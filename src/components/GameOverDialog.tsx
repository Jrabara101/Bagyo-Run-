import React, { useState } from 'react';
import { RunSubmissionPayload } from '../types/game';
import { RotateCcw, Share2, CheckCircle2, AlertTriangle, Trophy, Sparkles, Skull, Copy, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverDialogProps {
  isOpen: boolean;
  runData: RunSubmissionPayload | null;
  validationStatus: { verified: boolean; reason: string; rank?: number } | null;
  ghostDeltaMeters: number;
  onRestart: () => void;
  onOpenLeaderboard: () => void;
}

export const GameOverDialog: React.FC<GameOverDialogProps> = ({
  isOpen,
  runData,
  validationStatus,
  ghostDeltaMeters,
  onRestart,
  onOpenLeaderboard,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !runData) return null;

  // Trigger celebration confetti if new personal record or verified run
  React.useEffect(() => {
    if (runData.distance > 1000) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4cd7f6', '#fbabff', '#f7be1d'],
      });
    }
  }, [runData]);

  // Generate spoiler-free scorecard summary
  const generateScorecard = () => {
    return `🏃 ⚡ 💀 [NEON CHASM // SEED: ${runData.seed}]
Distance: ${runData.distance.toLocaleString()}m
Score: ${runData.score.toLocaleString()} PTS
Near-Miss Sparks: ${runData.nearMisses}x
Energy Orbs: ${runData.coins}
Max Combo: x${runData.maxCombo}
Duration: ${(runData.durationMs / 1000).toFixed(1)}s
Cause of Death: ${runData.causeOfDeath || 'Lethal Hazard Impact'}
Verified by Server-Authoritative Anti-Cheat 🛡️`;
  };

  const handleCopyScorecard = () => {
    navigator.clipboard.writeText(generateScorecard());
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-panel-glow rounded-3xl p-6 md:p-8 flex flex-col gap-6 text-white border border-cyan-500/30">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <Skull className="w-8 h-8 text-red-400" />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-red-400 font-bold mb-1">
            AVIONICS TELEMETRY TERMINATED
          </span>
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
            RUN DEBRIEF // KINETIC REPORT
          </h2>
          <p className="font-mono text-xs text-gray-400 mt-1">
            FATAL IMPACT: <span className="text-amber-400 font-bold">{runData.causeOfDeath || 'Track Obstacle Impact'}</span>
          </p>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Distance */}
          <div className="p-4 rounded-2xl bg-surface-container-high/80 border border-white/5 flex flex-col items-center justify-center">
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
              DISTANCE TRAVERSED
            </span>
            <span className="font-mono text-3xl font-extrabold text-neon-cyan mt-1">
              {runData.distance.toLocaleString()}
              <span className="text-xs text-cyan-400/80 ml-1">M</span>
            </span>
          </div>

          {/* Score */}
          <div className="p-4 rounded-2xl bg-surface-container-high/80 border border-white/5 flex flex-col items-center justify-center">
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
              TOTAL SCORE
            </span>
            <span className="font-mono text-3xl font-extrabold text-neon-amber mt-1">
              {runData.score.toLocaleString()}
            </span>
          </div>

          {/* Near-Misses */}
          <div className="p-3 rounded-2xl bg-surface-container-high/60 border border-white/5 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fuchsia-400" />
              <span className="font-mono text-xs text-gray-300">Near-Miss Sparks</span>
            </div>
            <span className="font-mono text-sm font-bold text-fuchsia-300">
              {runData.nearMisses}x
            </span>
          </div>

          {/* Coins / Orbs */}
          <div className="p-3 rounded-2xl bg-surface-container-high/60 border border-white/5 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-sm">⚡</span>
              <span className="font-mono text-xs text-gray-300">Orbs Collected</span>
            </div>
            <span className="font-mono text-sm font-bold text-amber-300">
              {runData.coins}
            </span>
          </div>
        </div>

        {/* Ghost Delta Split comparison */}
        <div className="p-3 rounded-xl bg-surface-container-low/90 border border-white/10 flex items-center justify-between font-mono text-xs">
          <span className="text-gray-400">GHOST RUNNER COMPARISON:</span>
          <span
            className={`font-bold flex items-center gap-1 ${
              ghostDeltaMeters >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {ghostDeltaMeters >= 0 ? `+${ghostDeltaMeters}m LEAD AHEAD` : `${ghostDeltaMeters}m BEHIND GHOST`}
          </span>
        </div>

        {/* Anti-Cheat Authoritative Verification Badge */}
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-3">
          {validationStatus?.verified ? (
            <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          )}
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
              {validationStatus?.verified ? 'SERVER ANTI-CHEAT VERIFIED' : 'TELEMETRY VALIDATING'}
            </span>
            <span className="font-mono text-[11px] text-gray-300">
              {validationStatus?.reason || 'Replaying flight path against deterministic seed...'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            <button
              onClick={onRestart}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-headline text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)]"
            >
              <RotateCcw className="w-4 h-4" /> RE-DEPLOY SPRINT
            </button>
            <button
              onClick={handleCopyScorecard}
              className="px-4 py-3.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-cyan-300 font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-cyan-500/20"
              title="Copy shareable scorecard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'COPIED!' : 'SHARE'}
            </button>
          </div>

          <button
            onClick={onOpenLeaderboard}
            className="w-full py-2.5 rounded-xl bg-surface-container-high/60 hover:bg-surface-container-high text-gray-300 hover:text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-white/5"
          >
            <Trophy className="w-4 h-4 text-amber-400" /> View Global Leaderboard & Ghost Archive
          </button>
        </div>
      </div>
    </div>
  );
};
