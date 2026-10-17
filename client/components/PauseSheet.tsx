import React from 'react';
import { GameSettings } from '../../shared/sim/types';
import { Lang, UI, UiKey } from '../../shared/content/i18n';
import { X, Volume2, Camera, RotateCcw, Play, Keyboard, Languages, Home, UserRound } from 'lucide-react';

interface PauseSheetProps {
  isOpen: boolean;
  /** true while a run is paused: offers resume, restart and quit; otherwise just settings. */
  paused: boolean;
  lang: Lang;
  onToggleLang: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

const Slider: React.FC<{ label: string; value: number; max?: number; step?: number; onChange: (v: number) => void }> = ({
  label,
  value,
  max = 1,
  step = 0.05,
  onChange,
}) => (
  <label className="flex flex-col gap-1">
    <span className="flex justify-between text-xs">
      <span>{label}</span>
      <span className="font-display text-[#f2c230]">{Math.round(value * 100)}%</span>
    </span>
    <input type="range" min="0" max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="slider w-full cursor-pointer" />
  </label>
);

export const PauseSheet: React.FC<PauseSheetProps> = ({ isOpen, paused, lang, onToggleLang, settings, onUpdateSettings, onResume, onRestart, onQuit }) => {
  if (!isOpen) return null;
  const t = (key: UiKey) => UI[key][lang];
  const keys: [UiKey, string][] = [
    ['jump', `${settings.keyJump.toUpperCase()} / ↑`],
    ['slide', `${settings.keySlide.toUpperCase()} / ↓`],
    ['left', `${settings.keyLeft.toUpperCase()} / ←`],
    ['right', `${settings.keyRight.toUpperCase()} / →`],
    ['bayanihan', 'SPACE'],
    ['pause', 'P / ESC'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onResume}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={paused ? t('paused') : t('settings')}
        onClick={(e) => e.stopPropagation()}
        className="sheet w-full max-w-sm h-full !rounded-none px-5 pb-5 flex flex-col gap-5 overflow-y-auto font-body"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{paused ? t('paused') : t('settings')}</h2>
          <button onClick={onResume} className="btn-icon p-1.5" aria-label={t('close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {paused && (
          <div className="flex flex-col gap-2">
            <button onClick={onResume} className="btn-jeep py-2.5 flex items-center justify-center gap-2" autoFocus>
              <Play className="w-4 h-4 fill-white" /> {t('resume')}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onRestart} className="btn-plain py-2 text-xs flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> {t('restart')}
              </button>
              <button onClick={onQuit} className="btn-plain py-2 text-xs flex items-center justify-center gap-2">
                <Home className="w-4 h-4" /> {t('quitToTitle')}
              </button>
            </div>
          </div>
        )}

        <section className="flex flex-col gap-2">
          <label htmlFor="runner-name" className="font-display text-sm text-[#f2c230] flex items-center gap-2">
            <UserRound className="w-4 h-4" /> {t('runnerName')}
          </label>
          <input
            id="runner-name"
            value={settings.playerName}
            maxLength={16}
            placeholder="RUNNER"
            autoComplete="nickname"
            onChange={(e) => onUpdateSettings({ playerName: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            className="px-3 py-2 rounded-md bg-black/30 border-2 border-white/20 focus:border-[#f2c230] outline-none font-semibold select-text"
          />
          <span className="text-[11px] text-[#aaa6b8]">{t('runnerNameHint')}</span>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-display text-sm text-[#f2c230] flex items-center gap-2">
            <Languages className="w-4 h-4" /> {t('language')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {(['en', 'fil'] as const).map((l) => (
              <button
                key={l}
                onClick={() => l !== lang && onToggleLang()}
                aria-pressed={l === lang}
                className={`py-2 rounded-md border-2 font-display text-xs ${l === lang ? 'bg-[#f2c230] border-[#f2c230] text-[#15141f]' : 'border-white/25'}`}
              >
                {l === 'en' ? 'English' : 'Filipino'}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-display text-sm text-[#f2c230] flex items-center gap-2">
            <Volume2 className="w-4 h-4" /> {t('sound')}
          </h3>
          <Slider label={t('masterVolume')} value={settings.masterVolume} onChange={(v) => onUpdateSettings({ masterVolume: v })} />
          <Slider label={t('sfxVolume')} value={settings.sfxVolume} onChange={(v) => onUpdateSettings({ sfxVolume: v })} />
          <Slider label={t('musicVolume')} value={settings.musicVolume} onChange={(v) => onUpdateSettings({ musicVolume: v })} />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-display text-sm text-[#f2c230] flex items-center gap-2">
            <Camera className="w-4 h-4" /> {t('camera')}
          </h3>
          <Slider label={t('cameraTilt')} value={settings.cameraTilt} max={2} step={0.1} onChange={(v) => onUpdateSettings({ cameraTilt: v })} />
          <Slider label={t('screenShake')} value={settings.screenShake} onChange={(v) => onUpdateSettings({ screenShake: v })} />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-display text-sm text-[#f2c230] flex items-center gap-2">
            <Keyboard className="w-4 h-4" /> {t('controls')}
          </h3>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {keys.map(([label, key]) => (
              <div key={label} className="px-2.5 py-1.5 rounded-md bg-black/25 flex justify-between items-center">
                <span>{t(label)}</span>
                <span className="font-mono font-bold text-[#f2c230]">{key}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
