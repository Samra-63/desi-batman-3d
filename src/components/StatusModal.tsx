import { ArrowRight, Home, Play, RotateCcw, Trophy } from 'lucide-react';
import type { HudSnapshot } from '../game/types';

interface StatusModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRetry: () => void;
  onNextChapter: () => void;
  onMainMenu: () => void;
}

export function StatusModal({
  hud,
  onResume,
  onRetry,
  onNextChapter,
  onMainMenu,
}: StatusModalProps) {
  const isPaused = hud.screen === 'PAUSED';
  const isClear = hud.screen === 'CHAPTER_CLEAR';
  const isVictory = hud.screen === 'VICTORY';
  const isGameOver = hud.screen === 'GAME_OVER';

  if (!isPaused && !isClear && !isVictory && !isGameOver) return null;

  const heading = isPaused
    ? 'MISSION PAUSED'
    : isVictory
    ? 'GAON SAVED · CAMPAIGN COMPLETE'
    : isClear
    ? `CHAPTER 0${hud.chapterId} CLEARED`
    : hud.mode === 'ENDLESS'
    ? `FALLEN ON WAVE ${hud.wave}`
    : 'THE SHADOWS PREVAILED';

  const accent = isGameOver ? 'text-red-400' : 'text-amber-400';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06080f]/86 p-4">
      <div className="w-full max-w-md bg-[#0e1320] border-2 border-slate-700/90 comic-panel-frame p-6 flex flex-col gap-5">
        <div className="border-b border-slate-800 pb-3">
          <p className="font-mono-num text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {hud.chapterTitle}
          </p>
          <h2 className={`font-display text-4xl font-black uppercase leading-none mt-1 ${accent}`}>
            {heading}
          </h2>
        </div>

        {/* Combat Performance Summary */}
        <div className="grid grid-cols-2 gap-2.5 font-mono-num">
          <div className="bg-[#080b12] border border-slate-800 p-3">
            <span className="text-[10px] text-slate-400 block">SCORE</span>
            <span className="text-xl font-bold text-amber-300">{hud.score.toLocaleString()}</span>
          </div>
          <div className="bg-[#080b12] border border-slate-800 p-3">
            <span className="text-[10px] text-slate-400 block">
              {isClear || isVictory ? 'ARKHAM RANK' : 'MAX COMBO'}
            </span>
            <span className="text-xl font-bold text-[#f4efe4] flex items-center gap-1.5">
              {isClear || isVictory ? (
                <>
                  <Trophy className="w-4 h-4 text-amber-400" />
                  RANK {hud.rank}
                </>
              ) : (
                `${hud.maxCombo}x`
              )}
            </span>
          </div>
          <div className="bg-[#080b12] border border-slate-800 p-3">
            <span className="text-[10px] text-slate-400 block">COUNTERS LANDED</span>
            <span className="text-lg font-bold text-yellow-300">{hud.countersLanded}</span>
          </div>
          <div className="bg-[#080b12] border border-slate-800 p-3">
            <span className="text-[10px] text-slate-400 block">ENEMIES DEFEATED</span>
            <span className="text-lg font-bold text-slate-200">{hud.enemiesDefeated}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {isPaused && (
            <button
              type="button"
              onClick={onResume}
              className="min-h-[48px] w-full bg-amber-500 hover:bg-amber-400 text-[#090c14] font-display text-2xl font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              RESUME PATROL
            </button>
          )}

          {isClear && hud.chapterId < 5 && (
            <button
              type="button"
              onClick={onNextChapter}
              className="min-h-[48px] w-full bg-amber-500 hover:bg-amber-400 text-[#090c14] font-display text-2xl font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              NEXT CHAPTER
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          {(isGameOver || isPaused || isClear || isVictory) && (
            <button
              type="button"
              onClick={onRetry}
              className={`min-h-[48px] w-full font-display text-2xl font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
                isGameOver
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-[#172033] hover:bg-[#1f2b45] border border-slate-600 text-slate-100'
              }`}
            >
              <RotateCcw className="w-5 h-5" />
              {isGameOver ? 'RETRY IMMEDIATELY' : 'REPLAY CHAPTER'}
            </button>
          )}

          <button
            type="button"
            onClick={onMainMenu}
            className="min-h-[44px] w-full bg-transparent hover:bg-slate-800/70 border border-slate-700 text-slate-300 font-display text-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
