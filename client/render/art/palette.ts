import type { AreaId } from '../../../shared/content/areas';

/** Jeepney sign-paint colors used across the art. */
export const JEEP = { yellow: '#f2c230', red: '#d6402b', blue: '#2b5fb8', green: '#3d8b4f', cream: '#f1ebdd', ink: '#15141f' };
export const FIESTA = [JEEP.red, JEEP.yellow, JEEP.blue, JEEP.green, JEEP.cream];

/** Sky, ground and air of an area. Blended near area boundaries, so every field must mix. */
export interface Look {
  sky: [string, string, string];
  glow: string;
  glowA: number;
  cloud: string;
  cloudA: number;
  /** The typhoon's eye turning in the sky */
  spiralA: number;
  haze: string;
  hazeA: number;
  ground: [string, string];
  mountainsA: number;
  vignette: number;
  /** 0 = day; 1 = night with lit windows */
  night: number;
}

export interface RoadLook {
  a: string;
  b: string;
  line: string | null;
  edge: string;
  water: boolean;
}

export const AREA_LOOK: Record<AreaId, Look> = {
  barangay: {
    sky: ['#55626f', '#8f9aa3', '#b4bcc0'], glow: '#ffffff', glowA: 0, cloud: '#46505c', cloudA: 0.55, spiralA: 0.06,
    haze: '#c8cdd2', hazeA: 0.35, ground: ['#77797a', '#4b4d4c'], mountainsA: 0, vignette: 0.35, night: 0,
  },
  estero: {
    sky: ['#2f3943', '#5e6c72', '#7b8a8f'], glow: '#ffffff', glowA: 0, cloud: '#283038', cloudA: 0.6, spiralA: 0.05,
    haze: '#a0aaaa', hazeA: 0.35, ground: ['#4b5641', '#2e3529'], mountainsA: 0, vignette: 0.4, night: 0.15,
  },
  palayan: {
    sky: ['#26302f', '#56665a', '#8e9a83'], glow: '#ffffff', glowA: 0, cloud: '#232c2a', cloudA: 0.6, spiralA: 0.04,
    haze: '#96a596', hazeA: 0.45, ground: ['#4e7a36', '#3d6a2a'], mountainsA: 1, vignette: 0.45, night: 0.3,
  },
  evac: {
    sky: ['#0b0e1c', '#1d2238', '#3a3550'], glow: '#ffcd78', glowA: 0.22, cloud: '#141828', cloudA: 0.7, spiralA: 0.07,
    haze: '#3a3550', hazeA: 0.25, ground: ['#1c1f2a', '#0f1118'], mountainsA: 0, vignette: 0.5, night: 1,
  },
};

/** Dusk over the barangay, behind the title screen. */
export const TITLE_LOOK: Look = {
  sky: ['#1f1838', '#6b2f57', '#f39a4a'], glow: '#ffaa5a', glowA: 0.45, cloud: '#3c1e46', cloudA: 0.45, spiralA: 0.09,
  haze: '#f39a4a', hazeA: 0.12, ground: ['#2a1a2c', '#140d18'], mountainsA: 0, vignette: 0.55, night: 0.8,
};

export const ROAD_LOOK: Record<AreaId, RoadLook> = {
  barangay: { a: '#55585c', b: '#5c5f63', line: 'rgba(240,240,230,.8)', edge: '#8c8c86', water: false },
  estero: { a: '#4c5843', b: '#53604a', line: null, edge: '#8b887f', water: true },
  palayan: { a: '#7a6247', b: '#806850', line: 'rgba(60,45,30,.45)', edge: '#5e4a33', water: false },
  evac: { a: '#262a36', b: '#2b2f3c', line: 'rgba(255,214,120,.6)', edge: '#3a3f50', water: false },
};
export const TITLE_ROAD: RoadLook = { a: '#2c2230', b: '#33283a', line: 'rgba(242,194,48,.75)', edge: '#4a3a52', water: false };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function mixHex(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, t));
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function mixLook(a: Look, b: Look, t: number): Look {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    sky: [mixHex(a.sky[0], b.sky[0], t), mixHex(a.sky[1], b.sky[1], t), mixHex(a.sky[2], b.sky[2], t)],
    glow: mixHex(a.glow, b.glow, t),
    glowA: lerp(a.glowA, b.glowA, t),
    cloud: mixHex(a.cloud, b.cloud, t),
    cloudA: lerp(a.cloudA, b.cloudA, t),
    spiralA: lerp(a.spiralA, b.spiralA, t),
    haze: mixHex(a.haze, b.haze, t),
    hazeA: lerp(a.hazeA, b.hazeA, t),
    ground: [mixHex(a.ground[0], b.ground[0], t), mixHex(a.ground[1], b.ground[1], t)],
    mountainsA: lerp(a.mountainsA, b.mountainsA, t),
    vignette: lerp(a.vignette, b.vignette, t),
    night: lerp(a.night, b.night, t),
  };
}
