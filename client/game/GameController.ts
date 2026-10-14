import {
  Action,
  AreaId,
  GameSettings,
  HudState,
  InputEvent,
  LaneIndex,
  RunResult,
  RunStatus,
  RunSubmissionPayload,
  SimEvent,
  TelemetryPoint,
} from '../../shared/sim/types';
import { GameSimulation, TICK_MS } from '../../shared/sim/simulation';
import { FIXED_TIMESTEP_SEC, STARTING_HEARTS } from '../../shared/sim/constants';
import { SIGNALS } from '../../shared/content/signals';
import { AREAS, COURSE_LENGTH_M } from '../../shared/content/areas';
import { CanvasRenderer, RenderBiome } from '../engine/canvasRenderer';
import { soundEngine } from '../engine/audio';

const HUD_SYNC_SEC = 0.065; // ~15 Hz
const TELEMETRY_HEARTBEAT_MS = 100;
const TOP_SPEED = SIGNALS[SIGNALS.length - 1].speed;

// Placeholder palettes until the Phase 4 art replaces the renderer
const AREA_PALETTE: Record<AreaId, RenderBiome> = {
  barangay: 'neon_city',
  estero: 'sky_bridge',
  palayan: 'magma_vault',
  evac: 'neon_city',
};

export interface HudSnapshot {
  state: HudState;
  ghostDeltaMeters: number;
}

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

  /** Sampled positions for ghost playback of this run. */
  private telemetry: TelemetryPoint[] = [];

  private ghostTelemetry: TelemetryPoint[] | null = null;
  private ghostZ = 0;
  private ghostLane: LaneIndex = 1;

  private readonly renderer: CanvasRenderer;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private hudTimer = 0;

  constructor(
    canvas: HTMLCanvasElement,
    seed: string,
    private readonly callbacks: ControllerCallbacks
  ) {
    this.renderer = new CanvasRenderer(canvas);
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
    soundEngine.stopEngineHum();
  }

  public loadGhostTelemetry(telemetry: TelemetryPoint[]) {
    this.ghostTelemetry = telemetry;
  }

  public reset(seed = this.sim.seed) {
    this.sim = new GameSimulation(seed);
    this.inputLog = [];
    this.telemetry = [];
    this.ghostZ = 0;
    this.ghostLane = 1;
    this.accumulator = 0;
    this.setStatus('IDLE');
  }

  public startRun() {
    if (this.status === 'ENDED') this.reset();
    this.setStatus('RUNNING');
    soundEngine.startEngineHum();
  }

  public pause() {
    if (this.status !== 'RUNNING') return;
    soundEngine.stopEngineHum();
    this.setStatus('PAUSED');
  }

  public resume() {
    if (this.status !== 'PAUSED') return;
    soundEngine.startEngineHum();
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
        soundEngine.updateEnginePitch(this.sim.effectiveSpeed / TOP_SPEED);
        this.updateGhost();
        this.accumulator -= FIXED_TIMESTEP_SEC;
      }
      if (this.status === 'RUNNING') {
        this.recordHeartbeat();
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
      sim.player,
      sim.playerZ,
      sim.chunks,
      AREA_PALETTE[sim.areaId],
      sim.isBayanihanActive,
      this.ghostTelemetry ? this.ghostZ : null,
      this.ghostTelemetry ? this.ghostLane : null,
      this.settings.screenShake,
      this.settings.cameraTilt
    );

    this.animFrameId = requestAnimationFrame(this.frame);
  };

  private handleEvents(events: SimEvent[]) {
    for (const event of events) {
      switch (event.type) {
        case 'LANE_CHANGED':
          soundEngine.playLaneShift();
          this.recordAction('lane_shift');
          break;
        case 'JUMP_REQUESTED':
          soundEngine.playJump();
          this.recordAction('jump');
          break;
        case 'SLIDE_STARTED':
          soundEngine.playSlide();
          this.recordAction('slide');
          break;
        case 'BAYANIHAN_STARTED':
          soundEngine.playOverdrive();
          this.renderer.triggerScreenShake(0.8);
          this.recordAction('bayanihan');
          break;
        case 'NEAR_MISS': {
          soundEngine.playNearMiss();
          const p = this.playerScreenPos();
          this.renderer.addNearMissSparks(p.x, p.y, 24);
          this.renderer.triggerScreenShake(0.3);
          break;
        }
        case 'ITEM_COLLECTED':
          if (event.itemId === 'supply' || event.goBag) {
            soundEngine.playCoin();
            const p = this.playerScreenPos();
            this.renderer.addCoinBurst(p.x, p.y);
          } else {
            soundEngine.playNearMiss();
          }
          break;
        case 'GO_BAG_COMPLETE':
        case 'SIGNAL_UP':
          soundEngine.playOverdrive();
          break;
        case 'SHIELD_ABSORBED':
          soundEngine.playImpact();
          this.renderer.triggerScreenShake(0.6);
          break;
        case 'HAZARD_HIT':
          soundEngine.playImpact();
          this.renderer.triggerScreenShake(1.0);
          this.emitHud();
          break;
        case 'FINISHED':
        case 'RESCUED':
          soundEngine.stopEngineHum();
          if (event.type === 'RESCUED') this.renderer.triggerScreenShake(1.5);
          this.setStatus('ENDED');
          this.callbacks.onGameOver(this.sim.result(), this.submission());
          break;
        case 'AREA_ENTERED':
          this.emitHud();
          break;
      }
    }
  }

  private submission(): RunSubmissionPayload {
    return {
      seed: this.sim.seed,
      playerName: 'RUNNER',
      inputLog: this.inputLog,
      ticks: this.sim.tick,
      inputTelemetry: this.telemetry,
    };
  }

  private playerScreenPos() {
    const player = this.sim.player;
    return this.renderer.project(player.currentX, player.yPos, 2.8);
  }

  private recordAction(action: TelemetryPoint['action']) {
    this.telemetry.push({
      timeMs: this.sim.elapsedMs,
      action,
      lane: this.sim.player.lane,
      y: this.sim.player.yPos,
      z: this.sim.playerZ,
    });
  }

  private recordHeartbeat() {
    const last = this.telemetry[this.telemetry.length - 1];
    if (last && this.sim.elapsedMs - last.timeMs <= TELEMETRY_HEARTBEAT_MS) return;
    this.telemetry.push({
      timeMs: Math.floor(this.sim.elapsedMs),
      action: 'tick',
      lane: this.sim.player.lane,
      y: Number(this.sim.player.yPos.toFixed(1)),
      z: Number(this.sim.playerZ.toFixed(1)),
    });
  }

  private updateGhost() {
    const points = this.ghostTelemetry;
    if (!points || points.length === 0) return;
    const target = this.sim.elapsedMs;
    const closest = points.find((p) => p.timeMs >= target) ?? points[points.length - 1];
    this.ghostZ = closest.z;
    this.ghostLane = closest.lane;
  }

  private emitHud() {
    const sim = this.sim;
    const distance = Math.floor(Math.min(sim.playerZ, COURSE_LENGTH_M));
    this.callbacks.onHud({
      ghostDeltaMeters: this.ghostTelemetry ? Math.floor(distance - this.ghostZ) : 0,
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
      },
    });
  }
}

export const INITIAL_HUD = (seed: string): HudSnapshot => ({
  ghostDeltaMeters: 0,
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
  },
});
