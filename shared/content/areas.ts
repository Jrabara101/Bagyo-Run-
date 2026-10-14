import type { HazardId } from './hazards';

export type AreaId = 'barangay' | 'estero' | 'palayan' | 'evac';

/** Course length in meters. The run ends when the player reaches it. */
export const COURSE_LENGTH_M = 2500;

export interface Area {
  id: AreaId;
  name: { en: string; fil: string };
  startM: number;
  endM: number;
  /** Relative weights; only hazards listed here appear in the area. */
  hazards: Partial<Record<HazardId, number>>;
}

export const AREAS: readonly Area[] = [
  {
    id: 'barangay',
    name: { en: 'Barangay street', fil: 'Kalye ng barangay' },
    startM: 0,
    endM: 750,
    hazards: { debris_pile: 3, torn_tarp: 3, open_manhole: 2, swept_jeepney: 1 },
  },
  {
    id: 'estero',
    name: { en: 'Estero', fil: 'Estero' },
    startM: 750,
    endM: 1400,
    hazards: { floating_debris: 3, flood_hole: 3, debris_pile: 2, torn_tarp: 1 },
  },
  {
    id: 'palayan',
    name: { en: 'Rice fields', fil: 'Palayan' },
    startM: 1400,
    endM: 2200,
    hazards: { fallen_branch: 3, power_line: 2, flood_hole: 2, floating_debris: 1 },
  },
  {
    id: 'evac',
    name: { en: 'Evacuation center', fil: 'Evacuation center' },
    startM: 2200,
    endM: COURSE_LENGTH_M,
    hazards: { swept_jeepney: 3, debris_pile: 2, power_line: 2, open_manhole: 2 },
  },
];

export function areaAt(meters: number): Area {
  for (let i = AREAS.length - 1; i >= 0; i--) {
    if (meters >= AREAS[i].startM) return AREAS[i];
  }
  return AREAS[0];
}
