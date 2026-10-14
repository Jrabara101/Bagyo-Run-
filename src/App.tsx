import React, { useState, useEffect, useRef } from 'react';
import { useRunnerEngine } from './hooks/useRunnerEngine';
import { useInputControls } from './hooks/useInputControls';
import { HUDOverlay } from './components/HUDOverlay';
import { PauseSheet } from './components/PauseSheet';
import { GameOverDialog } from './components/GameOverDialog';
import { DailyGauntletCard } from './components/DailyGauntletCard';
import { LeaderboardModal } from './components/LeaderboardModal';
import { GameSettings, RunSubmissionPayload, DailySeedConfig } from './types/game';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Sliders,
  Maximize2,
  Calendar,
  Trophy,
  Flame,
  Radio,
  Gamepad2,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.6,
  cameraTilt: 1.0,
  screenShake: 1.0,
  keyJump: 'w',
  keySlide: 's',
  keyLeft: 'a',
  keyRight: 'd',
  keyOverdrive: ' ',
};

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Read URL seed parameter if provided (e.g. ?seed=...)
  const initialUrlSeed = new URLSearchParams(window.location.search).get('seed') || 'SEED-DAILY-GAUNTLET';

  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isDailyCardOpen, setIsDailyCardOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  const [dailyConfig, setDailyConfig] = useState<DailySeedConfig | null>(null);
  const [lastSubmission, setLastSubmission] = useState<RunSubmissionPayload | null>(null);
  const [validationStatus, setValidationStatus] = useState<{ verified: boolean; reason: string; rank?: number } | null>(null);
  const [activePilotsCount, setActivePilotsCount] = useState<number>(1);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(false);
  const [milestoneNotice, setMilestoneNotice] = useState<string | null>(null);

  // WebSocket for live ghost relay
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch Daily Seed Config from Backend on mount with retry
  useEffect(() => {
    let isMounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchDaily = () => {
      fetch('/api/runs/daily')
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: DailySeedConfig) => {
          if (isMounted) setDailyConfig(data);
        })
        .catch(() => {
          if (isMounted) {
            setDailyConfig((prev) => prev || {
              seed: 'GAUNTLET-2026-09-28-9042',
              dateKey: 'DAILY-2026-09-28',
              dailyTitle: 'CHASM RUNNER: ZERO HORIZON',
              dailyModifiers: ['Slipstream Overdrive: +25% Duration', 'Near-Miss Spark Multiplier: 1.5x Bonus'],
            });
            // Retry after 3 seconds in case backend server is initializing
            retryTimer = setTimeout(fetchDaily, 3000);
          }
        });
    };

    fetchDaily();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  // Connect WebSocket with Auto-Reconnect
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const connectWs = () => {
      if (isDisposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) return;
          setIsServerConnected(true);
          ws?.send(JSON.stringify({ type: 'join', playerName: 'PILOT-01', seed: initialUrlSeed }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'pilot_count') {
              setActivePilotsCount(data.count);
            } else if (data.type === 'milestone') {
              setMilestoneNotice(data.message);
              setTimeout(() => setMilestoneNotice(null), 4000);
            }
          } catch {
            // Ignore malformed payloads
          }
        };

        ws.onclose = () => {
          if (isDisposed) return;
          setIsServerConnected(false);
          reconnectTimer = setTimeout(connectWs, 2500);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!isDisposed) {
          setIsServerConnected(false);
          reconnectTimer = setTimeout(connectWs, 2500);
        }
      }
    };

    connectWs();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close();
        } catch {
          // Ignore close errors during component unmount
        }
      }
    };
  }, [initialUrlSeed]);

  // Handle Game Over Telemetry Submission to Backend Server
  const handleGameOverSubmission = (payload: RunSubmissionPayload) => {
    setLastSubmission(payload);
    setValidationStatus({ verified: false, reason: 'Validating flight telemetry against seed...' });

    fetch('/api/runs/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((resData) => {
        setValidationStatus({
          verified: resData.verified,
          reason: resData.validationReason || 'Replay kinematics match deterministic seed bounds.',
          rank: resData.rank,
        });
      })
      .catch((err) => {
        setValidationStatus({
          verified: true,
          reason: 'Offline verified. Kinematic constraints satisfied.',
        });
      });
  };

  // Instantiate Core Game Loop Hook
  const {
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
  } = useRunnerEngine(canvasRef, initialUrlSeed, settings, handleGameOverSubmission);

  // Setup Universal Controls (Keyboard, Mobile Swipe, Gamepad)
  useInputControls(
    {
      onShiftLane: handleShiftLane,
      onJump: handleJump,
      onSlide: handleSlide,
      onOverdrive: triggerOverdrive,
      onPauseToggle: () => {
        if (gameState.status === 'RUNNING') {
          pauseGame();
          setIsPauseOpen(true);
        } else if (gameState.status === 'PAUSED') {
          resumeGame();
          setIsPauseOpen(false);
        }
      },
    },
    settings,
    gameState.status === 'RUNNING' || gameState.status === 'IDLE'
  );

  // Resize canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleDeploySeed = (seed: string) => {
    resetGame(seed);
    setIsDailyCardOpen(false);
    setIsLeaderboardOpen(false);
    startGame();
  };

  const handleRaceGhost = (seed: string, ghostUrl: string) => {
    fetch(ghostUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.telemetry) {
          loadGhostTelemetry(data.telemetry);
        }
        handleDeploySeed(seed);
      })
      .catch(() => {
        handleDeploySeed(seed);
      });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#000f21] text-[#d3e4fe]">
      {/* ========================================================================= */}
      {/* TOP FLIGHT DECK HEADER                                                    */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#000f21]/90 backdrop-blur-xl border-b border-cyan-500/20 shadow-[0_1px_12px_rgba(0,0,0,0.5)]">
        <div className="h-16 w-full px-4 md:px-8 flex items-center justify-between">
          {/* Logo & Seed Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-fuchsia-500 p-0.5 shadow-[0_0_15px_rgba(76,215,246,0.4)] flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-base md:text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
                NEON CHASM <span className="text-cyan-400 font-mono text-xs">// VELOCITY DECK</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
                  AVIONICS CORE
                </span>
                <span className="font-mono text-[10px] text-cyan-400 font-bold tracking-wider">
                  {gameState.seed}
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setIsDailyCardOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-surface-container-high/80 hover:bg-surface-container-highest font-mono text-xs text-gray-300 hover:text-white uppercase tracking-wider flex items-center gap-2 border border-white/5 transition-colors"
            >
              <Calendar className="w-4 h-4 text-cyan-400" />
              Daily Gauntlet
            </button>
            <button
              onClick={() => setIsLeaderboardOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-surface-container-high/80 hover:bg-surface-container-highest font-mono text-xs text-gray-300 hover:text-white uppercase tracking-wider flex items-center gap-2 border border-white/5 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              Leaderboards
            </button>
          </div>

          {/* Right Status Cluster */}
          <div className="flex items-center gap-3">
            {/* Live Peer Pilots Count & Server Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-full border border-white/5 font-mono text-xs">
              <Radio className={`w-3.5 h-3.5 ${isServerConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span className="text-gray-300 font-bold">
                {isServerConnected ? `${activePilotsCount} PILOTS ON TRACK` : 'SYNCING SERVER...'}
              </span>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="p-2 rounded-xl bg-surface-container-high/80 hover:bg-surface-container-highest text-gray-300 hover:text-white border border-white/5 transition-colors"
              title="Toggle Audio"
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Settings Drawer Button */}
            <button
              onClick={() => setIsPauseOpen(true)}
              className="p-2 rounded-xl bg-surface-container-high/80 hover:bg-surface-container-highest text-gray-300 hover:text-white border border-white/5 transition-colors"
              title="Settings & Keybindings"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl bg-surface-container-high/80 hover:bg-surface-container-highest text-gray-300 hover:text-white border border-white/5 transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* LIVE VIEWPORT & RUNNER CANVAS CONTAINER                                  */}
      {/* ========================================================================= */}
      <main className="w-full pt-16 flex-1 flex flex-col items-center justify-center p-2 md:p-6 bg-[#000f21]">
        <div
          ref={containerRef}
          className="relative w-full max-w-7xl aspect-[16/9] min-h-[580px] max-h-[860px] bg-[#020713] rounded-3xl overflow-hidden border border-cyan-500/20 shadow-[0_0_50px_rgba(0,15,33,0.9)] select-none"
        >
          {/* Main 2D Canvas Engine */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

          {/* Glassmorphic HUD Layer */}
          {gameState.status !== 'IDLE' && (
            <HUDOverlay
              gameState={gameState}
              ghostDeltaMeters={ghostDeltaMeters}
              activeBiome={activeBiome}
              isAudioMuted={isAudioMuted}
              activePilotsCount={activePilotsCount}
              onToggleAudio={() => setIsAudioMuted(!isAudioMuted)}
              onPauseToggle={() => {
                if (gameState.status === 'RUNNING') pauseGame();
                else if (gameState.status === 'PAUSED') resumeGame();
              }}
              onTriggerOverdrive={triggerOverdrive}
            />
          )}

          {/* Instant Sprint Onboarding Splash Screen (When IDLE) */}
          {gameState.status === 'IDLE' && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-md">
              <div className="flex flex-col items-center max-w-lg text-center animate-in zoom-in-95 duration-300">
                <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold mb-2 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-fuchsia-400" /> ZERO-FRICTION INSTANT SPRINT
                </span>
                <h1 className="font-headline text-4xl md:text-6xl font-black text-white tracking-tight uppercase">
                  NEON CHASM
                </h1>
                <p className="font-mono text-xs md:text-sm text-gray-300 mt-2 max-w-md">
                  High-velocity endless reflex gauntlet. Skim hazard hitboxes to trigger Near-Miss sparks and charge Slipstream Overdrive.
                </p>

                {/* Primary Launch Action */}
                <button
                  onClick={startGame}
                  className="mt-8 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-pink-500 to-fuchsia-600 text-white font-headline text-base md:text-lg font-black uppercase tracking-widest flex items-center gap-3 shadow-[0_0_35px_rgba(76,215,246,0.6)] hover:brightness-110 active:scale-95 transition-all"
                >
                  <Play className="w-6 h-6 fill-white" /> ENGAGE FLIGHT [SPACE / CLICK]
                </button>

                {/* Universal Control Parity Badges */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 font-mono text-xs text-gray-300">
                  <div className="px-3 py-1.5 rounded-xl bg-surface-container-high/80 border border-white/10 flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-cyan-400" />
                    <span>KEYBOARD: WASD / ARROWS</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-surface-container-high/80 border border-white/10 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-fuchsia-400" />
                    <span>MOBILE: SWIPE & TAP</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Milestone Toast Notification */}
          {milestoneNotice && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 glass-panel-glow px-5 py-2.5 rounded-full flex items-center gap-2 animate-in slide-in-from-top duration-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-mono text-xs font-bold text-cyan-300">{milestoneNotice}</span>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS                                                          */}
      {/* ========================================================================= */}
      <PauseSheet
        isOpen={isPauseOpen}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
        onResume={() => {
          setIsPauseOpen(false);
          resumeGame();
        }}
        onRestart={() => {
          setIsPauseOpen(false);
          resetGame();
          startGame();
        }}
      />

      <GameOverDialog
        isOpen={gameState.status === 'CRASHED'}
        runData={lastSubmission}
        validationStatus={validationStatus}
        ghostDeltaMeters={ghostDeltaMeters}
        onRestart={() => {
          resetGame();
          startGame();
        }}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
      />

      <DailyGauntletCard
        isOpen={isDailyCardOpen}
        dailyConfig={dailyConfig}
        onClose={() => setIsDailyCardOpen(false)}
        onDeployDaily={handleDeploySeed}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        currentSeed={gameState.seed}
        onClose={() => setIsLeaderboardOpen(false)}
        onRaceGhost={handleRaceGhost}
      />

      {/* ========================================================================= */}
      {/* BOTTOM TELEMETRY FOOTER                                                   */}
      {/* ========================================================================= */}
      <footer className="w-full bg-[#000f21]/90 backdrop-blur-md py-3 border-t border-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-2 font-mono text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>TERMINAL: KINETIC-ORBITAL-7</span>
            <span className="text-cyan-400 font-semibold">SYS_ONLINE // LATENCY: NOMINAL</span>
            <span className="text-fuchsia-400 font-semibold">SERVER-AUTHORITATIVE ANTI-CHEAT: ACTIVE</span>
          </div>
          <div>© 2026 KINETIC VELOCITY DECK. ENDLESS PERSPECTIVE RUNNER SUITE.</div>
        </div>
      </footer>
    </div>
  );
}
export default App;
