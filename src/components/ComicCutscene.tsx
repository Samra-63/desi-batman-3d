import { useState } from 'react';
import { ChevronRight, SkipForward } from 'lucide-react';
import type { CutsceneId } from '../game/types';

interface ComicPanel {
  kicker: string;
  headline: string;
  caption: string;
  urduLine: string;
  art: 'BATMAN_ROOF' | 'JOKER_CONVOY' | 'INFERNO_SHOP' | 'SUPERMAN_EYES' | 'FINALE_DAWN';
}

const CUTSCENE_DATA: Record<CutsceneId, { issueTitle: string; panels: ComicPanel[] }> = {
  INTRO: {
    issueTitle: 'ISSUE #01 · SHADOWS OF THE GAON',
    panels: [
      {
        kicker: 'DUSK OVER THE SARSON FIELDS',
        headline: 'WHEN NIGHT FALLS ON THE GAON...',
        caption:
          'Desi Joker’s bandits have seized Handpump Square and the Chai Dhaba. The villagers lock their mud shutters as storm clouds gather.',
        urduLine: '“Andhera barh raha hai... par Gaon akela nahi.”',
        art: 'BATMAN_ROOF',
      },
      {
        kicker: 'THE DARK RAKHWALA RISES',
        headline: 'STITCHED COWL. STEEL BATARANGS. IRON WILL.',
        caption:
          'With jute rope bound across his chest and the massive Bat-Bhensa waiting in the shadows, one vigilante descends from the flat rooftops.',
        urduLine: '“Main hoon is Gaon ka Rakhwala.”',
        art: 'JOKER_CONVOY',
      },
    ],
  },
  CH4_INFERNO: {
    issueTitle: 'ISSUE #04 · THE PUNCTURE SHOP INFERNO',
    panels: [
      {
        kicker: 'SUPRESH MANGAL REPAIRING · MIDNIGHT',
        headline: 'DESI JOKER SETS THE LANE ABLAZE',
        caption:
          'Laughing through smeared chalk paint, Desi Joker hurls burning kerosene across the old bicycle puncture shop—and drops a scorched Steel Batarang in the ashes to frame Batman.',
        urduLine: '“Haha! Dekh chacha, tera Rakhwala kya tohfa chhod gaya!”',
        art: 'INFERNO_SHOP',
      },
      {
        kicker: 'THE ASHES PART IN SILENCE',
        headline: 'CRIMSON EYES AWAKEN IN THE SMOKE',
        caption:
          'The elderly shopkeeper staggers out of the roaring flames untouched. His torn kurta parts to reveal a glowing Blue-and-Red suit as searing crimson heat-vision ignites in his eyes!',
        urduLine: '“Meri dukaan jala di... ab koi nahi bachega!”',
        art: 'SUPERMAN_EYES',
      },
    ],
  },
  CH5_FINALE: {
    issueTitle: 'EPILOGUE · GUARDIANS OF THE GAON',
    panels: [
      {
        kicker: 'EENT BHATTA CHIMNEY · FIRST LIGHT',
        headline: 'THE TRUTH SHINES THROUGH THE SMOKE',
        caption:
          'After a thunderous Tag-Team Finisher with the Bat-Bhensa, Desi Batman shows the scorched canister proving Joker’s frame-up. The crimson glow fades from the old man’s eyes.',
        urduLine: '“Asli dushman Joker tha... hum dono Gaon ke hain.”',
        art: 'FINALE_DAWN',
      },
    ],
  },
};

interface ComicCutsceneProps {
  cutsceneId: CutsceneId;
  onComplete: () => void;
}

export function ComicCutscene({ cutsceneId, onComplete }: ComicCutsceneProps) {
  const story = CUTSCENE_DATA[cutsceneId];
  const [panelIdx, setPanelIdx] = useState(0);
  const panel = story.panels[panelIdx] ?? story.panels[0];
  const isLast = panelIdx >= story.panels.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setPanelIdx((prev) => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#06080f]/95 px-4 py-5 sm:px-8">
      <div className="w-full max-w-4xl flex flex-col gap-3 sm:gap-4">
        {/* Top Graphic-Novel Issue Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
          <div className="flex items-center gap-3">
            <span className="font-mono-num text-xs uppercase tracking-[0.2em] text-amber-400">
              {story.issueTitle}
            </span>
            <span className="font-mono-num text-xs text-slate-400">
              PANEL {panelIdx + 1}/{story.panels.length}
            </span>
          </div>
          <button
            type="button"
            tabIndex={-1}
            onClick={onComplete}
            className="min-h-[40px] px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/60 bg-slate-900/90 transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip
          </button>
        </div>

        {/* Illustrated Arkham Comic Panel */}
        <div className="relative w-full aspect-[16/9] max-h-[54vh] bg-[#0b0f19] border-2 border-[#e2d6bc]/30 comic-panel-frame overflow-hidden">
          <ComicPanelArtwork art={panel.art} />

          {/* Top-left Noir Narration Kicker Box */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-amber-500 text-[#090c14] px-3 py-1 border-2 border-[#090c14] shadow-lg">
            <span className="font-display text-sm sm:text-base font-black uppercase tracking-wider">
              {panel.kicker}
            </span>
          </div>

          {/* Bottom-right Dramatic Urdu Dialogue Box */}
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 max-w-[82%] sm:max-w-[56%] bg-[#090c14]/92 border-l-4 border-amber-400 px-3.5 py-2 shadow-xl">
            <p className="text-xs sm:text-sm italic font-semibold text-amber-200 leading-snug">
              {panel.urduLine}
            </p>
          </div>
        </div>

        {/* Dramatic Comic Caption & Action Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101521] border border-slate-800 px-4 py-3.5">
          <div className="space-y-1 max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-black text-[#f4efe4] leading-none">
              {panel.headline}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {panel.caption}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="min-h-[48px] shrink-0 px-6 py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-[#090c14] font-display text-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
          >
            {isLast ? 'ENTER THE GAON' : 'NEXT PANEL'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ComicPanelArtwork({ art }: { art: ComicPanel['art'] }) {
  if (art === 'BATMAN_ROOF') {
    return (
      <svg viewBox="0 0 960 540" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#050812" />
            <stop offset="55%" stopColor="#131e33" />
            <stop offset="100%" stopColor="#2a2433" />
          </linearGradient>
          <radialGradient id="batGlow" cx="72%" cy="24%" r="28%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="960" height="540" fill="url(#sky1)" />
        {/* Bat-signal cone */}
        <polygon points="840,540 885,540 790,110 590,150" fill="rgba(250,224,120,0.12)" />
        <ellipse cx="695" cy="130" rx="108" ry="62" fill="url(#batGlow)" />
        <path
          d="M695 104l8 11 16-12c16 4 30 15 40 30-16 2-28 9-35 21-10-8-18-8-29 6-11-14-19-14-29-6-7-12-19-19-35-21 10-15 24-26 40-30l16 12 8-11z"
          fill="#070a12"
          opacity="0.82"
        />
        {/* Distant Eent Bhatta chimney */}
        <polygon points="150,430 176,170 202,170 228,430" fill="#12141e" />
        {/* Mud wall & village silhouettes */}
        <rect x="0" y="390" width="960" height="150" fill="#181519" />
        {/* Desi Batman perched heroically on foreground mud rooftop */}
        <path d="M290 540 L310 290 L460 290 L495 540 Z" fill="#2c241e" />
        {/* Flowing cape */}
        <path
          d="M365 208 Q250 245 180 390 Q265 372 318 415 Q372 368 440 408 L412 212 Z"
          fill="#070910"
          stroke="#60a5fa"
          strokeOpacity="0.45"
          strokeWidth="2.5"
        />
        {/* Grey tunic torso + yellow oval bat emblem + diagonal jute rope */}
        <path d="M352 212 L426 212 L416 332 L362 332 Z" fill="#525b69" stroke="#090c12" strokeWidth="3" />
        <ellipse cx="390" cy="255" rx="28" ry="16" fill="#eab308" stroke="#090c12" strokeWidth="2.5" />
        <path d="M390 246l3 4 6-4c6 2 11 6 14 11-6 1-10 3-12 7-4-3-7-3-11 2-4-5-7-5-11-2-2-4-6-6-12-7 3-5 8-9 14-11l6 4 3-4z" fill="#090c12" />
        <line x1="354" y1="216" x2="418" y2="326" stroke="#9a683a" strokeWidth="10" />
        {/* Cowl with stitched ears & glowing white eyes */}
        <circle cx="390" cy="176" r="28" fill="#090c14" />
        <polygon points="368,160 362,126 382,152" fill="#090c14" />
        <polygon points="412,160 418,126 398,152" fill="#090c14" />
        <polygon points="376,174 388,177 386,182 375,180" fill="#f8fafc" />
        <polygon points="404,174 392,177 394,182 405,180" fill="#f8fafc" />
        {/* Rain lines */}
        <g stroke="#93c5fd" strokeOpacity="0.24" strokeWidth="1.5">
          <line x1="120" y1="40" x2="80" y2="170" />
          <line x1="300" y1="10" x2="255" y2="160" />
          <line x1="560" y1="30" x2="510" y2="195" />
          <line x1="820" y1="25" x2="775" y2="180" />
        </g>
      </svg>
    );
  }

  if (art === 'JOKER_CONVOY') {
    return (
      <svg viewBox="0 0 960 540" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
        <rect width="960" height="540" fill="#0d111b" />
        {/* Split dramatic diagonal comic panel: Bat-Bhensa on left, Desi Joker on right */}
        <polygon points="0,0 530,0 430,540 0,540" fill="#0f172a" />
        <polygon points="530,0 960,0 960,540 430,540" fill="#23122d" />
        <line x1="530" y1="0" x2="430" y2="540" stroke="#f59e0b" strokeWidth="6" />
        {/* Left: Massive Bat-Bhensa head with horns & silver crescent Bat-pendant */}
        <path d="M120 340 Q95 215 185 190 Q275 170 335 245 L315 390 L135 390 Z" fill="#10131c" stroke="#94a3b8" strokeWidth="3" />
        <path d="M145 205 Q65 135 105 90" fill="none" stroke="#64748b" strokeWidth="20" strokeLinecap="round" />
        <path d="M300 205 Q380 135 340 90" fill="none" stroke="#64748b" strokeWidth="20" strokeLinecap="round" />
        <circle cx="190" cy="262" r="7" fill="#fde047" />
        <circle cx="268" cy="262" r="7" fill="#fde047" />
        {/* Silver crescent Bat-Pendant */}
        <path d="M242 400c-14 3-24 14-24 28s10 25 24 28a29 29 0 1 1 0-56z" fill="#f8fafc" />
        {/* Right: Desi Joker wicked grin */}
        <ellipse cx="710" cy="260" rx="88" ry="112" fill="#e5e7eb" stroke="#090c14" strokeWidth="4" />
        <path d="M624 218 Q710 112 796 218 Q740 175 624 218 Z" fill="#15803d" />
        <ellipse cx="675" cy="245" rx="18" ry="10" fill="#111827" />
        <ellipse cx="745" cy="245" rx="18" ry="10" fill="#111827" />
        <circle cx="678" cy="245" r="4" fill="#f8fafc" />
        <circle cx="742" cy="245" r="4" fill="#f8fafc" />
        <path d="M652 298 Q710 348 768 298" fill="none" stroke="#dc2626" strokeWidth="11" strokeLinecap="round" />
        {/* Purple coat & green vest */}
        <path d="M565 540 L608 365 L812 365 L855 540 Z" fill="#5b21b6" />
        <polygon points="665,365 755,365 730,540 690,540" fill="#15803d" />
      </svg>
    );
  }

  if (art === 'INFERNO_SHOP') {
    return (
      <svg viewBox="0 0 960 540" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="fireBg" cx="50%" cy="75%" r="65%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#0c070a" />
          </radialGradient>
        </defs>
        <rect width="960" height="540" fill="url(#fireBg)" />
        {/* Supresh Mangal Repairing signboard burning */}
        <rect x="210" y="95" width="540" height="72" fill="#1a0d0b" stroke="#f97316" strokeWidth="4" />
        <text
          x="480"
          y="144"
          textAnchor="middle"
          fill="#fed7aa"
          fontFamily="Big Shoulders Display, Impact, sans-serif"
          fontWeight="900"
          fontSize="40"
        >
          SUPRESH MANGAL REPAIRING
        </text>
        {/* Roaring flame silhouettes */}
        <path d="M0 540 Q120 310 240 460 Q360 220 480 420 Q600 240 720 450 Q840 290 960 540 Z" fill="#ea580c" opacity="0.85" />
        <path d="M60 540 Q200 360 320 490 Q460 300 580 470 Q720 320 880 540 Z" fill="#fde047" opacity="0.72" />
        {/* Scorched Steel Batarang falling in foreground */}
        <g transform="translate(480, 355) rotate(-18) scale(2.4)">
          <path
            d="M0 -14l5 6 10-7c10 3 19 9 25 18-10 1-18 5-22 13-6-4-11-4-18 4-7-8-12-8-18-4-4-8-12-12-22-13 6-9 15-15 25-18l10 7 5-6z"
            fill="#cbd5e1"
            stroke="#090c14"
            strokeWidth="2.5"
          />
        </g>
      </svg>
    );
  }

  if (art === 'SUPERMAN_EYES') {
    return (
      <svg viewBox="0 0 960 540" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="crimsonAura" cx="50%" cy="44%" r="55%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#070910" stopOpacity="1" />
          </radialGradient>
        </defs>
        <rect width="960" height="540" fill="#070910" />
        <rect width="960" height="540" fill="url(#crimsonAura)" />
        {/* Elderly bearded Desi Superman rising with glowing Blue-Red suit underneath */}
        <path d="M295 540 L335 335 L625 335 L665 540 Z" fill="#1d4ed8" />
        {/* Glowing Crimson-Gold Diamond Emblem */}
        <polygon points="480,368 552,424 480,502 408,424" fill="#dc2626" stroke="#facc15" strokeWidth="7" />
        {/* Torn dusty shopkeeper shirt lapels */}
        <polygon points="295,540 335,335 415,335 385,540" fill="#6b5e4c" />
        <polygon points="665,540 625,335 545,335 575,540" fill="#6b5e4c" />
        {/* Head & Silver-White Beard */}
        <ellipse cx="480" cy="215" rx="92" ry="108" fill="#9a6445" />
        <path d="M388 188 Q480 80 572 188 Q528 138 388 188 Z" fill="#cbd5e1" />
        <path d="M396 232 Q480 355 564 232 Q518 286 480 286 Q442 286 396 232 Z" fill="#e2e8f0" />
        {/* Blazing Crimson Heat-Vision Eyes & Beams */}
        <circle cx="442" cy="208" r="24" fill="#ef4444" opacity="0.6" />
        <circle cx="518" cy="208" r="24" fill="#ef4444" opacity="0.6" />
        <circle cx="442" cy="208" r="10" fill="#ffffff" />
        <circle cx="518" cy="208" r="10" fill="#ffffff" />
        <line x1="442" y1="208" x2="120" y2="50" stroke="#ef4444" strokeWidth="18" opacity="0.7" />
        <line x1="442" y1="208" x2="120" y2="50" stroke="#ffffff" strokeWidth="5" />
        <line x1="518" y1="208" x2="840" y2="50" stroke="#ef4444" strokeWidth="18" opacity="0.7" />
        <line x1="518" y1="208" x2="840" y2="50" stroke="#ffffff" strokeWidth="5" />
      </svg>
    );
  }

  // FINALE_DAWN
  return (
    <svg viewBox="0 0 960 540" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="dawnSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="55%" stopColor="#7c2d12" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="url(#dawnSky)" />
      {/* Sun rising behind Eent Bhatta chimney */}
      <circle cx="480" cy="390" r="130" fill="#fde68a" opacity="0.65" />
      <polygon points="445,440 464,135 496,135 515,440" fill="#181216" />
      <rect x="0" y="420" width="960" height="120" fill="#120e12" />
      {/* Silhouettes of Desi Batman & Bat-Bhensa standing side by side at dawn */}
      <path d="M295 425 L312 275 L356 275 L370 425 Z" fill="#090c14" />
      <polygon points="322,272 318,248 332,268" fill="#090c14" />
      <polygon points="346,272 350,248 336,268" fill="#090c14" />
      <path d="M308 286 Q240 340 220 425 L322 425 Z" fill="#090c14" />
      {/* Bat-Bhensa silhouette beside Batman */}
      <ellipse cx="625" cy="368" rx="92" ry="48" fill="#090c14" />
      <rect x="560" y="380" width="18" height="48" fill="#090c14" />
      <rect x="665" y="380" width="18" height="48" fill="#090c14" />
      <path d="M555 340 Q518 295 538 272" fill="none" stroke="#090c14" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}
