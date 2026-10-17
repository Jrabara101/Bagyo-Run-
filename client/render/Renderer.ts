import type { LaneIndex, PlayerPhysicsState, TrackChunk } from '../../shared/sim/types';
import { AREAS, AreaId, COURSE_LENGTH_M, areaAt } from '../../shared/content/areas';
import { SIGNALS, signalAt } from '../../shared/content/signals';
import {
  CAM_BACK_M, Ctx, DRAW_DISTANCE_M, HEIGHT_TO_LANE, TAU, View, depth, glow, hash, laneCenterU, laneU, laneW, makeView, pick, quad, xAt, yAt,
} from './view';
import { AREA_LOOK, FIESTA, Look, ROAD_LOOK, RoadLook, TITLE_LOOK, TITLE_ROAD, mixHex, mixLook } from './art/palette';
import { Cloud, Drop, Leaf, clouds, ground, haze, leaves, lightningBolt, makeClouds, makeLeaves, makeRain, makeRidge, mountains, rain, sky, spiral, vignette } from './art/sky';
import {
  HouseStyle, PoleTop, banderitas, carabao, coconut, flagpole, house, jeepneyRear, kubo, pole, rescueTruck, school, stiltHouse, volunteer, wires,
} from './art/scenery';
import { drawFinish, drawGate, drawHazard } from './art/hazards';
import { drawCollectible } from './art/items';
import { GHOST_COLORS, KID_HEIGHT_UNITS, KidPose, drawKid } from './art/kid';

/** A quiz gate to draw: where it stands, and the lane to highlight while its question is up. */
export interface RenderGate {
  z: number;
  highlightLane: LaneIndex | null;
}

export interface RenderFrame {
  player: PlayerPhysicsState;
  playerZ: number;
  chunks: TrackChunk[];
  gate: RenderGate | null;
  bayanihan: boolean;
  ghost: { z: number; lane: LaneIndex } | null;
  /** Title screen: dusk over the barangay with the kid running in place, no hazards. */
  title: boolean;
}

export interface RenderSettings {
  screenShake: number;
  cameraTilt: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Drawable {
  z: number;
  draw: () => void;
}

const SLOT_M = 12;
const BAND_M = 4;
/** Sky and ground blend into the next area over this many meters before its start. */
const LOOK_BLEND_M = 120;
const KID_LANES_TALL = 0.5;
const TITLE_PACE = 7;
const BANDERITAS_EVERY_M = 96;

const HOUSE_WALLS = ['#e6b9a6', '#9fc2b5', '#e7d38f', '#b7a6d6', '#efece2', '#a9c4de'];
const HOUSE_ROOFS = ['#7d8a93', '#a4593d', '#5d6a73', '#8b5a44'];
const SHACK_WALLS = ['#8d969b', '#a7875f', '#7f8f86', '#9b7f78'];
const SHACK_ROOFS = ['#6b757b', '#8a6a3a', '#7a5f50'];
const STORE_SIGNS = ['#2b5fb8', '#d6402b', '#3d8b4f'];

/**
 * Draws the run: the four areas of the course in procedural canvas art, the hazards, items,
 * quiz gates and the kid. Holds only visual state (camera, sparks, rain); never game rules.
 */
export class Renderer {
  private readonly ctx: Ctx;
  private clock = 0;
  private sparks: Spark[] = [];
  private shakeTime = 0;
  private shakeIntensity = 0;
  private tilt = 0;
  private flashTime = 0;
  private flashX = 0.8;
  private view: View = makeView(1, 1);
  private readonly cloudList: Cloud[] = makeClouds(14);
  private readonly drops: Drop[] = makeRain(320);
  private readonly leafList: Leaf[] = makeLeaves(28);
  private readonly ridgeNear = makeRidge(26);
  private readonly ridgeFar = makeRidge(20);

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not obtain 2D canvas context');
    this.ctx = context;
  }

  public triggerScreenShake(intensity = 1.0) {
    this.shakeTime = 0.35;
    this.shakeIntensity = intensity * 12;
  }

  public addNearMissSparks(x: number, y: number, count = 22) {
    this.burst(x, y, count, () => (Math.random() > 0.4 ? '#ffffff' : '#f2c230'), 280, 0.45);
  }

  public addCoinBurst(x: number, y: number) {
    this.burst(x, y, 16, () => '#f2c230', 200, 0.35);
  }

  /** Screen position of the kid's chest, for effects that start from the player. */
  public playerScreenPos(player: PlayerPhysicsState) {
    const v = this.view;
    const p = depth(0);
    const lw = laneW(v, p);
    return { x: xAt(v, laneU(player.currentX), p), y: yAt(v, p) - (player.yPos * HEIGHT_TO_LANE + KID_LANES_TALL * 0.6) * lw };
  }

  public render(dt: number, f: RenderFrame, settings: RenderSettings) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    if (!W || !H) return;
    this.clock += dt;
    const t = this.clock;
    const camZ = f.title ? t * TITLE_PACE : f.playerZ;
    const player = f.player;

    const camX = f.title ? 0 : -player.currentX * W * 0.05;
    const v = makeView(W, H, camX);
    this.view = v;
    const look = f.title ? TITLE_LOOK : lookAt(camZ + 40);
    const signal = f.title ? SIGNALS[0] : signalAt(camZ);
    const areaOf = (z: number): AreaId => (f.title ? 'barangay' : areaAt(z).id);

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const mag = this.shakeIntensity * settings.screenShake * Math.max(0, this.shakeTime / 0.35);
      shakeX = (Math.random() * 2 - 1) * mag;
      shakeY = (Math.random() * 2 - 1) * mag;
    }
    const targetTilt = (player.currentX - player.targetX) * 0.06 * settings.cameraTilt;
    this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 10);

    ctx.save();
    ctx.translate(shakeX, shakeY);
    if (Math.abs(this.tilt) > 0.001) {
      ctx.translate(W / 2, H * 0.6);
      ctx.rotate(this.tilt);
      ctx.translate(-W / 2, -H * 0.6);
    }
    // Overdraw the edges so shake and tilt never show the canvas behind
    ctx.fillStyle = look.ground[1];
    ctx.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);

    // Sky
    sky(ctx, v, look);
    spiral(ctx, v.W * 0.72, v.H * 0.13, v.W * 0.28, t * (0.1 + signal.wind * 0.15), look.spiralA);
    clouds(ctx, v, t, this.cloudList, look, signal.wind);
    mountains(ctx, v, this.ridgeNear, this.ridgeFar, look.mountainsA, camZ);
    haze(ctx, v, look);

    // Ground and road
    ground(ctx, v, look);
    if (look.mountainsA > 0.01) this.paddyRows(v, look.mountainsA);
    this.road(v, camZ, f.title, areaOf);

    // Everything standing on the road or beside it, far to near
    const queue: Drawable[] = [];
    const tops: PoleTop[] = [];
    this.queueScenery(queue, tops, v, camZ, t, look, signal.wind, f.title, areaOf);
    if (!f.title) this.queueEntities(queue, v, f, t, signal.wind);
    queue.sort((a, b) => b.z - a.z);
    let i = 0;
    for (; i < queue.length && queue[i].z > 0.3; i++) queue[i].draw();
    wires(ctx, tops);
    this.drawPlayer(v, player, camZ, f, areaOf(camZ));
    for (; i < queue.length; i++) queue[i].draw();

    // Weather and effects
    if (signal.wind > 0.45 || areaOf(camZ) === 'palayan') leaves(ctx, v, t, this.leafList, Math.max(signal.wind - 0.2, look.mountainsA * 0.8));
    rain(ctx, v, t, this.drops, signal.rain, signal.wind, look.night);
    if (f.bayanihan) this.bayanihanStreaks(v);
    this.updateSparks(dt);
    vignette(ctx, v, look.vignette);
    this.lightning(v, dt, signal.level);
    ctx.restore();
  }

  private burst(x: number, y: number, count: number, color: () => string, speed: number, life: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU;
      const sp = Math.random() * speed + 80;
      this.sparks.push({ x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp - 70, life: life + Math.random() * 0.2, color: color() });
    }
  }

  /** Paddy rows fanning out from the horizon on both sides of the road. */
  private paddyRows(v: View, alpha: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha * 0.55;
    for (let k = -30; k < 30; k++) {
      const x0 = v.vx + k * v.W * 0.07;
      ctx.fillStyle = k % 2 ? '#5a8c3c' : '#467330';
      ctx.beginPath();
      ctx.moveTo(v.vx, v.hy);
      ctx.lineTo(x0, v.H);
      ctx.lineTo(x0 + v.W * 0.07, v.H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** The road in 4 m bands, each painted for the area it lies in: asphalt, floodwater or dirt. */
  private road(v: View, camZ: number, title: boolean, areaOf: (z: number) => AreaId) {
    const ctx = this.ctx;
    const first = Math.floor((camZ - CAM_BACK_M) / BAND_M) * BAND_M;
    for (let z = first; z < camZ + DRAW_DISTANCE_M; z += BAND_M) {
      const z0 = Math.max(z - camZ, -CAM_BACK_M);
      const z1 = z + BAND_M - camZ;
      if (z1 <= z0) continue;
      const area = areaOf(z);
      const look: RoadLook = title ? TITLE_ROAD : ROAD_LOOK[area];
      const odd = Math.floor(z / BAND_M) % 2 !== 0;
      if (look.water) {
        quad(ctx, v, -0.6, 1.25, z0, z1, odd ? look.b : look.a);
        quad(ctx, v, -0.6, 1.25, z1 - 0.2, z1, 'rgba(210,222,200,.09)');
        // Riprap creek wall on the right bank
        quad(ctx, v, 1.25, 5, z0, z1, '#6e6c66');
        quad(ctx, v, 1.2, 1.3, z0, z1, look.edge);
        quad(ctx, v, 1.3, 5, z1 - 0.15, z1, 'rgba(0,0,0,.18)');
        for (const u of [1 / 3, 2 / 3]) quad(ctx, v, u - 0.012, u + 0.012, z0 + 0.6, Math.min(z1, z0 + 1.6), 'rgba(225,190,90,.55)'); // bamboo lane floats
        continue;
      }
      quad(ctx, v, 0, 1, z0, z1, odd ? look.b : look.a);
      quad(ctx, v, -0.035, 0, z0, z1, look.edge);
      quad(ctx, v, 1, 1.035, z0, z1, look.edge);
      if (look.line && !odd) for (const u of [1 / 3, 2 / 3]) quad(ctx, v, u - 0.007, u + 0.007, z0, z1, look.line);
      if (area === 'palayan' && !title && !odd) {
        // Paddy dikes beside the farm road
        quad(ctx, v, -8, -0.05, z0, Math.min(z1, z0 + 0.3), 'rgba(48,66,26,.6)');
        quad(ctx, v, 1.05, 9, z0, Math.min(z1, z0 + 0.3), 'rgba(48,66,26,.6)');
      }
    }
  }

  private queueScenery(
    queue: Drawable[], tops: PoleTop[], v: View, camZ: number, t: number, look: Look, wind: number, title: boolean,
    areaOf: (z: number) => AreaId
  ) {
    const ctx = this.ctx;
    const push = (zWorld: number, draw: (p: number, lw: number) => void) => {
      const zRel = zWorld - camZ;
      if (zRel < -CAM_BACK_M + 0.05 || zRel > DRAW_DISTANCE_M) return;
      const p = depth(zRel);
      queue.push({ z: zRel, draw: () => draw(p, laneW(v, p)) });
    };
    const sideX = (p: number, side: number, gap: number, w: number) =>
      side < 0 ? xAt(v, -0.14 - gap, p) - w : xAt(v, 1.14 + gap, p);
    const houseStyle = (n: number, side: number, walls: readonly string[], roofs: readonly string[], store: boolean): HouseStyle => ({
      wall: mixHex(pick(walls, hash(n, side + 11)), '#2b1d33', look.night * 0.8),
      roof: mixHex(pick(roofs, hash(n, side + 13)), '#1d1424', look.night * 0.7),
      kind: store ? 'store' : 'house',
      sign: pick(STORE_SIGNS, hash(n, side + 17)),
      window: look.night > 0.4 ? (hash(n, side + 19) < 0.7 ? '#ffc96b' : '#2a2030') : '#e9e1c8',
    });

    const firstSlot = Math.floor((camZ - SLOT_M) / SLOT_M);
    for (let n = firstSlot; n * SLOT_M < camZ + DRAW_DISTANCE_M; n++) {
      for (const side of [-1, 1]) {
        const z = n * SLOT_M + (side > 0 ? SLOT_M / 2 : 0);
        if (z < -SLOT_M) continue;
        const area = areaOf(z);
        const r = hash(n, side + 3);
        const gap = hash(n, side + 5) * 0.15;
        const wLanes = 1.7 + hash(n, side + 7) * 1.1;
        const hLanes = 1.5 + hash(n, side + 9) * 0.7;
        if (!title && z > COURSE_LENGTH_M - 50) continue; // the finish has its own set
        if (area === 'barangay' || area === 'evac') {
          if (r < (area === 'evac' ? 0.7 : 0.88)) {
            const style = houseStyle(n, side, HOUSE_WALLS, HOUSE_ROOFS, area === 'barangay' && r < 0.1);
            push(z, (p, lw) => house(ctx, sideX(p, side, gap, wLanes * lw), wLanes * lw, yAt(v, p), hLanes * lw, style));
          }
          if (wrapMod(n, 3) === 0) push(z - 0.5, () => tops.push(pole(ctx, v, z - 0.5 - camZ, side)));
          else if (side > 0 && area === 'barangay' && hash(n, 21) < 0.08) {
            push(z - 1, (p, lw) => jeepneyRear(ctx, xAt(v, 1.1, p), lw * 1.2, yAt(v, p), lw * 1.1));
          }
        } else if (area === 'estero') {
          if (side < 0 && r < 0.85) {
            const style = houseStyle(n, side, SHACK_WALLS, SHACK_ROOFS, false);
            const nipa = hash(n, 23) < 0.33;
            push(z, (p, lw) => stiltHouse(ctx, sideX(p, side, 0.3 + gap, wLanes * lw), wLanes * lw, yAt(v, p), hLanes * lw, style, nipa));
          }
        } else if (area === 'palayan') {
          if (r < 0.6) {
            const palmGap = 0.3 + hash(n, side + 25) * 1.2;
            const palmH = 2.2 + hash(n, side + 27) * 0.9;
            const seed = hash(n, side + 29) * 10;
            push(z, (p, lw) => coconut(ctx, xAt(v, side < 0 ? -0.2 - palmGap : 1.2 + palmGap, p), yAt(v, p), palmH * lw, t, wind, seed));
          }
          if (side > 0 && hash(n, 31) < 0.09) push(z + 3, (p, lw) => kubo(ctx, xAt(v, 2.6 + hash(n, 33), p), lw * 2, yAt(v, p), lw * 2.3));
          if (side < 0 && hash(n, 35) < 0.07) push(z + 2, (p, lw) => carabao(ctx, xAt(v, -1.7 - hash(n, 37), p), yAt(v, p), lw * 0.45));
          if (side > 0 && wrapMod(n, 4) === 0) push(z - 0.5, () => tops.push(pole(ctx, v, z - 0.5 - camZ, side)));
        }
      }
    }

    // Banderitas across the barangay and evacuation-center streets
    const firstFlag = Math.floor((camZ - BANDERITAS_EVERY_M) / BANDERITAS_EVERY_M);
    for (let k = firstFlag; k * BANDERITAS_EVERY_M < camZ + DRAW_DISTANCE_M; k++) {
      const z = k * BANDERITAS_EVERY_M + 50;
      const area = areaOf(z);
      if ((area !== 'barangay' && area !== 'evac') || (!title && z > COURSE_LENGTH_M - 70)) continue;
      push(z, () => banderitas(ctx, v, z - camZ, t, FIESTA, wind));
    }
    if (title) return;

    // The evacuation center: school on the horizon, then volunteers, a rescue truck and the finish arch
    if (camZ > AREAS[AREAS.length - 1].startM - 200) {
      const zRel = Math.min(COURSE_LENGTH_M + 45 - camZ, 260);
      const p = depth(zRel);
      queue.push({
        z: zRel,
        draw: () => {
          const lw = laneW(v, p);
          const cx = xAt(v, 0.5, p);
          const yb = yAt(v, p);
          school(ctx, cx, yb, lw * 9, lw * 3, t);
          flagpole(ctx, cx - lw * 5.4, yb, lw * 4.2, t);
        },
      });
    }
    push(COURSE_LENGTH_M, () => drawFinish(ctx, v, COURSE_LENGTH_M - camZ));
    push(COURSE_LENGTH_M + 12, () => banderitas(ctx, v, COURSE_LENGTH_M + 12 - camZ, t, FIESTA, wind, 2.1));
    push(COURSE_LENGTH_M - 16, (p, lw) => rescueTruck(ctx, xAt(v, 1.25, p), yAt(v, p), lw * 0.9, t));
    push(COURSE_LENGTH_M - 3, (p, lw) => {
      volunteer(ctx, xAt(v, -0.2, p), yAt(v, p), lw * 0.85, t, 0);
      volunteer(ctx, xAt(v, -0.5, p), yAt(v, p), lw * 0.8, t, 2);
      volunteer(ctx, xAt(v, 1.25, p), yAt(v, p), lw * 0.85, t, 4);
    });
  }

  private queueEntities(queue: Drawable[], v: View, f: RenderFrame, t: number, wind: number) {
    const ctx = this.ctx;
    const inRange = (zRel: number) => zRel > -CAM_BACK_M + 0.05 && zRel < DRAW_DISTANCE_M;
    for (const chunk of f.chunks) {
      for (const obs of chunk.obstacles) {
        const zRel = obs.zPos - f.playerZ;
        if (inRange(zRel)) queue.push({ z: zRel, draw: () => drawHazard(ctx, v, obs.hazardId, obs.lane, zRel, t, wind) });
      }
      for (const col of chunk.collectibles) {
        const zRel = col.zPos - f.playerZ;
        if (!col.collected && inRange(zRel)) queue.push({ z: zRel, draw: () => drawCollectible(ctx, v, col, zRel, t) });
      }
    }
    const gate = f.gate;
    if (gate && inRange(gate.z - f.playerZ)) {
      const zRel = gate.z - f.playerZ;
      queue.push({ z: zRel, draw: () => drawGate(ctx, v, zRel, gate.highlightLane, t) });
    }
    const ghost = f.ghost;
    if (ghost && ghost.z - f.playerZ > 0.5 && ghost.z - f.playerZ < 140) {
      const zRel = ghost.z - f.playerZ;
      queue.push({
        z: zRel,
        draw: () => {
          const p = depth(zRel);
          const lw = laneW(v, p);
          ctx.save();
          ctx.globalAlpha = 0.45;
          drawKid(ctx, xAt(v, laneCenterU(ghost.lane), p), yAt(v, p), (lw * KID_LANES_TALL) / KID_HEIGHT_UNITS, ghost.z * 0.75, 'run', GHOST_COLORS);
          ctx.restore();
        },
      });
    }
  }

  private drawPlayer(v: View, player: PlayerPhysicsState, camZ: number, f: RenderFrame, area: AreaId) {
    const ctx = this.ctx;
    const p = depth(0);
    const lw = laneW(v, p);
    const x = xAt(v, laneU(player.currentX), p);
    const groundY = yAt(v, p);
    const lift = player.yPos * HEIGHT_TO_LANE * lw;
    const s = (lw * KID_LANES_TALL) / KID_HEIGHT_UNITS;
    const pose: KidPose = player.isSliding ? 'slide' : player.isGrounded ? 'run' : 'jump';
    const inWater = area === 'estero' && !f.title;

    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath();
    ctx.ellipse(x, groundY, 7 * s * Math.max(0.4, 1 - lift / lw), 1.6 * s, 0, 0, TAU);
    ctx.fill();
    if (f.bayanihan) glow(ctx, x, groundY - lift - lw * 0.25, lw * 0.6, 'rgba(255,214,110,.55)');

    ctx.save();
    if (player.invincibleTimerMs > 0 && Math.floor(player.invincibleTimerMs / 100) % 2 === 0) ctx.globalAlpha = 0.35;
    drawKid(ctx, x, groundY - lift, s, camZ * 0.75, pose);
    ctx.restore();

    if (inWater && player.isGrounded) {
      // Wading: floodwater over the boots, rippling around the legs
      ctx.fillStyle = 'rgba(76,88,67,.88)';
      ctx.fillRect(x - 8 * s, groundY - 4.5 * s, 16 * s, 4.5 * s);
      ctx.strokeStyle = 'rgba(220,230,210,.45)';
      ctx.lineWidth = Math.max(1, s * 0.35);
      ctx.beginPath();
      ctx.ellipse(x, groundY - 4.5 * s, 6.5 * s + Math.sin(camZ * 0.75) * s, 1.2 * s, 0, 0, TAU);
      ctx.stroke();
    }
  }

  /** Bayanihan rush: warm streaks racing past. */
  private bayanihanStreaks(v: View) {
    const ctx = this.ctx;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const sx = Math.random() * v.W;
      const sy = Math.random() * v.H * 0.8 + v.H * 0.2;
      const len = Math.random() * 80 + 40;
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(242,194,48,.45)' : 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + len);
      ctx.stroke();
    }
  }

  private updateSparks(dt: number) {
    const ctx = this.ctx;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.min(1, s.life * 3);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.5, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Lightning from Signal No. 4 up: a bolt and a white flash every few seconds. */
  private lightning(v: View, dt: number, level: number) {
    if (level < 4) return;
    if (this.flashTime <= 0 && Math.random() < dt * (level === 5 ? 0.22 : 0.08)) {
      this.flashTime = 0.18;
      this.flashX = 0.15 + Math.random() * 0.7;
    }
    if (this.flashTime <= 0) return;
    this.flashTime -= dt;
    const ctx = this.ctx;
    if (this.flashTime > 0.08) lightningBolt(ctx, v, this.flashX, this.flashX * 7.3);
    ctx.fillStyle = `rgba(210,220,255,${Math.max(0, this.flashTime) * 1.2})`;
    ctx.fillRect(-v.W * 0.1, -v.H * 0.1, v.W * 1.2, v.H * 1.2);
  }
}

const wrapMod = (n: number, m: number) => ((n % m) + m) % m;

/** The area's look at `z`, blending into the next area's over the last LOOK_BLEND_M meters. */
function lookAt(z: number): Look {
  const area = areaAt(z);
  const next = AREAS[AREAS.indexOf(area) + 1];
  const look = AREA_LOOK[area.id];
  if (!next || z < area.endM - LOOK_BLEND_M) return look;
  return mixLook(look, AREA_LOOK[next.id], (z - (area.endM - LOOK_BLEND_M)) / LOOK_BLEND_M);
}
