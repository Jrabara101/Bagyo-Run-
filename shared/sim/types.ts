export type LaneIndex = 0 | 1 | 2; // Left, Center, Right
export type ObstacleType = 'barrier_low' | 'barrier_high' | 'pitfall' | 'moving_train';
export type PowerUpType = 'coin_magnet' | 'shield' | 'overdrive_boost' | 'multiplier_2x';

export interface ObstacleEntity {
  id: string;
  type: ObstacleType;
  lane: LaneIndex;
  zPos: number; // Longitudinal distance along the track
  height: number;
  width: number;
  cleared: boolean;
  nearMissAwarded?: boolean;
}

export interface CollectibleEntity {
  id: string;
  type: 'coin' | PowerUpType;
  lane: LaneIndex;
  zPos: number;
  yOffset: number; // Height off the ground
  collected: boolean;
}

export interface TrackChunk {
  id: string;
  zStart: number;
  length: number;
  biome: 'neon_city' | 'sky_bridge' | 'magma_vault';
  obstacles: ObstacleEntity[];
  collectibles: CollectibleEntity[];
}

export interface PlayerPhysicsState {
  lane: LaneIndex;
  targetX: number;
  currentX: number;
  yPos: number;
  yVelocity: number;
  isGrounded: boolean;
  isJumping: boolean;
  isSliding: boolean;
  slideTimerMs: number;
  invincibleTimerMs: number;
}

// BAYANIHAN triggers the current overdrive burst; it is renamed with the Phase 2 rules.
export type Action = 'LEFT' | 'RIGHT' | 'JUMP' | 'SLIDE' | 'BAYANIHAN';

/** One player input, stamped with the tick it is applied at (before that tick's physics). */
export interface InputEvent {
  tick: number;
  action: Action;
}

export type SimEvent =
  | { type: 'LANE_CHANGED'; lane: LaneIndex }
  | { type: 'JUMP_REQUESTED' }
  | { type: 'SLIDE_STARTED' }
  | { type: 'OVERDRIVE_STARTED' }
  | { type: 'ITEM_COLLECTED'; itemId: CollectibleEntity['type']; goBag: boolean }
  | { type: 'NEAR_MISS'; combo: number }
  | { type: 'SHIELD_ABSORBED'; hazardId: string }
  | { type: 'CRASHED'; hazardId: string; cause: string };

export interface RunResult {
  seed: string;
  score: number;
  distance: number;
  coins: number;
  nearMisses: number;
  maxCombo: number;
  ticks: number;
  crashed: boolean;
  causeOfDeath?: string;
}

export interface EndlessRunnerGameState {
  status: 'IDLE' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'CRASHED';
  seed: string;
  distanceMeters: number;
  currentSpeed: number; // m/s, accelerating over time
  score: number;
  coinsCollected: number;
  nearMissCount: number;
  overdriveGauge: number; // 0.0 - 100.0
  isOverdriveActive: boolean;
  activePowerUps: { type: PowerUpType; expiresAtMs: number }[];
  ghostDistanceMeters: number;
}

export interface TelemetryPoint {
  timeMs: number;
  action: 'lane_shift' | 'jump' | 'slide' | 'overdrive_trigger' | 'tick';
  lane: LaneIndex;
  y: number;
  z: number;
}

export interface RunSubmissionPayload {
  seed: string;
  playerName: string;
  distance: number;
  score: number;
  coins: number;
  nearMisses: number;
  maxCombo: number;
  durationMs: number;
  causeOfDeath?: string;
  inputTelemetry: TelemetryPoint[];
  /** Tick-stamped inputs; with the seed this reproduces the run exactly. */
  inputLog: InputEvent[];
  ticks: number;
}

export interface LeaderboardRecord {
  id: string;
  playerName: string;
  seed: string;
  distance: number;
  score: number;
  coins: number;
  nearMisses: number;
  maxCombo: number;
  verified: boolean;
  validationReason?: string;
  createdAt: string;
  hasGhost: boolean;
}

export interface DailySeedConfig {
  seed: string;
  dateKey: string;
  dailyTitle: string;
  dailyModifiers: string[];
  topRecord?: {
    playerName: string;
    distance: number;
    score: number;
  };
}

export interface GameSettings {
  masterVolume: number; // 0 - 1
  sfxVolume: number; // 0 - 1
  musicVolume: number; // 0 - 1
  cameraTilt: number; // 0 - 1
  screenShake: number; // 0 - 1
  keyJump: string;
  keySlide: string;
  keyLeft: string;
  keyRight: string;
  keyOverdrive: string;
}
