/**
 * Road perspective shared by every art function. Depth is meters ahead of the player (`zRel`);
 * the camera sits CAM_BACK_M behind the player. `u` runs across the road, 0 at the left edge to
 * 1 at the right, and the three lanes are its thirds. Sizes are given in lane widths at that depth.
 */
export const CAM_BACK_M = 0.6;
const DEPTH_K = 0.08;
export const DRAW_DISTANCE_M = 170;
/** Sim heights (jump arc, hazard clearances) to lane widths: the kid stands about 40 high. */
export const HEIGHT_TO_LANE = 1 / 80;
export const TAU = Math.PI * 2;
export const DISPLAY_FONT = '"Bungee", Impact, "Arial Black", sans-serif';

export interface View {
  W: number;
  H: number;
  /** Horizon line */
  hy: number;
  /** Vanishing point x */
  vx: number;
  /** Road half-width at the bottom of the screen, and at the horizon */
  bw: number;
  tw: number;
}

export function makeView(W: number, H: number, camX = 0): View {
  return { W, H, hy: H * 0.5, vx: W * 0.5 + camX, bw: W * 0.44, tw: W * 0.008 };
}

/** 1 at the camera, falling toward 0 at the horizon. */
export const depth = (zRel: number) => 1 / (1 + Math.max(0, zRel + CAM_BACK_M) * DEPTH_K);
const halfRoad = (v: View, p: number) => v.tw + (v.bw - v.tw) * p;
export const xAt = (v: View, u: number, p: number) => v.vx + (u - 0.5) * 2 * halfRoad(v, p);
export const yAt = (v: View, p: number) => v.hy + (v.H - v.hy) * p;
export const laneW = (v: View, p: number) => (halfRoad(v, p) * 2) / 3;
/** Sim lane x (-1, 0, 1, or in between while switching) to road `u`. */
export const laneU = (laneX: number) => (laneX + 1.5) / 3;
export const laneCenterU = (lane: number) => (lane + 0.5) / 3;

export type Ctx = CanvasRenderingContext2D;

/** Fills the ground-level patch between `u0..u1` across and `z0..z1` meters ahead. */
export function quad(ctx: Ctx, v: View, u0: number, u1: number, z0: number, z1: number, fill: string) {
  const p0 = depth(z0);
  const p1 = depth(z1);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(xAt(v, u0, p0), yAt(v, p0));
  ctx.lineTo(xAt(v, u1, p0), yAt(v, p0));
  ctx.lineTo(xAt(v, u1, p1), yAt(v, p1));
  ctx.lineTo(xAt(v, u0, p1), yAt(v, p1));
  ctx.closePath();
  ctx.fill();
}

export function glow(ctx: Ctx, x: number, y: number, r: number, color: string) {
  if (r <= 0) return;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export const wrap = (value: number, m: number) => ((value % m) + m) % m;

/** Stable 0..1 noise for scenery, so a spot on the course always gets the same house. */
export function hash(n: number, k = 0): number {
  let x = Math.imul((n * 7919 + k * 104729) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export const pick = <T>(list: readonly T[], r: number): T => list[Math.floor(r * list.length) % list.length];
