import {
  Action,
  GameSettings,
  HudState,
  InputEvent,
  LaneIndex,
  RunResult,
  RunStatus,
  RunSubmissionPayload,
  SimEvent,
  GhostPoint,
} from '../../shared/sim/types';
import { GameSimulation, TICK_MS } from '../../shared/sim/simulation';
import { BAYANIHAN_MIN_GAUGE, FIXED_TIMESTEP_SEC, RULES_VERSION, STARTING_HEARTS } from '../../shared/sim/constants';
import { SIGNALS, signalAt } from '../../shared/content/signals';
import { AREAS, COURSE_LENGTH_M } from '../../shared/content/areas';
import { HAZARDS, HazardId } from '../../shared/content/hazards';
import type { UiKey } from '../../shared/content/i18n';
import { GATES_PER_AREA } from '../../shared/sim/quiz';
import { Renderer } from '../render/Renderer';
import { audio } from '../audio/AudioEngine';

const HUD_SYNC_SEC = 0.065; // ~15 Hz
/** One footstep per half stride of the kid's run cycle (see the renderer's run phase). */
const STEP_M = Math.PI / 0.75;
export const PRACTICE_SEED = 'PRACTICE';

/** The last gate answer, shown briefly after the player crosses a gate. */
export interface GateFeedback {
  gateIndex: number;
  questionId: string;
  correct: boolean;
  chosenLane: LaneIndex;
  correctLane: LaneIndex;
  points: number;
}

export interface HudSnapshot {
  state: HudState;
  ghostDeltaMeters: number;
  gateFeedback: GateFeedback | null;
  /** Practice runs are coached and never submitted. */
  practice: boolean;
  /** Practice-run tip for what is coming up next. */
  coach: UiKey | null;
}

const GATE_FEEDBACK_MS = 2600;

export interface ControllerCallbacks {
  /** Throttled while running, and immediately on every status change. */
  onHud: (hud: HudSnapshot) => void;
  onGameOver: (result: RunResult, submission: RunSubmissionPayload) => void;
}

/**
 * Drives a GameSimulation in real time: the rAF loop, the fixed-step accumulator, pause, and
 * turning SimEvents into sound and screen effects. Holds no game rules of its own.
 */
export class GameController {
  public settings: Pick<GameSettings, 'screenShake' | 'cameraTilt'> = { screenShake: 1, cameraTilt: 1 };

  private sim: GameSimulation;
  private status: RunStatus = 'IDLE';
  private inputLog: InputEvent[] = [];

  /** A verified run to race against, replayed by the server into positions over time. */
  private ghost: GhostPoint[] | null = null;
  private ghostIndex = 0;
  private ghostZ = 0;
  private ghostLane: LaneIndex = 1;

  private readonly renderer: Renderer;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private hudTimer = 0;
  private gateFeedback: GateFeedback | null = null;
  private gateFeedbackUntilMs = 0;
  private practice = false;
  private lastStep = 0;

  /** The seed to come back to after a practice run (today's daily challenge, or the URL's). */
  private readonly homeSeed: string;

  constructor(
    canvas: HTMLCanvasElement,
    seed: string,
    private readonly callbacks: ControllerCallbacks
  ) {
    this.renderer = new Renderer(canvas);
    this.homeSeed = seed;
    this.sim = new GameSimulation(seed);
  }

  get seed() {
    return this.sim.seed;
  }

  public start() {
    if (this.animFrameId !== null) return;
    this.lastTime = 0;
    this.animFrameId = requestAnimationFrame(this.frame);
  }

  public dispose() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = null;
  }

  /** Starts a run on the ghost's seed with the ghost running alongside. */
  public raceGhost(seed: string, points: GhostPoint[]) {
    this.reset(seed);
    this.ghost = points.length > 0 ? points : null;
    this.startRun();
  }

  /** Back to the start line, without a ghost. Practice runs always use the practice seed. */
  public reset(seed = this.sim.seed, practice = false) {
    this.practice = practice;
    this.lastStep = 0;
    this.sim = new GameSimulation(practice ? PRACTICE_SEED : seed === PRACTICE_SEED ? this.homeSeed : seed);
    audio.setMusicLevel('menu');
    this.inputLog = [];
    this.ghost = null;
    this.ghostIndex = 0;
    this.ghostZ = 0;
    this.ghostLane = 1;
    this.accumulator = 0;
    this.gateFeedback = null;
    this.setStatus('IDLE');
  }

  public startRun() {
    if (this.status === 'ENDED') {
      const ghost = this.ghost;
      this.reset(this.sim.seed, this.practice);
      this.ghost = ghost; // run again keeps racing the same ghost
    }
    audio.unlock();
    const signal = signalAt(this.sim.playerZ);
    audio.setWeather(signal.rain, signal.wind, signal.level);
    audio.setMusicLevel('run');
    this.setStatus('RUNNING');
  }

  /** A coached run on the fixed practice seed. */
  public startPractice() {
    this.reset(PRACTICE_SEED, true);
    this.startRun();
  }

  public pause() {
    if (this.status !== 'RUNNING') return;
    audio.setMusicLevel('menu');
    this.setStatus('PAUSED');
  }

  public resume() {
    if (this.status !== 'PAUSED') return;
    audio.setMusicLevel('run');
    this.setStatus('RUNNING');
  }

  /** Applies the input immediately and records it against the tick it precedes. */
  public input(action: Action) {
    if (this.status !== 'RUNNING') return;
    this.inputLog.push({ tick: this.sim.tick, action });
    this.handleEvents(this.sim.input(action));
  }

  private setStatus(status: RunStatus) {
    this.status = status;
    this.emitHud();
  }

  private frame = (timestamp: number) => {
    if (!this.lastTime) this.lastTime = timestamp;
    const frameDeltaSec = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (this.status === 'RUNNING') {
      this.accumulator += frameDeltaSec;
      while (this.accumulator >= FIXED_TIMESTEP_SEC && this.status === 'RUNNING') {
        this.handleEvents(this.sim.step());
        this.footsteps();
        this.updateGhost();
        this.accumulator -= FIXED_TIMESTEP_SEC;
      }
      if (this.status === 'RUNNING') {
        this.hudTimer += frameDeltaSec;
        if (this.hudTimer >= HUD_SYNC_SEC) {
          this.hudTimer = 0;
          this.emitHud();
        }
      }
    }

    const sim = this.sim;
    this.renderer.render(
      frameDeltaSec,
      {
        player: sim.player,
        playerZ: sim.playerZ,
        chunks: sim.chunks,
        gate: this.renderGate(),
        bayanihan: sim.isBayanihanActive,
        ghost: this.ghost ? { z: this.ghostZ, lane: this.ghostLane } : null,
        title: this.status === 'IDLE',
      },
      this.settings
    );

    this.animFrameId = requestAnimationFrame(this.frame);
  };

  private handleEvents(events: SimEvent[]) {
    for (const event of events) {
      switch (event.type) {
        case 'LANE_CHANGED':
          audio.laneShift();
          break;
        case 'JUMP_REQUESTED':
          audio.jump();
          break;
        case 'SLIDE_STARTED':
          audio.slide();
          break;
        case 'BAYANIHAN_STARTED':
          audio.bayanihan();
          this.renderer.triggerScreenShake(0.8);
          break;
        case 'NEAR_MISS': {
          audio.nearMiss();
          const p = this.playerScreenPos();
          this.renderer.addNearMissSparks(p.x, p.y, 24);
          this.renderer.triggerScreenShake(0.3);
          break;
        }
        case 'ITEM_COLLECTED':
          if (event.itemId === 'supply' || event.goBag) {
            if (event.goBag) audio.goBagItem();
            else audio.supply();
            const p = this.playerScreenPos();
            this.renderer.addCoinBurst(p.x, p.y);
          } else {
            audio.powerUp();
          }
          break;
        case 'GO_BAG_COMPLETE':
          audio.goBagComplete();
          break;
        case 'SIGNAL_UP': {
          const signal = SIGNALS[event.level - 1];
          audio.siren(event.level);
          audio.setWeather(signal.rain, signal.wind, signal.level);
          this.emitHud();
          break;
        }
        case 'SHIELD_ABSORBED':
          audio.shieldAbsorbed();
          this.renderer.triggerScreenShake(0.6);
          break;
        case 'HAZARD_HIT':
          audio.hit();
          this.renderer.triggerScreenShake(1.0);
          this.emitHud();
          break;
        case 'FINISHED':
        case 'RESCUED':
          if (event.type === 'RESCUED') {
            audio.rescued();
            this.renderer.triggerScreenShake(1.5);
          } else {
            audio.finish();
          }
          audio.setMusicLevel('menu');
          this.setStatus('ENDED');
          this.callbacks.onGameOver(this.sim.result(), this.submission());
          break;
        case 'AREA_ENTERED':
          this.emitHud();
          break;
        case 'GATE_SHOWN':
          audio.gateShown();
          this.emitHud();
          break;
        case 'GATE_ANSWERED': {
          const { type: _type, ...feedback } = event;
          this.gateFeedback = feedback;
          this.gateFeedbackUntilMs = this.sim.elapsedMs + GATE_FEEDBACK_MS;
          if (event.correct) {
            audio.gateCorrect();
            const p = this.playerScreenPos();
            this.renderer.addCoinBurst(p.x, p.y);
          } else {
            audio.gateWrong();
          }
          this.emitHud();
          break;
        }
      }
    }
  }

  private footsteps() {
    const step = Math.floor(this.sim.playerZ / STEP_M);
    if (step === this.lastStep) return;
    this.lastStep = step;
    if (this.sim.player.isGrounded && !this.sim.player.isSliding) audio.footstep(this.sim.areaId === 'estero');
  }

  /** Practice-run tip: the hazard in your lane first, then pickups and Bayanihan. */
  private coach(): UiKey | null {
    const sim = this.sim;
    if (!this.practice || this.status !== 'RUNNING') return null;
    if (sim.elapsedMs < 4000) return 'coachLanes';
    if (sim.gateShown) return 'coachGate';
    let nearest: { dz: number; hazard: HazardId } | null = null;
    let goBagAhead = false;
    let supplyAhead = false;
    for (const chunk of sim.chunks) {
      for (const o of chunk.obstacles) {
        const dz = o.zPos - sim.playerZ;
        if (dz > 0 && dz < 32 && o.lane === sim.player.lane && (!nearest || dz < nearest.dz)) nearest = { dz, hazard: o.hazardId };
      }
      for (const c of chunk.collectibles) {
        const dz = c.zPos - sim.playerZ;
        if (c.collected || dz <= 0 || dz > 40) continue;
        if (c.type === 'gobag') goBagAhead = true;
        if (c.type === 'supply' && dz < 25) supplyAhead = true;
      }
    }
    if (nearest) {
      const avoid = HAZARDS[nearest.hazard].avoid;
      return avoid === 'jump' ? 'coachJump' : avoid === 'slide' ? 'coachSlide' : 'coachDodge';
    }
    if (goBagAhead) return 'coachGoBag';
    if (sim.bayanihanGauge >= BAYANIHAN_MIN_GAUGE && !sim.isBayanihanActive) return 'coachBayanihan';
    if (supplyAhead && sim.supplies < 5) return 'coachSupply';
    return null;
  }

  /** The next gate while it is within drawing range, with the answer lane once it is crossed. */
  private renderGate() {
    const gate = this.sim.gates[this.sim.nextGate];
    if (!gate) return null;
    return { z: gate.z, highlightLane: this.sim.gateShown ? this.sim.player.lane : null };
  }

  /** The player's name is added by the UI, which owns the setting. */
  private submission(): RunSubmissionPayload {
    return { seed: this.sim.seed, playerName: '', inputLog: this.inputLog, ticks: this.sim.tick, rulesVersion: RULES_VERSION };
  }

  private playerScreenPos() {
    return this.renderer.playerScreenPos(this.sim.player);
  }

  /** Moves the ghost to where it was at this moment of its run (points are in time order). */
  private updateGhost() {
    const points = this.ghost;
    if (!points) return;
    const target = this.sim.elapsedMs;
    while (this.ghostIndex < points.length - 1 && points[this.ghostIndex].timeMs < target) this.ghostIndex++;
    this.ghostZ = points[this.ghostIndex].z;
    this.ghostLane = points[this.ghostIndex].lane;
  }

  private emitHud() {
    const sim = this.sim;
    const distance = Math.floor(Math.min(sim.playerZ, COURSE_LENGTH_M));
    if (this.gateFeedback && sim.elapsedMs > this.gateFeedbackUntilMs) this.gateFeedback = null;
    const gate = sim.activeGate;
    this.callbacks.onHud({
      ghostDeltaMeters: this.ghost ? Math.floor(distance - Math.min(this.ghostZ, COURSE_LENGTH_M)) : 0,
      gateFeedback: this.gateFeedback,
      practice: this.practice,
      coach: this.coach(),
      state: {
        status: this.status,
        seed: sim.seed,
        distanceMeters: distance,
        courseMeters: COURSE_LENGTH_M,
        currentSpeed: sim.effectiveSpeed,
        score: sim.score,
        hearts: sim.hearts,
        signal: sim.signal,
        areaId: sim.areaId,
        supplies: sim.supplies,
        goBag: [...sim.goBag],
        nearMissCount: sim.nearMisses,
        bayanihanGauge: Number(sim.bayanihanGauge.toFixed(1)),
        isBayanihanActive: sim.isBayanihanActive,
        activePowerUps: sim.powerUps.map((p) => ({ type: p.type, expiresAtMs: p.expiresAtTick * TICK_MS })),
        ghostDistanceMeters: Math.floor(this.ghostZ),
        gatesCorrect: sim.gatesCorrect,
        gatesTotal: sim.gates.length,
        gate: gate && {
          index: gate.index,
          questionId: gate.questionId,
          laneChoices: gate.laneChoices,
          metersLeft: Math.max(0, Math.ceil(gate.z - sim.playerZ)),
          lane: sim.player.lane,
        },
      },
    });
  }
}

export const INITIAL_HUD = (seed: string): HudSnapshot => ({
  ghostDeltaMeters: 0,
  gateFeedback: null,
  practice: false,
  coach: null,
  state: {
    status: 'IDLE',
    seed,
    distanceMeters: 0,
    courseMeters: COURSE_LENGTH_M,
    currentSpeed: SIGNALS[0].speed,
    score: 0,
    hearts: STARTING_HEARTS,
    signal: 1,
    areaId: AREAS[0].id,
    supplies: 0,
    goBag: [],
    nearMissCount: 0,
    bayanihanGauge: 0,
    isBayanihanActive: false,
    activePowerUps: [],
    ghostDistanceMeters: 0,
    gatesCorrect: 0,
    gatesTotal: AREAS.length * GATES_PER_AREA,
    gate: null,
  },
});
