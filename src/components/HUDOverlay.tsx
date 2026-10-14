import React from 'react';
import { EndlessRunnerGameState } from '../types/game';
import { Zap, Shield, Magnet, Rocket, Play, Pause, Volume2, VolumeX, Flame } from 'lucide-react';

interface HUDOverlayProps {
  gameState: EndlessRunnerGameState;
  ghostDeltaMeters: number;
  activeBiome: 'neon_city' | 'sky_bridge' | 'magma_vault';
  isAudioMuted: boolean;
  activePilotsCount: number;
  onToggleAudio: () => void;
  onPauseToggle: () => void;
  onTriggerOverdrive: () => void;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  gameState,
  ghostDeltaMeters,
  activeBiome,
  isAudioMuted,
  activePilotsCount,
  onToggleAudio,
  onPauseToggle,
  onTriggerOverdrive,
}) => {
  const isOverdriveReady = gameState.overdriveGauge >= 40 || gameState.isOverdriveActive;

  // Calculate 16 segments for Overdrive Condenser bar
  const totalSegments = 16;
  const filledSegments = Math.round((gameState.overdriveGauge / 100) * totalSegments);

  const biomeTitles = {
    neon_city: 'NEON CHASM // SECTOR 01',
    sky_bridge: 'ORBITAL SKYBRIDGE // SECTOR 02',
    magma_vault: 'MAGMA VAULT // SECTOR 03',
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 md:p-6 z-20">
      {/* ========================================================================= */}
      {/* TOP FLOATING TELEMETRY CAPSULE (HUD Level 2)                              */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Distance & Velocity Cluster */}
        <div className="glass-panel rounded-2xl px-4 py-2.5 flex items-center gap-4">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
              TRAVERSAL DISTANCE
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl md:text-3xl font-extrabold text-neon-cyan">
                {gameState.distanceMeters.toLocaleString()}
              </span>
              <span className="font-mono text-xs text-gray-400 font-semibold">METERS</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-gray-400 uppercase">VELOCITY</span>
              <span className="font-mono text-sm font-bold text-white">
                {(gameState.currentSpeed * 3.6).toFixed(0)}{' '}
                <span className="text-[10px] text-cyan-400">KM/H</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Biome Indicator & Ghost Split */}
        <div className="flex flex-col items-center">
          <div className="glass-panel px-4 py-1.5 rounded-full flex items-center gap-2.5 mb-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeBiome === 'magma_vault'
                  ? 'bg-orange-500 shadow-[0_0_10px_#f97316]'
                  : activeBiome === 'sky_bridge'
                  ? 'bg-blue-400 shadow-[0_0_10px_#60a5fa]'
                  : 'bg-fuchsia-400 shadow-[0_0_10px_#e879f9]'
              } animate-ping`}
            />
            <span className="font-headline text-xs md:text-sm font-bold tracking-widest uppercase text-white">
              {biomeTitles[activeBiome]}
            </span>
          </div>

          {/* Ghost Delta Split Indicator */}
          {gameState.ghostDistanceMeters > 0 && (
            <div
              className={`px-3 py-0.5 rounded-full font-mono text-[11px] font-bold tracking-wider flex items-center gap-1 ${
                ghostDeltaMeters >= 0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
              }`}
            >
              <span>{ghostDeltaMeters >= 0 ? '▲ LEAD' : '▼ LAG'}:</span>
              <span>{Math.abs(ghostDeltaMeters)}m VS GHOST</span>
            </div>
          )}
        </div>

        {/* Right: Currency Counter & Score Cluster */}
        <div className="flex items-center gap-3">
          {/* Live Score */}
          <div className="glass-panel rounded-2xl px-4 py-2 flex flex-col items-end">
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
              SCORE
            </span>
            <span className="font-mono text-xl md:text-2xl font-bold text-neon-amber">
              {gameState.score.toLocaleString()}
            </span>
          </div>

          {/* Coins / Near Misses */}
          <div className="hidden lg:flex flex-col gap-1">
            <div className="glass-panel px-3 py-1 rounded-full flex items-center gap-2">
              <span className="text-amber-400 text-xs">⚡</span>
              <span className="font-mono text-xs font-bold text-amber-300">
                {gameState.coinsCollected} ORBS
              </span>
            </div>
            <div className="glass-panel px-3 py-1 rounded-full flex items-center gap-2">
              <span className="text-fuchsia-400 text-xs">★</span>
              <span className="font-mono text-xs font-bold text-fuchsia-300">
                {gameState.nearMissCount} SPARKS
              </span>
            </div>
          </div>

          {/* Quick Audio & Pause Buttons */}
          <div className="flex items-center gap-1.5 glass-panel p-1.5 rounded-xl">
            <button
              onClick={onToggleAudio}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              onClick={onPauseToggle}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title="Pause Game [Esc / P]"
            >
              <Pause className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM COCKPIT HUD DOCK                                                   */}
      {/* ========================================================================= */}
      <div className="w-full flex flex-col md:flex-row items-end justify-between gap-4 pointer-events-auto">
        {/* Left: Active Power-up Status Rack */}
        <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center border border-white/10">
              <Magnet
                className={`w-4 h-4 ${
                  gameState.isOverdriveActive || gameState.activePowerUps.some((p) => p.type === 'coin_magnet')
                    ? 'text-neon-amber animate-bounce'
                    : 'text-gray-500'
                }`}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-gray-400 uppercase">MAGNET</span>
              <span className="font-mono text-[11px] font-bold text-white">
                {gameState.isOverdriveActive || gameState.activePowerUps.some((p) => p.type === 'coin_magnet')
                  ? 'ACTIVE'
                  : 'STANDBY'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-white/10 pl-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center border border-white/10">
              <Shield
                className={`w-4 h-4 ${
                  gameState.activePowerUps.some((p) => p.type === 'shield')
                    ? 'text-neon-cyan animate-pulse'
                    : 'text-gray-500'
                }`}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-gray-400 uppercase">SHIELD</span>
              <span className="font-mono text-[11px] font-bold text-white">
                {gameState.activePowerUps.some((p) => p.type === 'shield') ? '1 HIT' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Overdrive Adrenaline Condenser Gauge */}
        <div className="flex flex-col items-center gap-2 w-full max-w-sm">
          <div className="flex items-center justify-between w-full px-1">
            <span className="font-mono text-[10px] text-neon-pink font-bold tracking-widest flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
              SLIPSTREAM OVERDRIVE
            </span>
            <span className="font-mono text-[10px] font-bold text-neon-cyan">
              {gameState.isOverdriveActive ? 'WARP BURST ENGAGED' : `${gameState.overdriveGauge.toFixed(0)}% CHARGED`}
            </span>
          </div>

          {/* 16-Segment Neon Energy Conduit */}
          <div className="w-full glass-panel p-1.5 rounded-xl flex items-center gap-1">
            {Array.from({ length: totalSegments }).map((_, i) => {
              const isFilled = i < filledSegments || gameState.isOverdriveActive;
              const isHighPower = i >= 8;
              return (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded-sm transition-all duration-150 ${
                    isFilled
                      ? isHighPower
                        ? 'bg-fuchsia-400 shadow-[0_0_8px_#e879f9]'
                        : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                      : 'bg-surface-container-highest/60'
                  }`}
                />
              );
            })}
          </div>

          {/* Overdrive Trigger Button */}
          <button
            onClick={onTriggerOverdrive}
            disabled={!isOverdriveReady}
            className={`w-full py-1.5 rounded-xl font-headline text-xs font-black uppercase tracking-widest transition-all ${
              isOverdriveReady
                ? 'bg-gradient-to-r from-fuchsia-600 via-pink-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(232,121,249,0.5)] hover:brightness-110 active:scale-95 animate-pulse'
                : 'bg-gray-800/80 text-gray-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {gameState.isOverdriveActive ? 'HYPER SPEED ACTIVE ⚡' : isOverdriveReady ? 'BURST READY [SPACE]' : 'CHARGING OVERDRIVE...'}
          </button>
        </div>

        {/* Right: Avionics Controls Cheatsheet */}
        <div className="hidden lg:flex glass-panel px-4 py-2.5 rounded-2xl flex-col gap-1.5">
          <span className="font-mono text-[9px] text-gray-400 uppercase tracking-wider">
            AVIONIC CONTROLS
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-surface-container-highest text-cyan-400 rounded font-bold">W / ↑</span>
              <span className="text-gray-300">JUMP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-surface-container-highest text-cyan-400 rounded font-bold">S / ↓</span>
              <span className="text-gray-300">SLIDE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-surface-container-highest text-cyan-400 rounded font-bold">A / D</span>
              <span className="text-gray-300">LANE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-surface-container-highest text-fuchsia-400 rounded font-bold">SPACE</span>
              <span className="text-fuchsia-300">OVERDRIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
