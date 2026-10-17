import React, { useState, useEffect, useRef } from 'react';
import { useGame } from './game/useGame';
import { PRACTICE_SEED } from './game/GameController';
import { useInputControls } from './hooks/useInputControls';
import { HUDOverlay } from './components/HUDOverlay';
import { PauseSheet } from './components/PauseSheet';
import { GameOverDialog, VerifyState } from './components/GameOverDialog';
import { DailyGauntletCard } from './components/DailyGauntletCard';
import { LeaderboardModal } from './components/LeaderboardModal';
import { QuizGateBanner } from './components/QuizGateBanner';
import { TitleScreen } from './components/screens/TitleScreen';
import { HowToPlay } from './components/screens/HowToPlay';
import { Credits } from './components/screens/Credits';
import { audio } from './audio/AudioEngine';
import { Lang, UI, UiKey } from '../shared/content/i18n';
import { GameSettings, RunResult, RunSubmissionPayload, RunVerifyResponse, DailySeedConfig } from '../shared/sim/types';
import { Volume2, VolumeX, Settings, Maximize2, Calendar, Trophy, Radio, Lightbulb } from 'lucide-react';

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

const SETTINGS_KEY = 'bagyo-settings';
const LANG_KEY = 'bagyo-lang';
const MUTE_KEY = 'bagyo-muted';

type Screen = 'title' | 'howto' | 'credits';

function readStored<T>(key: string, fallback: T, parse: (raw: string) => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : parse(raw);
  } catch {
    return fallback;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice lasts for this page only
  }
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Read URL seed parameter if provided (e.g. ?seed=...)
  const initialUrlSeed = new URLSearchParams(window.location.search).get('seed') || 'SEED-DAILY-GAUNTLET';

  const [settings, setSettings] = useState<GameSettings>(() =>
    readStored(SETTINGS_KEY, DEFAULT_SETTINGS, (raw) => ({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }))
  );
  const [lang, setLang] = useState<Lang>(() => readStored<Lang>(LANG_KEY, 'en', (raw) => (raw === 'fil' ? 'fil' : 'en')));
  const [isAudioMuted, setIsAudioMuted] = useState(() => readStored(MUTE_KEY, false, (raw) => raw === '1'));
  const [screen, setScreen] = useState<Screen>('title');
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isDailyCardOpen, setIsDailyCardOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  const [dailyConfig, setDailyConfig] = useState<DailySeedConfig | null>(null);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [verify, setVerify] = useState<{ state: VerifyState; reason?: string; rank?: number } | null>(null);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(false);
  const t = (key: UiKey) => UI[key][lang];

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'fil' : 'en';
    setLang(next);
    store(LANG_KEY, next);
  };

  useEffect(() => {
    document.documentElement.lang = lang === 'fil' ? 'fil' : 'en';
  }, [lang]);

  useEffect(() => {
    store(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    audio.setMuted(isAudioMuted);
    store(MUTE_KEY, isAudioMuted ? '1' : '0');
  }, [isAudioMuted]);

  // Browsers only allow sound after a user gesture: start the title music on the first one
  useEffect(() => {
    const unlock = () => {
      audio.unlock();
      audio.setMusicLevel(statusRef.current === 'RUNNING' ? 'run' : 'menu');
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

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
            setDailyConfig((prev) => prev || { seed: initialUrlSeed, dateKey: '', dailyTitle: '', dailyModifiers: [] });
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

  // Server status for the header badge (the game is fully playable offline)
  useEffect(() => {
    let isMounted = true;
    const ping = () => {
      fetch('/api/health')
        .then((res) => isMounted && setIsServerConnected(res.ok))
        .catch(() => isMounted && setIsServerConnected(false));
    };
    ping();
    const timer = setInterval(ping, 10000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Submit the input log; the server replays it and returns its own result. Practice runs stay local.
  const handleGameOverSubmission = (result: RunResult, payload: RunSubmissionPayload) => {
    setLastResult(result);
    if (payload.seed === PRACTICE_SEED) {
      setVerify({ state: 'practice' });
      return;
    }
    setVerify({ state: 'checking' });

    fetch('/api/runs/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json() as Promise<RunVerifyResponse>)
      .then((res) => {
        const matches = res.verified && res.result?.score === result.score;
        setVerify({ state: matches ? 'verified' : res.verified ? 'mismatch' : 'rejected', reason: res.reason, rank: res.rank });
      })
      .catch(() => setVerify({ state: 'offline' }));
  };

  const {
    gameState,
    ghostDeltaMeters,
    gateFeedback,
    practice,
    coach,
    startGame,
    startPractice,
    pauseGame,
    resumeGame,
    resetGame,
    handleShiftLane,
    handleJump,
    handleSlide,
    triggerOverdrive,
    loadGhostTelemetry,
  } = useGame(canvasRef, initialUrlSeed, settings, handleGameOverSubmission);

  const statusRef = useRef(gameState.status);
  statusRef.current = gameState.status;

  const openPause = () => {
    if (gameState.status === 'RUNNING') pauseGame();
    setIsPauseOpen(true);
  };
  const closePause = () => {
    setIsPauseOpen(false);
    if (gameState.status === 'PAUSED') resumeGame();
  };
  const backToTitle = () => {
    setIsPauseOpen(false);
    setIsLeaderboardOpen(false);
    resetGame();
    setScreen('title');
  };
  const restart = () => {
    setIsPauseOpen(false);
    if (practice) startPractice();
    else {
      resetGame();
      startGame();
    }
  };

  useInputControls(
    {
      onShiftLane: handleShiftLane,
      onJump: handleJump,
      onSlide: handleSlide,
      onOverdrive: triggerOverdrive,
      onPauseToggle: () => {
        if (gameState.status === 'RUNNING') openPause();
        else if (gameState.status === 'PAUSED') closePause();
      },
    },
    settings,
    gameState.status === 'RUNNING' || gameState.status === 'PAUSED'
  );

  // SPACE / ENTER on the title screen starts a run (a focused button handles its own keys)
  const modalOpen = isPauseOpen || isDailyCardOpen || isLeaderboardOpen;
  useEffect(() => {
    if (gameState.status !== 'IDLE' || screen !== 'title' || modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button, input, a')) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState.status, screen, modalOpen, startGame]);

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

  const inRun = gameState.status === 'RUNNING' || gameState.status === 'PAUSED';

  return (
    <div className="flex flex-col min-h-screen bg-[#15141f] text-[#f1ebdd]">
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#15141f]/95 border-b border-[#2f2d42]">
        <div className="h-14 w-full px-3 md:px-8 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="takbo-logo font-display text-xl md:text-2xl leading-none">TAKBO!</span>
            <span className="font-display text-xs md:text-sm text-white">BAGYO RUN</span>
            <span className="hidden lg:inline font-mono text-[10px] text-[#aaa6b8] truncate ml-2">
              {t('seed')}: {gameState.seed}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <button onClick={() => setIsDailyCardOpen(true)} className="btn-plain px-3 py-1.5 text-[11px] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#f2c230]" /> {t('daily')}
            </button>
            <button onClick={() => setIsLeaderboardOpen(true)} className="btn-plain px-3 py-1.5 text-[11px] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#f2c230]" /> {t('leaderboard')}
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#2f2d42] text-[11px] font-semibold">
              <Radio className={`w-3.5 h-3.5 ${isServerConnected ? 'text-[#6cc070]' : 'text-[#f0862a]'}`} />
              {isServerConnected ? t('serverOnline') : t('offline')}
            </span>
            <button onClick={toggleLang} className="btn-icon px-2.5 py-1.5 font-display text-[11px]" title={t('switchLang')} aria-label={t('switchLang')}>
              <span className={lang === 'en' ? 'text-[#f2c230]' : 'text-white/50'}>EN</span>
              <span className="text-white/30"> / </span>
              <span className={lang === 'fil' ? 'text-[#f2c230]' : 'text-white/50'}>FIL</span>
            </button>
            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="btn-icon p-2"
              title={isAudioMuted ? t('unmute') : t('mute')}
              aria-label={isAudioMuted ? t('unmute') : t('mute')}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-[#ff5a4e]" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button onClick={openPause} className="btn-icon p-2" title={t('settings')} aria-label={t('settings')}>
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={handleToggleFullscreen} className="btn-icon p-2" title={t('fullscreen')} aria-label={t('fullscreen')}>
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 flex-1 flex flex-col items-center justify-center px-2 pb-2 md:px-5">
        <div
          ref={containerRef}
          className="relative w-full max-w-7xl h-[min(calc(100vh-5.5rem),56.25vw,860px)] min-h-[420px] bg-[#15141f] rounded-xl overflow-hidden border border-[#2f2d42] select-none"
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

          {inRun && (
            <HUDOverlay
              gameState={gameState}
              ghostDeltaMeters={ghostDeltaMeters}
              lang={lang}
              practice={practice}
              isAudioMuted={isAudioMuted}
              onToggleAudio={() => setIsAudioMuted(!isAudioMuted)}
              onPauseToggle={openPause}
              onTriggerOverdrive={triggerOverdrive}
            />
          )}

          {inRun && <QuizGateBanner gate={gameState.gate} feedback={gateFeedback} gatesTotal={gameState.gatesTotal} lang={lang} />}

          {gameState.status === 'RUNNING' && coach && coach !== 'coachGate' && (
            <div className="absolute left-1/2 -translate-x-1/2 top-[24%] z-20 pointer-events-none" role="status" aria-live="polite">
              <div className="px-4 py-2 rounded-lg bg-[#2b5fb8] border-2 border-[#f2c230] shadow-[4px_4px_0_#15141f] font-display text-sm md:text-base text-white flex items-center gap-2 animate-in fade-in">
                <Lightbulb className="w-4 h-4 text-[#f2c230]" /> {t(coach)}
              </div>
            </div>
          )}

          {gameState.status === 'IDLE' && screen === 'title' && (
            <TitleScreen
              lang={lang}
              onPlay={startGame}
              onPractice={startPractice}
              onHowTo={() => setScreen('howto')}
              onDaily={() => setIsDailyCardOpen(true)}
              onLeaderboard={() => setIsLeaderboardOpen(true)}
              onSettings={openPause}
              onCredits={() => setScreen('credits')}
            />
          )}
          {gameState.status === 'IDLE' && screen === 'howto' && (
            <HowToPlay
              lang={lang}
              onBack={() => setScreen('title')}
              onPractice={() => {
                setScreen('title');
                startPractice();
              }}
            />
          )}
          {gameState.status === 'IDLE' && screen === 'credits' && <Credits lang={lang} onBack={() => setScreen('title')} />}
        </div>
      </main>

      <PauseSheet
        isOpen={isPauseOpen}
        paused={gameState.status === 'PAUSED'}
        lang={lang}
        onToggleLang={toggleLang}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
        onResume={closePause}
        onRestart={restart}
        onQuit={backToTitle}
      />

      <GameOverDialog
        isOpen={gameState.status === 'ENDED' && !isLeaderboardOpen}
        runData={lastResult}
        verify={verify}
        lang={lang}
        onRestart={restart}
        onTitle={backToTitle}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
      />

      <DailyGauntletCard
        isOpen={isDailyCardOpen}
        dailyConfig={dailyConfig}
        lang={lang}
        onClose={() => setIsDailyCardOpen(false)}
        onDeployDaily={handleDeploySeed}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        currentSeed={gameState.seed}
        lang={lang}
        onClose={() => setIsLeaderboardOpen(false)}
        onRaceGhost={handleRaceGhost}
      />

      <footer className="w-full py-3 border-t border-[#2f2d42]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#aaa6b8]">
          <span>{t('footer')}</span>
          <button
            disabled={inRun}
            onClick={() => {
              backToTitle();
              setScreen('credits');
            }}
            className="underline underline-offset-2 hover:text-[#f2c230]"
          >
            {t('credits')}
          </button>
        </div>
      </footer>
    </div>
  );
}
export default App;
