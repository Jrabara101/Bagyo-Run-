import React, { useState } from 'react';
import { DailyChallenge } from '../../shared/sim/types';
import { Lang, UI, UiKey } from '../../shared/content/i18n';
import { Calendar, Trophy, Link, Check, Play, X } from 'lucide-react';

interface DailyGauntletCardProps {
  isOpen: boolean;
  dailyConfig: DailyChallenge | null;
  lang: Lang;
  onClose: () => void;
  onDeployDaily: (seed: string) => void;
}

/** Today's shared seed: everyone runs the same course and the same quiz. */
export const DailyGauntletCard: React.FC<DailyGauntletCardProps> = ({ isOpen, dailyConfig, lang, onClose, onDeployDaily }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const t = (key: UiKey) => UI[key][lang];

  if (!isOpen || !dailyConfig) return null;

  const handleCopyChallengeLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?seed=${encodeURIComponent(dailyConfig.seed)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-title"
        onClick={(e) => e.stopPropagation()}
        className="sheet w-full max-w-md px-5 md:px-7 pb-6 flex flex-col gap-5 font-body"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="font-display text-xs text-[#f2c230] flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> {t('daily')} · {dailyConfig.dateKey}
            </span>
            <h2 id="daily-title" className="takbo-logo font-display text-3xl mt-1">
              {dailyConfig.storm[lang]}
            </h2>
            <p className="text-sm text-[#f1ebdd]/85 mt-2">{t('dailyNote')}</p>
          </div>
          <button onClick={onClose} className="btn-icon p-1.5" aria-label={t('close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <dl className="rounded-lg bg-black/25 p-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-[#aaa6b8]">{t('todaysSeed')}</dt>
          <dd className="font-mono font-bold text-right break-all">{dailyConfig.seed}</dd>
          {dailyConfig.topRun && (
            <>
              <dt className="text-[#aaa6b8] flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#f2c230]" /> {t('seedRecord')}
              </dt>
              <dd className="text-right">
                {dailyConfig.topRun.score.toLocaleString('en-US')} {t('by')} {dailyConfig.topRun.playerName}
              </dd>
            </>
          )}
        </dl>

        <div className="flex flex-col gap-2">
          <button onClick={() => onDeployDaily(dailyConfig.seed)} className="btn-jeep py-3 flex items-center justify-center gap-2" autoFocus>
            <Play className="w-4 h-4 fill-white" /> {t('playDaily')}
          </button>
          <button onClick={handleCopyChallengeLink} className="btn-plain py-2.5 text-xs flex items-center justify-center gap-2">
            {copiedLink ? <Check className="w-4 h-4 text-[#6cc070]" /> : <Link className="w-4 h-4" />}
            {copiedLink ? t('linkCopied') : t('copyLink')}
          </button>
        </div>
      </div>
    </div>
  );
};
