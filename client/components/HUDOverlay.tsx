import React from 'react';
import { HudState } from '../../shared/sim/types';
import { AREAS, AreaId } from '../../shared/content/areas';
import { GO_BAG_ITEMS } from '../../shared/content/items';
import { BAYANIHAN_MIN_GAUGE, STARTING_HEARTS } from '../../shared/sim/constants';
import { Lang, UI, UiKey } from '../../shared/content/i18n';
import { Pause, Volume2, VolumeX, Shield, Megaphone } from 'lucide-react';

/** PAGASA signal colors, 1 to 5. */
export const SIGNAL_COLORS = ['#5aa9e6', '#6cc070', '#f2c230', '#f0862a', '#e0413a'];

const AREA_SHORT: Record<AreaId, UiKey> = {
  barangay: 'areaShortBarangay',
  estero: 'areaShortEstero',
  palayan: 'areaShortPalayan',
  evac: 'areaShortEvac',
};

interface HUDOverlayProps {
  gameState: HudState;
  ghostDeltaMeters: number;
  lang: Lang;
  practice: boolean;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  onPauseToggle: () => void;
  onTriggerOverdrive: () => void;
}

/** In-run HUD: hearts and signal, course progress, score, Go-Bag, Bayanihan meter. */
export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  gameState,
  ghostDeltaMeters,
  lang,
  practice,
  isAudioMuted,
  onToggleAudio,
  onPauseToggle,
  onTriggerOverdrive,
}) => {
  const t = (key: UiKey) => UI[key][lang];
  const progress = Math.min(1, gameState.distanceMeters / gameState.courseMeters);
  const ready = gameState.bayanihanGauge >= BAYANIHAN_MIN_GAUGE && !gameState.isBayanihanActive;
  const vest = gameState.activePowerUps.some((p) => p.type === 'life_vest');
  const whistle = gameState.activePowerUps.some((p) => p.type === 'tanod_whistle');

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 font-display text-white text-[11px] md:text-xs leading-tight">
      {/* Top left: hearts and signal */}
      <div className="hp absolute top-3 left-3 md:top-4 md:left-4 px-3 pb-2 flex flex-col gap-1.5">
        <div className="flex gap-0.5 text-2xl leading-none" aria-label={`${t('hearts')} ${gameState.hearts}/${STARTING_HEARTS}`}>
          {Array.from({ length: STARTING_HEARTS }, (_, i) => (
            <span key={i} className={i < gameState.hearts ? 'text-[#ff5a4e] drop-shadow-[0_2px_0_#7a1a12]' : 'text-white/20'}>
              ♥︎
            </span>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <span>
            {t('signalNo')} {gameState.signal}
          </span>
          <div className="flex items-end gap-[3px] h-4" aria-hidden="true">
            {SIGNAL_COLORS.map((c, i) => (
              <span
                key={i}
                className="w-1.5 rounded-sm"
                style={{ height: `${30 + i * 17}%`, background: i < gameState.signal ? c : 'rgba(255,255,255,.16)' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Top center: course progress */}
      <div className="absolute top-5 md:top-6 left-1/2 -translate-x-1/2 w-[36%] min-w-[200px]">
        <div className="relative h-2.5 rounded-full bg-black/45 border border-white/30">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, ${SIGNAL_COLORS[0]}, ${SIGNAL_COLORS[2]}, ${SIGNAL_COLORS[4]})` }}
          />
          {AREAS.map((a, i) => (
            <span
              key={a.id}
              className={`absolute top-3.5 text-[9px] md:text-[10px] whitespace-nowrap drop-shadow-[0_1px_2px_#000] ${
                gameState.areaId === a.id ? 'text-[#f2c230]' : 'text-white/80'
              }`}
              style={{
                left: `${(i === AREAS.length - 1 ? 1 : a.startM / gameState.courseMeters) * 100}%`,
                transform: i === 0 ? 'none' : i === AREAS.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {t(AREA_SHORT[a.id])}
            </span>
          ))}
          <span
            className="absolute top-1/2 w-4 h-4 rounded-full bg-[#f2c230] border-[3px] border-[#15141f] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-center gap-2 mt-7">
          {practice && <span className="px-2 py-0.5 rounded bg-[#2b5fb8] text-[10px]">{t('practiceBadge')}</span>}
          {gameState.ghostDistanceMeters > 0 && (
            <span className={`px-2 py-0.5 rounded text-[10px] ${ghostDeltaMeters >= 0 ? 'bg-[#3d8b4f]' : 'bg-[#f0862a] text-[#15141f]'}`}>
              {Math.abs(ghostDeltaMeters)} m {ghostDeltaMeters >= 0 ? t('aheadOfGhost') : t('behindGhost')}
            </span>
          )}
        </div>
      </div>

      {/* Top right: score, distance, sound and pause */}
      <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-start gap-2">
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <button onClick={onPauseToggle} className="btn-icon p-2" title={`${t('pause')} [P / ESC]`} aria-label={t('pause')}>
            <Pause className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleAudio}
            className="btn-icon p-2"
            title={isAudioMuted ? t('unmute') : t('mute')}
            aria-label={isAudioMuted ? t('unmute') : t('mute')}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-[#ff5a4e]" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
        <div className="hp px-3 pb-2 text-right flex flex-col gap-0.5 min-w-[120px]">
          <span className="text-[10px] tracking-wider text-[#f2c230]">{t('score')}</span>
          <span className="text-2xl md:text-3xl leading-none">{gameState.score.toLocaleString('en-US')}</span>
          <span className="font-body font-bold text-[11px] text-white/85">
            {(gameState.distanceMeters / 1000).toFixed(2)} / {(gameState.courseMeters / 1000).toFixed(1)} km
          </span>
        </div>
      </div>

      {/* Bottom left: Go-Bag, quiz, power-ups */}
      <div className="hp absolute bottom-3 left-3 md:bottom-4 md:left-4 px-3 pb-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#f2c230]">
            {t('goBag')} {gameState.goBag.length}/{GO_BAG_ITEMS.length}
          </span>
          <span className="text-[#9fe0a8]">
            {t('quiz')} {gameState.gatesCorrect}/{gameState.gatesTotal}
          </span>
        </div>
        <div className="flex gap-1">
          {GO_BAG_ITEMS.map((item) => {
            const packed = gameState.goBag.includes(item.id);
            return (
              <span
                key={item.id}
                title={item.name[lang]}
                className={`w-4 h-4 md:w-5 md:h-5 rounded-sm border-2 ${packed ? 'bg-[#f2c230] border-[#f2c230]' : 'border-white/35'}`}
              />
            );
          })}
        </div>
        {(vest || whistle) && (
          <div className="flex gap-1.5 text-[10px]">
            {vest && (
              <span className="px-1.5 py-0.5 rounded bg-[#f0862a] text-[#15141f] flex items-center gap-1">
                <Shield className="w-3 h-3" /> {t('lifeVest')}
              </span>
            )}
            {whistle && (
              <span className="px-1.5 py-0.5 rounded bg-[#2b5fb8] flex items-center gap-1">
                <Megaphone className="w-3 h-3" /> {t('whistle')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom right: Bayanihan meter (tap it on touch screens) */}
      <button
        onClick={onTriggerOverdrive}
        disabled={!ready}
        className={`hp absolute bottom-3 right-3 md:bottom-4 md:right-4 px-3 pb-2.5 w-[38%] max-w-[230px] min-w-[150px] flex flex-col gap-1.5 text-left pointer-events-auto ${
          ready ? 'ring-2 ring-[#f2c230] animate-pulse' : ''
        }`}
      >
        <span className="text-[#f2c230]">{t('bayanihan')}</span>
        <span className="block h-2.5 rounded-full bg-white/15 overflow-hidden">
          <span
            className="block h-full rounded-full transition-[width] duration-150"
            style={{
              width: `${gameState.isBayanihanActive ? 100 : gameState.bayanihanGauge}%`,
              background: 'linear-gradient(90deg, #3d8b4f, #f2c230)',
            }}
          />
        </span>
        <span className="font-body font-semibold text-[10px] text-white/80 normal-case">
          {gameState.isBayanihanActive ? t('bayanihanActive') : ready ? t('bayanihanReady') : t('bayanihanFill')}
        </span>
      </button>
    </div>
  );
};
