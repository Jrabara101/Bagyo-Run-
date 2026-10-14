import { useEffect, useRef, useState, useCallback } from 'react';
import {
  EndlessRunnerGameState,
  LaneIndex,
  PowerUpType,
  TrackChunk,
  TelemetryPoint,
  GameSettings,
  RunSubmissionPayload,
} from '../types/game';
import {
  KinematicController,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_ACCELERATION,
  OVERDRIVE_SPEED_BOOST,
  FIXED_TIMESTEP_SEC,
} from '../engine/kinematicController';
import { generateChunk, CHUNK_LENGTH, getBiomeForDistance } from '../engine/chunkGenerator';
import { CanvasRenderer } from '../engine/canvasRenderer';
import { soundEngine } from '../engine/audio';

const OVERDRIVE_DURATION_MS = 6000;

export function useRunnerEngine(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  initialSeed: string,
  settings: GameSettings,
  onGameOver?: (payload: RunSubmissionPayload) => void
) {
  // Throttled HUD state exposed to React
  const [gameState, setGameState] = useState<EndlessRunnerGameState>({
    status: 'IDLE',
    seed: initialSeed,
    distanceMeters: 0,
    currentSpeed: BASE_SPEED,
    score: 0,
    coinsCollected: 0,
    nearMissCount: 0,
    overdriveGauge: 0,
    isOverdriveActive: false,
    activePowerUps: [],
    ghostDistanceMeters: 0,
  });

  const [ghostDeltaMeters, setGhostDeltaMeters] = useState<number>(0);
  const [activeBiome, setActiveBiome] = useState<'neon_city' | 'sky_bridge' | 'magma_vault'>('neon_city');

  // Internal mutable game engine references (NEVER trigger React re-renders)
  const kinematicRef = useRef<KinematicController>(new KinematicController());
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const activeChunksRef = useRef<TrackChunk[]>([]);
  const currentChunkIndexRef = useRef<number>(0);
  const playerZRef = useRef<number>(0);
  const currentSpeedRef = useRef<number>(BASE_SPEED);
  const scoreRef = useRef<number>(0);
  const coinsRef = useRef<number>(0);
  const nearMissesRef = useRef<number>(0);
  const comboMultiplierRef = useRef<number>(1.0);
  const overdriveGaugeRef = useRef<number>(0);
  const isOverdriveRef = useRef<boolean>(false);
  const overdriveTimerMsRef = useRef<number>(0);
  const powerUpsRef = useRef<{ type: PowerUpType; expiresAtMs: number }[]>([]);

  // Telemetry recording for Anti-Cheat verification
  const telemetryRef = useRef<TelemetryPoint[]>([]);
  const runStartTimeRef = useRef<number>(0);
  const runDurationMsRef = useRef<number>(0);

  // Ghost Playback data
  const ghostTelemetryRef = useRef<TelemetryPoint[] | null>(null);
  const ghostZRef = useRef<number>(0);
  const ghostLaneRef = useRef<LaneIndex>(1);

  // Animation loop timing
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const hudSyncTimerRef = useRef<number>(0);
  const statusRef = useRef<'IDLE' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'CRASHED'>('IDLE');

  // Initialize Canvas Renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }
  }, [canvasRef]);

  // Update volume in sound engine
  useEffect(() => {
    soundEngine.setVolumes(settings.masterVolume, settings.sfxVolume);
  }, [settings.masterVolume, settings.sfxVolume]);

  /**
   * Loads Ghost Telemetry for asynchronous run comparison
   */
  const loadGhostTelemetry = useCallback((telemetry: TelemetryPoint[]) => {
    ghostTelemetryRef.current = telemetry;
  }, []);

  /**
   * Resets and initializes the runner track and chunks
   */
  const resetGame = useCallback((newSeed?: string) => {
    const seed = newSeed || gameState.seed;
    kinematicRef.current.reset();
    playerZRef.current = 0;
    currentSpeedRef.current = BASE_SPEED;
    scoreRef.current = 0;
    coinsRef.current = 0;
    nearMissesRef.current = 0;
    comboMultiplierRef.current = 1.0;
    overdriveGaugeRef.current = 0;
    isOverdriveRef.current = false;
    overdriveTimerMsRef.current = 0;
    powerUpsRef.current = [];
    telemetryRef.current = [];
    runDurationMsRef.current = 0;
    ghostZRef.current = 0;
    ghostLaneRef.current = 1;

    // Generate initial 4 chunks (0m to 480m)
    currentChunkIndexRef.current = 0;
    const initialChunks: TrackChunk[] = [];
    for (let i = 0; i < 4; i++) {
      initialChunks.push(generateChunk(i, seed));
    }
    activeChunksRef.current = initialChunks;

    statusRef.current = 'IDLE';
    setGameState({
      status: 'IDLE',
      seed,
      distanceMeters: 0,
      currentSpeed: BASE_SPEED,
      score: 0,
      coinsCollected: 0,
      nearMissCount: 0,
      overdriveGauge: 0,
      isOverdriveActive: false,
      activePowerUps: [],
      ghostDistanceMeters: 0,
    });
    setActiveBiome('neon_city');
    setGhostDeltaMeters(0);
  }, [gameState.seed]);

  /**
   * Trigger Slipstream Overdrive Hyper Burst
   */
  const triggerOverdrive = useCallback(() => {
    if (statusRef.current !== 'RUNNING') return;
    if (overdriveGaugeRef.current < 40 && !isOverdriveRef.current) return;

    isOverdriveRef.current = true;
    overdriveTimerMsRef.current = OVERDRIVE_DURATION_MS;
    overdriveGaugeRef.current = 0;
    soundEngine.playOverdrive();
    if (rendererRef.current) {
      rendererRef.current.triggerScreenShake(0.8);
    }

    // Telemetry log
    telemetryRef.current.push({
      timeMs: runDurationMsRef.current,
      action: 'overdrive_trigger',
      lane: kinematicRef.current.player.lane,
      y: kinematicRef.current.player.yPos,
      z: playerZRef.current,
    });
  }, []);

  /**
   * Handle Player Inputs
   */
  const handleShiftLane = useCallback((direction: -1 | 1) => {
    if (statusRef.current !== 'RUNNING') return;
    const shifted = kinematicRef.current.shiftLane(direction);
    if (shifted) {
      soundEngine.playLaneShift();
      if (rendererRef.current) {
        // Subtle bump
      }
      telemetryRef.current.push({
        timeMs: runDurationMsRef.current,
        action: 'lane_shift',
        lane: kinematicRef.current.player.lane,
        y: kinematicRef.current.player.yPos,
        z: playerZRef.current,
      });
    }
  }, []);

  const handleJump = useCallback(() => {
    if (statusRef.current !== 'RUNNING') return;
    kinematicRef.current.requestJump();
    soundEngine.playJump();
    telemetryRef.current.push({
      timeMs: runDurationMsRef.current,
      action: 'jump',
      lane: kinematicRef.current.player.lane,
      y: kinematicRef.current.player.yPos,
      z: playerZRef.current,
    });
  }, []);

  const handleSlide = useCallback(() => {
    if (statusRef.current !== 'RUNNING') return;
    kinematicRef.current.requestSlide();
    soundEngine.playSlide();
    telemetryRef.current.push({
      timeMs: runDurationMsRef.current,
      action: 'slide',
      lane: kinematicRef.current.player.lane,
      y: kinematicRef.current.player.yPos,
      z: playerZRef.current,
    });
  }, []);

  /**
   * Start / Resume Game
   */
  const startGame = useCallback(() => {
    if (statusRef.current === 'CRASHED') {
      resetGame();
    }
    statusRef.current = 'RUNNING';
    runStartTimeRef.current = performance.now();
    soundEngine.startEngineHum();
    setGameState((prev) => ({ ...prev, status: 'RUNNING' }));
  }, [resetGame]);

  const pauseGame = useCallback(() => {
    if (statusRef.current === 'RUNNING') {
      statusRef.current = 'PAUSED';
      soundEngine.stopEngineHum();
      setGameState((prev) => ({ ...prev, status: 'PAUSED' }));
    }
  }, []);

  const resumeGame = useCallback(() => {
    if (statusRef.current === 'PAUSED') {
      statusRef.current = 'RUNNING';
      soundEngine.startEngineHum();
      setGameState((prev) => ({ ...prev, status: 'RUNNING' }));
    }
  }, []);

  /**
   * Fixed 60Hz Physics Step (Server Authoritative Equivalence)
   */
  const fixedPhysicsTick = useCallback(() => {
    if (statusRef.current !== 'RUNNING') return;

    const dt = FIXED_TIMESTEP_SEC;
    runDurationMsRef.current += dt * 1000;

    const biome = getBiomeForDistance(playerZRef.current);

    // Speed progression
    if (currentSpeedRef.current < MAX_SPEED) {
      currentSpeedRef.current += SPEED_ACCELERATION * dt;
    }

    // Effective forward speed
    let effectiveSpeed = currentSpeedRef.current;
    if (isOverdriveRef.current) {
      effectiveSpeed += OVERDRIVE_SPEED_BOOST;
      overdriveTimerMsRef.current -= dt * 1000;
      if (overdriveTimerMsRef.current <= 0) {
        isOverdriveRef.current = false;
        overdriveTimerMsRef.current = 0;
      }
    }

    // Update player track distance
    playerZRef.current += effectiveSpeed * dt;

    // Kinematic player position update (lateral easing, gravity, buffering)
    kinematicRef.current.update(dt, biome);

    // Audio pitch follows speed ratio
    soundEngine.updateEnginePitch(effectiveSpeed / MAX_SPEED);

    // Has magnet active check
    const hasMagnet = isOverdriveRef.current || powerUpsRef.current.some((p) => p.type === 'coin_magnet');

    // 1. Chunk Recycling & Spawning
    const currentZ = playerZRef.current;
    const currentChunkIndex = Math.floor(currentZ / CHUNK_LENGTH);

    // If we moved into a new chunk, recycle old chunks behind and spawn new ones ahead
    if (currentChunkIndex > currentChunkIndexRef.current) {
      currentChunkIndexRef.current = currentChunkIndex;

      // Filter out chunks that are far behind player (>1 chunk behind)
      activeChunksRef.current = activeChunksRef.current.filter(
        (c) => c.zStart + c.length > currentZ - CHUNK_LENGTH
      );

      // Ensure 4 chunks ahead exist
      const maxExistingChunk = Math.max(...activeChunksRef.current.map((c) => Math.floor(c.zStart / CHUNK_LENGTH)));
      for (let i = maxExistingChunk + 1; i <= currentChunkIndex + 4; i++) {
        activeChunksRef.current.push(generateChunk(i, gameState.seed));
      }
    }

    // 2. Collision & Near-Miss Detection
    const player = kinematicRef.current.player;
    let fatalImpact = false;
    let causeOfDeath = 'Impact with Hazard';

    for (const chunk of activeChunksRef.current) {
      // Check obstacles
      for (const obs of chunk.obstacles) {
        const result = kinematicRef.current.checkObstacleCollision(obs, currentZ, isOverdriveRef.current);

        if (result === 'impact') {
          // Check if kinetic shield absorbs it
          const shieldIdx = powerUpsRef.current.findIndex((p) => p.type === 'shield');
          if (shieldIdx >= 0) {
            powerUpsRef.current.splice(shieldIdx, 1);
            player.invincibleTimerMs = 1200; // 1.2s post-hit invincibility
            obs.cleared = true;
            soundEngine.playImpact();
            if (rendererRef.current) rendererRef.current.triggerScreenShake(0.6);
          } else {
            fatalImpact = true;
            causeOfDeath = obs.type === 'barrier_high' ? 'High Overhead Barrier' : obs.type === 'barrier_low' ? 'Low Laser Hurdle' : obs.type === 'pitfall' ? 'Void Chasm Pitfall' : 'Oncoming Drone Train';
            break;
          }
        } else if (result === 'near_miss') {
          // Near-miss spark burst!
          nearMissesRef.current += 1;
          comboMultiplierRef.current = Math.min(5.0, comboMultiplierRef.current + 0.25);
          scoreRef.current += Math.floor(250 * comboMultiplierRef.current);

          // Charge Overdrive meter (12% per near miss)
          overdriveGaugeRef.current = Math.min(100, overdriveGaugeRef.current + 12);
          soundEngine.playNearMiss();

          if (rendererRef.current) {
            const screenX = rendererRef.current.project(player.currentX, player.yPos, 2.8).x;
            const screenY = rendererRef.current.project(player.currentX, player.yPos, 2.8).y;
            rendererRef.current.addNearMissSparks(screenX, screenY, 24);
            rendererRef.current.triggerScreenShake(0.3);
          }
        }
      }

      if (fatalImpact) break;

      // Check collectibles
      for (const col of chunk.collectibles) {
        const collected = kinematicRef.current.checkCollectibleCollision(col, currentZ, hasMagnet);
        if (collected) {
          if (col.type === 'coin') {
            coinsRef.current += 1;
            scoreRef.current += Math.floor(100 * comboMultiplierRef.current);
            soundEngine.playCoin();
            if (rendererRef.current) {
              const p = rendererRef.current.project(player.currentX, player.yPos, 2.8);
              rendererRef.current.addCoinBurst(p.x, p.y);
            }
          } else if (col.type === 'overdrive_boost') {
            overdriveGaugeRef.current = Math.min(100, overdriveGaugeRef.current + 50);
            soundEngine.playNearMiss();
          } else {
            // Powerup with duration
            powerUpsRef.current.push({
              type: col.type,
              expiresAtMs: runDurationMsRef.current + 8000,
            });
            soundEngine.playNearMiss();
          }
        }
      }
    }

    // Score accumulation by distance
    scoreRef.current += Math.floor(effectiveSpeed * dt * 8 * comboMultiplierRef.current);

    // Clean up expired powerups
    powerUpsRef.current = powerUpsRef.current.filter((p) => p.expiresAtMs > runDurationMsRef.current);

    // 3. Ghost Interpolation
    if (ghostTelemetryRef.current && ghostTelemetryRef.current.length > 0) {
      const gPoints = ghostTelemetryRef.current;
      const targetTime = runDurationMsRef.current;

      // Find closest telemetry slice
      let closest = gPoints[0];
      for (let i = 0; i < gPoints.length; i++) {
        if (gPoints[i].timeMs >= targetTime) {
          closest = gPoints[i];
          break;
        }
      }
      ghostZRef.current = closest.z;
      ghostLaneRef.current = closest.lane;
    }

    // 4. Handle Fatal Crash
    if (fatalImpact) {
      statusRef.current = 'CRASHED';
      soundEngine.stopEngineHum();
      soundEngine.playImpact();
      if (rendererRef.current) rendererRef.current.triggerScreenShake(1.5);

      const submission: RunSubmissionPayload = {
        seed: gameState.seed,
        playerName: 'PILOT-01',
        distance: Math.floor(playerZRef.current),
        score: scoreRef.current,
        coins: coinsRef.current,
        nearMisses: nearMissesRef.current,
        maxCombo: Number(comboMultiplierRef.current.toFixed(1)),
        durationMs: Math.floor(runDurationMsRef.current),
        causeOfDeath,
        inputTelemetry: telemetryRef.current,
      };

      setGameState((prev) => ({
        ...prev,
        status: 'CRASHED',
        distanceMeters: Math.floor(playerZRef.current),
        score: scoreRef.current,
        coinsCollected: coinsRef.current,
        nearMissCount: nearMissesRef.current,
      }));

      if (onGameOver) {
        onGameOver(submission);
      }
    }
  }, [gameState.seed, onGameOver]);

  /**
   * Main requestAnimationFrame Loop (Decoupled Physics & Render)
   */
  useEffect(() => {
    let isRunning = true;

    const gameLoop = (timestamp: number) => {
      if (!isRunning) return;

      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const frameDeltaSec = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      if (statusRef.current === 'RUNNING') {
        // Fixed Timestep Accumulator (prevents spiral of death)
        accumulatorRef.current += frameDeltaSec;
        while (accumulatorRef.current >= FIXED_TIMESTEP_SEC) {
          fixedPhysicsTick();
          accumulatorRef.current -= FIXED_TIMESTEP_SEC;
        }

        // Periodic Telemetry Position Heartbeat (every ~100ms)
        if (telemetryRef.current.length === 0 || runDurationMsRef.current - telemetryRef.current[telemetryRef.current.length - 1].timeMs > 100) {
          telemetryRef.current.push({
            timeMs: Math.floor(runDurationMsRef.current),
            action: 'tick',
            lane: kinematicRef.current.player.lane,
            y: Number(kinematicRef.current.player.yPos.toFixed(1)),
            z: Number(playerZRef.current.toFixed(1)),
          });
        }

        // Throttle React State Updates to ~15Hz for buttery 60fps rendering without React overhead
        hudSyncTimerRef.current += frameDeltaSec;
        if (hudSyncTimerRef.current >= 0.065) {
          hudSyncTimerRef.current = 0;
          const currentDistance = Math.floor(playerZRef.current);
          const currentBiome = getBiomeForDistance(currentDistance);
          setActiveBiome(currentBiome);

          const ghostDelta = ghostTelemetryRef.current ? Math.floor(currentDistance - ghostZRef.current) : 0;
          setGhostDeltaMeters(ghostDelta);

          setGameState((prev) => ({
            ...prev,
            distanceMeters: currentDistance,
            currentSpeed: currentSpeedRef.current,
            score: scoreRef.current,
            coinsCollected: coinsRef.current,
            nearMissCount: nearMissesRef.current,
            overdriveGauge: Number(overdriveGaugeRef.current.toFixed(1)),
            isOverdriveActive: isOverdriveRef.current,
            activePowerUps: [...powerUpsRef.current],
            ghostDistanceMeters: Math.floor(ghostZRef.current),
          }));
        }
      }

      // Render Directly to Canvas 2D
      if (rendererRef.current) {
        const biome = getBiomeForDistance(playerZRef.current);
        rendererRef.current.render(
          frameDeltaSec,
          kinematicRef.current.player,
          playerZRef.current,
          activeChunksRef.current,
          biome,
          isOverdriveRef.current,
          ghostTelemetryRef.current ? ghostZRef.current : null,
          ghostTelemetryRef.current ? ghostLaneRef.current : null,
          settings.screenShake,
          settings.cameraTilt
        );
      }

      animFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      soundEngine.stopEngineHum();
    };
  }, [fixedPhysicsTick, settings.cameraTilt, settings.screenShake]);

  return {
    gameState,
    ghostDeltaMeters,
    activeBiome,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    handleShiftLane,
    handleJump,
    handleSlide,
    triggerOverdrive,
    loadGhostTelemetry,
  };
}
