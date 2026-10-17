import { LaneIndex } from './types';

export const FIXED_TIMESTEP_SEC = 1 / 60;
export const TICK_MS = FIXED_TIMESTEP_SEC * 1000;

export const LANE_X_POSITIONS: Record<LaneIndex, number> = { 0: -1.0, 1: 0.0, 2: 1.0 };
export const LERP_LANE_SPEED = 18.0;

// Run pace comes from the current signal (shared/content/signals.ts); this is how fast it changes.
export const SPEED_ACCELERATION = 1.5; // m/s^2

// Jump: defined by apex height and air time, so it can be tuned against hazard clearances.
export const JUMP_APEX = 28;
export const JUMP_AIR_SEC = 0.62;
export const GRAVITY = (8 * JUMP_APEX) / (JUMP_AIR_SEC * JUMP_AIR_SEC);
export const JUMP_VELOCITY = (4 * JUMP_APEX) / JUMP_AIR_SEC;
export const JUMP_BUFFER_MS = 100;
export const COYOTE_TIME_MS = 80;
export const SLIDE_DURATION_MS = 650;

// Height the player must be above to clear each collision class
export const CLEAR_LOW_BARRIER = 18;
export const CLEAR_PITFALL = 12;
export const CLEAR_LANE_BLOCKER = Infinity; // swept jeepney / floating debris: change lanes

export const HITBOX_WIDTH = 0.55;
export const HITBOX_Z_DEPTH = 2.0;
export const NEAR_MISS_Z_BUFFER = 4.8;
export const NEAR_MISS_X_BUFFER = 0.35;
export const PICKUP_REACH_Z = 3.5;
export const PICKUP_REACH_X = 0.65;
export const MAGNET_REACH_Z = 18.0;
export const MAGNET_REACH_X = 1.4;

export const STARTING_HEARTS = 3;
export const HIT_INVULNERABLE_MS = 1500;
export const SHIELD_INVULNERABLE_MS = 1200;

export const BAYANIHAN_DURATION_TICKS = 360; // 6 s
export const BAYANIHAN_MIN_GAUGE = 40;
export const BAYANIHAN_SPEED_BOOST = 6;
export const NEAR_MISS_GAUGE = 12;
export const BAYANIHAN_PICKUP_GAUGE = 50;
export const GATE_CORRECT_GAUGE = 25;
export const POWERUP_DURATION_TICKS = 480; // 8 s

export const CHUNK_LENGTH = 120;
export const CHUNKS_AHEAD = 4;
/** Hazard-free run-in before the finish line, in meters. */
export const FINISH_CLEAR_M = 80;
