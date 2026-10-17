import { Ctx, DISPLAY_FONT, TAU, View, depth, glow, laneW, xAt, yAt } from '../view';
import { JEEP } from './palette';

export interface HouseStyle {
  wall: string;
  roof: string;
  kind: 'house' | 'store';
  sign: string;
  /** Window color: capiz by day, lamp-lit at night, dark if nobody is home */
  window: string;
}

/** Concrete house with a galvanized roof and capiz windows, or a sari-sari store with its grille. */
export function house(ctx: Ctx, x0: number, w: number, yb: number, h: number, o: HouseStyle) {
  ctx.fillStyle = o.wall;
  ctx.fillRect(x0, yb - h, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  ctx.fillRect(x0, yb - h * 0.16, w, h * 0.16);
  const rh = h * 0.3;
  ctx.fillStyle = o.roof;
  ctx.beginPath();
  ctx.moveTo(x0 - w * 0.07, yb - h);
  ctx.lineTo(x0 + w * 1.07, yb - h);
  ctx.lineTo(x0 + w * 0.85, yb - h - rh);
  ctx.lineTo(x0 + w * 0.15, yb - h - rh);
  ctx.closePath();
  ctx.fill();
  const thin = Math.max(0.5, w * 0.008);
  ctx.strokeStyle = 'rgba(0,0,0,.22)';
  ctx.lineWidth = thin;
  ctx.beginPath();
  for (let i = 1; i < 9; i++) {
    const f = i / 9;
    ctx.moveTo(x0 - w * 0.07 + w * 1.14 * f, yb - h);
    ctx.lineTo(x0 + w * 0.15 + w * 0.7 * f, yb - h - rh);
  }
  ctx.stroke();
  if (o.kind === 'store') {
    ctx.fillStyle = o.sign;
    ctx.fillRect(x0 + w * 0.05, yb - h * 0.97, w * 0.9, h * 0.2);
    if (h > 14) {
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(4, h * 0.12)}px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SARI-SARI STORE', x0 + w / 2, yb - h * 0.865, w * 0.84);
    }
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(x0 + w * 0.1, yb - h * 0.7, w * 0.8, h * 0.4);
    const goods = ['#e94f37', '#f6c445', '#4f9d69', '#3c6fd1'];
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = goods[i % 4];
      ctx.fillRect(x0 + w * 0.13 + i * w * 0.073, yb - h * 0.52, w * 0.05, h * 0.09);
      ctx.fillRect(x0 + w * 0.13 + i * w * 0.073, yb - h * 0.66, w * 0.05, h * 0.07);
    }
    ctx.strokeStyle = 'rgba(205,205,195,.8)';
    ctx.lineWidth = Math.max(0.5, w * 0.006);
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const x = x0 + w * 0.1 + (w * 0.8 * i) / 16;
      ctx.moveTo(x, yb - h * 0.7);
      ctx.lineTo(x, yb - h * 0.3);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(x0 + w * 0.06, yb - h * 0.3, w * 0.88, h * 0.06);
    return;
  }
  for (const fx of [0.12, 0.6]) {
    ctx.fillStyle = o.window;
    ctx.fillRect(x0 + w * fx, yb - h * 0.82, w * 0.28, h * 0.3);
    if (w > 24) {
      ctx.strokeStyle = 'rgba(110,80,50,.55)';
      ctx.lineWidth = thin;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        const xx = x0 + w * (fx + (0.28 * i) / 4);
        const yy = yb - h * (0.82 - (0.3 * i) / 4);
        ctx.moveTo(xx, yb - h * 0.82);
        ctx.lineTo(xx, yb - h * 0.52);
        ctx.moveTo(x0 + w * fx, yy);
        ctx.lineTo(x0 + w * (fx + 0.28), yy);
      }
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  ctx.fillRect(x0 + w * 0.42, yb - h * 0.45, w * 0.16, h * 0.45);
}

/** Bahay kubo: bamboo walls, nipa roof, on stilts. */
export function kubo(ctx: Ctx, x0: number, w: number, yb: number, h: number, window = 'rgba(40,25,10,.75)') {
  const stilt = h * 0.3;
  const body = h * 0.38;
  const roof = h * 0.42;
  const yf = yb - stilt;
  ctx.strokeStyle = '#5a4126';
  ctx.lineWidth = Math.max(1, w * 0.04);
  ctx.beginPath();
  for (const f of [0.1, 0.5, 0.9]) {
    ctx.moveTo(x0 + w * f, yb);
    ctx.lineTo(x0 + w * f, yf);
  }
  ctx.stroke();
  ctx.fillStyle = '#b58a4c';
  ctx.fillRect(x0, yf - body, w, body);
  if (w > 20) {
    ctx.strokeStyle = 'rgba(80,55,25,.45)';
    ctx.lineWidth = Math.max(0.5, w * 0.008);
    ctx.beginPath();
    for (let i = 1; i < 14; i++) {
      const x = x0 + (w * i) / 14;
      ctx.moveTo(x, yf - body);
      ctx.lineTo(x, yf);
    }
    ctx.stroke();
  }
  ctx.fillStyle = window;
  ctx.fillRect(x0 + w * 0.35, yf - body * 0.78, w * 0.3, body * 0.45);
  ctx.fillStyle = '#8a6a3a';
  ctx.beginPath();
  ctx.moveTo(x0 - w * 0.16, yf - body + roof * 0.08);
  ctx.lineTo(x0 + w * 1.16, yf - body + roof * 0.08);
  ctx.lineTo(x0 + w * 0.5, yf - body - roof);
  ctx.closePath();
  ctx.fill();
  if (w > 20) {
    ctx.strokeStyle = 'rgba(60,40,15,.35)';
    ctx.beginPath();
    for (let i = 1; i < 10; i++) {
      ctx.moveTo(x0 + w * 0.5, yf - body - roof);
      ctx.lineTo(x0 - w * 0.16 + w * 1.32 * (i / 10), yf - body + roof * 0.08);
    }
    ctx.stroke();
  }
}

/** Creek-side house on posts over the floodwater: a barong-barong or a nipa hut. */
export function stiltHouse(ctx: Ctx, x0: number, w: number, yb: number, h: number, o: HouseStyle, nipa: boolean) {
  ctx.strokeStyle = '#3e3326';
  ctx.lineWidth = Math.max(1, w * 0.035);
  ctx.beginPath();
  for (const f of [0.08, 0.36, 0.64, 0.92]) {
    ctx.moveTo(x0 + w * f, yb + h * 0.05);
    ctx.lineTo(x0 + w * f, yb - h * 0.32);
  }
  ctx.stroke();
  if (nipa) kubo(ctx, x0, w, yb, h * 1.05, o.window);
  else house(ctx, x0, w, yb - h * 0.3, h * 0.7, o);
}

/** A parked jeepney seen from behind: stripes, the BAYANIHAN route board, a chrome horse on the hood. */
export function jeepneyRear(ctx: Ctx, x0: number, w: number, yb: number, h: number) {
  const top = yb - h;
  ctx.fillStyle = '#d9dde2';
  ctx.fillRect(x0, top + h * 0.12, w, h * 0.74);
  ctx.fillStyle = JEEP.blue;
  ctx.fillRect(x0 - w * 0.04, top, w * 1.08, h * 0.14);
  ctx.fillStyle = JEEP.yellow;
  ctx.fillRect(x0, top + h * 0.14, w, h * 0.1);
  ctx.fillStyle = JEEP.red;
  ctx.fillRect(x0, top + h * 0.24, w, h * 0.05);
  ctx.fillStyle = '#1b1b22';
  ctx.fillRect(x0 + w * 0.3, top + h * 0.32, w * 0.4, h * 0.5);
  const stripes = [JEEP.red, JEEP.blue, JEEP.green, JEEP.yellow, JEEP.red];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = stripes[i];
    ctx.fillRect(x0 + w * 0.04, top + h * (0.34 + i * 0.08), w * 0.2, h * 0.04);
    ctx.fillRect(x0 + w * 0.76, top + h * (0.34 + i * 0.08), w * 0.2, h * 0.04);
  }
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(x0 - w * 0.03, top + h * 0.82, w * 1.06, h * 0.07);
  ctx.fillStyle = '#ff4d3a';
  ctx.fillRect(x0 + w * 0.06, top + h * 0.7, w * 0.12, h * 0.08);
  ctx.fillRect(x0 + w * 0.82, top + h * 0.7, w * 0.12, h * 0.08);
  ctx.fillStyle = JEEP.ink;
  ctx.fillRect(x0 + w * 0.05, yb - h * 0.11, w * 0.18, h * 0.11);
  ctx.fillRect(x0 + w * 0.77, yb - h * 0.11, w * 0.18, h * 0.11);
  if (h > 16) {
    ctx.font = `${Math.max(4, h * 0.085)}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BAYANIHAN', x0 + w / 2, top + h * 0.19, w * 0.9);
  }
  ctx.fillStyle = '#c7ccd2';
  ctx.beginPath();
  ctx.moveTo(x0 + w * 0.5, top - h * 0.16);
  ctx.lineTo(x0 + w * 0.44, top);
  ctx.lineTo(x0 + w * 0.56, top);
  ctx.fill();
}

export interface PoleTop { side: number; x: number; y: number; z: number; lw: number }

/** Wooden utility pole at the roadside. Returns where its crossarm is, for the wires. */
export function pole(ctx: Ctx, v: View, zRel: number, side: number): PoleTop {
  const p = depth(zRel);
  const lw = laneW(v, p);
  const x = xAt(v, side < 0 ? -0.08 : 1.08, p);
  const yb = yAt(v, p);
  const h = lw * 2.6;
  ctx.fillStyle = '#35302b';
  ctx.fillRect(x - lw * 0.03, yb - h, lw * 0.06, h);
  ctx.fillRect(x - lw * 0.22, yb - h * 0.95, lw * 0.44, lw * 0.04);
  if (lw > 30) {
    ctx.fillStyle = '#4a4540';
    ctx.fillRect(x + lw * 0.04, yb - h * 0.82, lw * 0.12, lw * 0.16); // transformer
  }
  return { side, x, y: yb - h * 0.95, z: zRel, lw };
}

/** The tangle of sagging wires between consecutive poles on each side. */
export function wires(ctx: Ctx, tops: PoleTop[]) {
  ctx.strokeStyle = 'rgba(18,18,24,.75)';
  ctx.lineWidth = 1;
  for (const s of [-1, 1]) {
    const pts = tops.filter((q) => q.side === s).sort((a, b) => b.z - a.z);
    ctx.beginPath();
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      for (const dx of [-0.18, 0.18]) {
        ctx.moveTo(a.x + dx * a.lw, a.y);
        ctx.quadraticCurveTo((a.x + b.x) / 2 + (dx * (a.lw + b.lw)) / 2, (a.y + b.y) / 2 + b.lw * 0.35, b.x + dx * b.lw, b.y);
      }
    }
    ctx.stroke();
  }
}

/** Fiesta banderitas strung across the street, flapping in the wind. */
export function banderitas(ctx: Ctx, v: View, zRel: number, t: number, colors: readonly string[], wind: number, hLanes = 1.9) {
  const p = depth(zRel);
  if (p < 0.03) return;
  const lw = laneW(v, p);
  const xa = xAt(v, -0.25, p);
  const xb = xAt(v, 1.25, p);
  const ya = yAt(v, p) - hLanes * lw;
  const sag = lw * 0.3;
  const n = 16;
  const at = (f: number): [number, number] => [xa + (xb - xa) * f, ya + sag * 4 * f * (1 - f)];
  ctx.strokeStyle = 'rgba(30,20,10,.65)';
  ctx.lineWidth = Math.max(0.5, lw * 0.012);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const [x, y] = at(i / n);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const [x1, y1] = at(i / n);
    const [x2, y2] = at((i + 0.8) / n);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(mx + Math.sin(t * (5 + wind * 6) + i * 1.3) * lw * 0.06 * (0.5 + wind), my + lw * 0.22);
    ctx.closePath();
    ctx.fill();
  }
}

export function coconut(ctx: Ctx, x: number, yb: number, h: number, t: number, wind: number, seed: number) {
  const sway = Math.sin(t * 2.2 + seed) * h * 0.035 * wind + wind * h * 0.1;
  const tx = x + sway;
  const ty = yb - h;
  ctx.strokeStyle = '#5e4628';
  ctx.lineWidth = Math.max(1, h * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, yb);
  ctx.quadraticCurveTo(x + sway * 0.15, yb - h * 0.55, tx, ty);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI + i * (Math.PI / 7);
    const flutter = Math.sin(t * 6 + seed + i) * 0.12 * wind;
    const len = h * (0.32 + 0.06 * Math.sin(i * 2.1));
    const bend = wind * 0.7;
    const ex = tx + Math.cos(a + flutter) * len + bend * len * 0.6;
    const ey = ty + Math.sin(a + flutter) * len * 0.5 + len * 0.45;
    const cx = tx + Math.cos(a) * len * 0.5 + bend * len * 0.2;
    const cy = ty + Math.sin(a) * len * 0.5 - len * 0.15;
    ctx.strokeStyle = i % 2 ? '#2f5d2a' : '#3e7a33';
    ctx.lineWidth = Math.max(1, h * 0.032);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#4a3a1c';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(tx + (i - 1) * h * 0.025, ty + h * 0.03, h * 0.022, 0, TAU);
    ctx.fill();
  }
}

export function carabao(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = '#3b3a3f';
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.55, s * 0.8, s * 0.4, 0, 0, TAU);
  ctx.fill();
  for (const lx of [-0.6, -0.25, 0.2, 0.5]) ctx.fillRect(x + s * lx, y - s * 0.4, s * 0.14, s * 0.45);
  ctx.beginPath();
  ctx.ellipse(x + s * 0.95, y - s * 0.6, s * 0.25, s * 0.2, 0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#3b3a3f';
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.arc(x + s * 0.95, y - s * 0.8, s * 0.3, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
}

/** The public school that serves as the evacuation center, lit up, with its sign. */
export function school(ctx: Ctx, cx: number, yb: number, w: number, h: number, t: number) {
  const x0 = cx - w / 2;
  ctx.fillStyle = '#4a4a62';
  ctx.fillRect(x0, yb - h, w, h);
  ctx.fillStyle = '#6e2c2c';
  ctx.beginPath();
  ctx.moveTo(x0 - w * 0.03, yb - h);
  ctx.lineTo(x0 + w * 1.03, yb - h);
  ctx.lineTo(x0 + w * 0.95, yb - h * 1.22);
  ctx.lineTo(x0 + w * 0.05, yb - h * 1.22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3c3c52';
  ctx.fillRect(x0, yb - h * 0.5, w, h * 0.04);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 10; i++) {
      const lit = (i * 7 + row * 3) % 5 !== 0;
      ctx.globalAlpha = lit && Math.sin(t * 2 + i * 3 + row) > 0.97 ? 0.6 : 1;
      ctx.fillStyle = lit ? '#ffd27a' : '#262636';
      ctx.fillRect(x0 + w * (0.04 + i * 0.095), yb - h * (0.9 - row * 0.45), w * 0.06, h * 0.26);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f4efe2';
  ctx.fillRect(x0 + w * 0.22, yb - h * 0.62, w * 0.56, h * 0.15);
  if (h > 12) {
    ctx.fillStyle = '#c4321f';
    ctx.font = `${Math.max(4, h * 0.1)}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EVACUATION CENTER', cx, yb - h * 0.545, w * 0.52);
  }
  glow(ctx, cx, yb - h * 0.5, w * 0.6, 'rgba(255,200,110,.16)');
}

let flagImage: HTMLCanvasElement | null = null;
function flagCanvas(): HTMLCanvasElement {
  if (flagImage) return flagImage;
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 120;
  const x = c.getContext('2d')!;
  x.fillStyle = '#0038a8';
  x.fillRect(0, 0, 240, 60);
  x.fillStyle = '#ce1126';
  x.fillRect(0, 60, 240, 60);
  x.fillStyle = '#fff';
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(104, 60);
  x.lineTo(0, 120);
  x.closePath();
  x.fill();
  x.fillStyle = '#fcd116';
  x.save();
  x.translate(36, 60);
  for (let i = 0; i < 8; i++) {
    x.rotate(TAU / 8);
    x.beginPath();
    x.moveTo(-3, 0);
    x.lineTo(0, -22);
    x.lineTo(3, 0);
    x.fill();
  }
  x.beginPath();
  x.arc(0, 0, 10, 0, TAU);
  x.fill();
  x.restore();
  for (const [sx, sy] of [[10, 14], [10, 106], [86, 60]]) star(x, sx, sy, 5);
  flagImage = c;
  return c;
}
function star(x: Ctx, cx: number, cy: number, r: number) {
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  x.closePath();
  x.fill();
}

/** Philippine flag on its pole, waving. */
export function flagpole(ctx: Ctx, x: number, base: number, h: number, t: number) {
  const top = base - h;
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(x, top, Math.max(1, h * 0.012), h);
  const f = flagCanvas();
  const w = h * 0.3;
  const fh = w / 2;
  const n = 24;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const dy = Math.sin(t * 5 - k * 6) * fh * 0.09 * k;
    ctx.drawImage(f, (f.width * i) / n, 0, f.width / n + 1, f.height, x + w * k, top + dy, w / n + 1, fh);
  }
}

export function rescueTruck(ctx: Ctx, x: number, yb: number, s: number, t: number) {
  ctx.fillStyle = '#e8e6df';
  ctx.fillRect(x, yb - s * 0.7, s * 1.6, s * 0.55);
  ctx.fillRect(x + s * 1.6, yb - s * 0.55, s * 0.5, s * 0.4);
  ctx.fillStyle = JEEP.red;
  ctx.fillRect(x, yb - s * 0.45, s * 2.1, s * 0.08);
  ctx.fillStyle = '#1d1d22';
  for (const wx of [0.35, 1.7]) {
    ctx.beginPath();
    ctx.arc(x + s * wx, yb - s * 0.12, s * 0.14, 0, TAU);
    ctx.fill();
  }
  const on = Math.floor(t * 5) % 2 === 0;
  const lights: [string, boolean][] = [['#ff3b30', on], ['#2f7bff', !on]];
  lights.forEach(([c, lit], i) => {
    ctx.globalAlpha = lit ? 1 : 0.25;
    ctx.fillStyle = c;
    ctx.fillRect(x + s * (0.5 + i * 0.35), yb - s * 0.82, s * 0.3, s * 0.12);
    ctx.globalAlpha = 1;
    if (lit) glow(ctx, x + s * (0.65 + i * 0.35), yb - s * 0.76, s * 1.5, c + '66');
  });
}

/** Rescue volunteer in an orange vest, waving a flashlight. */
export function volunteer(ctx: Ctx, x: number, yb: number, s: number, t: number, phase: number) {
  ctx.fillStyle = '#1b1d26';
  ctx.fillRect(x - s * 0.12, yb - s * 0.5, s * 0.1, s * 0.5);
  ctx.fillRect(x + s * 0.02, yb - s * 0.5, s * 0.1, s * 0.5);
  ctx.fillStyle = '#f0862a';
  ctx.fillRect(x - s * 0.17, yb - s * 0.95, s * 0.34, s * 0.48);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(x - s * 0.17, yb - s * 0.76, s * 0.34, s * 0.05);
  ctx.fillStyle = '#5a3b28';
  ctx.beginPath();
  ctx.arc(x, yb - s * 1.07, s * 0.12, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#f0862a';
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = 'round';
  const hx = x + s * 0.32 + Math.sin(t * 6 + phase) * s * 0.12;
  const hy = yb - s * 1.3;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.15, yb - s * 0.9);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.lineCap = 'butt';
  glow(ctx, hx, hy, s * 0.35, 'rgba(255,240,190,.55)');
}
