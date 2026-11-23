import type { ChapterConfig, ChapterId, WaveSpawn } from './types';

export const CHAPTERS: Record<ChapterId, ChapterConfig> = {
  1: {
    id: 1,
    title: 'CH 1 · SHADOWS OVER SARSON FIELDS',
    subtitle: 'Handpump Square & Mud-Roof Alley',
    objective: 'Clear the bandits terrorizing Handpump Square',
    hint: 'Tap STRIKE when yellow lightning flashes for a Slow-Mo Counter!',
    theme: 'SARSON_SQUARE',
    arenaWidth: 2100,
    introCutscene: 'INTRO',
    nalkaX: 1050,
    platforms: [
      { id: 'c1-p1', x: 340, y: 155, w: 300, h: 20, kind: 'ROOF_MUD', hasClothesline: true },
      { id: 'c1-p2', x: 1420, y: 165, w: 320, h: 20, kind: 'ROOF_MUD', hasClothesline: true },
    ],
    lanterns: [
      { x: 640, y: 230 },
      { x: 1360, y: 235 },
    ],
    waves: [
      [
        { type: 'THUG', offsetX: 340 },
        { type: 'THUG', offsetX: -320 },
        { type: 'THUG', offsetX: 480 },
      ],
      [
        { type: 'THUG', offsetX: -380 },
        { type: 'THUG', offsetX: 360 },
        { type: 'BOTTLE_THROWER', offsetX: 420, onRoof: true },
        { type: 'THUG', offsetX: -480 },
      ],
      [
        { type: 'THUG', offsetX: -350 },
        { type: 'SHIELD_THUG', offsetX: 330 },
        { type: 'BOTTLE_THROWER', offsetX: -420, onRoof: true },
        { type: 'THUG', offsetX: 490 },
      ],
    ],
  },
  2: {
    id: 2,
    title: 'CH 2 · AMBUSH AT CHAI DHABA',
    subtitle: 'Roadside Tea Stall & Hatti Market',
    objective: 'Defend the Chai Dhaba from shield bandits & bottle throwers',
    hint: 'Hold BATARANG briefly to drop a Laal Mirch Smoke Bomb for stealth takedowns!',
    theme: 'CHAI_DHABA',
    arenaWidth: 2200,
    dhabaX: 1080,
    nalkaX: 520,
    platforms: [
      { id: 'c2-p1', x: 840, y: 165, w: 440, h: 20, kind: 'DHABA_CANOPY', label: 'CHAI KA HOTEL' },
      { id: 'c2-p2', x: 250, y: 155, w: 280, h: 20, kind: 'ROOF_MUD', hasClothesline: true },
      { id: 'c2-p3', x: 1580, y: 160, w: 300, h: 20, kind: 'ROOF_MUD' },
    ],
    lanterns: [
      { x: 690, y: 235 },
      { x: 1080, y: 255 },
      { x: 1470, y: 235 },
    ],
    waves: [
      [
        { type: 'SHIELD_THUG', offsetX: 350 },
        { type: 'THUG', offsetX: -340 },
        { type: 'BOTTLE_THROWER', offsetX: 280, onRoof: true },
      ],
      [
        { type: 'SHIELD_THUG', offsetX: -380 },
        { type: 'SHIELD_THUG', offsetX: 380 },
        { type: 'THUG', offsetX: 500 },
        { type: 'BOTTLE_THROWER', offsetX: -300, onRoof: true },
      ],
      [
        { type: 'THUG', offsetX: -440 },
        { type: 'SHIELD_THUG', offsetX: 320 },
        { type: 'BOTTLE_THROWER', offsetX: 440, onRoof: true },
        { type: 'BOTTLE_THROWER', offsetX: -420, onRoof: true },
        { type: 'THUG', offsetX: 520 },
      ],
      [
        { type: 'SHIELD_THUG', offsetX: -360 },
        { type: 'SHIELD_THUG', offsetX: 360 },
        { type: 'DESI_JOKER', offsetX: 460 },
        { type: 'THUG', offsetX: -500 },
      ],
    ],
  },
  3: {
    id: 3,
    title: 'CH 3 · LOADER RICKSHAW CONVOY',
    subtitle: 'Rain-Slicked Gaon Main Road',
    objective: 'Shatter Desi Joker’s armored Loader Rickshaw convoy',
    hint: 'Snipe overhead explosive lanterns with Batarangs & unleash BAT-BHENSA!',
    theme: 'RICKSHAW_LANE',
    arenaWidth: 2450,
    nalkaX: 1680,
    dhabaX: 480,
    platforms: [
      { id: 'c3-p1', x: 350, y: 160, w: 300, h: 20, kind: 'DHABA_CANOPY' },
      { id: 'c3-p2', x: 1050, y: 170, w: 340, h: 20, kind: 'ROOF_MUD', hasClothesline: true },
      { id: 'c3-p3', x: 1820, y: 160, w: 310, h: 20, kind: 'ROOF_MUD' },
    ],
    lanterns: [
      { x: 680, y: 230 },
      { x: 1220, y: 245 },
      { x: 1720, y: 230 },
    ],
    waves: [
      [
        { type: 'LOADER_RICKSHAW', offsetX: 520 },
        { type: 'THUG', offsetX: -340 },
        { type: 'THUG', offsetX: 380 },
      ],
      [
        { type: 'LOADER_RICKSHAW', offsetX: -540 },
        { type: 'SHIELD_THUG', offsetX: 340 },
        { type: 'BOTTLE_THROWER', offsetX: 420, onRoof: true },
        { type: 'THUG', offsetX: -360 },
      ],
      [
        { type: 'LOADER_RICKSHAW', offsetX: 540 },
        { type: 'LOADER_RICKSHAW', offsetX: -540 },
        { type: 'DESI_JOKER', offsetX: 420 },
        { type: 'SHIELD_THUG', offsetX: -360 },
      ],
    ],
  },
  4: {
    id: 4,
    title: 'CH 4 · THE PUNCTURE SHOP INFERNO',
    subtitle: 'Supresh Mangal Repairing — Burning Lane',
    objective: 'Survive Joker’s ambush & withstand Desi Superman’s first wrath',
    hint: 'Jump & hold UP to Cape-Glide over crimson eye-lasers!',
    theme: 'PUNCTURE_INFERNO',
    arenaWidth: 2250,
    introCutscene: 'CH4_INFERNO',
    punctureShopX: 1125,
    platforms: [
      { id: 'c4-p1', x: 880, y: 165, w: 460, h: 20, kind: 'PUNCTURE_ROOF', label: 'SUPRESH MANGAL REPAIRING' },
      { id: 'c4-p2', x: 260, y: 155, w: 290, h: 20, kind: 'ROOF_MUD' },
      { id: 'c4-p3', x: 1680, y: 155, w: 290, h: 20, kind: 'ROOF_MUD' },
    ],
    lanterns: [
      { x: 650, y: 235 },
      { x: 1120, y: 255 },
      { x: 1580, y: 235 },
    ],
    waves: [
      [
        { type: 'THUG', offsetX: -380 },
        { type: 'SHIELD_THUG', offsetX: 350 },
        { type: 'BOTTLE_THROWER', offsetX: 410, onRoof: true },
        { type: 'THUG', offsetX: 480 },
      ],
      [
        { type: 'DESI_JOKER', offsetX: -400 },
        { type: 'LOADER_RICKSHAW', offsetX: 540 },
        { type: 'SHIELD_THUG', offsetX: 340 },
      ],
      [
        { type: 'DESI_SUPERMAN', offsetX: 460 },
      ],
    ],
  },
  5: {
    id: 5,
    title: 'CH 5 · CLIMAX AT THE EENT BHATTA',
    subtitle: 'Towering Brick Kiln — Final Showdown',
    objective: 'Defeat Desi Superman & unleash the Tag-Team Finisher',
    hint: 'Glide over sweeping lasers, COUNTER supersonic coins, then trigger BAT-BHENSA!',
    theme: 'EENT_BHATTA',
    arenaWidth: 2300,
    kilnX: 1150,
    outroCutscene: 'CH5_FINALE',
    platforms: [
      { id: 'c5-p1', x: 380, y: 155, w: 320, h: 20, kind: 'KILN_LEDGE' },
      { id: 'c5-p2', x: 970, y: 195, w: 360, h: 20, kind: 'KILN_LEDGE' },
      { id: 'c5-p3', x: 1590, y: 155, w: 320, h: 20, kind: 'KILN_LEDGE' },
    ],
    lanterns: [
      { x: 760, y: 245 },
      { x: 1540, y: 245 },
    ],
    waves: [
      [
        { type: 'DESI_SUPERMAN', offsetX: 480 },
      ],
    ],
  },
};

export const ENDLESS_ARENA_CONFIG: ChapterConfig = {
  id: 1,
  title: 'ENDLESS GAON SURVIVAL',
  subtitle: 'Rain-Lashed Village Crossroads',
  objective: 'Protect the Gaon against endless escalating waves',
  hint: 'Chain Counters, Smoke Takedowns & Bat-Bhensa charges for massive score multipliers!',
  theme: 'CHAI_DHABA',
  arenaWidth: 2300,
  dhabaX: 1150,
  nalkaX: 560,
  kilnX: 1850,
  platforms: [
    { id: 'end-p1', x: 320, y: 155, w: 300, h: 20, kind: 'ROOF_MUD', hasClothesline: true },
    { id: 'end-p2', x: 940, y: 168, w: 420, h: 20, kind: 'DHABA_CANOPY', label: 'CHAI KA HOTEL' },
    { id: 'end-p3', x: 1640, y: 158, w: 300, h: 20, kind: 'KILN_LEDGE' },
  ],
  lanterns: [
    { x: 700, y: 235 },
    { x: 1150, y: 255 },
    { x: 1590, y: 235 },
  ],
  waves: [],
};

export function generateEndlessWave(waveNumber: number): WaveSpawn[] {
  const spawns: WaveSpawn[] = [];
  const totalCount = Math.min(3 + Math.floor(waveNumber * 0.9), 9);

  if (waveNumber % 5 === 0) {
    spawns.push({ type: 'DESI_SUPERMAN', offsetX: 460 });
    spawns.push({ type: 'THUG', offsetX: -360 });
    return spawns;
  }

  if (waveNumber % 3 === 0) {
    spawns.push({ type: 'LOADER_RICKSHAW', offsetX: 520 });
  }
  if (waveNumber % 4 === 0) {
    spawns.push({ type: 'DESI_JOKER', offsetX: -420 });
  }

  for (let i = spawns.length; i < totalCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const dist = 300 + (i % 4) * 90;
    const roll = (waveNumber * 7 + i * 13) % 10;
    if (roll < 4) {
      spawns.push({ type: 'THUG', offsetX: side * dist });
    } else if (roll < 7 && waveNumber >= 2) {
      spawns.push({ type: 'SHIELD_THUG', offsetX: side * dist });
    } else {
      spawns.push({ type: 'BOTTLE_THROWER', offsetX: side * dist, onRoof: i % 2 === 1 });
    }
  }
  return spawns;
}
