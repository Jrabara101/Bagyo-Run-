import { Mulberry32 } from './rng';
import { CollectibleEntity, LaneIndex, ObstacleEntity, ObstacleType } from './types';
import { HAZARDS, HazardId } from '../content/hazards';
import type { Area } from '../content/areas';
import type { Signal } from '../content/signals';

/** One hazard group to place at `z`, using the area's hazard weights and the signal's rules. */
export interface PatternSlot {
  rng: Mulberry32;
  idPrefix: string;
  z: number;
  area: Area;
  signal: Signal;
  obstacles: ObstacleEntity[];
  collectibles: CollectibleEntity[];
}

const JUMP_OR_SLIDE: ObstacleType[] = ['barrier_low', 'barrier_high'];

/** Weighted pick among the area's hazards whose collision class is in `classes`. */
function pickHazard(slot: PatternSlot, classes: ObstacleType[]): HazardId | null {
  const options = (Object.entries(slot.area.hazards) as [HazardId, number][]).filter(
    ([id, weight]) => weight > 0 && classes.includes(HAZARDS[id].collision)
  );
  if (options.length === 0) return null;
  const total = options.reduce((sum, [, w]) => sum + w, 0);
  let roll = slot.rng.next() * total;
  for (const [id, weight] of options) {
    roll -= weight;
    if (roll < 0) return id;
  }
  return options[options.length - 1][0];
}

function addHazard(slot: PatternSlot, hazardId: HazardId, lane: LaneIndex, suffix: string) {
  const hazard = HAZARDS[hazardId];
  slot.obstacles.push({
    id: `${slot.idPrefix}_${suffix}`,
    hazardId,
    type: hazard.collision,
    lane,
    zPos: slot.z,
    height: hazard.height,
    width: 1,
    cleared: false,
  });
}

function addSupply(slot: PatternSlot, lane: LaneIndex, z: number, yOffset: number, suffix: string) {
  slot.collectibles.push({ id: `${slot.idPrefix}_${suffix}`, type: 'supply', lane, zPos: z, yOffset, collected: false });
}

const randomLane = (rng: Mulberry32) => rng.nextInt(0, 2) as LaneIndex;

/** A jump-or-slide hazard in one lane, with supplies in a free lane. */
function single(slot: PatternSlot): boolean {
  const hazard = pickHazard(slot, JUMP_OR_SLIDE);
  if (!hazard) return false;
  const lane = randomLane(slot.rng);
  addHazard(slot, hazard, lane, '0');
  const freeLane = ((lane + 1 + slot.rng.nextInt(0, 1)) % 3) as LaneIndex;
  for (let c = 0; c < 3; c++) addSupply(slot, freeLane, slot.z - 10 + c * 8, 0, `s${c}`);
  return true;
}

/** Two lanes blocked by jump-or-slide hazards; one open lane with a reward. */
function pinch(slot: PatternSlot): boolean {
  const openLane = randomLane(slot.rng);
  for (let l = 0; l <= 2; l++) {
    if (l === openLane) continue;
    const hazard = pickHazard(slot, JUMP_OR_SLIDE);
    if (!hazard) return false;
    addHazard(slot, hazard, l as LaneIndex, String(l));
  }
  addSupply(slot, openLane, slot.z, 0, 'reward');
  return true;
}

/** A hole to jump, with supplies in the air above it. */
function hole(slot: PatternSlot): boolean {
  const hazard = pickHazard(slot, ['pitfall']);
  if (!hazard) return false;
  const lane = randomLane(slot.rng);
  addHazard(slot, hazard, lane, 'hole');
  addSupply(slot, lane, slot.z - 4, 25, 'air1');
  addSupply(slot, lane, slot.z + 4, 25, 'air2');
  return true;
}

/** Something big coming down a lane: the only way past is another lane. */
function oncoming(slot: PatternSlot): boolean {
  if (!slot.signal.laneHazards) return false;
  const hazard = pickHazard(slot, ['moving_train']);
  if (!hazard) return false;
  addHazard(slot, hazard, randomLane(slot.rng), 'lane');
  return true;
}

/** An overhead hazard to slide under. */
function overhead(slot: PatternSlot): boolean {
  const hazard = pickHazard(slot, ['barrier_high']);
  if (!hazard) return false;
  addHazard(slot, hazard, randomLane(slot.rng), 'high');
  return true;
}

const PATTERNS = [single, pinch, hole, oncoming, overhead];

/** Places one pattern, falling back to `single` when the chosen one does not fit the area or signal. */
export function placePattern(slot: PatternSlot) {
  const pattern = PATTERNS[slot.rng.nextInt(0, PATTERNS.length - 1)];
  if (!pattern(slot)) single(slot);
}
