import React from 'react';
import { ArrowLeft, GraduationCap, Keyboard, Smartphone } from 'lucide-react';
import { Lang, UI, UiKey } from '../../../shared/content/i18n';
import { HAZARDS, AvoidBy } from '../../../shared/content/hazards';
import { GO_BAG_ITEMS, POWER_UPS, PowerUpType } from '../../../shared/content/items';
import { SIGNALS } from '../../../shared/content/signals';
import { ArtThumb } from '../ArtThumb';
import { SIGNAL_COLORS } from '../HUDOverlay';

const AVOID_TEXT: Record<AvoidBy, UiKey> = { jump: 'avoidJump', slide: 'avoidSlide', lane: 'avoidLane' };
const WATER_HAZARDS = new Set(['flood_hole', 'floating_debris']);
const STORM_HAZARDS = new Set(['lightning_strike']);

interface HowToPlayProps {
  lang: Lang;
  onBack: () => void;
  onPractice: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-2">
    <h3 className="font-display text-base md:text-lg text-[#f2c230]">{title}</h3>
    {children}
  </section>
);

/** Everything a new player needs, with the hazards and items drawn as they look in the game. */
export const HowToPlay: React.FC<HowToPlayProps> = ({ lang, onBack, onPractice }) => {
  const t = (key: UiKey) => UI[key][lang];
  return (
    <div className="absolute inset-0 z-30 bg-[#15141f]/88 overflow-y-auto">
      <div className="sheet max-w-4xl mx-auto my-4 md:my-8 px-5 md:px-8 pb-8 flex flex-col gap-6 font-body text-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl md:text-3xl">{t('howToPlay')}</h2>
          <button onClick={onBack} className="btn-plain px-3 py-2 text-xs flex items-center gap-2" autoFocus>
            <ArrowLeft className="w-4 h-4" /> {t('back')}
          </button>
        </div>

        <Section title={t('htpGoalTitle')}>
          <p className="max-w-prose text-[#f1ebdd]/90">{t('htpGoal')}</p>
        </Section>

        <Section title={t('htpControlsTitle')}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-black/25 p-3 flex flex-col gap-1">
              <span className="font-display text-xs flex items-center gap-2 text-[#ffe2b0]">
                <Keyboard className="w-4 h-4" /> {t('htpKeys')}
              </span>
              {(['htpLaneKeys', 'htpJumpKeys', 'htpSlideKeys', 'htpBayKeys', 'htpPauseKeys'] as const).map((k) => (
                <span key={k}>{t(k)}</span>
              ))}
            </div>
            <div className="rounded-lg bg-black/25 p-3 flex flex-col gap-1">
              <span className="font-display text-xs flex items-center gap-2 text-[#ffe2b0]">
                <Smartphone className="w-4 h-4" /> {t('htpTouch')}
              </span>
              {(['htpLaneTouch', 'htpJumpTouch', 'htpSlideTouch', 'htpBayTouch'] as const).map((k) => (
                <span key={k}>{t(k)}</span>
              ))}
            </div>
          </div>
        </Section>

        <Section title={t('htpHazardsTitle')}>
          <p className="max-w-prose text-[#f1ebdd]/90">{t('htpHazards')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.values(HAZARDS).map((h) => (
              <figure key={h.id} className="flex flex-col items-center gap-1 text-center">
                <ArtThumb subject={{ hazard: h.id }} ground={WATER_HAZARDS.has(h.id) ? '#4c5843' : STORM_HAZARDS.has(h.id) ? '#2e3240' : '#55585c'} label={h.name[lang]} />
                <figcaption className="text-xs leading-snug">
                  <span className="block font-semibold">{h.name[lang]}</span>
                  <span className="text-[#f2c230] font-display text-[10px]">{t(AVOID_TEXT[h.avoid])}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>

        <Section title={t('htpGoBagTitle')}>
          <p className="max-w-prose text-[#f1ebdd]/90">{t('htpGoBag')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {GO_BAG_ITEMS.map((item) => (
              <figure key={item.id} className="flex flex-col items-center gap-1 text-center">
                <ArtThumb subject={{ item: { type: 'gobag', itemId: item.id } }} label={item.name[lang]} />
                <figcaption className="text-xs font-semibold leading-snug">{item.name[lang]}</figcaption>
              </figure>
            ))}
          </div>
        </Section>

        <Section title={t('htpPowerTitle')}>
          <div className="grid sm:grid-cols-3 gap-3">
            {(Object.keys(POWER_UPS) as PowerUpType[]).map((type) => (
              <figure key={type} className="flex items-center gap-3">
                <ArtThumb subject={{ item: { type } }} label={POWER_UPS[type].name[lang]} />
                <figcaption className="text-xs leading-snug">
                  {t(type === 'life_vest' ? 'htpPowerVest' : type === 'tanod_whistle' ? 'htpPowerWhistle' : 'htpPowerBay')}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>

        <Section title={t('htpWeatherTitle')}>
          <div className="grid sm:grid-cols-3 gap-3 text-[#f1ebdd]/90">
            <p>
              <span className="font-display text-[#f2c230] block">➜ ➜ ➜</span>
              {t('htpGust')}
            </p>
            <p>
              <span className="font-display text-[#c9a96b] block">≈ ≈ ≈</span>
              {t('htpFlood')}
            </p>
            <p>
              <span className="font-display text-[#a9c4ff] block">ϟ</span>
              {t('htpLightning')}
            </p>
          </div>
        </Section>

        <div className="grid md:grid-cols-3 gap-5">
          <Section title={t('htpQuizTitle')}>
            <p className="text-[#f1ebdd]/90">{t('htpQuiz')}</p>
          </Section>
          <Section title={t('htpBayTitle')}>
            <p className="text-[#f1ebdd]/90">{t('htpBay')}</p>
          </Section>
          <Section title={t('htpSignalsTitle')}>
            <p className="text-[#f1ebdd]/90">{t('htpSignals')}</p>
            <div className="flex gap-1.5">
              {SIGNALS.map((s) => (
                <span key={s.level} className="font-display text-[11px] px-2 py-1 rounded text-[#15141f]" style={{ background: SIGNAL_COLORS[s.level - 1] }}>
                  {s.level}
                </span>
              ))}
            </div>
          </Section>
        </div>

        <button onClick={onPractice} className="btn-jeep self-start px-6 py-3 text-base flex items-center gap-2">
          <GraduationCap className="w-5 h-5" /> {t('startPractice')}
        </button>
      </div>
    </div>
  );
};
