import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { ComicCutscene } from './components/ComicCutscene';
import { GameHud } from './components/GameHud';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { TouchControls } from './components/TouchControls';
import { DarkRakhwalaEngine } from './game/engine';
import type { ChapterId, HudSnapshot } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  screen: 'TITLE',
  mode: 'CAMPAIGN',
  chapterId: 1,
  chapterTitle: 'CH 1 · SHADOWS OVER SARSON FIELDS',
  chapterSubtitle: 'Handpump Square & Mud-Roof Alley',
  objective: 'Clear the bandits terrorizing Handpump Square',
  hint: 'Tap STRIKE when yellow lightning flashes for a Slow-Mo Counter!',
  wave: 1,
  totalWaves: 3,
  hp: 100,
  maxHp: 100,
  score: 0,
  combo: 0,
  maxCombo: 0,
  bhensaMeter: 35,
  bhensaReady: false,
  bhensaActive: false,
  counterAvailable: false,
  stealthReady: false,
  finisherReady: false,
  smokeCooldownRatio: 0,
  bossName: null,
  bossHp: 0,
  bossMaxHp: 0,
  bossPhase: 1,
  bossHint: null,
  muted: false,
  touchVisible: true,
  activeCutscene: null,
  countersLanded: 0,
  stealthTakedowns: 0,
  enemiesDefeated: 0,
  rank: 'A',
  endlessBestScore: 0,
  endlessBestWave: 0,
  unlockedChapter: 1,
  completedChapters: [],
};

export default function App() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<DarkRakhwalaEngine | null>(null);
  const rightClickTimerRef = useRef<number | null>(null);
  const rightClickSmokeFired = useRef(false);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;
    const engine = new DarkRakhwalaEngine(container, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // PC Mouse Combat Controls directly on the 3D Viewport (Left-Click = Strike/Counter, Right-Click Tap = Batarang / Hold = Smoke)
  const handleViewportMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine || hud.screen !== 'PLAYING') return;

    if (e.button === 0) {
      engine.triggerStrikeOrCounter();
    } else if (e.button === 2) {
      rightClickSmokeFired.current = false;
      if (rightClickTimerRef.current !== null) {
        window.clearTimeout(rightClickTimerRef.current);
      }
      rightClickTimerRef.current = window.setTimeout(() => {
        rightClickSmokeFired.current = true;
        engine.triggerSmokeBomb();
      }, 270);
    }
  };

  const handleViewportMouseUp = (e: ReactMouseEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine || hud.screen !== 'PLAYING') return;
    if (e.button === 2) {
      if (rightClickTimerRef.current !== null) {
        window.clearTimeout(rightClickTimerRef.current);
        rightClickTimerRef.current = null;
      }
      if (!rightClickSmokeFired.current) {
        engine.triggerBatarang();
      }
    }
  };

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#080b12] select-none touch-none">
      {/* Isolated Full-Viewport Three.js WebGL 3D Mount Container */}
      <div
        ref={viewportRef}
        onMouseDown={handleViewportMouseDown}
        onMouseUp={handleViewportMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full"
      />

      {/* Title Screen */}
      {hud.screen === 'TITLE' && (
        <TitleScreen
          hud={hud}
          onStartCampaign={(ch: ChapterId) => engineRef.current?.startCampaign(ch)}
          onStartEndless={() => engineRef.current?.startEndless()}
          onToggleMute={() => engineRef.current?.toggleMute()}
        />
      )}

      {/* Illustrated Graphic-Novel Comic Cutscenes */}
      {hud.screen === 'CUTSCENE' && hud.activeCutscene && (
        <ComicCutscene
          cutsceneId={hud.activeCutscene}
          onComplete={() => engineRef.current?.completeCutscene()}
        />
      )}

      {/* Active Gameplay HUD & On-Screen Mobile/Desktop Controls */}
      {(hud.screen === 'PLAYING' || hud.screen === 'PAUSED') && (
        <>
          <GameHud
            hud={hud}
            onTogglePause={() => engineRef.current?.togglePause()}
            onToggleMute={() => engineRef.current?.toggleMute()}
            onToggleTouch={() => engineRef.current?.toggleTouchControls()}
          />
          {hud.screen === 'PLAYING' && hud.touchVisible && (
            <TouchControls
              hud={hud}
              onStickMove={(x, y) => engineRef.current?.setVirtualStick(x, y)}
              onStrikeOrCounter={() => engineRef.current?.triggerStrikeOrCounter()}
              onBatarang={() => engineRef.current?.triggerBatarang()}
              onSmokeBomb={() => engineRef.current?.triggerSmokeBomb()}
              onBatBhensa={() => engineRef.current?.triggerBatBhensa()}
            />
          )}
        </>
      )}

      {/* Pause / Chapter Clear / Game Over / Campaign Victory Modals */}
      <StatusModal
        hud={hud}
        onResume={() => engineRef.current?.togglePause()}
        onRetry={() => engineRef.current?.retryCurrent()}
        onNextChapter={() => engineRef.current?.nextChapter()}
        onMainMenu={() => engineRef.current?.returnToTitle()}
      />
    </main>
  );
}
