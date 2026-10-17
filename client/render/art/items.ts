import type { CollectibleEntity, GoBagItemId, PowerUpType } from '../../../shared/sim/types';
import { Ctx, HEIGHT_TO_LANE, TAU, View, depth, glow, laneCenterU, laneW, xAt, yAt } from '../view';
import { JEEP } from './palette';

export function drawCollectible(ctx: Ctx, v: View, col: CollectibleEntity, zRel: number, t: number) {
  const p = depth(zRel);
  const lw = laneW(v, p);
  const x = xAt(v, laneCenterU(col.lane), p);
  const ground = yAt(v, p);
  const lift = col.yOffset * HEIGHT_TO_LANE * lw;
  if (col.type === 'supply') {
    cannedGoods(ctx, x, ground - lift, lw * 0.2, t);
    return;
  }
  const r = lw * 0.2;
  const cy = ground - lift - lw * 0.32 + Math.sin(t * 4 + col.zPos) * lw * 0.03;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x, ground - lw * 0.01, r * 0.8, r * 0.22, 0, 0, TAU);
  ctx.fill();
  const goBag = col.type === 'gobag';
  glow(ctx, x, cy, r * 2.2, goBag ? 'rgba(255,214,110,.5)' : 'rgba(120,190,255,.45)');
  ctx.fillStyle = JEEP.cream;
  ctx.beginPath();
  ctx.arc(x, cy, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = goBag ? JEEP.red : JEEP.blue;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, cy);
  if (goBag && col.itemId) goBagIcon(ctx, col.itemId, r * 0.62);
  else if (!goBag) powerUpIcon(ctx, col.type as PowerUpType, r * 0.62, t);
  ctx.restore();
}

/** Canned goods: the supplies the player picks up for points. */
function cannedGoods(ctx: Ctx, x: number, y: number, w: number, t: number) {
  const bob = Math.sin(t * 4 + x * 0.05) * w * 0.12;
  const h = w * 0.9;
  glow(ctx, x, y - h * 1.15 + bob, w * 1.1, 'rgba(255,214,110,.35)');
  ctx.fillStyle = '#c9ccd2';
  ctx.fillRect(x - w / 2, y - h * 1.6 + bob, w, h);
  ctx.fillStyle = JEEP.red;
  ctx.fillRect(x - w / 2, y - h * 1.45 + bob, w, h * 0.5);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - w * 0.3, y - h * 1.3 + bob, w * 0.6, h * 0.12);
}

/** Small icons for the 8 Go-Bag items, drawn around (0,0) within radius `s`. */
function goBagIcon(ctx: Ctx, id: GoBagItemId, s: number) {
  switch (id) {
    case 'drinking_water':
      ctx.fillStyle = '#5aa9e6';
      ctx.fillRect(-s * 0.32, -s * 0.5, s * 0.64, s * 1.3);
      ctx.fillStyle = '#2b5fb8';
      ctx.fillRect(-s * 0.16, -s * 0.85, s * 0.32, s * 0.36);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillRect(-s * 0.32, -s * 0.1, s * 0.64, s * 0.22);
      break;
    case 'canned_food':
      ctx.fillStyle = '#b8bcc4';
      ctx.fillRect(-s * 0.45, -s * 0.6, s * 0.9, s * 1.2);
      ctx.fillStyle = JEEP.red;
      ctx.fillRect(-s * 0.45, -s * 0.3, s * 0.9, s * 0.6);
      break;
    case 'flashlight':
      ctx.fillStyle = 'rgba(255,240,170,.8)';
      ctx.beginPath();
      ctx.moveTo(s * 0.3, -s * 0.25);
      ctx.lineTo(s * 0.95, -s * 0.6);
      ctx.lineTo(s * 0.95, s * 0.6);
      ctx.lineTo(s * 0.3, s * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a3f4a';
      ctx.fillRect(-s * 0.85, -s * 0.18, s * 0.9, s * 0.36);
      ctx.fillRect(0, -s * 0.3, s * 0.32, s * 0.6);
      break;
    case 'battery_radio':
      ctx.strokeStyle = '#3a3f4a';
      ctx.lineWidth = Math.max(1, s * 0.1);
      ctx.beginPath();
      ctx.moveTo(s * 0.4, -s * 0.35);
      ctx.lineTo(s * 0.75, -s * 0.95);
      ctx.stroke();
      ctx.fillStyle = '#8a5a3b';
      ctx.fillRect(-s * 0.8, -s * 0.35, s * 1.6, s * 0.95);
      ctx.fillStyle = '#2a2a30';
      ctx.beginPath();
      ctx.arc(-s * 0.32, s * 0.12, s * 0.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = JEEP.yellow;
      ctx.fillRect(s * 0.15, -s * 0.15, s * 0.5, s * 0.18);
      break;
    case 'first_aid_kit':
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-s * 0.75, -s * 0.55, s * 1.5, s * 1.1);
      ctx.strokeStyle = '#9aa0a8';
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.strokeRect(-s * 0.75, -s * 0.55, s * 1.5, s * 1.1);
      ctx.fillStyle = JEEP.red;
      ctx.fillRect(-s * 0.13, -s * 0.4, s * 0.26, s * 0.8);
      ctx.fillRect(-s * 0.4, -s * 0.13, s * 0.8, s * 0.26);
      break;
    case 'emergency_whistle':
      ctx.fillStyle = '#f0862a';
      ctx.beginPath();
      ctx.arc(-s * 0.2, s * 0.1, s * 0.45, 0, TAU);
      ctx.fill();
      ctx.fillRect(-s * 0.2, -s * 0.35, s * 1.0, s * 0.4);
      ctx.fillStyle = '#7a3a10';
      ctx.fillRect(s * 0.25, -s * 0.35, s * 0.2, s * 0.12);
      break;
    case 'documents':
      ctx.fillStyle = 'rgba(200,225,240,.7)';
      ctx.fillRect(-s * 0.7, -s * 0.8, s * 1.4, s * 1.6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-s * 0.5, -s * 0.6, s * 1.0, s * 1.2);
      ctx.fillStyle = '#9aa0a8';
      for (let i = 0; i < 4; i++) ctx.fillRect(-s * 0.35, -s * 0.4 + i * s * 0.25, s * 0.7, s * 0.08);
      break;
    case 'extra_clothes':
      ctx.fillStyle = '#3d8b4f';
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.7);
      ctx.lineTo(-s * 0.9, -s * 0.35);
      ctx.lineTo(-s * 0.65, 0);
      ctx.lineTo(-s * 0.45, -s * 0.12);
      ctx.lineTo(-s * 0.45, s * 0.7);
      ctx.lineTo(s * 0.45, s * 0.7);
      ctx.lineTo(s * 0.45, -s * 0.12);
      ctx.lineTo(s * 0.65, 0);
      ctx.lineTo(s * 0.9, -s * 0.35);
      ctx.lineTo(s * 0.3, -s * 0.7);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

function powerUpIcon(ctx: Ctx, type: PowerUpType, s: number, t: number) {
  if (type === 'life_vest') {
    ctx.fillStyle = '#f0862a';
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, -s * 0.85);
    ctx.lineTo(-s * 0.8, -s * 0.5);
    ctx.lineTo(-s * 0.75, s * 0.8);
    ctx.lineTo(s * 0.75, s * 0.8);
    ctx.lineTo(s * 0.8, -s * 0.5);
    ctx.lineTo(s * 0.35, -s * 0.85);
    ctx.lineTo(0, -s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-s * 0.75, s * 0.15, s * 1.5, s * 0.14);
    ctx.fillRect(-s * 0.75, s * 0.45, s * 1.5, s * 0.14);
  } else if (type === 'tanod_whistle') {
    ctx.strokeStyle = JEEP.blue;
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.2, s * 0.6, Math.PI * 0.9, Math.PI * 2.1);
    ctx.stroke();
    ctx.fillStyle = '#c9ccd2';
    ctx.beginPath();
    ctx.arc(-s * 0.2, s * 0.25, s * 0.38, 0, TAU);
    ctx.fill();
    ctx.fillRect(-s * 0.2, -s * 0.13, s * 0.85, s * 0.34);
  } else {
    // Bayanihan: the eight-rayed sun of the flag
    ctx.save();
    ctx.rotate(t * 0.8);
    ctx.fillStyle = JEEP.yellow;
    for (let i = 0; i < 8; i++) {
      ctx.rotate(TAU / 8);
      ctx.beginPath();
      ctx.moveTo(-s * 0.14, 0);
      ctx.lineTo(0, -s * 0.95);
      ctx.lineTo(s * 0.14, 0);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.42, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
