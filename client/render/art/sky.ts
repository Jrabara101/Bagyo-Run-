import { Ctx, TAU, View, glow, wrap } from '../view';
import { Look, rgba } from './palette';

export interface Cloud { x: number; y: number; r: number; s: number }
export interface Drop { x: number; y: number; l: number; s: number }
export interface Leaf { x: number; y: number; s: number; c: string }

export const makeClouds = (n: number): Cloud[] =>
  Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 0.9, s: 0.5 + Math.random() }));
export const makeRain = (n: number): Drop[] =>
  Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), l: 0.5 + Math.random(), s: 0.7 + Math.random() * 0.6 }));
export const makeLeaves = (n: number): Leaf[] =>
  Array.from({ length: n }, () => ({
    x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8,
    c: ['#3e7a33', '#6e9e43', '#8a6a3a'][Math.floor(Math.random() * 3)],
  }));
/** A smoothed random ridge line, 0..1 per point. */
export function makeRidge(n: number): number[] {
  const raw = Array.from({ length: n }, () => Math.random());
  return raw.map((value, i) => (raw[Math.max(0, i - 1)] + value * 2 + raw[Math.min(n - 1, i + 1)]) / 4);
}

export function sky(ctx: Ctx, v: View, look: Look) {
  const gr = ctx.createLinearGradient(0, 0, 0, v.hy);
  gr.addColorStop(0, look.sky[0]);
  gr.addColorStop(0.65, look.sky[1]);
  gr.addColorStop(1, look.sky[2]);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, v.W, v.hy + 1);
  if (look.glowA > 0.01) glow(ctx, v.vx, v.hy, v.W * 0.42, rgba(look.glow, look.glowA));
}

/** The typhoon's eye: three spiral arms, flattened as if seen low over the horizon. */
export function spiral(ctx: Ctx, cx: number, cy: number, R: number, rot: number, alpha: number) {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.5);
  ctx.rotate(rot);
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(255,240,225,${alpha})`;
  ctx.lineWidth = R * 0.1;
  for (let arm = 0; arm < 3; arm++) {
    ctx.rotate(TAU / 3);
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const f = i / 40;
      const a = f * 4.4;
      const r = R * (0.1 + f * 0.9);
      if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(20,14,30,${Math.min(0.6, alpha * 3)})`;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.07, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function clouds(ctx: Ctx, v: View, t: number, list: Cloud[], look: Look, wind: number) {
  ctx.fillStyle = rgba(look.cloud, look.cloudA);
  const speed = 1 + wind * 4;
  const yMax = v.hy * 0.7;
  ctx.beginPath();
  for (const c of list) {
    const x = wrap(c.x * v.W * 1.4 + t * speed * c.s * v.W * 0.02, v.W * 1.4) - v.W * 0.2;
    const y = c.y * yMax;
    const r = c.r * v.W * 0.07;
    for (let k = 0; k < 4; k++) {
      const cx = x + k * r * 0.75;
      const cy = y + Math.sin(k * 1.7) * r * 0.2;
      const rr = r * (0.8 + 0.25 * Math.sin(k * 2.3));
      ctx.moveTo(cx + rr, cy);
      ctx.arc(cx, cy, rr, 0, TAU);
    }
  }
  ctx.fill();
}

export function mountains(ctx: Ctx, v: View, near: number[], far: number[], alpha: number, scroll: number) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const ridge = (pts: number[], color: string, amp: number, shift: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, v.hy + 1);
    const step = (v.W * 1.3) / (pts.length - 1);
    for (let i = 0; i < pts.length; i++) ctx.lineTo(i * step - v.W * 0.15 - shift, v.hy - pts[i] * amp);
    ctx.lineTo(v.W, v.hy + 1);
    ctx.closePath();
    ctx.fill();
  };
  ridge(far, '#4f5d55', v.H * 0.14, (scroll * 0.02) % (v.W * 0.1));
  ridge(near, '#3d4a48', v.H * 0.08, (scroll * 0.05) % (v.W * 0.1));
  ctx.restore();
}

export function ground(ctx: Ctx, v: View, look: Look) {
  const gr = ctx.createLinearGradient(0, v.hy, 0, v.H);
  gr.addColorStop(0, look.ground[0]);
  gr.addColorStop(1, look.ground[1]);
  ctx.fillStyle = gr;
  ctx.fillRect(0, v.hy, v.W, v.H - v.hy);
}

/** Mist band along the horizon. */
export function haze(ctx: Ctx, v: View, look: Look) {
  if (look.hazeA <= 0.01) return;
  const top = v.hy - v.H * 0.09;
  const gr = ctx.createLinearGradient(0, top, 0, v.hy + v.H * 0.1);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(0.5, rgba(look.haze, look.hazeA));
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, top, v.W, v.H * 0.19);
}

/** Rain streaks; `amount` and `wind` are 0..1 from the current signal. */
export function rain(ctx: Ctx, v: View, t: number, drops: Drop[], amount: number, wind: number, night: number) {
  const n = Math.floor(drops.length * (0.25 + amount * 0.75));
  const speed = 0.9 + amount;
  const slant = 0.15 + wind * 0.6;
  const len = (14 + amount * 12) * (v.W / 900);
  const color = night > 0.5 ? '190,200,230' : '200,215,235';
  ctx.strokeStyle = `rgba(${color},${0.2 + amount * 0.2})`;
  ctx.lineWidth = Math.max(1, v.W / 900);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const d = drops[i];
    const y = wrap(d.y + t * speed * d.s, 1) * v.H * 1.1 - v.H * 0.05;
    const x = wrap(d.x + t * speed * d.s * slant * 0.6, 1) * v.W;
    const L = len * d.l;
    ctx.moveTo(x, y);
    ctx.lineTo(x - slant * L * 1.4, y + L);
  }
  ctx.stroke();
}

/** Leaves torn off by the wind, crossing the screen. */
export function leaves(ctx: Ctx, v: View, t: number, list: Leaf[], amount: number) {
  const n = Math.floor(list.length * amount);
  for (let i = 0; i < n; i++) {
    const l = list[i];
    const x = wrap(l.x * v.W * 1.2 + t * v.W * 0.5 * l.s, v.W * 1.2) - v.W * 0.1;
    const y = l.y * v.H * 0.85 + Math.sin(t * 3 + l.x * 10) * v.H * 0.03;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 6 * l.s + l.x * 9);
    ctx.fillStyle = l.c;
    ctx.beginPath();
    ctx.ellipse(0, 0, v.W * 0.008, v.W * 0.003, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

export function lightningBolt(ctx: Ctx, v: View, xFrac: number, seed: number) {
  ctx.strokeStyle = 'rgba(235,240,255,.9)';
  ctx.lineWidth = Math.max(1, v.W / 500);
  ctx.beginPath();
  let x = v.W * xFrac;
  let y = 0;
  ctx.moveTo(x, y);
  for (let i = 0; i < 7; i++) {
    x += (i % 2 ? -1 : 1) * v.W * (0.01 + ((seed * (i + 3)) % 1) * 0.015);
    y += v.hy / 8;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function vignette(ctx: Ctx, v: View, alpha: number) {
  const gr = ctx.createRadialGradient(v.W / 2, v.H * 0.55, v.H * 0.3, v.W / 2, v.H * 0.55, v.W * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, v.W, v.H);
}
