import { CollectibleEntity, GoBagItemId, LaneIndex, PowerUpType, TrackChunk } from './types';
import { Mulberry32 } from './rng';
import { CHUNK_LENGTH, FINISH_CLEAR_M } from './constants';
import { placePattern } from './patterns';
import { gatePlan, inGateClearZone } from './quiz';
import { areaAt, COURSE_LENGTH_M } from '../content/areas';
import { signalAt } from '../content/signals';
import { GO_BAG_ITEMS } from '../content/items';

export { CHUNK_LENGTH, COURSE_LENGTH_M };

const POWER_UP_CHANCE = 0.28;
const POWER_UPS: PowerUpType[] = ['life_vest', 'tanod_whistle', 'bayanihan'];

const GO_BAG_START_M = 150;
const GO_BAG_END_M = COURSE_LENGTH_M - FINISH_CLEAR_M - 20;
/** A Go-Bag item moves to another lane if a hazard in its lane is closer than this. */
const GO_BAG_HAZARD_GAP_M = 8;

export interface GoBagPlacement {
  itemId: GoBagItemId;
  z: number;
  lane: LaneIndex;
}

/**
 * Where each of the 8 Go-Bag items sits for this seed: one per equal slice of the course,
 * in a seeded order, lane and position.
 */
export function goBagPlan(seed: string): GoBagPlacement[] {
  const rng = new Mulberry32(`${seed}_gobag`);
  const order = rng.shuffle(GO_BAG_ITEMS.map((item) => item.id));
  const slice = (GO_BAG_END_M - GO_BAG_START_M) / order.length;
  return order.map((itemId, i) => ({
    itemId,
    z: GO_BAG_START_M + i * slice + slice * (0.15 + rng.next() * 0.7),
    lane: rng.nextInt(0, 2) as LaneIndex,
  }));
}

/**
 * Deterministically generates the chunk at `chunkIndex` for `seed`. Client and server share it,
 * so the course is identical everywhere. Chunks past the finish line are empty, and quiz gate
 * zones hold no hazards.
 */
export function generateChunk(chunkIndex: number, seed: string): TrackChunk {
  const zStart = chunkIndex * CHUNK_LENGTH;
  const chunk: TrackChunk = {
    id: `chunk_${chunkIndex}`,
    zStart,
    length: CHUNK_LENGTH,
    areaId: areaAt(zStart).id,
    obstacles: [],
    collectibles: [],
  };
  if (zStart >= COURSE_LENGTH_M) return chunk;

  const rng = new Mulberry32(`${seed}_chunk_${chunkIndex}`);

  if (chunkIndex === 0) {
    // Start: a line of supplies down the middle lane and no hazards
    for (let i = 0; i < 6; i++) {
      chunk.collectibles.push({ id: `c0_supply_${i}`, type: 'supply', lane: 1, zPos: 30 + i * 12, yOffset: 0, collected: false });
    }
  } else {
    const segments = signalAt(zStart).hazardSegments;
    const spacing = CHUNK_LENGTH / (segments + 1);
    for (let s = 1; s <= segments; s++) {
      const z = zStart + s * spacing + rng.nextInt(-4, 4);
      if (z > COURSE_LENGTH_M - FINISH_CLEAR_M) break;
      placePattern({
        rng,
        idPrefix: `c${chunkIndex}_${s}`,
        z,
        area: areaAt(z),
        signal: signalAt(z),
        obstacles: chunk.obstacles,
        collectibles: chunk.collectibles,
      });
    }

    if (rng.next() < POWER_UP_CHANCE) {
      const type = rng.pick(POWER_UPS);
      const z = zStart + rng.nextInt(20, 90);
      if (z < COURSE_LENGTH_M - FINISH_CLEAR_M) {
        chunk.collectibles.push({ id: `c${chunkIndex}_pw_${type}`, type, lane: rng.nextInt(0, 2) as LaneIndex, zPos: z, yOffset: 12, collected: false });
      }
    }
  }

  // Quiz gates need a clear run-up so the player can read and pick a lane
  const gates = gatePlan(seed);
  chunk.obstacles = chunk.obstacles.filter((o) => !inGateClearZone(o.zPos, gates));

  for (const item of goBagPlan(seed)) {
    if (Math.floor(item.z / CHUNK_LENGTH) !== chunkIndex) continue;
    chunk.collectibles.push(goBagCollectible(item, chunk));
  }

  return chunk;
}

function goBagCollectible(item: GoBagPlacement, chunk: TrackChunk): CollectibleEntity {
  const blocked = (lane: number) =>
    chunk.obstacles.some((o) => o.lane === lane && Math.abs(o.zPos - item.z) < GO_BAG_HAZARD_GAP_M);
  let lane = item.lane;
  for (let k = 0; k < 3 && blocked(lane); k++) lane = ((lane + 1) % 3) as LaneIndex;
  return { id: `gobag_${item.itemId}`, type: 'gobag', itemId: item.itemId, lane, zPos: item.z, yOffset: 12, collected: false };
}
