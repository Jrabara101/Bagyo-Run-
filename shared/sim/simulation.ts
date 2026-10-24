import { Action, AreaId, GoBagItemId, HazardId, PowerUpType, RunResult, SignalLevel, SimEvent, TrackChunk } from './types';
import { KinematicController } from './player';
import { checkCollectible, checkObstacle } from './collision';
import { generateChunk } from './course';
import {
  FIXED_TIMESTEP_SEC,
  TICK_MS,
  SPEED_ACCELERATION,
  STARTING_HEARTS,
  HIT_INVULNERABLE_MS,
  SHIELD_INVULNERABLE_MS,
  BAYANIHAN_DURATION_TICKS,
  BAYANIHAN_MIN_GAUGE,
  BAYANIHAN_SPEED_BOOST,
  BAYANIHAN_PICKUP_GAUGE,
  NEAR_MISS_GAUGE,
  GATE_CORRECT_GAUGE,
  POWERUP_DURATION_TICKS,
  CHUNK_LENGTH,
  CHUNKS_AHEAD,
} from './constants';
import { distancePoints, finishBonus, gatePoints, nearMissPoints, nextCombo, SCORE, supplyPoints } from './scoring';

const GUST_BRACED_GAUGE = 10;
import { gatePlan, QuizGate } from './quiz';
import { FLOOD_DRAG_RATE, FLOOD_SLOW, FloodZone, GUST_WARN_M, Gust, WeatherPlan, floodAt, weatherPlan } from './weather';
import { areaAt, COURSE_LENGTH_M } from '../content/areas';
import { signalAt } from '../content/signals';
import { GO_BAG_ITEMS } from '../content/items';

export { TICK_MS };

export type SimStatus = 'RUNNING' | 'FINISHED' | 'RESCUED';

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAtTick: number;
}

/**
 * The game rules as a headless, deterministic state machine.
 *
 * Time is a tick count at a fixed 60 Hz. `step(actions)` applies the inputs, advances one tick
 * and returns what happened as events. It never touches audio, rendering, the DOM or a clock,
 * so the same seed and input log always produce the same run, in the browser or on the server.
 *
 * A run is a fixed course to the evacuation center. It ends at the finish line (FINISHED) or
 * when the last heart is lost (RESCUED: score kept, no finish bonus).
 *
 * Weather (shared/sim/weather.ts): a wind gust shoves the runner one lane downwind unless they
 * are crouching (sliding) as it hits; in a flooded stretch the two deep-water lanes slow the run
 * and allow no jumping, while the high-ground lane is clear.
 */
export class GameSimulation {
  public readonly seed: string;
  public status: SimStatus = 'RUNNING';
  /** Ticks completed so far. Inputs for the next step are stamped with this value. */
  public tick = 0;

  public readonly kinematics = new KinematicController();
  public chunks: TrackChunk[] = [];
  public playerZ = 0;
  public currentSpeed = signalAt(0).speed;
  public signal: SignalLevel = signalAt(0).level;
  public areaId: AreaId = areaAt(0).id;

  public score = 0;
  public hearts = STARTING_HEARTS;
  public hits = 0;
  public supplies = 0;
  public goBag: GoBagItemId[] = [];
  public nearMisses = 0;
  public combo = 1.0;
  public maxCombo = 1.0;
  public bayanihanGauge = 0;
  public isBayanihanActive = false;
  public bayanihanTicksLeft = 0;
  public powerUps: ActivePowerUp[] = [];
  public rescuedBy: HazardId | undefined;

  public readonly gates: readonly QuizGate[];
  /** The next gate to reach; `gates.length` once all are answered. */
  public nextGate = 0;
  /** Whether the next gate's question is on screen. */
  public gateShown = false;
  public gatesCorrect = 0;
  public wrongQuestionIds: string[] = [];

  public readonly weather: WeatherPlan;
  /** The next gust to hit; `weather.gusts.length` once all have passed. */
  public nextGust = 0;
  public gustWarned = false;
  public gustsBraced = 0;
  /** The flood the player is in, if any. */
  public flood: FloodZone | null = null;
  /** 0..1: how much the floodwater is holding the player back. */
  public waterDrag = 0;

  private currentChunkIndex = 0;

  constructor(seed: string) {
    this.seed = seed;
    this.gates = gatePlan(seed);
    this.weather = weatherPlan(seed);
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

  get effectiveSpeed() {
    return (this.currentSpeed + (this.isBayanihanActive ? BAYANIHAN_SPEED_BOOST : 0)) * (1 - FLOOD_SLOW * this.waterDrag);
  }

  /** In a flood and not on its high ground. */
  get inDeepWater() {
    return this.flood !== null && this.kinematics.player.lane !== this.flood.safeLane;
  }

  /** The gust whose warning is up, if any. */
  get activeGust(): Gust | null {
    return this.gustWarned ? this.weather.gusts[this.nextGust] ?? null : null;
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
      distance: Math.floor(Math.min(this.playerZ, COURSE_LENGTH_M)),
      finished: this.status === 'FINISHED',
      heartsLeft: this.hearts,
      hits: this.hits,
      gatesCorrect: this.gatesCorrect,
      gatesTotal: this.gates.length,
      goBagCount: this.goBag.length,
      supplies: this.supplies,
      nearMisses: this.nearMisses,
      maxCombo: Number(this.maxCombo.toFixed(2)),
      gustsBraced: this.gustsBraced,
      ticks: this.tick,
      wrongQuestionIds: [...this.wrongQuestionIds],
      rescuedBy: this.rescuedBy,
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
        if (this.inDeepWater && kin.player.isGrounded) {
          events.push({ type: 'JUMP_BLOCKED' });
          break;
        }
        kin.requestJump();
        events.push({ type: 'JUMP_REQUESTED' });
        break;
      case 'SLIDE':
        kin.requestSlide();
        events.push({ type: 'SLIDE_STARTED' });
        break;
      case 'BAYANIHAN':
        if (this.bayanihanGauge < BAYANIHAN_MIN_GAUGE && !this.isBayanihanActive) break;
        this.isBayanihanActive = true;
        this.bayanihanTicksLeft = BAYANIHAN_DURATION_TICKS;
        this.bayanihanGauge = 0;
        events.push({ type: 'BAYANIHAN_STARTED' });
        break;
    }
  }

  private advance(events: SimEvent[]) {
    const dt = FIXED_TIMESTEP_SEC;
    this.tick += 1;

    // Pace follows the current signal, easing between levels
    const target = signalAt(this.playerZ).speed;
    if (this.currentSpeed < target) this.currentSpeed = Math.min(target, this.currentSpeed + SPEED_ACCELERATION * dt);
    else if (this.currentSpeed > target) this.currentSpeed = Math.max(target, this.currentSpeed - SPEED_ACCELERATION * dt);

    const speed = this.effectiveSpeed;
    if (this.isBayanihanActive) {
      this.bayanihanTicksLeft -= 1;
      if (this.bayanihanTicksLeft <= 0) {
        this.isBayanihanActive = false;
        this.bayanihanTicksLeft = 0;
      }
    }

    const prevZ = this.playerZ;
    this.playerZ += speed * dt;
    this.kinematics.update(dt);

    this.updateZone(events);
    this.updateWeather(dt, events);
    this.recycleChunks();
    this.resolveContacts(events);
    this.resolveGate(events);

    this.score += distancePoints(Math.max(0, Math.min(this.playerZ, COURSE_LENGTH_M) - prevZ), this.combo);
    this.powerUps = this.powerUps.filter((p) => p.expiresAtTick > this.tick);

    if (this.hearts <= 0) {
      this.status = 'RESCUED';
      events.push({ type: 'RESCUED', hazardId: this.rescuedBy! });
    } else if (this.playerZ >= COURSE_LENGTH_M) {
      this.status = 'FINISHED';
      this.score += finishBonus(this.hearts);
      events.push({ type: 'FINISHED' });
    }
  }

  private updateZone(events: SimEvent[]) {
    const signal = signalAt(this.playerZ).level;
    if (signal !== this.signal) {
      this.signal = signal;
      events.push({ type: 'SIGNAL_UP', level: signal });
    }
    const area = areaAt(this.playerZ).id;
    if (area !== this.areaId) {
      this.areaId = area;
      events.push({ type: 'AREA_ENTERED', areaId: area });
    }
  }

  /**
   * Floods: entering and leaving, and the water's drag in the deep lanes. Gusts: the warning,
   * then the shove (or the brace, if the player is crouching as it hits).
   */
  private updateWeather(dt: number, events: SimEvent[]) {
    const flood = floodAt(this.weather, this.playerZ);
    if (flood !== this.flood) {
      if (flood) events.push({ type: 'FLOOD_ENTERED', safeLane: flood.safeLane });
      else events.push({ type: 'FLOOD_LEFT' });
      this.flood = flood;
    }
    const drag = this.inDeepWater && this.kinematics.player.isGrounded ? 1 : 0;
    const step = FLOOD_DRAG_RATE * dt;
    this.waterDrag = drag > this.waterDrag ? Math.min(drag, this.waterDrag + step) : Math.max(drag, this.waterDrag - step);

    const gust = this.weather.gusts[this.nextGust];
    if (!gust) return;
    if (!this.gustWarned && this.playerZ >= gust.z - GUST_WARN_M) {
      this.gustWarned = true;
      events.push({ type: 'GUST_WARNING', dir: gust.dir });
    }
    if (this.playerZ < gust.z) return;
    const braced = this.kinematics.player.isSliding;
    let pushed = false;
    let points = 0;
    if (braced) {
      this.gustsBraced += 1;
      points = SCORE.gustBraced;
      this.score += points;
      this.bayanihanGauge = Math.min(100, this.bayanihanGauge + GUST_BRACED_GAUGE);
    } else {
      pushed = this.kinematics.shiftLane(gust.dir);
      if (pushed) this.combo = 1.0;
    }
    events.push({ type: 'GUST', dir: gust.dir, braced, pushed, points });
    this.nextGust += 1;
    this.gustWarned = false;
  }

  /** The active gate, if its question is showing. */
  get activeGate(): QuizGate | null {
    return this.gateShown ? this.gates[this.nextGate] : null;
  }

  /**
   * Shows the next gate's question once the player is close enough, and answers it with the
   * player's lane when they cross the gate line. Right: points x signal and Bayanihan charge.
   * Wrong: no bonus, and the question goes on the lessons list.
   */
  private resolveGate(events: SimEvent[]) {
    const gate = this.gates[this.nextGate];
    if (!gate) return;
    if (!this.gateShown && this.playerZ >= gate.showZ) {
      this.gateShown = true;
      events.push({ type: 'GATE_SHOWN', gateIndex: gate.index, questionId: gate.questionId });
    }
    if (this.playerZ < gate.z) return;

    const chosenLane = this.kinematics.player.lane;
    const correct = chosenLane === gate.correctLane;
    const points = correct ? gatePoints(this.signal) : 0;
    if (correct) {
      this.gatesCorrect += 1;
      this.score += points;
      this.bayanihanGauge = Math.min(100, this.bayanihanGauge + GATE_CORRECT_GAUGE);
    } else {
      this.wrongQuestionIds.push(gate.questionId);
    }
    events.push({
      type: 'GATE_ANSWERED',
      gateIndex: gate.index,
      questionId: gate.questionId,
      chosenLane,
      correctLane: gate.correctLane,
      correct,
      points,
    });
    this.nextGate += 1;
    this.gateShown = false;
  }

  /** Drops chunks behind the player and keeps CHUNKS_AHEAD generated in front. */
  private recycleChunks() {
    const z = this.playerZ;
    const chunkIndex = Math.floor(z / CHUNK_LENGTH);
    if (chunkIndex <= this.currentChunkIndex) return;
    this.currentChunkIndex = chunkIndex;
    this.chunks = this.chunks.filter((c) => c.zStart + c.length > z - CHUNK_LENGTH);
    const maxExisting = this.chunks.length ? Math.max(...this.chunks.map((c) => Math.floor(c.zStart / CHUNK_LENGTH))) : chunkIndex - 1;
    for (let i = maxExisting + 1; i <= chunkIndex + CHUNKS_AHEAD; i++) {
      this.chunks.push(generateChunk(i, this.seed));
    }
  }

  private resolveContacts(events: SimEvent[]) {
    const player = this.kinematics.player;
    const z = this.playerZ;
    const hasMagnet = this.isBayanihanActive || this.powerUps.some((p) => p.type === 'tanod_whistle');

    for (const chunk of this.chunks) {
      for (const obs of chunk.obstacles) {
        const invincible = this.isBayanihanActive || player.invincibleTimerMs > 0;
        const contact = checkObstacle(player, obs, z, invincible);

        if (contact === 'impact') {
          obs.cleared = true;
          const vest = this.powerUps.findIndex((p) => p.type === 'life_vest');
          if (vest >= 0) {
            this.powerUps.splice(vest, 1);
            player.invincibleTimerMs = SHIELD_INVULNERABLE_MS;
            events.push({ type: 'SHIELD_ABSORBED', hazardId: obs.hazardId });
          } else {
            this.hearts -= 1;
            this.hits += 1;
            this.combo = 1.0;
            player.invincibleTimerMs = HIT_INVULNERABLE_MS;
            events.push({ type: 'HAZARD_HIT', hazardId: obs.hazardId, heartsLeft: this.hearts });
            if (this.hearts <= 0) {
              this.rescuedBy = obs.hazardId;
              return;
            }
          }
        } else if (contact === 'near_miss') {
          this.nearMisses += 1;
          this.combo = nextCombo(this.combo);
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.score += nearMissPoints(this.combo);
          this.bayanihanGauge = Math.min(100, this.bayanihanGauge + NEAR_MISS_GAUGE);
          events.push({ type: 'NEAR_MISS', combo: this.combo });
        }
      }

      for (const col of chunk.collectibles) {
        if (!checkCollectible(player, col, z, hasMagnet)) continue;

        if (col.type === 'supply') {
          this.supplies += 1;
          this.score += supplyPoints(this.combo);
          events.push({ type: 'ITEM_COLLECTED', itemId: 'supply', goBag: false });
        } else if (col.type === 'gobag') {
          this.goBag.push(col.itemId!);
          this.score += SCORE.goBagItem;
          events.push({ type: 'ITEM_COLLECTED', itemId: col.itemId!, goBag: true });
          if (this.goBag.length === GO_BAG_ITEMS.length) {
            this.score += SCORE.goBagComplete;
            events.push({ type: 'GO_BAG_COMPLETE' });
          }
        } else {
          if (col.type === 'bayanihan') {
            this.bayanihanGauge = Math.min(100, this.bayanihanGauge + BAYANIHAN_PICKUP_GAUGE);
          } else {
            this.powerUps.push({ type: col.type, expiresAtTick: this.tick + POWERUP_DURATION_TICKS });
          }
          events.push({ type: 'ITEM_COLLECTED', itemId: col.type, goBag: false });
        }
      }
    }
  }
}
