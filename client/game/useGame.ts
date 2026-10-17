import { useCallback, useEffect, useRef, useState } from 'react';
import { GameSettings, GhostPoint, RunResult, RunSubmissionPayload } from '../../shared/sim/types';
import { audio } from '../audio/AudioEngine';
import { GameController, HudSnapshot, INITIAL_HUD } from './GameController';

/** Thin React bridge over GameController: owns its lifetime and mirrors a throttled HUD snapshot. */
export function useGame(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  initialSeed: string,
  settings: GameSettings,
  onGameOver?: (result: RunResult, submission: RunSubmissionPayload) => void
) {
  const [hud, setHud] = useState<HudSnapshot>(() => INITIAL_HUD(initialSeed));
  const controllerRef = useRef<GameController | null>(null);

  // Read through a ref so the controller never holds a stale callback
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  useEffect(() => {
    if (!canvasRef.current) return;
    const controller = new GameController(canvasRef.current, initialSeed, {
      onHud: setHud,
      onGameOver: (result, submission) => onGameOverRef.current?.(result, submission),
    });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
    // The controller lives for the page; seed changes go through resetGame.
  }, [canvasRef]);

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.settings = { screenShake: settings.screenShake, cameraTilt: settings.cameraTilt };
    }
  }, [settings.screenShake, settings.cameraTilt]);

  useEffect(() => {
    audio.setVolumes(settings.masterVolume, settings.sfxVolume, settings.musicVolume);
  }, [settings.masterVolume, settings.sfxVolume, settings.musicVolume]);

  const resetGame = useCallback((seed?: string) => controllerRef.current?.reset(seed || undefined), []);
  const startGame = useCallback(() => controllerRef.current?.startRun(), []);
  const startPractice = useCallback(() => controllerRef.current?.startPractice(), []);
  const pauseGame = useCallback(() => controllerRef.current?.pause(), []);
  const resumeGame = useCallback(() => controllerRef.current?.resume(), []);
  const handleShiftLane = useCallback(
    (direction: -1 | 1) => controllerRef.current?.input(direction < 0 ? 'LEFT' : 'RIGHT'),
    []
  );
  const handleJump = useCallback(() => controllerRef.current?.input('JUMP'), []);
  const handleSlide = useCallback(() => controllerRef.current?.input('SLIDE'), []);
  const triggerOverdrive = useCallback(() => controllerRef.current?.input('BAYANIHAN'), []);
  const raceGhost = useCallback((seed: string, points: GhostPoint[]) => controllerRef.current?.raceGhost(seed, points), []);

  return {
    gameState: hud.state,
    ghostDeltaMeters: hud.ghostDeltaMeters,
    gateFeedback: hud.gateFeedback,
    practice: hud.practice,
    coach: hud.coach,
    startGame,
    startPractice,
    pauseGame,
    resumeGame,
    resetGame,
    handleShiftLane,
    handleJump,
    handleSlide,
    triggerOverdrive,
    raceGhost,
  };
}
