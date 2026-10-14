import { CollectibleEntity, ObstacleEntity, PlayerPhysicsState } from './types';
import {
  LANE_X_POSITIONS,
  HITBOX_WIDTH,
  HITBOX_Z_DEPTH,
  NEAR_MISS_X_BUFFER,
  NEAR_MISS_Z_BUFFER,
  CLEAR_LOW_BARRIER,
  CLEAR_PITFALL,
  CLEAR_LANE_BLOCKER,
  PICKUP_REACH_X,
  PICKUP_REACH_Z,
  MAGNET_REACH_X,
  MAGNET_REACH_Z,
} from './constants';

export type ObstacleResult = 'impact' | 'near_miss' | 'none';

/** Whether the player's current pose gets past this obstacle while overlapping it. */
function avoids(player: PlayerPhysicsState, obstacle: ObstacleEntity): boolean {
  switch (obstacle.type) {
    case 'barrier_low':
      return player.yPos > CLEAR_LOW_BARRIER;
    case 'barrier_high':
      return player.isSliding;
    case 'pitfall':
      return player.yPos > CLEAR_PITFALL;
    case 'moving_train':
      return player.yPos > CLEAR_LANE_BLOCKER;
  }
}

/**
 * Two-zone check: a lethal box, and an outer near-miss box that rewards close dodges.
 * Marks the obstacle `cleared` once passed (or smashed while invincible) so it is checked once.
 */
export function checkObstacle(
  player: PlayerPhysicsState,
  obstacle: ObstacleEntity,
  playerZ: number,
  invincible: boolean
): ObstacleResult {
  if (obstacle.cleared) return 'none';

  if (playerZ > obstacle.zPos + 4.0) {
    obstacle.cleared = true;
    return 'none';
  }

  const zDiff = Math.abs(obstacle.zPos - playerZ);
  const xDiff = Math.abs(player.currentX - LANE_X_POSITIONS[obstacle.lane]);

  if (zDiff <= HITBOX_Z_DEPTH && xDiff <= HITBOX_WIDTH) {
    if (invincible) {
      obstacle.cleared = true;
      return 'none';
    }
    return avoids(player, obstacle) ? 'none' : 'impact';
  }

  if (
    !obstacle.nearMissAwarded &&
    zDiff <= HITBOX_Z_DEPTH + NEAR_MISS_Z_BUFFER &&
    xDiff <= HITBOX_WIDTH + NEAR_MISS_X_BUFFER
  ) {
    obstacle.nearMissAwarded = true;
    return 'near_miss';
  }

  return 'none';
}

export function checkCollectible(
  player: PlayerPhysicsState,
  collectible: CollectibleEntity,
  playerZ: number,
  hasMagnet: boolean
): boolean {
  if (collectible.collected) return false;

  const zDiff = Math.abs(collectible.zPos - playerZ);
  const xDiff = Math.abs(player.currentX - LANE_X_POSITIONS[collectible.lane]);
  // The magnet never pulls Go-Bag items: they are placed to be reached on purpose
  const magnet = hasMagnet && collectible.type !== 'gobag';

  if (zDiff <= (magnet ? MAGNET_REACH_Z : PICKUP_REACH_Z) && xDiff <= (magnet ? MAGNET_REACH_X : PICKUP_REACH_X)) {
    collectible.collected = true;
    return true;
  }
  return false;
}
