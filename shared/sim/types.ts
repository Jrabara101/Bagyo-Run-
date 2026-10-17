import type { AreaId } from '../content/areas';
import type { HazardId } from '../content/hazards';
import type { GoBagItemId, PowerUpType } from '../content/items';
import type { SignalLevel } from '../content/signals';

export type { AreaId, HazardId, GoBagItemId, PowerUpType, SignalLevel };

export type LaneIndex = 0 | 1 | 2; // Left, Center, Right
/** Collision class: how a hazard is checked. The hazard itself (content) is `hazardId`. */
export type ObstacleType = 'barrier_low' | 'barrier_high' | 'pitfall' | 'moving_train';

export interface ObstacleEntity {
  id: string;
  hazardId: HazardId;
  type: ObstacleType;
  lane: LaneIndex;
  zPos: number; // Longitudinal distance along the track, meters
  height: number;
  width: number;
  cleared: boolean;
  nearMissAwarded?: boolean;
}

export interface CollectibleEntity {
  id: string;
  type: 'supply' | 'gobag' | PowerUpType;
  /** Set for `gobag` collectibles. */
  itemId?: GoBagItemId;
  lane: LaneIndex;
  zPos: number;
  yOffset: number; // Height off the ground
  collected: boolean;
}

export interface TrackChunk {
  id: string;
  zStart: number;
  length: number;
  areaId: AreaId;
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
  | { type: 'BAYANIHAN_STARTED' }
  | { type: 'ITEM_COLLECTED'; itemId: string; goBag: boolean }
  | { type: 'GO_BAG_COMPLETE' }
  | { type: 'NEAR_MISS'; combo: number }
  | { type: 'SHIELD_ABSORBED'; hazardId: HazardId }
  | { type: 'HAZARD_HIT'; hazardId: HazardId; heartsLeft: number }
  | { type: 'GATE_SHOWN'; gateIndex: number; questionId: string }
  | {
      type: 'GATE_ANSWERED';
      gateIndex: number;
      questionId: string;
      chosenLane: LaneIndex;
      correctLane: LaneIndex;
      correct: boolean;
      points: number;
    }
  | { type: 'SIGNAL_UP'; level: SignalLevel }
  | { type: 'AREA_ENTERED'; areaId: AreaId }
  | { type: 'FINISHED' }
  | { type: 'RESCUED'; hazardId: HazardId };

export interface RunResult {
  seed: string;
  score: number;
  distance: number;
  finished: boolean;
  heartsLeft: number;
  hits: number;
  gatesCorrect: number;
  gatesTotal: number;
  goBagCount: number;
  supplies: number;
  nearMisses: number;
  maxCombo: number;
  ticks: number;
  /** Questions answered wrong, in course order; the results screen teaches these. */
  wrongQuestionIds: string[];
  /** The hazard that took the last heart, when the run ended in a rescue. */
  rescuedBy?: HazardId;
}

export type RunStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'ENDED';

/** Throttled HUD snapshot the React layer renders. */
export interface HudState {
  status: RunStatus;
  seed: string;
  distanceMeters: number;
  courseMeters: number;
  currentSpeed: number;
  score: number;
  hearts: number;
  signal: SignalLevel;
  areaId: AreaId;
  supplies: number;
  goBag: GoBagItemId[];
  nearMissCount: number;
  bayanihanGauge: number; // 0 - 100
  isBayanihanActive: boolean;
  activePowerUps: { type: PowerUpType; expiresAtMs: number }[];
  ghostDistanceMeters: number;
  gatesCorrect: number;
  gatesTotal: number;
  /** The quiz gate being asked right now, if any. */
  gate: ActiveGateHud | null;
}

export interface ActiveGateHud {
  index: number;
  questionId: string;
  /** Choice index standing in each lane, left to right. */
  laneChoices: [number, number, number];
  metersLeft: number;
  /** The lane the player would answer with if they crossed now. */
  lane: LaneIndex;
}

/** Where a ghost runner was at a moment of its run (sampled by the server's replay). */
export interface GhostPoint {
  timeMs: number;
  lane: LaneIndex;
  z: number;
}

/** What the client sends. The server replays `inputLog` and computes the RunResult itself. */
export interface RunSubmissionPayload {
  seed: string;
  playerName: string;
  inputLog: InputEvent[];
  ticks: number;
  /** RULES_VERSION the run was played under; older versions no longer replay the same. */
  rulesVersion: number;
}

/** Why a submission was or was not accepted. The client shows these in the player's language. */
export type VerifyCode =
  | 'saved'
  | 'bad_request'
  | 'bad_seed'
  | 'bad_length'
  | 'bad_inputs'
  | 'old_rules'
  | 'tick_mismatch'
  | 'not_ended'
  | 'save_failed';

export interface RunVerifyResponse {
  verified: boolean;
  code: VerifyCode;
  runId?: string;
  /** The server's own result from replaying the inputs. */
  result?: RunResult;
  /** Place among players on this seed (each player's best run counts once). */
  rank?: number;
}

export interface LeaderboardRecord {
  id: string;
  playerName: string;
  seed: string;
  score: number;
  distance: number;
  finished: boolean;
  heartsLeft: number;
  gatesCorrect: number;
  gatesTotal: number;
  goBagCount: number;
  createdAt: string;
}

export interface GhostTrack {
  runId: string;
  playerName: string;
  seed: string;
  points: GhostPoint[];
}

/** Today's shared challenge: one seed and one storm for everyone, by the date in Manila. */
export interface DailyChallenge {
  dateKey: string;
  seed: string;
  storm: { en: string; fil: string };
  topRun?: { playerName: string; score: number };
}

export interface GameSettings {
  /** Shown on the leaderboard; the server cleans it and falls back to RUNNER. */
  playerName: string;
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
