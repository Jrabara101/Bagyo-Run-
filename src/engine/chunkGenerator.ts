import { TrackChunk, ObstacleEntity, CollectibleEntity, LaneIndex, ObstacleType, PowerUpType } from '../types/game';
import { Mulberry32 } from './prng';

export const CHUNK_LENGTH = 120; // 120 meters per chunk
export const BIOME_TRANSITION_INTERVAL = 1000; // 1,000 meters per biome

export function getBiomeForDistance(zPos: number): 'neon_city' | 'sky_bridge' | 'magma_vault' {
  const sector = Math.floor(Math.max(0, zPos) / BIOME_TRANSITION_INTERVAL) % 3;
  if (sector === 0) return 'neon_city';
  if (sector === 1) return 'sky_bridge';
  return 'magma_vault';
}

/**
 * Deterministically generates a TrackChunk for a given chunk index and seed.
 * Both client and server share this logic to ensure 100% deterministic obstacle patterns.
 */
export function generateChunk(chunkIndex: number, seed: string): TrackChunk {
  // Safe zone for first chunk (0 - 120m) so player can get ready
  const zStart = chunkIndex * CHUNK_LENGTH;
  const biome = getBiomeForDistance(zStart);
  
  // Seed for this specific chunk is derived from the master seed and chunk index
  const chunkSeed = `${seed}_chunk_${chunkIndex}`;
  const rng = new Mulberry32(chunkSeed);

  const obstacles: ObstacleEntity[] = [];
  const collectibles: CollectibleEntity[] = [];

  if (chunkIndex === 0) {
    // Starting chunk: Only guide coins in center lane, no obstacles
    for (let i = 0; i < 6; i++) {
      collectibles.push({
        id: `c_${chunkIndex}_coin_${i}`,
        type: 'coin',
        lane: 1,
        zPos: zStart + 30 + i * 12,
        yOffset: 0,
        collected: false,
      });
    }
    return {
      id: `chunk_${chunkIndex}`,
      zStart,
      length: CHUNK_LENGTH,
      biome,
      obstacles,
      collectibles,
    };
  }

  // Difficulty scaling factor based on distance
  const difficultyLevel = Math.min(3, Math.floor(zStart / 600)); // 0, 1, 2, 3
  const obstacleDensity = 2 + Math.min(3, difficultyLevel); // 2 to 5 obstacle segments per chunk
  const segmentSpacing = CHUNK_LENGTH / (obstacleDensity + 1);

  for (let s = 1; s <= obstacleDensity; s++) {
    const segmentZ = zStart + s * segmentSpacing + rng.nextInt(-4, 4);
    const patternType = rng.nextInt(0, 4);

    if (patternType === 0) {
      // Single Lane Barrier (Low or High)
      const lane = rng.nextInt(0, 2) as LaneIndex;
      const isHigh = rng.nextBool(0.45);
      const obsType: ObstacleType = isHigh ? 'barrier_high' : 'barrier_low';
      obstacles.push({
        id: `obs_${chunkIndex}_${s}_0`,
        type: obsType,
        lane,
        zPos: segmentZ,
        height: isHigh ? 65 : 32,
        width: 1,
        cleared: false,
      });

      // Coin arc in an open lane
      const freeLane = ((lane + 1 + rng.nextInt(0, 1)) % 3) as LaneIndex;
      for (let c = 0; c < 3; c++) {
        collectibles.push({
          id: `c_${chunkIndex}_${s}_${c}`,
          type: 'coin',
          lane: freeLane,
          zPos: segmentZ - 10 + c * 8,
          yOffset: 0,
          collected: false,
        });
      }
    } else if (patternType === 1) {
      // Double Lane Pinch: Two lanes blocked, leaving one escape lane
      const openLane = rng.nextInt(0, 2) as LaneIndex;
      for (let l = 0; l <= 2; l++) {
        if (l !== openLane) {
          const isHigh = rng.nextBool(0.3);
          obstacles.push({
            id: `obs_${chunkIndex}_${s}_${l}`,
            type: isHigh ? 'barrier_high' : 'barrier_low',
            lane: l as LaneIndex,
            zPos: segmentZ,
            height: isHigh ? 65 : 32,
            width: 1,
            cleared: false,
          });
        }
      }

      // Reward coin in the open escape lane
      collectibles.push({
        id: `c_${chunkIndex}_${s}_reward`,
        type: 'coin',
        lane: openLane,
        zPos: segmentZ,
        yOffset: 0,
        collected: false,
      });
    } else if (patternType === 2) {
      // Pitfall / Chasm Void: One lane has collapsed track
      const lane = rng.nextInt(0, 2) as LaneIndex;
      obstacles.push({
        id: `obs_${chunkIndex}_${s}_pit`,
        type: 'pitfall',
        lane,
        zPos: segmentZ,
        height: 10,
        width: 1,
        cleared: false,
      });

      // Airborne coins over the pitfall to reward jumping over it
      collectibles.push({
        id: `c_${chunkIndex}_${s}_air1`,
        type: 'coin',
        lane,
        zPos: segmentZ - 4,
        yOffset: 25,
        collected: false,
      });
      collectibles.push({
        id: `c_${chunkIndex}_${s}_air2`,
        type: 'coin',
        lane,
        zPos: segmentZ + 4,
        yOffset: 25,
        collected: false,
      });
    } else if (patternType === 3 && difficultyLevel >= 1) {
      // Moving Drone / Oncoming Train on high difficulty
      const lane = rng.nextInt(0, 2) as LaneIndex;
      obstacles.push({
        id: `obs_${chunkIndex}_${s}_train`,
        type: 'moving_train',
        lane,
        zPos: segmentZ,
        height: 70,
        width: 1,
        cleared: false,
      });
    } else {
      // High hurdle requiring slide
      const lane = rng.nextInt(0, 2) as LaneIndex;
      obstacles.push({
        id: `obs_${chunkIndex}_${s}_high`,
        type: 'barrier_high',
        lane,
        zPos: segmentZ,
        height: 65,
        width: 1,
        cleared: false,
      });
    }
  }

  // Occasional Power-up drop (approx 25% chance per chunk)
  if (rng.next() < 0.28) {
    const powerUps: PowerUpType[] = ['coin_magnet', 'shield', 'overdrive_boost', 'multiplier_2x'];
    const selectedPowerUp = rng.pick(powerUps);
    const lane = rng.nextInt(0, 2) as LaneIndex;
    collectibles.push({
      id: `pw_${chunkIndex}_${selectedPowerUp}`,
      type: selectedPowerUp,
      lane,
      zPos: zStart + rng.nextInt(20, 90),
      yOffset: 12,
      collected: false,
    });
  }

  return {
    id: `chunk_${chunkIndex}`,
    zStart,
    length: CHUNK_LENGTH,
    biome,
    obstacles,
    collectibles,
  };
}
