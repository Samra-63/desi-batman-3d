import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { HudSnapshot } from '../game/types';
import {
  BatarangIcon,
  BhensaPendantIcon,
  CounterBoltIcon,
  FistStrikeIcon,
} from './HudIcons';

interface TouchControlsProps {
  hud: HudSnapshot;
  onStickMove: (x: number, y: number) => void;
  onStrikeOrCounter: () => void;
  onBatarang: () => void;
  onSmokeBomb: () => void;
  onBatBhensa: () => void;
}

const STICK_RADIUS = 46;
const SMOKE_HOLD_MS = 270;

export function TouchControls({
  hud,
  onStickMove,
  onStrikeOrCounter,
  onBatarang,
  onSmokeBomb,
  onBatBhensa,
}: TouchControlsProps) {
  // Left Virtual Thumb-Stick State
  const stickRef = useRef<HTMLDivElement | null>(null);
  const stickPointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [stickActive, setStickActive] = useState(false);

  // Right Gadget Tap vs Hold (Batarang vs Laal Mirch Smoke Bomb)
  const gadgetTimerRef = useRef<number | null>(null);
  const gadgetHeldFired = useRef(false);
  const [gadgetHolding, setGadgetHolding] = useState(false);

  const updateStickFromEvent = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, STICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const ox = Math.cos(angle) * clamped;
    const oy = Math.sin(angle) * clamped;
    setKnobOffset({ x: ox, y: oy });
    onStickMove(ox / STICK_RADIUS, oy / STICK_RADIUS);
  };

  const handleStickDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    stickPointerId.current = e.pointerId;
    setStickActive(true);
    updateStickFromEvent(e);
  };

  const handleStickMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stickPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    updateStickFromEvent(e);
  };

  const handleStickUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stickPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    stickPointerId.current = null;
    setStickActive(false);
    setKnobOffset({ x: 0, y: 0 });
    onStickMove(0, 0);
  };

  const handleGadgetDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    gadgetHeldFired.current = false;
    setGadgetHolding(true);
    if (gadgetTimerRef.current !== null) {
      window.clearTimeout(gadgetTimerRef.current);
    }
    gadgetTimerRef.current = window.setTimeout(() => {
      gadgetHeldFired.current = true;
      setGadgetHolding(false);
      onSmokeBomb();
    }, SMOKE_HOLD_MS);
  };

  const handleGadgetUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (gadgetTimerRef.current !== null) {
      window.clearTimeout(gadgetTimerRef.current);
      gadgetTimerRef.current = null;
    }
    setGadgetHolding(false);
    if (!gadgetHeldFired.current) {
      onBatarang();
    }
  };

  const handleGadgetCancel = () => {
    if (gadgetTimerRef.current !== null) {
      window.clearTimeout(gadgetTimerRef.current);
      gadgetTimerRef.current = null;
    }
    setGadgetHolding(false);
  };

  const bhensaPct = hud.finisherReady ? 100 : hud.bhensaMeter;
  const strokeDash = 2 * Math.PI * 30;
  const dashOffset = strokeDash * (1 - bhensaPct / 100);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 pointer-events-none flex items-end justify-between px-4 pb-5 sm:px-7 sm:pb-7 select-none touch-none"
      aria-label="On-screen game controls"
    >
      {/* LEFT THUMB ZONE: Floating Virtual Thumb-Stick */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        <div
          ref={stickRef}
          onPointerDown={handleStickDown}
          onPointerMove={handleStickMove}
          onPointerUp={handleStickUp}
          onPointerCancel={handleStickUp}
          className={`relative w-32 h-32 sm:w-36 sm:h-36 rounded-full border-2 transition-colors touch-none flex items-center justify-center ${
            stickActive
              ? 'border-amber-400/80 bg-[#0c111d]/70'
              : 'border-slate-500/45 bg-[#090d16]/55'
          }`}
        >
          {/* Directional micro cues */}
          <span className="absolute top-1.5 font-mono-num text-[9px] font-bold tracking-wider text-slate-300/80">
            JUMP/GLIDE
          </span>
          <span className="absolute bottom-1.5 font-mono-num text-[9px] font-bold tracking-wider text-slate-400/80">
            SLIDE
          </span>
          <span className="absolute left-2 text-xs text-slate-400/70">◀</span>
          <span className="absolute right-2 text-xs text-slate-400/70">▶</span>

          {/* Movable thumb puck */}
          <div
            style={{
              transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
            }}
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform duration-75 ${
              stickActive
                ? 'bg-amber-400/90 border-amber-200 scale-105'
                : 'bg-slate-800/90 border-slate-400/70'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-[#090c14]/65" />
          </div>
        </div>
      </div>

      {/* RIGHT THUMB ZONE: ONLY 3 LARGE SMART CONTEXT-SENSITIVE BUTTONS */}
      <div className="pointer-events-auto relative flex items-end gap-3 sm:gap-4">
        {/* 2. BATARANG / LAAL MIRCH SMOKE (Silver Bat Button) */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={handleGadgetDown}
            onPointerUp={handleGadgetUp}
            onPointerCancel={handleGadgetCancel}
            aria-label="Batarang or hold for Laal Mirch Smoke Bomb"
            className={`relative w-16 h-16 sm:w-[74px] sm:h-[74px] rounded-full border-2 flex flex-col items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer touch-none ${
              gadgetHolding
                ? 'bg-red-900/95 border-red-400 text-red-100 scale-105'
                : 'bg-[#1a2232]/90 border-slate-300/80 text-slate-100 hover:border-white'
            }`}
          >
            <BatarangIcon className="w-8 h-6" />
            <span className="font-display text-[11px] font-black tracking-wider leading-none mt-0.5">
              {gadgetHolding ? 'SMOKE!' : 'BATARANG'}
            </span>
            {hud.smokeCooldownRatio > 0 && (
              <span className="absolute -top-2 font-mono-num text-[9px] px-1.5 py-0.5 bg-[#090c14] border border-red-500/60 text-red-300">
                SMOKE CD
              </span>
            )}
          </button>
          <span className="font-mono-num text-[9px] uppercase tracking-wider text-slate-300 noir-text-shadow">
            TAP · HOLD SMOKE
          </span>
        </div>

        {/* 3. BAT-BHENSA ULTIMATE (Golden Crescent Pendant Button) */}
        <div className="flex flex-col items-center gap-1 mb-10">
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => {
              e.stopPropagation();
              onBatBhensa();
            }}
            aria-label="Summon Bat-Bhensa Ultimate"
            className={`relative w-[68px] h-[68px] sm:w-[78px] sm:h-[78px] rounded-full flex flex-col items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer touch-none ${
              hud.bhensaReady
                ? 'bg-amber-500 border-2 border-yellow-200 text-[#090c14] shadow-amber-500/50 animate-pulse'
                : 'bg-[#131824]/88 border-2 border-slate-600/70 text-slate-400'
            }`}
          >
            {/* Circular charge ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 68 68">
              <circle
                cx="34"
                cy="34"
                r="30"
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="3.5"
              />
              <circle
                cx="34"
                cy="34"
                r="30"
                fill="none"
                stroke={hud.bhensaReady ? '#fef08a' : '#f59e0b'}
                strokeWidth="3.5"
                strokeDasharray={strokeDash}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </svg>
            <BhensaPendantIcon className="w-7 h-7 relative z-10" />
            <span className="font-display text-[11px] font-black tracking-wider leading-none relative z-10">
              {hud.finisherReady ? 'FINISHER' : hud.bhensaReady ? 'BHENSA!' : `${bhensaPct}%`}
            </span>
          </button>
          <span className="font-mono-num text-[9px] uppercase tracking-wider text-amber-300 noir-text-shadow">
            BAT-BHENSA
          </span>
        </div>

        {/* 1. STRIKE / COUNTER (Primary Big Crimson/Gold Context Button) */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => {
              e.stopPropagation();
              onStrikeOrCounter();
            }}
            aria-label="Strike or Counter"
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] flex flex-col items-center justify-center shadow-2xl active:scale-92 transition-all cursor-pointer touch-none ${
              hud.counterAvailable || hud.finisherReady
                ? 'bg-yellow-400 border-white text-[#090c14] shadow-yellow-400/60 scale-105'
                : hud.stealthReady
                ? 'bg-red-600 border-amber-300 text-white shadow-red-600/50'
                : 'bg-[#7f1d1d]/95 border-red-400/85 text-[#fef2f2] shadow-red-950/60'
            }`}
          >
            {hud.counterAvailable ? (
              <CounterBoltIcon className="w-8 h-8" />
            ) : (
              <FistStrikeIcon className="w-8 h-8" />
            )}
            <span className="font-display text-sm sm:text-base font-black tracking-wider leading-none mt-0.5">
              {hud.finisherReady
                ? 'FINISH!'
                : hud.counterAvailable
                ? 'COUNTER!'
                : hud.stealthReady
                ? 'TAKEDOWN'
                : 'STRIKE'}
            </span>
          </button>
          <span className="font-mono-num text-[9px] uppercase tracking-wider text-red-200 noir-text-shadow">
            COMBO · COUNTER
          </span>
        </div>
      </div>
    </div>
  );
}
