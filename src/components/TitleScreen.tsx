import { Check, Flame, Play, Shield, Volume2, VolumeX } from 'lucide-react';
import { CHAPTERS } from '../game/chapters';
import type { ChapterId, HudSnapshot } from '../game/types';
import { BatEmblemIcon } from './HudIcons';

interface TitleScreenProps {
  hud: HudSnapshot;
  onStartCampaign: (chapter: ChapterId) => void;
  onStartEndless: () => void;
  onToggleMute: () => void;
}

const CHAPTER_IDS: ChapterId[] = [1, 2, 3, 4, 5];

export function TitleScreen({
  hud,
  onStartCampaign,
  onStartEndless,
  onToggleMute,
}: TitleScreenProps) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-8 bg-gradient-to-t from-[#06080f]/95 via-[#06080f]/45 to-[#06080f]/75 overflow-y-auto">
      {/* Top Minimal Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BatEmblemIcon className="w-8 h-5 text-amber-400" />
          <span className="font-mono-num text-[11px] uppercase tracking-[0.22em] text-amber-300/90 noir-text-shadow">
            ARKHAM-NOIR 3D GRAPHIC NOVEL ACTION
          </span>
        </div>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={hud.muted ? 'Unmute soundtrack' : 'Mute soundtrack'}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#0c111d]/85 border border-slate-700 hover:border-amber-400 text-slate-200 transition-colors cursor-pointer"
        >
          {hud.muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Center-Left Dramatic Title & Primary Actions */}
      <div className="my-auto py-4 max-w-2xl">
        <p className="font-mono-num text-xs uppercase tracking-[0.28em] text-red-400 mb-1.5 noir-text-shadow">
          5-CHAPTER STORY CAMPAIGN · ENDLESS GAON SURVIVAL
        </p>
        <h1 className="font-display text-6xl sm:text-8xl font-black uppercase leading-[0.88] tracking-tight text-[#f4efe4] noir-text-shadow">
          THE DARK <span className="text-amber-400">RAKHWALA</span>
        </h1>
        <p className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-[0.14em] text-slate-300 mt-1 noir-text-shadow">
          SHADOWS OF THE GAON
        </p>

        <p className="mt-3 max-w-xl text-xs sm:text-sm text-slate-200/90 leading-relaxed noir-text-shadow">
          Patrol rain-drenched mud rooftops, chain slow-motion counters, toss bamboo{' '}
          <span className="text-red-300 font-semibold">Laal Mirch</span> smoke bombs, and summon the
          unstoppable <span className="text-amber-300 font-semibold">Bat-Bhensa</span> against Desi
          Joker’s convoy and the crimson fury of Desi Superman.
        </p>

        {/* Primary Action CTAs */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onStartCampaign(1)}
            className="min-h-[52px] px-7 py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-[#090c14] font-display text-2xl font-black uppercase tracking-wider flex items-center gap-2.5 shadow-xl shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            PLAY CAMPAIGN
          </button>

          <button
            type="button"
            onClick={onStartEndless}
            className="min-h-[52px] px-6 py-3 bg-[#121826]/90 hover:bg-[#1a2236] border border-red-500/60 hover:border-red-400 text-[#f4efe4] font-display text-2xl font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <Flame className="w-5 h-5 text-red-400" />
            ENDLESS GAON
            {hud.endlessBestWave > 0 && (
              <span className="font-mono-num text-xs font-bold text-amber-300 ml-1">
                W{hud.endlessBestWave} · {hud.endlessBestScore.toLocaleString()}
              </span>
            )}
          </button>
        </div>

        {/* 5-Chapter Quick Mission Selector */}
        <div className="mt-5">
          <div className="flex items-center gap-2 text-[11px] font-mono-num uppercase tracking-wider text-slate-400 mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>SELECT CHAPTER (DIRECT JUMP)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CHAPTER_IDS.map((cid) => {
              const ch = CHAPTERS[cid];
              const completed = hud.completedChapters.includes(cid);
              return (
                <button
                  key={cid}
                  type="button"
                  onClick={() => onStartCampaign(cid)}
                  className="min-h-[54px] text-left px-2.5 py-2 bg-[#0c111d]/85 hover:bg-[#161f33] border border-slate-700/90 hover:border-amber-400/80 transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-num text-[10px] font-bold text-amber-400">
                      CH 0{cid}
                    </span>
                    {completed && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200 leading-tight line-clamp-2 mt-0.5">
                    {ch.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Clean 1-Line Control Legend */}
      <div className="border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-num text-slate-300/85">
        <span>
          TOUCH: <strong className="text-amber-300">LEFT STICK</strong> MOVE/GLIDE/SLIDE ·{' '}
          <strong className="text-red-300">3 SMART BUTTONS</strong> STRIKE/COUNTER · BATARANG/SMOKE · BAT-BHENSA
        </span>
        <span className="text-slate-400">
          PC: A/D · W/SPACE · S · L-CLICK · R-CLICK · E
        </span>
      </div>
    </div>
  );
}
