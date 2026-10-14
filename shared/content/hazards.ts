import type { ObstacleType } from '../sim/types';

export type HazardId =
  | 'debris_pile'
  | 'fallen_branch'
  | 'power_line'
  | 'torn_tarp'
  | 'open_manhole'
  | 'flood_hole'
  | 'swept_jeepney'
  | 'floating_debris';

/** How the player gets past it. `lane` means the only way is to change lanes. */
export type AvoidBy = 'jump' | 'slide' | 'lane';

export interface Hazard {
  id: HazardId;
  avoid: AvoidBy;
  /** Collision class used by shared/sim/collision.ts (and, until Phase 4, by the renderer). */
  collision: ObstacleType;
  height: number;
  name: { en: string; fil: string };
}

export const HAZARDS: Record<HazardId, Hazard> = {
  debris_pile: { id: 'debris_pile', avoid: 'jump', collision: 'barrier_low', height: 32, name: { en: 'Debris pile', fil: 'Tambak ng kalat' } },
  fallen_branch: { id: 'fallen_branch', avoid: 'jump', collision: 'barrier_low', height: 32, name: { en: 'Fallen branch', fil: 'Nabuwal na sanga' } },
  power_line: { id: 'power_line', avoid: 'slide', collision: 'barrier_high', height: 65, name: { en: 'Sagging power line', fil: 'Nakalaylay na kable ng kuryente' } },
  torn_tarp: { id: 'torn_tarp', avoid: 'slide', collision: 'barrier_high', height: 65, name: { en: 'Torn tarpaulin', fil: 'Punit na tarpaulin' } },
  open_manhole: { id: 'open_manhole', avoid: 'jump', collision: 'pitfall', height: 10, name: { en: 'Open manhole', fil: 'Bukas na manhole' } },
  flood_hole: { id: 'flood_hole', avoid: 'jump', collision: 'pitfall', height: 10, name: { en: 'Hidden hole under floodwater', fil: 'Butas na natatakpan ng baha' } },
  swept_jeepney: { id: 'swept_jeepney', avoid: 'lane', collision: 'moving_train', height: 70, name: { en: 'Swept-away jeepney', fil: 'Jeep na tinangay ng baha' } },
  floating_debris: { id: 'floating_debris', avoid: 'lane', collision: 'moving_train', height: 70, name: { en: 'Floating debris', fil: 'Lumulutang na kalat' } },
};
