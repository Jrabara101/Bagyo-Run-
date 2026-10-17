import React, { useEffect, useState } from 'react';
import { LeaderboardRecord } from '../../shared/sim/types';
import { Lang, UI, UiKey } from '../../shared/content/i18n';
import { Trophy, X, ShieldCheck, Ghost, WifiOff } from 'lucide-react';
import { localBoard } from '../game/localRuns';

interface LeaderboardModalProps {
  isOpen: boolean;
  currentSeed: string;
  lang: Lang;
  onClose: () => void;
  onRaceGhost: (runId: string) => void;
}

const MEDALS = ['#f2c230', '#d9dde2', '#c98a4a'];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, currentSeed, lang, onClose, onRaceGhost }) => {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [filterSeed, setFilterSeed] = useState<'all' | 'current'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [offline, setOffline] = useState(false);
  const t = (key: UiKey) => UI[key][lang];

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const query = filterSeed === 'current' ? `?seed=${encodeURIComponent(currentSeed)}` : '';
    fetch(`/api/leaderboard${query}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setRecords(data.records || []);
        setOffline(false);
      })
      .catch(() => {
        setRecords(localBoard(filterSeed === 'current' ? currentSeed : undefined));
        setOffline(true);
      })
      .finally(() => setLoading(false));
  }, [isOpen, filterSeed, currentSeed]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lb-title"
        onClick={(e) => e.stopPropagation()}
        className="sheet w-full max-w-2xl max-h-[85vh] px-5 md:px-7 pb-6 flex flex-col gap-4 font-body"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="lb-title" className="font-display text-2xl flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#f2c230]" /> {t('topRunners')}
          </h2>
          <button onClick={onClose} className="btn-icon p-1.5" aria-label={t('close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2">
          {(['all', 'current'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterSeed(f)}
              aria-pressed={filterSeed === f}
              className={`px-3 py-1.5 rounded-md border-2 font-display text-[11px] ${
                filterSeed === f ? 'bg-[#f2c230] border-[#f2c230] text-[#15141f]' : 'border-white/25'
              }`}
            >
              {f === 'all' ? t('allSeeds') : t('thisSeed')}
            </button>
          ))}
        </div>

        {offline && (
          <p className="text-xs text-[#f0862a] flex items-center gap-2">
            <WifiOff className="w-4 h-4" /> {t('offlineBoard')}
          </p>
        )}

        <div className="overflow-y-auto flex-1 pr-1 flex flex-col gap-1.5">
          {loading ? (
            <p className="py-10 text-center text-sm text-[#aaa6b8] animate-pulse">{t('loading')}</p>
          ) : records.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#aaa6b8]">{t('noRuns')}</p>
          ) : (
            records.map((r, index) => (
              <div key={r.id} className="px-3 py-2.5 rounded-lg bg-black/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-display text-sm w-7 text-center" style={{ color: MEDALS[index] ?? '#aaa6b8' }}>
                    #{index + 1}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm flex items-center gap-1.5 truncate">
                      {r.playerName} {!offline && <ShieldCheck className="w-3.5 h-3.5 text-[#6cc070] shrink-0" aria-label={t('verified')} />}
                    </span>
                    <span className="font-mono text-[10px] text-[#aaa6b8] truncate">
                      {t('seed')}: {r.seed}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="font-display text-sm">{r.score.toLocaleString('en-US')}</span>
                    <span className="text-[10px] text-[#aaa6b8]">
                      {(r.distance / 1000).toFixed(2)} km · {t('quiz')} {r.gatesCorrect}/{r.gatesTotal}
                    </span>
                  </div>
                  {!offline && (
                    <button
                      onClick={() => onRaceGhost(r.id)}
                      className="btn-plain px-2.5 py-1.5 text-[10px] flex items-center gap-1.5"
                    >
                      <Ghost className="w-3.5 h-3.5 text-[#8fd3ff]" /> {t('raceGhost')}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
