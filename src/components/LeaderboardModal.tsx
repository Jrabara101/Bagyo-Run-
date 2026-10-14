import React, { useEffect, useState } from 'react';
import { LeaderboardRecord } from '../types/game';
import { Trophy, X, ShieldCheck, Ghost, Flame, Sparkles } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  currentSeed: string;
  onClose: () => void;
  onRaceGhost: (seed: string, ghostTelemetryUrl: string) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  currentSeed,
  onClose,
  onRaceGhost,
}) => {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [filterSeed, setFilterSeed] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const query = filterSeed === 'current' ? `?seed=${currentSeed}` : '';
    fetch(`/api/leaderboard${query}`)
      .then((res) => res.json())
      .then((data) => {
        setRecords(data.records || []);
      })
      .catch(() => {
        // Fallback
        setRecords([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, filterSeed, currentSeed]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl glass-panel-glow rounded-3xl p-6 md:p-8 flex flex-col gap-6 text-white border border-cyan-500/30 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="font-mono text-[10px] text-amber-400 uppercase tracking-widest font-bold">
                GLOBAL TELEMETRY ARCHIVE
              </span>
              <h2 className="font-headline text-2xl font-bold tracking-tight text-white">
                Verified Flight Leaderboards
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterSeed('all')}
            className={`px-4 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-colors ${
              filterSeed === 'all'
                ? 'bg-cyan-500 text-white font-bold'
                : 'bg-surface-container-high text-gray-400 hover:text-white'
            }`}
          >
            Global Top Pilots
          </button>
          <button
            onClick={() => setFilterSeed('current')}
            className={`px-4 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-colors ${
              filterSeed === 'current'
                ? 'bg-cyan-500 text-white font-bold'
                : 'bg-surface-container-high text-gray-400 hover:text-white'
            }`}
          >
            Current Seed Only
          </button>
        </div>

        {/* Records Table */}
        <div className="overflow-y-auto flex-1 pr-1 flex flex-col gap-2">
          {loading ? (
            <div className="py-12 text-center font-mono text-xs text-gray-400 animate-pulse">
              FETCHING AUTHORITATIVE TELEMETRY LOGS...
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center font-mono text-xs text-gray-400">
              NO VERIFIED RUNS RECORDED FOR THIS FILTER YET. BE THE FIRST!
            </div>
          ) : (
            records.map((r, index) => (
              <div
                key={r.id}
                className="p-3.5 rounded-2xl bg-surface-container-low/90 border border-white/5 flex items-center justify-between gap-3 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-sm font-extrabold w-6 text-center ${
                      index === 0
                        ? 'text-amber-400'
                        : index === 1
                        ? 'text-gray-300'
                        : index === 2
                        ? 'text-amber-600'
                        : 'text-gray-500'
                    }`}
                  >
                    #{index + 1}
                  </span>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-white text-sm">
                        {r.playerName}
                      </span>
                      <span title="Anti-Cheat Verified">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-gray-400">
                      SEED: {r.seed}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-sm font-extrabold text-neon-cyan">
                      {r.distance.toLocaleString()}m
                    </span>
                    <span className="font-mono text-[10px] text-neon-amber font-semibold">
                      {r.score.toLocaleString()} PTS
                    </span>
                  </div>

                  {r.hasGhost && (
                    <button
                      onClick={() => onRaceGhost(r.seed, `/api/ghosts/${r.seed}`)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                      title="Run alongside this player's ghost hologram"
                    >
                      <Ghost className="w-3.5 h-3.5 text-cyan-400" />
                      RACE GHOST
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
