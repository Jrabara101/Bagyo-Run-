import {
  Action,
  InputEvent,
  PowerUpType,
  RunResult,
  SimEvent,
  TrackChunk,
} from './types';
import {
  KinematicController,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_ACCELERATION,
  OVERDRIVE_SPEED_BOOST,
  FIXED_TIMESTEP_SEC,
} from './player';
import { generateChunk, CHUNK_LENGTH, getBiomeForDistance } from './course';

export const TICK_MS = FIXED_TIMESTEP_SEC * 1000;
export const OVERDRIVE_DURATION_TICKS = 360; // 6 s
export const POWERUP_DURATION_TICKS = 480; // 8 s
export const OVERDRIVE_MIN_GAUGE = 40;
const CHUNKS_AHEAD = 4;

export type SimStatus = 'RUNNING' | 'CRASHED';

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAtTick: number;
}

/**
 * The game rules as a headless, deterministic state machine.
 *
 * Time is a tick count at a fixed 60 Hz. `step(inputs)` applies the inputs, advances one tick
 * and returns what happened as events. It never touches audio, rendering, the DOM or a clock,
 * so the same seed and input log always produce the same run, in the browser or on the server.
 */
export class GameSimulation {
  public readonly seed: string;
  public status: SimStatus = 'RUNNING';
  /** Ticks completed so far. Inputs for the next step are stamped with this value. */
  public tick = 0;

  public readonly kinematics = new KinematicController();
  public chunks: TrackChunk[] = [];
  public playerZ = 0;
  public currentSpeed = BASE_SPEED;
  public score = 0;
  public coins = 0;
  public nearMisses = 0;
  public comboMultiplier = 1.0;
  public overdriveGauge = 0;
  public isOverdriveActive = false;
  public overdriveTicksLeft = 0;
  public powerUps: ActivePowerUp[] = [];
  public causeOfDeath: string | undefined;

  private currentChunkIndex = 0;

  constructor(seed: string) {
    this.seed = seed;
    for (let i = 0; i < CHUNKS_AHEAD; i++) {
      this.chunks.push(generateChunk(i, seed));
    }
  }

  get player() {
    return this.kinematics.player;
  }

  get elapsedMs() {
    return this.tick * TICK_MS;
  }

  /** Applies `actions` (in order) and advances one tick. Does nothing once the run has ended. */
  public step(actions: readonly Action[] = []): SimEvent[] {
    const events: SimEvent[] = [];
    for (const action of actions) {
      events.push(...this.input(action));
    }
    if (this.status === 'RUNNING') this.advance(events);
    return events;
  }

  /**
   * Applies one input now, ahead of the next tick. Equivalent to passing it to the next
   * `step()`; the client uses it so feedback is immediate. Record it as `{ tick, action }`.
   */
  public input(action: Action): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.status === 'RUNNING') this.applyAction(action, events);
    return events;
  }

  public result(): RunResult {
    return {
      seed: this.seed,
      score: this.score,
      distance: Math.floor(this.playerZ),
      coins: this.coins,
      nearMisses: this.nearMisses,
      maxCombo: Number(this.comboMultiplier.toFixed(1)),
      ticks: this.tick,
      crashed: this.status === 'CRASHED',
      causeOfDeath: this.causeOfDeath,
    };
  }

  private applyAction(action: Action, events: SimEvent[]) {
    const kin = this.kinematics;
    switch (action) {
      case 'LEFT':
      case 'RIGHT':
        if (kin.shiftLane(action === 'LEFT' ? -1 : 1)) {
          events.push({ type: 'LANE_CHANGED', lane: kin.player.lane });
        }
        break;
      case 'JUMP':
        kin.requestJump();
        events.push({ type: 'JUMP_REQUESTED' });
        break;
      case 'SLIDE':
        kin.requestSlide();
        events.push({ type: 'SLIDE_STARTED' });
        break;
      case 'BAYANIHAN':
        if (this.overdriveGauge < OVERDRIVE_MIN_GAUGE && !this.isOverdriveActive) break;
        this.isOverdriveActive = true;
        this.overdriveTicksLeft = OVERDRIVE_DURATION_TICKS;
        this.overdriveGauge = 0;
        events.push({ type: 'OVERDRIVE_STARTED' });
        break;
    }
  }

  private advance(events: SimEvent[]) {
    const dt = FIXED_TIMESTEP_SEC;
    this.tick += 1;

    const biome = getBiomeForDistance(this.playerZ);

    if (this.currentSpeed < MAX_SPEED) {
      this.currentSpeed += SPEED_ACCELERATION * dt;
    }

    let effectiveSpeed = this.currentSpeed;
    if (this.isOverdriveActive) {
      effectiveSpeed += OVERDRIVE_SPEED_BOOST;
      this.overdriveTicksLeft -= 1;
      if (this.overdriveTicksLeft <= 0) {
        this.isOverdriveActive = false;
        this.overdriveTicksLeft = 0;
      }
    }

    this.playerZ += effectiveSpeed * dt;
    this.kinematics.update(dt, biome);

    const hasMagnet = this.isOverdriveActive || this.powerUps.some((p) => p.type === 'coin_magnet');

    // 1. Recycle chunks behind the player and keep CHUNKS_AHEAD generated in front
    const currentZ = this.playerZ;
    const chunkIndex = Math.floor(currentZ / CHUNK_LENGTH);
    if (chunkIndex > this.currentChunkIndex) {
      this.currentChunkIndex = chunkIndex;
      this.chunks = this.chunks.filter((c) => c.zStart + c.length > currentZ - CHUNK_LENGTH);
      const maxExisting = Math.max(...this.chunks.map((c) => Math.floor(c.zStart / CHUNK_LENGTH)));
      for (let i = maxExisting + 1; i <= chunkIndex + CHUNKS_AHEAD; i++) {
        this.chunks.push(generateChunk(i, this.seed));
      }
    }

    // 2. Collisions, near-misses and pickups
    const player = this.kinematics.player;
    let crash: { hazardId: string; cause: string } | null = null;

    for (const chunk of this.chunks) {
      for (const obs of chunk.obstacles) {
        const hit = this.kinematics.checkObstacleCollision(obs, currentZ, this.isOverdriveActive);

        if (hit === 'impact') {
          const shieldIdx = this.powerUps.findIndex((p) => p.type === 'shield');
          if (shieldIdx >= 0) {
            this.powerUps.splice(shieldIdx, 1);
            player.invincibleTimerMs = 1200;
            obs.cleared = true;
            events.push({ type: 'SHIELD_ABSORBED', hazardId: obs.id });
          } else {
            crash = { hazardId: obs.id, cause: causeOfDeathFor(obs.type) };
            break;
          }
        } else if (hit === 'near_miss') {
          this.nearMisses += 1;
          this.comboMultiplier = Math.min(5.0, this.comboMultiplier + 0.25);
          this.score += Math.floor(250 * this.comboMultiplier);
          this.overdriveGauge = Math.min(100, this.overdriveGauge + 12);
          events.push({ type: 'NEAR_MISS', combo: this.comboMultiplier });
        }
      }

      if (crash) break;

      for (const col of chunk.collectibles) {
        if (!this.kinematics.checkCollectibleCollision(col, currentZ, hasMagnet)) continue;

        if (col.type === 'coin') {
          this.coins += 1;
          this.score += Math.floor(100 * this.comboMultiplier);
        } else if (col.type === 'overdrive_boost') {
          this.overdriveGauge = Math.min(100, this.overdriveGauge + 50);
        } else {
          this.powerUps.push({ type: col.type, expiresAtTick: this.tick + POWERUP_DURATION_TICKS });
        }
        events.push({ type: 'ITEM_COLLECTED', itemId: col.type, goBag: false });
      }
    }

    // Distance score
    this.score += Math.floor(effectiveSpeed * dt * 8 * this.comboMultiplier);

    this.powerUps = this.powerUps.filter((p) => p.expiresAtTick > this.tick);

    if (crash) {
      this.status = 'CRASHED';
      this.causeOfDeath = crash.cause;
      events.push({ type: 'CRASHED', ...crash });
    }
  }
}

function causeOfDeathFor(type: string): string {
  if (type === 'barrier_high') return 'High Overhead Barrier';
  if (type === 'barrier_low') return 'Low Laser Hurdle';
  if (type === 'pitfall') return 'Void Chasm Pitfall';
  return 'Oncoming Drone Train';
}
