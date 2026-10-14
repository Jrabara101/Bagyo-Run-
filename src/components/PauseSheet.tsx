import React, { useState } from 'react';
import { GameSettings } from '../types/game';
import { X, Volume2, Sliders, Shield, RotateCcw, Play, Keyboard } from 'lucide-react';

interface PauseSheetProps {
  isOpen: boolean;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onResume: () => void;
  onRestart: () => void;
}

export const PauseSheet: React.FC<PauseSheetProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onResume,
  onRestart,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md h-full bg-[#031427]/95 border-l border-cyan-500/20 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h2 className="font-headline text-lg font-bold uppercase tracking-wider text-white">
                Avionics Settings & Pause
              </h2>
            </div>
            <button
              onClick={onResume}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Settings Groups */}
          <div className="flex flex-col gap-6 py-6">
            {/* Audio Section */}
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                <Volume2 className="w-4 h-4" /> Audio Synthesis Levels
              </span>

              {/* Master Volume */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-xs text-gray-300">
                  <span>Master Volume</span>
                  <span className="text-cyan-400 font-bold">{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* SFX Volume */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-xs text-gray-300">
                  <span>SFX Intensity</span>
                  <span className="text-cyan-400 font-bold">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Dynamics & Feel */}
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                <Shield className="w-4 h-4" /> Kinetic & Camera Dynamics
              </span>

              {/* Camera Tilt */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-xs text-gray-300">
                  <span>Camera Banking Tilt</span>
                  <span className="text-cyan-400 font-bold">{Math.round(settings.cameraTilt * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.cameraTilt}
                  onChange={(e) => onUpdateSettings({ cameraTilt: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Screen Shake */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-xs text-gray-300">
                  <span>Haptic Screen Shake</span>
                  <span className="text-cyan-400 font-bold">{Math.round(settings.screenShake * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.screenShake}
                  onChange={(e) => onUpdateSettings({ screenShake: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Keybinding Rebind Controls */}
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                <Keyboard className="w-4 h-4" /> Flight Deck Keybindings
              </span>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-surface-container-high border border-white/5 flex justify-between items-center">
                  <span className="text-gray-400">Jump:</span>
                  <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 rounded font-bold border border-cyan-800">
                    {settings.keyJump.toUpperCase()} / ↑
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-high border border-white/5 flex justify-between items-center">
                  <span className="text-gray-400">Slide:</span>
                  <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 rounded font-bold border border-cyan-800">
                    {settings.keySlide.toUpperCase()} / ↓
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-high border border-white/5 flex justify-between items-center">
                  <span className="text-gray-400">Left:</span>
                  <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 rounded font-bold border border-cyan-800">
                    {settings.keyLeft.toUpperCase()} / ←
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-high border border-white/5 flex justify-between items-center">
                  <span className="text-gray-400">Right:</span>
                  <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 rounded font-bold border border-cyan-800">
                    {settings.keyRight.toUpperCase()} / →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-2.5 border-t border-white/10 pt-4">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-headline text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          >
            <Play className="w-4 h-4 fill-white" /> Resume Flight
          </button>
          <button
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-gray-300 hover:text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-white/5"
          >
            <RotateCcw className="w-4 h-4" /> Restart Run
          </button>
        </div>
      </div>
    </div>
  );
};
