import { LaneIndex, PlayerPhysicsState, ObstacleEntity, CollectibleEntity, EndlessRunnerGameState, TelemetryPoint } from '../types/game';

export const FIXED_TIMESTEP_SEC = 1 / 60; // 60Hz physics (16.667ms)
export const LANE_X_POSITIONS: Record<LaneIndex, number> = {
  0: -1.0, // Left
  1: 0.0,  // Center
  2: 1.0,  // Right
};

// Physics constants
export const BASE_SPEED = 24.0; // meters per second initial speed
export const MAX_SPEED = 58.0;  // maximum speed reached in later biomes
export const SPEED_ACCELERATION = 0.45; // m/s^2 acceleration
export const OVERDRIVE_SPEED_BOOST = 22.0; // extra speed in overdrive
export const LERP_LANE_SPEED = 18.0; // lateral easing responsiveness

export const STANDARD_GRAVITY = 65.0; // m/s^2 gravity
export const SKYBRIDGE_GRAVITY = 45.0; // orbital low-gravity
export const JUMP_VELOCITY = 16.5; // initial upward impulse
export const MAX_JUMP_HEIGHT = 45; // peak y height
export const SLIDE_DURATION_MS = 650; // duration of a slide duck
export const JUMP_BUFFER_MS = 100; // 100ms jump buffer
export const COYOTE_TIME_MS = 80;  // 80ms coyote grace period

export const HITBOX_NORMAL_HEIGHT = 50;
export const HITBOX_SLIDE_HEIGHT = 20; // 60% reduction in height during slide
export const HITBOX_WIDTH = 0.55; // lane width fraction (0.55)
export const HITBOX_Z_DEPTH = 3.2; // depth along track
export const NEAR_MISS_Z_BUFFER = 4.8; // outer concentric near-miss zone
export const NEAR_MISS_X_BUFFER = 0.35; // outer lateral buffer

export interface KinematicInputState {
  jumpRequested: boolean;
  slideRequested: boolean;
  targetLane: LaneIndex;
  overdriveRequested: boolean;
}

export class KinematicController {
  public player: PlayerPhysicsState;
  public jumpBufferTimerMs = 0;
  public coyoteTimerMs = 0;
  public currentGravity = STANDARD_GRAVITY;

  constructor() {
    this.player = {
      lane: 1,
      targetX: LANE_X_POSITIONS[1],
      currentX: LANE_X_POSITIONS[1],
      yPos: 0,
      yVelocity: 0,
      isGrounded: true,
      isJumping: false,
      isSliding: false,
      slideTimerMs: 0,
      invincibleTimerMs: 0,
    };
  }

  public reset() {
    this.player = {
      lane: 1,
      targetX: LANE_X_POSITIONS[1],
      currentX: LANE_X_POSITIONS[1],
      yPos: 0,
      yVelocity: 0,
      isGrounded: true,
      isJumping: false,
      isSliding: false,
      slideTimerMs: 0,
      invincibleTimerMs: 0,
    };
    this.jumpBufferTimerMs = 0;
    this.coyoteTimerMs = 0;
  }

  public shiftLane(direction: -1 | 1): boolean {
    const nextLane = Math.max(0, Math.min(2, this.player.lane + direction)) as LaneIndex;
    if (nextLane !== this.player.lane) {
      this.player.lane = nextLane;
      this.player.targetX = LANE_X_POSITIONS[nextLane];
      return true;
    }
    return false;
  }

  public setLane(lane: LaneIndex) {
    this.player.lane = lane;
    this.player.targetX = LANE_X_POSITIONS[lane];
  }

  public requestJump() {
    this.jumpBufferTimerMs = JUMP_BUFFER_MS;
  }

  public requestSlide() {
    this.player.isSliding = true;
    this.player.slideTimerMs = SLIDE_DURATION_MS;
    // Fast fall if sliding mid-air
    if (!this.player.isGrounded) {
      this.player.yVelocity = -25;
    }
  }

  /**
   * Fixed 60Hz physics tick update
   */
  public update(dt: number, biome: 'neon_city' | 'sky_bridge' | 'magma_vault') {
    const dtMs = dt * 1000;

    // Adjust gravity parameters per biome
    this.currentGravity = biome === 'sky_bridge' ? SKYBRIDGE_GRAVITY : STANDARD_GRAVITY;

    // Smooth lateral easing with lerp
    const lerpFactor = Math.min(1.0, dt * LERP_LANE_SPEED);
    this.player.currentX += (this.player.targetX - this.player.currentX) * lerpFactor;

    // Slide state management
    if (this.player.isSliding) {
      this.player.slideTimerMs -= dtMs;
      if (this.player.slideTimerMs <= 0) {
        this.player.isSliding = false;
        this.player.slideTimerMs = 0;
      }
    }

    // Invincibility management
    if (this.player.invincibleTimerMs > 0) {
      this.player.invincibleTimerMs -= dtMs;
    }

    // Grounded & Coyote time checks
    if (this.player.isGrounded) {
      this.coyoteTimerMs = COYOTE_TIME_MS;
    } else {
      this.coyoteTimerMs = Math.max(0, this.coyoteTimerMs - dtMs);
    }

    // Process jump buffering
    if (this.jumpBufferTimerMs > 0) {
      this.jumpBufferTimerMs -= dtMs;
      if (this.player.isGrounded || this.coyoteTimerMs > 0) {
        // Execute buffered jump
        this.player.yVelocity = JUMP_VELOCITY;
        this.player.isGrounded = false;
        this.player.isJumping = true;
        this.player.isSliding = false;
        this.jumpBufferTimerMs = 0;
        this.coyoteTimerMs = 0;
      }
    }

    // Apply vertical kinematics & dynamic gravity curve
    if (!this.player.isGrounded) {
      this.player.yPos += this.player.yVelocity * dt * 2.8;
      this.player.yVelocity -= this.currentGravity * dt;

      // Landing check
      if (this.player.yPos <= 0) {
        this.player.yPos = 0;
        this.player.yVelocity = 0;
        this.player.isGrounded = true;
        this.player.isJumping = false;
      }
    }
  }

  /**
   * Dual-Hitbox Collision Resolution
   * Returns:
   * - 'impact': Fatal impact on lethal bounding box
   * - 'near_miss': Concentric near-miss bounding zone triggered (feeds Overdrive meter)
   * - 'none': Completely clear
   */
  public checkObstacleCollision(
    obstacle: ObstacleEntity,
    playerZ: number,
    isOverdriveActive: boolean
  ): 'impact' | 'near_miss' | 'none' {
    if (obstacle.cleared) return 'none';

    const zDiff = Math.abs(obstacle.zPos - playerZ);
    const playerTargetLaneX = LANE_X_POSITIONS[obstacle.lane];
    const xDiff = Math.abs(this.player.currentX - playerTargetLaneX);

    // If player is way ahead of the obstacle, mark it cleared
    if (playerZ > obstacle.zPos + 4.0) {
      obstacle.cleared = true;
      return 'none';
    }

    // Check lethal impact depth
    const inLethalZ = zDiff <= HITBOX_Z_DEPTH;
    const inLethalX = xDiff <= HITBOX_WIDTH;

    if (inLethalZ && inLethalX) {
      // Overdrive grants invincibility, smash obstacle without dying
      if (isOverdriveActive || this.player.invincibleTimerMs > 0) {
        obstacle.cleared = true;
        return 'none';
      }

      // Check obstacle specific dodging mechanics
      if (obstacle.type === 'barrier_low') {
        // Jump over low barrier (requires player height > 18)
        if (this.player.yPos > 18) {
          // Cleared via jump!
          return 'none';
        }
        return 'impact';
      }

      if (obstacle.type === 'barrier_high') {
        // Slide duck under high barrier (requires sliding or player.yPos <= 10 with slide active)
        if (this.player.isSliding) {
          // Successfully ducked under!
          return 'none';
        }
        // If jumping into a high overhead barrier, fatal!
        return 'impact';
      }

      if (obstacle.type === 'pitfall') {
        // Must jump over pitfall
        if (this.player.yPos > 12) {
          return 'none';
        }
        return 'impact';
      }

      if (obstacle.type === 'moving_train') {
        // Trains block entire lane unless jumping with high clearance
        if (this.player.yPos > 40) {
          return 'none';
        }
        return 'impact';
      }

      return 'impact';
    }

    // Near-Miss Check: outer concentric zone (16px / buffer units)
    if (!obstacle.nearMissAwarded && zDiff <= (HITBOX_Z_DEPTH + NEAR_MISS_Z_BUFFER) && xDiff <= (HITBOX_WIDTH + NEAR_MISS_X_BUFFER)) {
      // Award near-miss if close to obstacle without hitting it
      obstacle.nearMissAwarded = true;
      return 'near_miss';
    }

    return 'none';
  }

  /**
   * Collectible collision detection
   */
  public checkCollectibleCollision(
    collectible: CollectibleEntity,
    playerZ: number,
    hasMagnet: boolean
  ): boolean {
    if (collectible.collected) return false;

    const zDiff = Math.abs(collectible.zPos - playerZ);
    const targetLaneX = LANE_X_POSITIONS[collectible.lane];
    const xDiff = Math.abs(this.player.currentX - targetLaneX);

    // If magnet is active, pull collectibles from adjacent lanes
    const reachZ = hasMagnet ? 18.0 : 3.5;
    const reachX = hasMagnet ? 1.4 : 0.65;

    if (zDiff <= reachZ && xDiff <= reachX) {
      collectible.collected = true;
      return true;
    }

    return false;
  }
}
