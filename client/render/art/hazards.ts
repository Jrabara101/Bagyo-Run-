import type { HazardId } from '../../../shared/content/hazards';
import type { LaneIndex } from '../../../shared/sim/types';
import { Ctx, DISPLAY_FONT, TAU, View, depth, glow, laneCenterU, laneW, quad, xAt, yAt } from '../view';
import { JEEP } from './palette';
import { bolt, contactShadow } from './weather';

/** A lightning strike hits the road when the player is this many meters away; before, it warns. */
export const STRIKE_AT_M = 26;

/**
 * Every hazard is sized in lane widths so it matches the sim's clearances (HEIGHT_TO_LANE): jump
 * hazards stay below ~0.35 lanes high, and slide hazards leave ~0.35 lanes free underneath.
 */
const SLIDE_GAP = 0.36;

export function drawHazard(ctx: Ctx, v: View, id: HazardId, lane: LaneIndex, zRel: number, t: number, wind: number) {
  const p = depth(zRel);
  const lw = laneW(v, p);
  const x = xAt(v, laneCenterU(lane), p);
  const y = yAt(v, p);
  if (id !== 'open_manhole' && id !== 'flood_hole' && id !== 'lightning_strike' && id !== 'power_line' && id !== 'torn_tarp') {
    contactShadow(ctx, x, y, lw * 0.6, 0.45);
  }
  switch (id) {
    case 'lightning_strike':
      return lightningStrike(ctx, v, x, y, lw, zRel, t);
    case 'debris_pile':
      return debrisPile(ctx, x, y, lw * 0.8);
    case 'fallen_branch':
      return fallenBranch(ctx, x, y, lw * 0.9, t, wind);
    case 'power_line':
      return powerLine(ctx, v, lane, p, t);
    case 'torn_tarp':
      return tornTarp(ctx, v, lane, p, t, wind);
    case 'open_manhole':
      return manhole(ctx, x, y, lw);
    case 'flood_hole':
      return floodHole(ctx, x, y, lw, t);
    case 'swept_jeepney':
      return sweptJeepney(ctx, x, y, lw, t);
    case 'floating_debris':
      return floatingDebris(ctx, x, y, lw, t);
  }
}

/**
 * Thunderstorm: before the strike the lane crackles, a glowing ring marking where it will hit;
 * then the bolt comes down and leaves the road scorched and sparking. Leave the lane.
 */
function lightningStrike(ctx: Ctx, v: View, x: number, y: number, lw: number, zRel: number, t: number) {
  const rx = lw * 0.42;
  const ry = rx * 0.26;
  if (zRel > STRIKE_AT_M) {
    const pulse = 0.5 + Math.sin(t * 14) * 0.3;
    glow(ctx, x, y - ry, lw * 0.7, `rgba(120,160,255,${0.35 * pulse})`);
    ctx.strokeStyle = `rgba(170,200,255,${0.6 + pulse * 0.4})`;
    ctx.lineWidth = Math.max(1, lw * 0.025);
    ctx.beginPath();
    ctx.ellipse(x, y - ry * 0.3, rx * (0.8 + pulse * 0.2), ry * (0.8 + pulse * 0.2), 0, 0, TAU);
    ctx.stroke();
    // Crackle: little arcs jumping over the ring
    ctx.strokeStyle = 'rgba(225,235,255,.85)';
    ctx.lineWidth = Math.max(1, lw * 0.012);
    for (let i = 0; i < 4; i++) {
      const a = Math.floor(t * 18 + i * 7) * 1.7;
      const px = x + Math.cos(a) * rx * 0.8;
      const py = y - ry * 0.3 + Math.sin(a) * ry * 0.8;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a + 1) * lw * 0.05, py - lw * 0.08);
      ctx.lineTo(px + Math.cos(a + 2) * lw * 0.03, py - lw * 0.15);
      ctx.stroke();
    }
    // A faint leader reaching down from the clouds
    const gr = ctx.createLinearGradient(0, 0, 0, y);
    gr.addColorStop(0, `rgba(150,180,255,${0.12 * pulse})`);
    gr.addColorStop(1, 'rgba(150,180,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x - lw * 0.08, 0, lw * 0.16, y);
    return;
  }
  // Struck: the bolt for a moment, then the scorch mark and sparks
  const since = (STRIKE_AT_M - zRel) / 20; // ~seconds since the strike at run pace
  ctx.fillStyle = 'rgba(15,12,10,.75)';
  ctx.beginPath();
  ctx.ellipse(x, y - ry * 0.3, rx, ry, 0, 0, TAU);
  ctx.fill();
  glow(ctx, x, y - ry * 0.3, rx * 1.1, `rgba(255,150,60,${Math.max(0.15, 0.7 - since)})`);
  if (since < 0.45) {
    bolt(ctx, v, x + Math.sin(x) * v.W * 0.1, x, y - ry * 0.3, Math.floor(t * 24) / 24 + x, 1.6);
    glow(ctx, x, y - lw * 0.2, lw * 1.6, `rgba(220,230,255,${0.8 * (1 - since / 0.45)})`);
  }
  ctx.fillStyle = '#ffcf6b';
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + t * 3;
    const f = (t * 1.5 + i * 0.37) % 1;
    ctx.fillRect(x + Math.cos(a) * rx * f, y - ry - Math.sin(f * Math.PI) * lw * 0.25, Math.max(1, lw * 0.015), Math.max(1, lw * 0.015));
  }
}

function debrisPile(ctx: Ctx, x: number, y: number, w: number) {
  ctx.fillStyle = '#4b3621';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.6, y);
  ctx.lineTo(x - w * 0.3, y - w * 0.35);
  ctx.lineTo(x + w * 0.1, y - w * 0.25);
  ctx.lineTo(x + w * 0.55, y - w * 0.42);
  ctx.lineTo(x + w * 0.6, y);
  ctx.closePath();
  ctx.fill();
  // Galvanized sheet and a plank sticking out of the pile
  ctx.fillStyle = '#8d969b';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.45, y - w * 0.18);
  ctx.lineTo(x - w * 0.05, y - w * 0.36);
  ctx.lineTo(x + w * 0.05, y - w * 0.28);
  ctx.lineTo(x - w * 0.38, y - w * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6b4f2d';
  ctx.lineWidth = Math.max(1, w * 0.06);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.7, y - w * 0.12);
  ctx.lineTo(x + w * 0.65, y - w * 0.3);
  ctx.stroke();
  ctx.strokeStyle = '#2f6b2f';
  ctx.lineWidth = Math.max(1, w * 0.05);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * 0.15 - i * 0.45;
    ctx.moveTo(x + w * 0.4, y - w * 0.3);
    ctx.lineTo(x + w * 0.4 + Math.cos(a) * w * 0.4, y - w * 0.3 + Math.sin(a) * w * 0.35);
  }
  ctx.stroke();
}

function fallenBranch(ctx: Ctx, x: number, y: number, w: number, t: number, wind: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.07);
  ctx.strokeStyle = '#4a3420';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, w * 0.06);
  ctx.beginPath();
  ctx.moveTo(-w * 0.2, -w * 0.12);
  ctx.lineTo(-w * 0.32, -w * 0.3);
  ctx.moveTo(w * 0.15, -w * 0.12);
  ctx.lineTo(w * 0.3, -w * 0.28);
  ctx.stroke();
  ctx.fillStyle = '#5a3f24';
  ctx.fillRect(-w * 0.58, -w * 0.15, w * 1.16, w * 0.15);
  ctx.fillStyle = '#7a5a36';
  ctx.fillRect(-w * 0.58, -w * 0.15, w * 1.16, w * 0.04);
  ctx.fillStyle = '#c9a777';
  ctx.beginPath();
  ctx.ellipse(-w * 0.58, -w * 0.075, w * 0.03, w * 0.075, 0, 0, TAU);
  ctx.fill();
  const flutter = Math.sin(t * 8) * w * 0.012 * wind;
  for (const [lx, ly, r, c] of [
    [-0.32, -0.32, 0.12, '#2f5d2a'],
    [0.3, -0.3, 0.13, '#3e7a33'],
    [0.42, -0.2, 0.1, '#2f5d2a'],
    [-0.42, -0.2, 0.09, '#3e7a33'],
  ] as const) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(w * lx + flutter, w * ly, w * r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** A downed power line sagging across one lane, still sparking. Slide under it. */
function powerLine(ctx: Ctx, v: View, lane: LaneIndex, p: number, t: number) {
  const lw = laneW(v, p);
  const yb = yAt(v, p);
  const xa = xAt(v, lane / 3 + 0.02, p);
  const xb = xAt(v, (lane + 1) / 3 - 0.02, p);
  const top = yb - lw * 0.95;
  const low = yb - lw * (SLIDE_GAP + 0.04);
  // Leaning broken pole stubs
  ctx.fillStyle = '#35302b';
  ctx.fillRect(xa - lw * 0.035, top, lw * 0.07, yb - top);
  ctx.save();
  ctx.translate(xb, yb);
  ctx.rotate(0.18);
  ctx.fillRect(-lw * 0.035, -(yb - top), lw * 0.07, yb - top);
  ctx.restore();
  ctx.strokeStyle = '#141418';
  ctx.lineWidth = Math.max(1, lw * 0.025);
  ctx.beginPath();
  ctx.moveTo(xa, top + lw * 0.05);
  ctx.quadraticCurveTo((xa + xb) / 2, low + lw * 0.05, xb + lw * 0.12, top + lw * 0.1);
  ctx.moveTo(xa, top + lw * 0.15);
  ctx.quadraticCurveTo((xa + xb) / 2, low + lw * 0.1, xb + lw * 0.1, top + lw * 0.22);
  ctx.stroke();
  // Hanging danger sign
  const sx = (xa + xb) / 2;
  const sy = low + lw * 0.02;
  ctx.fillStyle = JEEP.yellow;
  ctx.beginPath();
  ctx.moveTo(sx, sy - lw * 0.08);
  ctx.lineTo(sx + lw * 0.08, sy);
  ctx.lineTo(sx, sy + lw * 0.08);
  ctx.lineTo(sx - lw * 0.08, sy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = JEEP.ink;
  ctx.lineWidth = Math.max(1, lw * 0.012);
  ctx.beginPath();
  ctx.moveTo(sx + lw * 0.015, sy - lw * 0.05);
  ctx.lineTo(sx - lw * 0.02, sy + lw * 0.005);
  ctx.lineTo(sx + lw * 0.02, sy - lw * 0.005);
  ctx.lineTo(sx - lw * 0.015, sy + lw * 0.05);
  ctx.stroke();
  // Sparks at the snapped end
  if (Math.sin(t * 23) > 0.2) {
    const ex = xb + lw * 0.12;
    const ey = top + lw * 0.1;
    glow(ctx, ex, ey, lw * 0.18, 'rgba(160,210,255,.7)');
    ctx.strokeStyle = '#e8f4ff';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = t * 40 + i * 1.3;
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(a) * lw * 0.1, ey + Math.sin(a) * lw * 0.1);
    }
    ctx.stroke();
  }
}

/** A torn fiesta tarpaulin flapping from two posts. Slide under it. */
function tornTarp(ctx: Ctx, v: View, lane: LaneIndex, p: number, t: number, wind: number) {
  const lw = laneW(v, p);
  const yb = yAt(v, p);
  const xa = xAt(v, lane / 3 + 0.01, p);
  const xb = xAt(v, (lane + 1) / 3 - 0.01, p);
  const top = yb - lw * 0.95;
  const bottom = yb - lw * SLIDE_GAP;
  ctx.strokeStyle = '#333';
  ctx.lineWidth = Math.max(1, lw * 0.035);
  ctx.beginPath();
  ctx.moveTo(xa, yb);
  ctx.lineTo(xa, top);
  ctx.moveTo(xb, yb);
  ctx.lineTo(xb, top);
  ctx.stroke();
  ctx.fillStyle = '#f4f0e6';
  ctx.beginPath();
  ctx.moveTo(xa, top);
  ctx.lineTo(xb, top);
  const flap = lw * 0.05 * (0.6 + wind);
  for (let i = 6; i >= 0; i--) {
    const jag = (i % 2 ? 1 : -1) * Math.sin(t * 10 + i * 1.3) * flap;
    ctx.lineTo(xa + (xb - xa) * (i / 6), bottom - (i % 3 === 1 ? lw * 0.08 : 0) + jag);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = JEEP.red;
  ctx.fillRect(xa, top + lw * 0.05, xb - xa, lw * 0.1);
  ctx.fillStyle = JEEP.blue;
  ctx.fillRect(xa, top + lw * 0.32, xb - xa, lw * 0.06);
  if (lw > 50) {
    ctx.fillStyle = JEEP.ink;
    ctx.font = `${lw * 0.09}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MALIGAYANG PIYESTA', (xa + xb) / 2, top + lw * 0.23, (xb - xa) * 0.9);
  }
}

function manhole(ctx: Ctx, x: number, y: number, lw: number) {
  const rx = lw * 0.3;
  const ry = rx * 0.3;
  ctx.fillStyle = '#6d6d70';
  ctx.beginPath();
  ctx.ellipse(x, y - ry, rx * 1.12, ry * 1.15, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0b0b0e';
  ctx.beginPath();
  ctx.ellipse(x, y - ry, rx, ry, 0, 0, TAU);
  ctx.fill();
  // The lifted cover, leaning at the rim
  ctx.fillStyle = '#4d4d52';
  ctx.beginPath();
  ctx.ellipse(x + rx * 1.2, y - ry * 2.2, rx * 0.3, ry * 2.6, 0.25, 0, TAU);
  ctx.fill();
  // Water swirling down
  ctx.strokeStyle = 'rgba(180,200,210,.35)';
  ctx.lineWidth = Math.max(1, lw * 0.01);
  ctx.beginPath();
  ctx.ellipse(x, y - ry, rx * 0.6, ry * 0.5, 0, 0, Math.PI);
  ctx.stroke();
}

/** A hole hidden under the floodwater: only a dark swirl gives it away. */
function floodHole(ctx: Ctx, x: number, y: number, lw: number, t: number) {
  const rx = lw * 0.32;
  const ry = rx * 0.3;
  ctx.fillStyle = 'rgba(18,26,20,.85)';
  ctx.beginPath();
  ctx.ellipse(x, y - ry, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,230,210,.4)';
  ctx.lineWidth = Math.max(1, lw * 0.012);
  for (let i = 0; i < 3; i++) {
    const a = t * 3 + i * 2.1;
    ctx.beginPath();
    ctx.ellipse(x, y - ry, rx * (0.4 + i * 0.25), ry * (0.4 + i * 0.25), 0, a, a + 2);
    ctx.stroke();
  }
}

/** A jeepney swept down the street by the flood, nose first, tilted. Change lanes. */
function sweptJeepney(ctx: Ctx, x: number, y: number, lw: number, t: number) {
  const w = lw * 0.92;
  const h = lw * 0.88;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.06 + Math.sin(t * 1.7) * 0.02);
  const x0 = -w / 2;
  const top = -h;
  ctx.fillStyle = JEEP.blue;
  ctx.fillRect(x0 - w * 0.03, top, w * 1.06, h * 0.12);
  ctx.fillStyle = JEEP.yellow;
  ctx.fillRect(x0, top + h * 0.12, w, h * 0.1);
  if (h > 20) {
    ctx.fillStyle = JEEP.red;
    ctx.font = `${h * 0.075}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BAYANIHAN', 0, top + h * 0.17, w * 0.9);
  }
  ctx.fillStyle = '#d9dde2';
  ctx.fillRect(x0, top + h * 0.22, w, h * 0.66);
  ctx.fillStyle = '#26303a';
  ctx.fillRect(x0 + w * 0.08, top + h * 0.26, w * 0.84, h * 0.24); // windshield
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x0 + w * 0.12, top + h * 0.28, w * 0.2, h * 0.05);
  ctx.fillStyle = '#aeb4bb';
  ctx.fillRect(x0 + w * 0.3, top + h * 0.55, w * 0.4, h * 0.22); // grille
  ctx.strokeStyle = '#7d848c';
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.beginPath();
  for (let i = 1; i < 6; i++) {
    const gx = x0 + w * (0.3 + (0.4 * i) / 6);
    ctx.moveTo(gx, top + h * 0.55);
    ctx.lineTo(gx, top + h * 0.77);
  }
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(side * w * 0.32, top + h * 0.64, w * 0.07, 0, TAU);
    ctx.fill();
    ctx.fillStyle = JEEP.red;
    ctx.fillRect(side * w * 0.32 - w * 0.06, top + h * 0.53, w * 0.12, h * 0.03);
  }
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(x0 - w * 0.04, top + h * 0.84, w * 1.08, h * 0.08); // bumper
  ctx.fillStyle = JEEP.ink;
  ctx.fillRect(x0 + w * 0.04, top + h * 0.9, w * 0.16, h * 0.1);
  ctx.fillRect(x0 + w * 0.8, top + h * 0.9, w * 0.16, h * 0.1);
  ctx.restore();
  // Floodwater piling up against it
  ctx.fillStyle = 'rgba(120,135,110,.75)';
  ctx.beginPath();
  ctx.ellipse(x, y - lw * 0.03, w * 0.62, lw * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,236,225,.55)';
  ctx.lineWidth = Math.max(1, lw * 0.012);
  ctx.beginPath();
  ctx.ellipse(x, y - lw * 0.05, w * (0.55 + Math.sin(t * 6) * 0.03), lw * 0.05, 0, Math.PI, TAU);
  ctx.stroke();
}

function drum(ctx: Ctx, x: number, y: number, w: number, t: number, color: string) {
  const h = w * 1.1;
  const bob = Math.sin(t * 3 + x * 0.01) * w * 0.06;
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y - h + bob, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x - w / 2, y - h * 0.7 + bob, w, h * 0.07);
  ctx.fillRect(x - w / 2, y - h * 0.35 + bob, w, h * 0.07);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y - h + bob, w / 2, w * 0.14, 0, 0, TAU);
  ctx.fill();
}

/** Oil drums and a plank riding the current. Change lanes. */
function floatingDebris(ctx: Ctx, x: number, y: number, lw: number, t: number) {
  ctx.save();
  ctx.translate(0, Math.sin(t * 2.4 + x) * lw * 0.01);
  ctx.strokeStyle = '#7a5a36';
  ctx.lineWidth = Math.max(1, lw * 0.07);
  ctx.beginPath();
  ctx.moveTo(x - lw * 0.45, y - lw * 0.42);
  ctx.lineTo(x + lw * 0.42, y - lw * 0.62);
  ctx.stroke();
  drum(ctx, x - lw * 0.2, y, lw * 0.36, t, JEEP.blue);
  drum(ctx, x + lw * 0.22, y + lw * 0.02, lw * 0.34, t + 1, '#9b4a2a');
  ctx.restore();
  ctx.fillStyle = 'rgba(76,88,67,.9)';
  ctx.fillRect(x - lw * 0.48, y - lw * 0.1, lw * 0.96, lw * 0.12);
  ctx.strokeStyle = 'rgba(220,230,210,.45)';
  ctx.lineWidth = Math.max(1, lw * 0.01);
  ctx.beginPath();
  ctx.ellipse(x, y - lw * 0.1, lw * (0.48 + Math.sin(t * 5) * 0.02), lw * 0.04, 0, 0, TAU);
  ctx.stroke();
}

const GATE_BOARDS = [JEEP.blue, JEEP.green, JEEP.red];

/**
 * Quiz gate: a bamboo arch over the whole road with an A / B / C board hanging over each lane.
 * While the question is up, the board over the player's lane is outlined in yellow.
 */
export function drawGate(ctx: Ctx, v: View, zRel: number, highlightLane: LaneIndex | null, t: number) {
  const p = depth(zRel);
  if (p < 0.04) return;
  const lw = laneW(v, p);
  const yb = yAt(v, p);
  const xa = xAt(v, -0.06, p);
  const xb = xAt(v, 1.06, p);
  const top = yb - lw * 2.4;
  ctx.strokeStyle = '#b89a55';
  ctx.lineWidth = Math.max(1.5, lw * 0.08);
  ctx.beginPath();
  ctx.moveTo(xa, yb);
  ctx.lineTo(xa, top);
  ctx.moveTo(xb, yb);
  ctx.lineTo(xb, top);
  ctx.moveTo(xa - lw * 0.12, top);
  ctx.lineTo(xb + lw * 0.12, top);
  ctx.stroke();
  // Bamboo nodes
  ctx.strokeStyle = '#8a7238';
  ctx.lineWidth = Math.max(1, lw * 0.02);
  ctx.beginPath();
  for (let k = 1; k < 6; k++) {
    const ny = yb - (yb - top) * (k / 6);
    for (const px of [xa, xb]) {
      ctx.moveTo(px - lw * 0.045, ny);
      ctx.lineTo(px + lw * 0.045, ny);
    }
  }
  ctx.stroke();
  // Sign on the beam
  const signW = Math.min(xb - xa, lw * 2.2);
  const cx = (xa + xb) / 2;
  ctx.fillStyle = JEEP.red;
  ctx.fillRect(cx - signW / 2, top - lw * 0.3, signW, lw * 0.3);
  ctx.fillStyle = JEEP.yellow;
  ctx.fillRect(cx - signW / 2, top - lw * 0.04, signW, lw * 0.04);
  if (lw > 18) {
    ctx.fillStyle = JEEP.yellow;
    ctx.font = `${lw * 0.15}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QUIZ GATE · TANONG', cx, top - lw * 0.16, signW * 0.92);
  }
  for (let i = 0; i < 3; i++) {
    const bx = xAt(v, laneCenterU(i), p);
    const swing = Math.sin(t * 3 + i) * lw * 0.03;
    ctx.strokeStyle = 'rgba(30,20,10,.7)';
    ctx.lineWidth = Math.max(0.5, lw * 0.015);
    ctx.beginPath();
    ctx.moveTo(bx - lw * 0.2, top);
    ctx.lineTo(bx - lw * 0.2 + swing, top + lw * 0.3);
    ctx.moveTo(bx + lw * 0.2, top);
    ctx.lineTo(bx + lw * 0.2 + swing, top + lw * 0.3);
    ctx.stroke();
    const bw = lw * 0.62;
    const bh = lw * 0.48;
    const bxl = bx - bw / 2 + swing;
    const byt = top + lw * 0.3;
    if (highlightLane === i) {
      glow(ctx, bx + swing, byt + bh / 2, lw * 0.7, 'rgba(242,194,48,.45)');
      ctx.fillStyle = JEEP.yellow;
      ctx.fillRect(bxl - lw * 0.05, byt - lw * 0.05, bw + lw * 0.1, bh + lw * 0.1);
    }
    ctx.fillStyle = GATE_BOARDS[i];
    ctx.fillRect(bxl, byt, bw, bh);
    if (lw > 10) {
      ctx.fillStyle = '#fff';
      ctx.font = `${lw * 0.36}px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ABC'[i], bx + swing, byt + bh * 0.55);
    }
  }
}

/** Finish line at the evacuation center: a checkered strip and the SAFE ZONE arch. */
export function drawFinish(ctx: Ctx, v: View, zRel: number) {
  const p = depth(zRel);
  if (p < 0.03) return;
  const lw = laneW(v, p);
  const yb = yAt(v, p);
  const xa = xAt(v, -0.08, p);
  const xb = xAt(v, 1.08, p);
  const top = yb - lw * 2.2;
  for (let i = 0; i < 12; i++) quad(ctx, v, i / 12, (i + 1) / 12, zRel - 0.4, zRel + 0.6, i % 2 ? JEEP.cream : '#1b1b22');
  ctx.fillStyle = JEEP.blue;
  ctx.fillRect(xa - lw * 0.08, top, lw * 0.16, yb - top);
  ctx.fillRect(xb - lw * 0.08, top, lw * 0.16, yb - top);
  ctx.fillStyle = JEEP.yellow;
  ctx.fillRect(xa - lw * 0.15, top - lw * 0.1, xb - xa + lw * 0.3, lw * 0.42);
  ctx.fillStyle = JEEP.red;
  ctx.fillRect(xa - lw * 0.15, top + lw * 0.28, xb - xa + lw * 0.3, lw * 0.06);
  if (lw > 8) {
    ctx.fillStyle = JEEP.ink;
    ctx.font = `${lw * 0.2}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LIGTAS NA! · SAFE ZONE', (xa + xb) / 2, top + lw * 0.1, xb - xa);
  }
}
