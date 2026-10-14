import React, { useState } from 'react';
import { DailySeedConfig } from '../types/game';
import { Calendar, Trophy, Link, Check, Zap, Play, X, Compass } from 'lucide-react';

interface DailyGauntletCardProps {
  isOpen: boolean;
  dailyConfig: DailySeedConfig | null;
  onClose: () => void;
  onDeployDaily: (seed: string) => void;
}

export const DailyGauntletCard: React.FC<DailyGauntletCardProps> = ({
  isOpen,
  dailyConfig,
  onClose,
  onDeployDaily,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !dailyConfig) return null;

  const handleCopyChallengeLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?seed=${dailyConfig.seed}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-panel-glow rounded-3xl p-6 md:p-8 flex flex-col gap-6 text-white border border-cyan-500/30">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                SYNCHRONIZED DAILY SEED
              </span>
              <h2 className="font-headline text-xl font-bold tracking-tight text-white">
                {dailyConfig.dailyTitle}
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

        {/* Seed Info Box */}
        <div className="p-4 rounded-2xl bg-surface-container-high/80 border border-white/10 flex flex-col gap-2">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-gray-400">TODAY'S SEED KEY:</span>
            <span className="text-cyan-300 font-bold tracking-wider">{dailyConfig.seed}</span>
          </div>

          {dailyConfig.topRecord && (
            <div className="flex justify-between items-center font-mono text-xs border-t border-white/10 pt-2 mt-1">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> SEED RECORD:
              </span>
              <span className="text-amber-300 font-bold">
                {dailyConfig.topRecord.distance.toLocaleString()}m by {dailyConfig.topRecord.playerName}
              </span>
            </div>
          )}
        </div>

        {/* Daily Active Modifiers */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
            SYNCHRONIZED GAUNTLET MODIFIERS
          </span>
          <div className="flex flex-col gap-1.5">
            {dailyConfig.dailyModifiers.map((mod, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-surface-container-low/90 border border-white/5 font-mono text-xs text-gray-200 flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>{mod}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={() => onDeployDaily(dailyConfig.seed)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-headline text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)]"
          >
            <Play className="w-4 h-4 fill-white" /> DEPLOY GAUNTLET RUN
          </button>

          <button
            onClick={handleCopyChallengeLink}
            className="w-full py-2.5 rounded-xl bg-surface-container-high/60 hover:bg-surface-container-high text-cyan-300 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-cyan-500/20"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link className="w-4 h-4" />}
            {copiedLink ? 'CHALLENGE LINK COPIED!' : 'COPY SEED CHALLENGE LINK'}
          </button>
        </div>
      </div>
    </div>
  );
};
