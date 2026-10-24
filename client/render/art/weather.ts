import type { FloodZone, WindDir } from '../../../shared/sim/weather';
import { CAM_BACK_M, Ctx, DRAW_DISTANCE_M, TAU, View, depth, glow, hash, laneW, quad, wrap, xAt, yAt } from '../view';
import { Look, mixHex, rgba } from './palette';

/*
 * The storm itself: layered clouds lit from inside by lightning, rain in depth with splashes on
 * the road, wind streaks that show which way it blows, floodwater with high ground, and the
 * camera effects (drops on the lens, fog, grain). All visual; the rules are in shared/sim.
 */

// ---- Clouds -------------------------------------------------------------------------------

export interface CloudBank {
  x: number;
  y: number;
  r: number;
  speed: number;
  puffs: { dx: number; dy: number; r: number }[];
  layer: 0 | 1;
}

export function makeCloudBanks(n: number): CloudBank[] {
  return Array.from({ length: n }, (_, i) => {
    const count = 5 + Math.floor(Math.random() * 4);
    return {
      x: Math.random(),
      y: Math.random(),
      r: 0.7 + Math.random() * 0.8,
      speed: 0.6 + Math.random() * 0.8,
      layer: (i % 3 === 0 ? 0 : 1) as 0 | 1,
      puffs: Array.from({ length: count }, (_, k) => ({
        dx: (k / (count - 1) - 0.5) * 2.6 + (Math.random() - 0.5) * 0.4,
        dy: -Math.sin((k / (count - 1)) * Math.PI) * (0.35 + Math.random() * 0.35) + (Math.random() - 0.5) * 0.15,
        r: 0.55 + Math.random() * 0.45,
      })),
    };
  });
}

/**
 * Two decks of storm clouds, drawn at half resolution so the big soft puffs stay cheap: a far,
 * hazy deck and a near, dark one, both drifting downwind. Each puff is lit from the top and
 * shadowed underneath; `flash` (0..1) lights the deck from inside at `flashX`.
 */
export class CloudLayer {
  private readonly layer = document.createElement('canvas');
  private readonly lctx = this.layer.getContext('2d')!;

  draw(ctx: Ctx, v: View, t: number, banks: CloudBank[], look: Look, windDir: WindDir, wind: number, flash: number, flashX: number, quality: number) {
    const scale = quality > 0.75 ? 0.5 : 0.33;
    const w = Math.max(1, Math.ceil(v.W * scale));
    const h = Math.max(1, Math.ceil(v.hy * 1.05 * scale));
    if (this.layer.width !== w || this.layer.height !== h) {
      this.layer.width = w;
      this.layer.height = h;
    }
    const c = this.lctx;
    c.clearRect(0, 0, w, h);
    const lit = mixHex(look.cloud, '#c8ced6', 0.32 + look.glowA);
    const dark = mixHex(look.cloud, '#05060a', 0.45);
    const drift = (1 + wind * 5) * windDir;

    for (const layer of [0, 1] as const) {
      const sizeK = layer === 0 ? 0.55 : 1;
      const alpha = look.cloudA * (layer === 0 ? 0.65 : 1);
      for (const b of banks) {
        if (b.layer !== layer) continue;
        const span = w * 1.6;
        const x = wrap(b.x * span + t * drift * b.speed * w * 0.012 * (layer === 0 ? 0.5 : 1), span) - w * 0.3;
        const y = (layer === 0 ? 0.25 + b.y * 0.45 : b.y * 0.62) * h;
        const R = b.r * w * 0.085 * sizeK;
        for (const puff of b.puffs) {
          const px = x + puff.dx * R;
          const py = y + puff.dy * R;
          const pr = puff.r * R;
          const gr = c.createRadialGradient(px - pr * 0.15, py - pr * 0.45, pr * 0.1, px, py, pr);
          gr.addColorStop(0, rgba(lit, alpha));
          gr.addColorStop(0.55, rgba(look.cloud, alpha * 0.95));
          gr.addColorStop(1, rgba(dark, 0));
          c.fillStyle = gr;
          c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        }
        // Flat, dark underside of the bank
        const ug = c.createLinearGradient(0, y, 0, y + R * 0.9);
        ug.addColorStop(0, rgba(dark, 0));
        ug.addColorStop(0.5, rgba(dark, alpha * 0.55));
        ug.addColorStop(1, rgba(dark, 0));
        c.fillStyle = ug;
        c.fillRect(x - R * 1.8, y, R * 3.6, R * 0.9);
      }
    }
    if (flash > 0) {
      // Lightning inside the clouds: light only where there is cloud
      c.globalCompositeOperation = 'source-atop';
      const fx = flashX * w;
      const fg = c.createRadialGradient(fx, h * 0.35, 0, fx, h * 0.35, w * 0.5);
      fg.addColorStop(0, `rgba(235,240,255,${0.85 * flash})`);
      fg.addColorStop(1, 'rgba(235,240,255,0)');
      c.fillStyle = fg;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(this.layer, 0, 0, w, h, 0, 0, v.W, v.hy * 1.05);
  }
}

/** Grey curtains of heavy rain hanging from the clouds on the horizon, leaning downwind. */
export function rainCurtains(ctx: Ctx, v: View, t: number, amount: number, windDir: WindDir, wind: number, look: Look) {
  if (amount < 0.3) return;
  ctx.save();
  const color = mixHex(look.haze, '#4a5260', 0.5);
  for (let i = 0; i < 5; i++) {
    const x = wrap(hash(i, 3) * v.W * 1.4 + t * windDir * v.W * 0.006 * (1 + wind), v.W * 1.4) - v.W * 0.2;
    const w = v.W * (0.12 + hash(i, 5) * 0.18);
    const top = v.hy * (0.25 + hash(i, 7) * 0.25);
    const lean = windDir * w * 0.5 * wind;
    const gr = ctx.createLinearGradient(0, top, 0, v.hy);
    gr.addColorStop(0, rgba(color, 0));
    gr.addColorStop(0.4, rgba(color, 0.28 * amount));
    gr.addColorStop(1, rgba(color, 0.4 * amount));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, top);
    ctx.lineTo(x + w + lean, v.hy + 2);
    ctx.lineTo(x + lean, v.hy + 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---- Lightning ----------------------------------------------------------------------------

/**
 * A forked bolt from the cloud base down to (x1, y1), with a glow around it. `seed` keeps the
 * shape steady over the few frames it is on screen.
 */
export function bolt(ctx: Ctx, v: View, x0: number, x1: number, y1: number, seed: number, width = 1) {
  const segs = 14;
  const pts: [number, number][] = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const jitter = i === 0 || i === segs ? 0 : (hash(Math.floor(seed * 1000), i) - 0.5) * v.W * 0.06 * (1 - f * 0.5);
    pts.push([x0 + (x1 - x0) * f + jitter, y1 * f]);
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = (list: [number, number][]) => {
    ctx.beginPath();
    list.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  const unit = Math.max(1, v.W / 600) * width;
  ctx.strokeStyle = 'rgba(150,170,255,.25)';
  ctx.lineWidth = unit * 9;
  path(pts);
  ctx.strokeStyle = 'rgba(200,215,255,.55)';
  ctx.lineWidth = unit * 4;
  path(pts);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = unit * 1.6;
  path(pts);
  // Forks
  ctx.lineWidth = unit * 0.9;
  ctx.strokeStyle = 'rgba(225,232,255,.8)';
  for (let k = 0; k < 3; k++) {
    const from = 3 + Math.floor(hash(Math.floor(seed * 1000), 40 + k) * (segs - 6));
    const [fx, fy] = pts[from];
    const dir = hash(Math.floor(seed * 1000), 50 + k) < 0.5 ? -1 : 1;
    const fork: [number, number][] = [[fx, fy]];
    for (let j = 1; j <= 4; j++) fork.push([fx + dir * j * v.W * 0.018 + (hash(k, j) - 0.5) * v.W * 0.02, fy + j * y1 * 0.045]);
    path(fork);
  }
  ctx.restore();
}

// ---- Rain ---------------------------------------------------------------------------------

export interface RainDrop {
  x: number;
  y: number;
  l: number;
  s: number;
  near: boolean;
}

export const makeRainDrops = (n: number): RainDrop[] =>
  Array.from({ length: n }, (_, i) => ({ x: Math.random(), y: Math.random(), l: 0.5 + Math.random(), s: 0.7 + Math.random() * 0.6, near: i % 5 === 0 }));

/**
 * Rain in two depths: fine, fast streaks far away and long, bright ones close to the camera,
 * all slanted downwind. `amount` and `wind` are 0..1 from the current signal.
 */
export function rainLayers(ctx: Ctx, v: View, t: number, drops: RainDrop[], amount: number, windDir: WindDir, wind: number, night: number, quality: number) {
  const n = Math.floor(drops.length * (0.25 + amount * 0.75) * quality);
  const slant = (0.12 + wind * 0.7) * windDir;
  const unit = v.W / 900;
  const color = night > 0.5 ? '185,198,232' : '205,218,236';
  for (const near of [false, true]) {
    const speed = (near ? 1.5 : 1.0) + amount;
    const len = (near ? 34 : 13) * (0.6 + amount * 0.6) * unit;
    ctx.strokeStyle = `rgba(${color},${(near ? 0.32 : 0.2) + amount * (near ? 0.18 : 0.15)})`;
    ctx.lineWidth = Math.max(1, unit * (near ? 1.6 : 0.9));
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const d = drops[i];
      if (d.near !== near) continue;
      const y = wrap(d.y + t * speed * d.s, 1) * v.H * 1.15 - v.H * 0.08;
      const x = wrap(d.x + t * speed * d.s * slant * 0.55, 1) * v.W * 1.1 - v.W * 0.05;
      const L = len * d.l;
      ctx.moveTo(x, y);
      ctx.lineTo(x - slant * L * 1.2, y - L);
    }
    ctx.stroke();
  }
}

/** Raindrops hitting the road and the puddles: little crowns and rings near the camera. */
export function splashes(ctx: Ctx, v: View, t: number, amount: number, water: boolean, quality: number) {
  if (amount < 0.1) return;
  const n = Math.floor((30 + amount * 70) * quality);
  const rate = 2.6;
  ctx.save();
  ctx.lineWidth = Math.max(1, v.W / 1200);
  for (let i = 0; i < n; i++) {
    const phase = t * rate + i * 0.6180339;
    const cycle = Math.floor(phase);
    const f = phase - cycle;
    const u = -0.25 + hash(cycle, i * 3 + 1) * 1.5;
    const zRel = 1 + hash(cycle, i * 3 + 2) * 34;
    const p = depth(zRel);
    const lw = laneW(v, p);
    const x = xAt(v, u, p);
    const y = yAt(v, p);
    const r = lw * (water ? 0.05 + f * 0.12 : 0.03 + f * 0.05);
    ctx.strokeStyle = `rgba(215,228,240,${(1 - f) * (water ? 0.45 : 0.35)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.3, 0, 0, TAU);
    ctx.stroke();
    if (!water && f < 0.35) {
      // The crown of a drop bouncing off the asphalt
      ctx.fillStyle = `rgba(225,235,245,${0.5 * (1 - f / 0.35)})`;
      const hgt = lw * 0.05 * Math.sin((f / 0.35) * Math.PI);
      ctx.fillRect(x - r * 0.6, y - hgt, Math.max(1, r * 0.2), Math.max(1, hgt));
      ctx.fillRect(x + r * 0.4, y - hgt * 0.8, Math.max(1, r * 0.2), Math.max(1, hgt * 0.8));
    }
  }
  ctx.restore();
}

/**
 * The road is wet: the bright horizon and the sky glow reflect in it, strongest far away
 * where the angle is low, with a soft sheen running down the middle.
 */
export function wetRoad(ctx: Ctx, v: View, look: Look, amount: number) {
  if (amount <= 0.05) return;
  const p0 = depth(DRAW_DISTANCE_M);
  const p1 = depth(-CAM_BACK_M);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xAt(v, -0.04, p0), yAt(v, p0));
  ctx.lineTo(xAt(v, 1.04, p0), yAt(v, p0));
  ctx.lineTo(xAt(v, 1.04, p1), yAt(v, p1));
  ctx.lineTo(xAt(v, -0.04, p1), yAt(v, p1));
  ctx.closePath();
  ctx.clip();
  const gr = ctx.createLinearGradient(0, v.hy, 0, v.H);
  const sheen = mixHex(look.sky[2], look.glow, look.glowA);
  gr.addColorStop(0, rgba(sheen, 0.5 * amount));
  gr.addColorStop(0.25, rgba(sheen, 0.16 * amount));
  gr.addColorStop(1, rgba(sheen, 0.03 * amount));
  ctx.fillStyle = gr;
  ctx.fillRect(0, v.hy, v.W, v.H - v.hy);
  // Long reflection streak down the middle
  const cg = ctx.createLinearGradient(v.vx - v.W * 0.12, 0, v.vx + v.W * 0.12, 0);
  cg.addColorStop(0, 'rgba(255,255,255,0)');
  cg.addColorStop(0.5, `rgba(235,240,250,${0.08 * amount})`);
  cg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(v.vx - v.W * 0.12, v.hy, v.W * 0.24, v.H - v.hy);
  ctx.restore();
}

/** Puddles on the road that ripple in the rain, seeded by where they lie on the course. */
export function puddles(ctx: Ctx, v: View, camZ: number, t: number, look: Look, amount: number) {
  if (amount < 0.2) return;
  const every = 9;
  const first = Math.floor(camZ / every);
  const sheen = mixHex(look.sky[1], look.glow, look.glowA);
  for (let k = first + Math.floor(DRAW_DISTANCE_M / every); k >= first; k--) {
    if (hash(k, 61) > amount * 0.8) continue;
    const zRel = k * every + hash(k, 63) * every - camZ;
    if (zRel < -CAM_BACK_M + 0.2 || zRel > 90) continue;
    const p = depth(zRel);
    const lw = laneW(v, p);
    const x = xAt(v, 0.08 + hash(k, 65) * 0.84, p);
    const y = yAt(v, p);
    const rx = lw * (0.25 + hash(k, 67) * 0.35);
    const ry = rx * 0.14 * (0.6 + p * 0.6);
    ctx.fillStyle = rgba(mixHex(sheen, '#1b1f27', 0.45), 0.55);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,230,240,.25)';
    ctx.lineWidth = Math.max(1, lw * 0.008);
    const f = wrap(t * 1.4 + hash(k, 69), 1);
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.2, y, rx * 0.3 * f + 1, ry * 0.3 * f + 0.5, 0, 0, TAU);
    ctx.stroke();
  }
}

// ---- Wind ---------------------------------------------------------------------------------

export interface Gust {
  x: number;
  y: number;
  l: number;
  s: number;
  c: number;
}
export const makeWindStreaks = (n: number): Gust[] =>
  Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), l: 0.4 + Math.random(), s: 0.6 + Math.random() * 0.8, c: Math.random() }));

/**
 * Wind made visible: thin curved streaks blowing across the screen in the wind's direction.
 * `strength` is the signal's wind plus any gust about to hit (up to ~2).
 */
export function windStreaks(ctx: Ctx, v: View, t: number, list: Gust[], windDir: WindDir, strength: number, quality: number) {
  const n = Math.floor(list.length * Math.min(1, strength * 0.6) * quality);
  if (n <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const g = list[i];
    const travel = wrap(g.x + t * (0.35 + strength * 0.5) * g.s, 1.4) - 0.2;
    const x = windDir > 0 ? travel * v.W : (1 - travel) * v.W;
    const y = g.y * v.H * 0.9 + Math.sin(t * 2 + g.c * 9) * v.H * 0.01;
    const L = v.W * (0.06 + g.l * 0.12) * (0.6 + strength * 0.4);
    const a = Math.min(0.35, 0.1 + strength * 0.12) * (0.5 + g.c * 0.5);
    ctx.strokeStyle = `rgba(230,236,242,${a})`;
    ctx.lineWidth = Math.max(1, (v.W / 900) * (0.8 + g.c * 1.4));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - windDir * L * 0.5, y - L * 0.06, x - windDir * L, y + L * 0.03);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A gust coming in from upwind: a wall of spray and dust building on the upwind side of the
 * screen as `closeness` goes 0 → 1, with a big arrow painted on the road.
 */
export function gustWall(ctx: Ctx, v: View, t: number, windDir: WindDir, closeness: number) {
  if (closeness <= 0) return;
  const side = windDir > 0 ? 0 : v.W;
  const reach = v.W * (0.15 + closeness * 0.45);
  const gr = ctx.createLinearGradient(side, 0, side + windDir * reach, 0);
  gr.addColorStop(0, `rgba(205,212,218,${0.42 * closeness})`);
  gr.addColorStop(1, 'rgba(205,212,218,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(Math.min(side, side + windDir * reach), v.hy * 0.4, reach, v.H);
  // Debris tumbling in the gust
  ctx.fillStyle = `rgba(60,48,36,${0.7 * closeness})`;
  for (let i = 0; i < 12; i++) {
    const f = wrap(t * 1.6 + i * 0.13, 1);
    const x = side + windDir * f * reach * 1.3;
    const y = v.hy + hash(i, 71) * (v.H - v.hy) * 0.8 - Math.sin(f * Math.PI) * v.H * 0.08;
    const s = v.W * 0.004 * (1 + hash(i, 73) * 2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 8 + i);
    ctx.fillRect(-s, -s * 0.4, s * 2, s * 0.8);
    ctx.restore();
  }
}

/** The arrow on the road ahead of a gust, pointing the way it will shove. */
export function gustArrow(ctx: Ctx, v: View, zRel: number, windDir: WindDir, t: number) {
  if (zRel < 2 || zRel > DRAW_DISTANCE_M) return;
  const pulse = 0.55 + Math.sin(t * 10) * 0.25;
  for (let k = 0; k < 3; k++) {
    const u0 = windDir > 0 ? 0.15 + k * 0.25 : 0.85 - k * 0.25;
    const u1 = u0 + windDir * 0.14;
    const p0 = depth(zRel);
    const p1 = depth(zRel + 2.4);
    ctx.fillStyle = `rgba(242,194,48,${pulse})`;
    ctx.beginPath();
    ctx.moveTo(xAt(v, u0, p0), yAt(v, p0));
    ctx.lineTo(xAt(v, u1, (p0 + p1) / 2), yAt(v, (p0 + p1) / 2));
    ctx.lineTo(xAt(v, u0, p1), yAt(v, p1));
    ctx.lineTo(xAt(v, u0 + windDir * 0.05, (p0 + p1) / 2), yAt(v, (p0 + p1) / 2));
    ctx.closePath();
    ctx.fill();
  }
}

// ---- Floods -------------------------------------------------------------------------------

/**
 * A flooded stretch: brown, moving water over the two deep lanes, and the high-ground lane
 * raised on sandbags. An MMDA-style flood gauge post marks where it starts.
 */
export function floodZone(ctx: Ctx, v: View, f: FloodZone, camZ: number, t: number, windDir: WindDir, look: Look) {
  const z0 = Math.max(f.startZ - camZ, -CAM_BACK_M);
  const z1 = Math.min(f.endZ - camZ, DRAW_DISTANCE_M);
  if (z1 <= z0) return;
  const safeU0 = f.safeLane / 3;
  const safeU1 = (f.safeLane + 1) / 3;
  const water = mixHex('#4a3c2a', '#161b1f', look.night * 0.6);
  const sky = mixHex(look.sky[2], look.glow, look.glowA);
  // Water spreads past the road edges into the fields on the deep side(s)
  const spans: [number, number][] =
    f.safeLane === 0 ? [[safeU1, 4]] : f.safeLane === 2 ? [[-3, safeU0]] : [[-3, safeU0], [safeU1, 4]];
  const pa = depth(z0);
  const pb = depth(z1);
  ctx.save();
  ctx.beginPath();
  for (const [u0, u1] of spans) {
    ctx.moveTo(xAt(v, u0, pa), yAt(v, pa));
    ctx.lineTo(xAt(v, u1, pa), yAt(v, pa));
    ctx.lineTo(xAt(v, u1, pb), yAt(v, pb));
    ctx.lineTo(xAt(v, u0, pb), yAt(v, pb));
    ctx.closePath();
  }
  ctx.clip();
  // Murky water that mirrors the sky: bright and glassy far off, dark and brown up close
  const gr = ctx.createLinearGradient(0, yAt(v, pb), 0, yAt(v, pa));
  gr.addColorStop(0, mixHex(water, sky, 0.75));
  gr.addColorStop(0.35, mixHex(water, sky, 0.4));
  gr.addColorStop(1, water);
  ctx.fillStyle = gr;
  ctx.fillRect(0, yAt(v, pb) - 1, v.W, yAt(v, pa) - yAt(v, pb) + 2);
  // Swell: soft light and dark bands rolling toward the camera
  const STEP = 2.5;
  for (let zw = Math.floor((camZ + z0 - t * 4) / STEP) * STEP; zw < camZ + z1; zw += STEP) {
    const a = zw + t * 4 - camZ;
    if (a < z0 || a > z1) continue;
    const band = Math.floor(zw / STEP) % 3;
    if (band === 0) quad(ctx, v, -3, 4, a, a + STEP * 0.4, rgba(sky, 0.12));
    else if (band === 1) quad(ctx, v, -3, 4, a, a + STEP * 0.5, 'rgba(0,0,0,.12)');
  }
  // Rain rings on the surface
  ctx.lineWidth = Math.max(1, v.W / 1200);
  for (let i = 0; i < 40; i++) {
    const phase = t * 1.8 + i * 0.37;
    const cycle = Math.floor(phase);
    const k = phase - cycle;
    const zRel = z0 + hash(cycle, i + 90) * Math.min(60, z1 - z0);
    const p = depth(zRel);
    const lw = laneW(v, p);
    const r = lw * (0.04 + k * 0.18);
    ctx.strokeStyle = `rgba(225,232,238,${(1 - k) * 0.45})`;
    ctx.beginPath();
    ctx.ellipse(xAt(v, -0.5 + hash(cycle, i + 91) * 2, p), yAt(v, p), r, r * 0.25, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  // High ground: a concrete strip, its near edge catching the light
  quad(ctx, v, safeU0 + 0.01, safeU1 - 0.01, z0, z1, '#8f8b81');
  quad(ctx, v, safeU0 + 0.01, safeU0 + 0.03, z0, z1, 'rgba(255,255,255,.12)');
  // Current: light streaks drifting downwind and toward the camera
  ctx.save();
  ctx.lineWidth = Math.max(1, v.W / 1000);
  for (let i = 0; i < 46; i++) {
    const zRel = z0 + wrap(hash(i, 81) * (z1 - z0) - t * 3, Math.max(1, z1 - z0));
    const u = wrap(hash(i, 83) + t * 0.05 * windDir, 1) * 1.6 - 0.3;
    if (u > safeU0 - 0.02 && u < safeU1 + 0.02) continue;
    const p = depth(zRel);
    const lw = laneW(v, p);
    const x = xAt(v, u, p);
    const y = yAt(v, p);
    ctx.strokeStyle = `rgba(220,210,185,${0.35 * p + 0.1})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + windDir * lw * 0.25, y + lw * 0.01);
    ctx.stroke();
  }
  ctx.restore();
  // Sandbags, far to near
  for (let zw = Math.ceil((camZ + z1) / 1.6) * 1.6; zw >= camZ + z0; zw -= 1.6) {
    const zRel = zw - camZ;
    if (zRel < -CAM_BACK_M + 0.1) continue;
    const p = depth(zRel);
    const lw = laneW(v, p);
    for (const u of [safeU0, safeU1]) {
      const x = xAt(v, u, p);
      const y = yAt(v, p);
      const bw = lw * 0.12;
      ctx.fillStyle = '#b9a675';
      ctx.beginPath();
      ctx.ellipse(x, y - bw * 0.35, bw, bw * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.beginPath();
      ctx.ellipse(x, y - bw * 0.2, bw, bw * 0.25, 0, 0, Math.PI);
      ctx.fill();
    }
  }
  // Foam line where the water starts
  if (f.startZ - camZ > z0 - 0.01 && f.startZ - camZ < DRAW_DISTANCE_M) {
    const zs = f.startZ - camZ;
    quad(ctx, v, -0.6, 1.6, zs, zs + 0.5, 'rgba(230,225,210,.35)');
    floodGauge(ctx, v, zs, f.safeLane === 0 ? 1 : -1, t);
  }
}

/** Flood gauge post by the road: bands for gutter, knee and waist deep (as on MMDA posts). */
function floodGauge(ctx: Ctx, v: View, zRel: number, side: number, t: number) {
  if (zRel < 0.5) return;
  const p = depth(zRel);
  const lw = laneW(v, p);
  const x = xAt(v, side < 0 ? -0.18 : 1.18, p);
  const y = yAt(v, p);
  const h = lw * 1.5;
  const w = lw * 0.11;
  const bands = ['#3d8b4f', '#f2c230', '#f0862a', '#d6402b', '#8a1f1a'];
  bands.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(x - w / 2, y - h * ((i + 1) / bands.length), w, h / bands.length);
  });
  ctx.fillStyle = '#f1ebdd';
  ctx.fillRect(x - w / 2, y - h * 1.12, w, h * 0.12);
  // Water around the base
  ctx.fillStyle = 'rgba(91,74,51,.8)';
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.2, w * 1.6 + Math.sin(t * 3) * w * 0.1, w * 0.5, 0, 0, TAU);
  ctx.fill();
}

// ---- Camera and air -----------------------------------------------------------------------

/** Fog over everything drawn so far above screen height `yLimit` (far things), fading out below. */
export function fogAbove(ctx: Ctx, v: View, yLimit: number, color: string, alpha: number) {
  if (alpha <= 0.005) return;
  const top = v.hy - v.H * 0.25;
  const gr = ctx.createLinearGradient(0, top, 0, yLimit);
  gr.addColorStop(0, rgba(color, 0));
  gr.addColorStop(0.45, rgba(color, alpha));
  gr.addColorStop(0.8, rgba(color, alpha * 0.8));
  gr.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gr;
  ctx.fillRect(0, top, v.W, yLimit - top);
}

export interface LensDrop {
  x: number;
  y: number;
  r: number;
  age: number;
  life: number;
  slide: number;
}

/**
 * Raindrops on the camera lens: they land, sit a moment, then run down. Each one shows the
 * scene behind it flipped and blurred, as a real drop would.
 */
export class LensDrops {
  private readonly drops: LensDrop[] = [];

  draw(ctx: Ctx, canvas: HTMLCanvasElement, v: View, dt: number, amount: number, quality: number) {
    if (Math.random() < dt * amount * 6 * quality && this.drops.length < 18) {
      this.drops.push({ x: Math.random(), y: Math.random() * 0.8, r: 0.006 + Math.random() * 0.016, age: 0, life: 1.5 + Math.random() * 2.5, slide: 0 });
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      if (d.age > d.life) {
        this.drops.splice(i, 1);
        continue;
      }
      if (d.age > d.life * 0.4) d.slide += dt * (0.05 + d.r * 6);
      const x = d.x * v.W;
      const y = (d.y + d.slide) * v.H;
      const r = d.r * v.W;
      const fade = Math.min(1, (d.life - d.age) * 2, d.age * 8);
      ctx.save();
      ctx.globalAlpha = 0.85 * fade;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 1.1, 0, 0, TAU);
      ctx.clip();
      // Refraction: the scene around the drop, upside down and magnified
      ctx.translate(x, y);
      ctx.scale(-0.55, -0.55);
      ctx.drawImage(canvas, x - r * 3, y - r * 3, r * 6, r * 6, -r * 3, -r * 3, r * 6, r * 6);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 1.1, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.22, r * 0.14, -0.6, 0, TAU);
      ctx.fill();
      if (d.slide > 0) {
        ctx.fillStyle = 'rgba(220,230,240,.12)';
        ctx.fillRect(x - r * 0.25, y - d.slide * v.H, r * 0.5, d.slide * v.H);
      }
      ctx.restore();
    }
  }
}

/** Film grain: a tile of noise drawn at a random offset each frame. */
export class Grain {
  private readonly tile = document.createElement('canvas');
  private pattern: CanvasPattern | null = null;

  constructor() {
    this.tile.width = this.tile.height = 128;
    const c = this.tile.getContext('2d')!;
    const img = c.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }

  draw(ctx: Ctx, v: View, alpha: number) {
    if (!this.pattern) this.pattern = ctx.createPattern(this.tile, 'repeat');
    if (!this.pattern) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128));
    ctx.fillStyle = this.pattern;
    ctx.fillRect(-128, -128, v.W + 256, v.H + 256);
    ctx.restore();
  }
}

/** The storm darkens and cools the picture as the signal rises; lightning bleaches it. */
export function grade(ctx: Ctx, v: View, level: number, flash: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const k = (level - 1) / 4;
  ctx.fillStyle = `rgb(${Math.round(255 - k * 60)},${Math.round(255 - k * 45)},${Math.round(255 - k * 25)})`;
  ctx.fillRect(-v.W * 0.1, -v.H * 0.1, v.W * 1.2, v.H * 1.2);
  ctx.restore();
  if (flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(190,205,255,${Math.min(0.75, flash)})`;
    ctx.fillRect(-v.W * 0.1, -v.H * 0.1, v.W * 1.2, v.H * 1.2);
    ctx.restore();
  }
}

/** Soft contact shadow under something standing on the road. */
export function contactShadow(ctx: Ctx, x: number, y: number, w: number, alpha = 0.35) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.22);
  glow(ctx, 0, 0, w, `rgba(0,0,0,${alpha})`);
  ctx.restore();
}
