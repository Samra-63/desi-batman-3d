export type GameMode = 'CAMPAIGN' | 'ENDLESS';

export type GameScreen =
  | 'TITLE'
  | 'CUTSCENE'
  | 'PLAYING'
  | 'PAUSED'
  | 'CHAPTER_CLEAR'
  | 'GAME_OVER'
  | 'VICTORY';

export type ChapterId = 1 | 2 | 3 | 4 | 5;

export type CutsceneId = 'INTRO' | 'CH4_INFERNO' | 'CH5_FINALE';

export type WorldTheme =
  | 'SARSON_SQUARE'
  | 'CHAI_DHABA'
  | 'RICKSHAW_LANE'
  | 'PUNCTURE_INFERNO'
  | 'EENT_BHATTA';

export type PlayerAction =
  | 'IDLE'
  | 'RUN'
  | 'JUMP'
  | 'GLIDE'
  | 'SLIDE'
  | 'ATTACK1'
  | 'ATTACK2'
  | 'ATTACK3'
  | 'COUNTER'
  | 'STEALTH_STRIKE'
  | 'BATARANG'
  | 'SMOKE'
  | 'BHENSA_RIDE'
  | 'TAG_FINISHER'
  | 'HURT';

export type EnemyType =
  | 'THUG'
  | 'SHIELD_THUG'
  | 'BOTTLE_THROWER'
  | 'LOADER_RICKSHAW'
  | 'DESI_JOKER'
  | 'DESI_SUPERMAN';

export type EnemyState =
  | 'APPROACH'
  | 'WINDUP'
  | 'ATTACK'
  | 'RECOVER'
  | 'STUNNED'
  | 'SMOKE_BLIND'
  | 'HURT'
  | 'BOSS_SWEEP_LOW'
  | 'BOSS_SWEEP_HIGH'
  | 'BOSS_COINS'
  | 'BOSS_SLAM'
  | 'BOSS_STAGGER'
  | 'DEAD';

export interface CapeNode {
  x: number;
  y: number;
  ox: number;
  oy: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  onPlatformId: string | null;
  hp: number;
  maxHp: number;
  score: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  bhensaMeter: number; // 0 to 100
  invulnTimer: number;
  action: PlayerAction;
  actionTimer: number;
  actionDuration: number;
  comboStep: 1 | 2 | 3;
  comboWindowTimer: number;
  hitConnected: boolean;
  batarangCooldown: number;
  smokeCooldown: number;
  stepPhase: number;
  glideTime: number;
  countersLanded: number;
  stealthTakedowns: number;
  enemiesDefeated: number;
  capeNodes: CapeNode[];
}

export interface BatBhensaState {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  timer: number;
  duration: number;
  gaitPhase: number;
  pendantSwing: number;
  steamCooldown: number;
  tagFinisher: boolean;
}

export interface EnemyEntity {
  id: string;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  state: EnemyState;
  stateTimer: number;
  telegraphTimer: number;
  telegraphMax: number;
  attackCooldown: number;
  hitFlash: number;
  animPhase: number;
  hasShield: boolean;
  shieldBroken: boolean;
  bossPhase: 1 | 2 | 3;
  laserActive: boolean;
  laserAngle: number;
  laserTargetY: number;
  laserSweeping: boolean;
  wheelAngle: number;
  onRoof: boolean;
  scoreValue: number;
}

export type ProjectileKind =
  | 'BATARANG'
  | 'SMOKE_BOMB'
  | 'FIRE_BOTTLE'
  | 'SUPER_COIN'
  | 'DEFLECTED_COIN'
  | 'JOKER_CRACKER';

export interface Projectile {
  id: string;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  owner: 'PLAYER' | 'ENEMY';
  targetId?: string;
  life: number;
  maxLife: number;
  counterable: boolean;
  damage: number;
  trail: Array<{ x: number; y: number }>;
}

export interface Platform {
  id: string;
  x: number;
  y: number; // Height above ground (positive upward in world coordinates where ground = 0)
  w: number;
  h: number;
  kind: 'ROOF_MUD' | 'DHABA_CANOPY' | 'PUNCTURE_ROOF' | 'KILN_LEDGE';
  hasClothesline?: boolean;
  label?: string;
}

export interface LanternProp {
  id: string;
  x: number;
  y: number; // Height above ground
  swingPhase: number;
  exploded: boolean;
  respawnTimer: number;
  radius: number;
}

export interface SmokeCloud {
  id: string;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface Pickup {
  id: string;
  kind: 'SAMOSA';
  x: number;
  y: number;
  vy: number;
  life: number;
  bobPhase: number;
}

export interface VillageKid {
  id: string;
  x: number;
  vx: number;
  facing: 1 | -1;
  tireAngle: number;
  scared: boolean;
  runPhase: number;
  tunicColor: string;
  scale: number;
}

export type ParticleKind =
  | 'RAIN'
  | 'SPARK'
  | 'DUST'
  | 'FIRE'
  | 'STEAM'
  | 'CHILLI_SMOKE'
  | 'RING'
  | 'SLASH'
  | 'WATER'
  | 'COMIC_TEXT';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  alpha: number;
  kind: ParticleKind;
  text?: string;
  rotation?: number;
}

export interface WaveSpawn {
  type: EnemyType;
  offsetX: number; // relative to arena center or player
  onRoof?: boolean;
  delay?: number;
}

export interface ChapterConfig {
  id: ChapterId;
  title: string;
  subtitle: string;
  objective: string;
  hint: string;
  theme: WorldTheme;
  arenaWidth: number;
  introCutscene?: CutsceneId;
  outroCutscene?: CutsceneId;
  platforms: Platform[];
  lanterns: Array<{ x: number; y: number }>;
  waves: WaveSpawn[][];
  nalkaX?: number;
  dhabaX?: number;
  punctureShopX?: number;
  kilnX?: number;
}

export interface HudSnapshot {
  screen: GameScreen;
  mode: GameMode;
  chapterId: ChapterId;
  chapterTitle: string;
  chapterSubtitle: string;
  objective: string;
  hint: string;
  wave: number;
  totalWaves: number;
  hp: number;
  maxHp: number;
  score: number;
  combo: number;
  maxCombo: number;
  bhensaMeter: number;
  bhensaReady: boolean;
  bhensaActive: boolean;
  counterAvailable: boolean;
  stealthReady: boolean;
  finisherReady: boolean;
  smokeCooldownRatio: number;
  bossName: string | null;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: 1 | 2 | 3;
  bossHint: string | null;
  muted: boolean;
  touchVisible: boolean;
  activeCutscene: CutsceneId | null;
  countersLanded: number;
  stealthTakedowns: number;
  enemiesDefeated: number;
  rank: 'S' | 'A' | 'B' | 'C';
  endlessBestScore: number;
  endlessBestWave: number;
  unlockedChapter: ChapterId;
  completedChapters: ChapterId[];
}

export interface SaveProgress {
  unlockedChapter: ChapterId;
  completedChapters: ChapterId[];
  bestScores: Partial<Record<ChapterId, number>>;
  endlessBestScore: number;
  endlessBestWave: number;
  touchVisibleOnDesktop: boolean;
}
