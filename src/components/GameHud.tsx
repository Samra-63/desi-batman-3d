import { Gamepad2, Pause, Volume2, VolumeX } from 'lucide-react';
import type { HudSnapshot } from '../game/types';
import { BatEmblemIcon } from './HudIcons';

interface GameHudProps {
  hud: HudSnapshot;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onToggleTouch: () => void;
}

export function GameHud({
  hud,
  onTogglePause,
  onToggleMute,
  onToggleTouch,
}: GameHudProps) {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const hpStatus = hpPct <= 25 ? 'CRITICAL' : hpPct <= 55 ? 'WOUNDED' : 'VIGILANT';

  return (
    <header className="fixed inset-x-0 top-0 z-20 pointer-events-none px-3 pt-2.5 sm:px-6 sm:pt-3.5 flex flex-col gap-2">
      {/* Compact Top Bar */}
      <div className="flex items-start justify-between gap-2">
        {/* LEFT: Health & Arkham Score / Combo */}
        <div className="flex flex-col gap-1.5 max-w-[54%] sm:max-w-xs">
          <div className="flex items-center gap-2">
            <BatEmblemIcon className="w-6 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-[130px] sm:min-w-[190px]">
              <div className="flex items-baseline justify-between text-[11px] font-mono-num mb-0.5 noir-text-shadow">
                <span className="font-bold text-[#f4efe4]">
                  HP {hud.hp}/{hud.maxHp}
                </span>
                <span
                  className={`text-[10px] font-bold tracking-wider ${
                    hpPct <= 25 ? 'text-red-400' : 'text-amber-300'
                  }`}
                >
                  {hpStatus}
                </span>
              </div>
              <div className="h-2.5 w-full bg-[#090c14]/90 border border-slate-600/70 overflow-hidden">
                <div
                  style={{ width: `${hpPct}%` }}
                  className={`h-full transition-all duration-150 ${
                    hpPct <= 25
                      ? 'bg-red-500'
                      : hpPct <= 55
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-red-600 to-amber-400'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Score & Wave Readout */}
          <div className="flex items-center gap-3 font-mono-num text-xs noir-text-shadow">
            <span className="text-slate-300">
              SCORE <strong className="text-amber-300">{hud.score.toLocaleString()}</strong>
            </span>
            <span className="text-slate-400">
              {hud.mode === 'ENDLESS'
                ? `WAVE ${hud.wave}`
                : `WAVE ${hud.wave}/${hud.totalWaves}`}
            </span>
            {hud.combo >= 2 && (
              <span className="font-display text-lg font-black text-yellow-400 tracking-wider leading-none">
                {hud.combo}x COMBO
              </span>
            )}
          </div>
        </div>

        {/* CENTER (Desktop): Chapter Objective */}
        <div className="hidden md:flex flex-col items-center text-center max-w-md noir-text-shadow">
          <span className="font-display text-lg font-black tracking-wider text-amber-400 leading-none">
            {hud.chapterTitle}
          </span>
          <span className="text-xs text-slate-200/90 mt-0.5">{hud.objective}</span>
        </div>

        {/* RIGHT: Utility Controls (Touch HUD Toggle for PC, Mute, Pause) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleTouch();
            }}
            title={hud.touchVisible ? 'Hide on-screen touch controls' : 'Show on-screen touch controls'}
            aria-label={hud.touchVisible ? 'Hide touch controls' : 'Show touch controls'}
            className={`min-h-[42px] px-2.5 sm:px-3 flex items-center gap-1.5 border text-xs font-semibold transition-colors cursor-pointer ${
              hud.touchVisible
                ? 'bg-amber-500/20 border-amber-400/70 text-amber-200'
                : 'bg-[#0c111d]/85 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span className="hidden sm:inline font-mono-num text-[11px]">
              {hud.touchVisible ? 'PAD ON' : 'PAD OFF'}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center bg-[#0c111d]/85 border border-slate-700 hover:border-amber-400/60 text-slate-200 transition-colors cursor-pointer"
          >
            {hud.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            aria-label="Pause game"
            className="min-h-[42px] min-w-[42px] flex items-center justify-center bg-[#0c111d]/85 border border-slate-700 hover:border-amber-400/60 text-slate-200 transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOSS HEALTH BAR (Desi Joker / Desi Superman) */}
      {hud.bossName && hud.bossMaxHp > 0 && (
        <div className="mx-auto w-full max-w-lg bg-[#090c14]/88 border border-red-500/50 px-3 py-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-display text-base font-black tracking-wider text-red-400">
              {hud.bossName}
              {hud.bossName === 'DESI SUPERMAN' ? ` · PHASE ${hud.bossPhase}` : ''}
            </span>
            <span className="font-mono-num text-[11px] text-slate-300">
              {hud.bossHp}/{hud.bossMaxHp}
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-900 overflow-hidden">
            <div
              style={{ width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%` }}
              className="h-full bg-gradient-to-r from-red-700 via-red-500 to-amber-400 transition-all duration-150"
            />
          </div>
          {hud.bossHint && (
            <p className="text-[11px] font-mono-num text-amber-300 text-center mt-1 tracking-wide">
              {hud.bossHint}
            </p>
          )}
        </div>
      )}

      {/* Subtle contextual tactical cue when no boss bar is active */}
      {!hud.bossName && !hud.touchVisible && (
        <div className="hidden md:flex justify-center">
          <span className="font-mono-num text-[10px] tracking-wider text-slate-300/80 noir-text-shadow">
            A/D MOVE · W/SPACE JUMP &amp; GLIDE · S SLIDE · L-CLICK STRIKE/COUNTER · R-CLICK BATARANG/SMOKE · E BAT-BHENSA
          </span>
        </div>
      )}
    </header>
  );
}
