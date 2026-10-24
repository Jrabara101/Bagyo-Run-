import type { AreaId } from './areas';
import type { SignalLevel } from './signals';

/** Which way the wind blows across the road: -1 toward the left lanes, 1 toward the right. */
export type WindDir = -1 | 1;

/** PAGASA Tropical Cyclone Wind Signal wind ranges, shown on the HUD's wind gauge. */
export const SIGNAL_WIND_KMH: Record<SignalLevel, string> = {
  1: '39–61',
  2: '62–88',
  3: '89–117',
  4: '118–184',
  5: '185+',
};

/**
 * The storm's other dangers, per area: wind gusts that shove the runner a lane downwind unless
 * they crouch, and flooded stretches where two lanes are deep water and one is high ground.
 * Lightning strikes are a hazard (`lightning_strike` in hazards.ts), weighted per area in areas.ts.
 */
export interface AreaWeather {
  /** Gusts placed where they fit (clear of quiz questions and floods); a tight area may get fewer. */
  gusts: number;
  /** Length in meters of each flooded stretch. One that cannot fit between the gates is left out. */
  floods: readonly number[];
}

export const AREA_WEATHER: Record<AreaId, AreaWeather> = {
  barangay: { gusts: 2, floods: [] },
  estero: { gusts: 2, floods: [100, 80] },
  palayan: { gusts: 3, floods: [100] },
  evac: { gusts: 0, floods: [50] },
};

/** Gusts start with Signal No. 2. */
export const GUSTS_FROM_M = 400;
