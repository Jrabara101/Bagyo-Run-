import { Ctx, TAU } from '../view';

export type KidPose = 'run' | 'jump' | 'slide';

export interface KidColors {
  coat: string;
  coatShade: string;
  bag: string;
  bagShade: string;
  pants: string;
  boots: string;
  skin: string;
}

/** Yellow raincoat, red Go-Bag on the back. */
export const KID_COLORS: KidColors = {
  coat: '#f2c230', coatShade: '#d9a91f', bag: '#c8402a', bagShade: '#a83220', pants: '#2f3b63', boots: '#e8e8e8', skin: '#8d5a3b',
};

/** The ghost of the best run: the same kid, as a pale blue silhouette. */
export const GHOST_COLORS: KidColors = {
  coat: '#8fd3ff', coatShade: '#6ab8ea', bag: '#8fd3ff', bagShade: '#6ab8ea', pants: '#6ab8ea', boots: '#cfeeff', skin: '#8fd3ff',
};

/** Kid units per standing height: about 25. `s` is pixels per unit. */
export const KID_HEIGHT_UNITS = 25;

/**
 * The player, seen from behind, feet at (x, y). `phase` drives the run cycle (radians).
 * Sliding squashes the kid into a crouch with the hood down; jumping tucks the legs.
 */
export function drawKid(ctx: Ctx, x: number, y: number, s: number, phase: number, pose: KidPose, c: KidColors = KID_COLORS) {
  const swing = pose === 'run' ? Math.sin(phase) : 0;
  const bob = pose === 'run' ? Math.abs(Math.cos(phase)) * 0.9 * s : 0;
  ctx.save();
  ctx.translate(x, y - bob);
  if (pose === 'slide') ctx.scale(1.15, 0.5);

  if (pose !== 'slide') {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 2 * s, -9 * s);
      ctx.rotate(pose === 'jump' ? side * 0.5 : side * swing * 0.45);
      const legLen = pose === 'jump' ? 5.5 : 8;
      ctx.fillStyle = c.pants;
      ctx.fillRect(-1.4 * s, 0, 2.8 * s, legLen * s);
      ctx.fillStyle = c.boots;
      ctx.fillRect(-1.6 * s, (legLen - 0.8) * s, 3.2 * s, 1.8 * s);
      ctx.restore();
    }
  }
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 4.4 * s, -17.5 * s);
    ctx.rotate(pose === 'jump' ? side * 1.2 : -side * swing * 0.5 + side * 0.25);
    ctx.fillStyle = c.coatShade;
    ctx.fillRect(-1.1 * s, 0, 2.2 * s, 7 * s);
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(0, 7.4 * s, 1.1 * s, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // Raincoat
  ctx.fillStyle = c.coat;
  ctx.beginPath();
  ctx.moveTo(-5 * s, -8 * s);
  ctx.lineTo(5 * s, -8 * s);
  ctx.lineTo(3.6 * s, -19.5 * s);
  ctx.lineTo(-3.6 * s, -19.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.fillRect(-5 * s, -9.2 * s, 10 * s, 1.2 * s);
  // Go-Bag
  ctx.fillStyle = c.bag;
  ctx.fillRect(-3.4 * s, -18.6 * s, 6.8 * s, 8 * s);
  ctx.fillStyle = c.bagShade;
  ctx.fillRect(-3.4 * s, -18.6 * s, 6.8 * s, 2.6 * s);
  ctx.fillStyle = '#ececec';
  ctx.fillRect(-3.4 * s, -13.2 * s, 6.8 * s, 0.7 * s);
  // Hood
  ctx.fillStyle = c.coat;
  ctx.beginPath();
  ctx.arc(0, -21.6 * s, 3.6 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = c.coatShade;
  ctx.beginPath();
  ctx.arc(0, -21.6 * s, 3.6 * s, Math.PI * 0.15, Math.PI * 0.85);
  ctx.fill();
  ctx.restore();
}
