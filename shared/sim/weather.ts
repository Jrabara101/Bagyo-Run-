import { Mulberry32 } from './rng';
import type { AreaId, LaneIndex } from './types';
import { FINISH_CLEAR_M } from './constants';
import { gatePlan } from './quiz';
import { AREAS, COURSE_LENGTH_M, areaAt } from '../content/areas';
import { AREA_WEATHER, GUSTS_FROM_M, WindDir } from '../content/weather';

export type { WindDir };

/** The gust's warning shows this far ahead; crouching (sliding) as it hits holds the lane. */
export const GUST_WARN_M = 40;
/** No hazards this close before and after a gust, so a shove never lands on one. */
export const GUST_CLEAR_BEFORE_M = 8;
export const GUST_CLEAR_AFTER_M = 30;
/** Deep floodwater slows the run by this fraction and stops jumping. */
export const FLOOD_SLOW = 0.3;
/** How fast (per second, 0..1) the drag of the water builds up and wears off. */
export const FLOOD_DRAG_RATE = 4;
const PLACE_STEP_M = 5;
/** Supplies along the high ground, one every this many meters. */
const HIGH_GROUND_SUPPLY_M = 12;

export interface Gust {
  z: number;
  dir: WindDir;
}

export interface FloodZone {
  startZ: number;
  endZ: number;
  /** The high-ground lane; the other two are deep water. */
  safeLane: LaneIndex;
}

export interface WeatherPlan {
  /** The wind's direction in each area; its gusts blow the same way. */
  windDir: Record<AreaId, WindDir>;
  gusts: Gust[];
  floods: FloodZone[];
}

type Span = [number, number];
const overlaps = (a: Span, spans: Span[]) => spans.some((b) => a[0] < b[1] && b[0] < a[1]);

/**
 * Where the wind gusts and floods are for this seed. Gusts keep apart from each other and floods
 * from each other, but a gust can blow across a flood (and shove a runner off the high ground). A
 * gust never blows
 * while a quiz question is up (it would shove the player off their answer); a flood may be under
 * a question but stops short of the gate itself.
 */
export function weatherPlan(seed: string): WeatherPlan {
  const rng = new Mulberry32(`${seed}_weather`);
  const gates = gatePlan(seed);
  const gateLines: Span[] = gates.map((g) => [g.z - 25, g.z + 35]);
  const gustSpans: Span[] = [];
  const floodSpans: Span[] = [];
  const questions: Span[] = gates.map((g) => [g.showZ - 20, g.z + 40]);
  const lastM = COURSE_LENGTH_M - FINISH_CLEAR_M - 20;
  const windDir = {} as Record<AreaId, WindDir>;
  const gusts: Gust[] = [];
  const floods: FloodZone[] = [];

  for (const area of AREAS) {
    const dir: WindDir = rng.next() < 0.5 ? -1 : 1;
    windDir[area.id] = dir;
    const weather = AREA_WEATHER[area.id];
    const from = area.startM + 20;
    const to = Math.min(area.endM - 20, lastM);

    // Each gust and flood goes at a seeded pick among the spots where it fits
    const place = (lo: number, hi: number, span: (z: number) => Span, avoid: Span[][], into: Span[]): number | null => {
      const spots: number[] = [];
      for (let z = lo; z <= hi; z += PLACE_STEP_M) if (!avoid.some((spans) => overlaps(span(z), spans))) spots.push(z);
      if (spots.length === 0) return null;
      const z = rng.pick(spots);
      into.push(span(z));
      return z;
    };
    for (let k = 0; k < weather.gusts; k++) {
      const z = place(Math.max(from, GUSTS_FROM_M), to, (g) => [g - GUST_WARN_M - 5, g + GUST_CLEAR_AFTER_M + 5], [gateLines, questions, gustSpans], gustSpans);
      if (z !== null) gusts.push({ z, dir });
    }
    for (const length of weather.floods) {
      const startZ = place(from, to - length, (s) => [s - 20, s + length + 20], [gateLines, floodSpans], floodSpans);
      if (startZ !== null) floods.push({ startZ, endZ: startZ + length, safeLane: rng.nextInt(0, 2) as LaneIndex });
    }
  }
  gusts.sort((a, b) => a.z - b.z);
  floods.sort((a, b) => a.startZ - b.startZ);
  return { windDir, gusts, floods };
}

export function floodAt(plan: WeatherPlan, z: number): FloodZone | null {
  return plan.floods.find((f) => z >= f.startZ && z < f.endZ) ?? null;
}

export function windDirAt(plan: WeatherPlan, z: number): WindDir {
  return plan.windDir[areaAt(z).id];
}

/** True if a hazard here would land on a gust's shove or on the high ground of a flood. */
export function inWeatherClearZone(z: number, lane: LaneIndex, plan: WeatherPlan): boolean {
  if (plan.gusts.some((g) => z >= g.z - GUST_CLEAR_BEFORE_M && z <= g.z + GUST_CLEAR_AFTER_M)) return true;
  const flood = floodAt(plan, z);
  return flood !== null && flood.safeLane === lane;
}

/** Supply spots along the high ground of each flood, as [z, lane]. */
export function highGroundSupplies(plan: WeatherPlan): [number, LaneIndex][] {
  const spots: [number, LaneIndex][] = [];
  for (const f of plan.floods) {
    for (let z = f.startZ + 6; z < f.endZ - 4; z += HIGH_GROUND_SUPPLY_M) spots.push([z, f.safeLane]);
  }
  return spots;
}
