import { GameAudioEngine } from './audio';
import { CHAPTERS, ENDLESS_ARENA_CONFIG, generateEndlessWave } from './chapters';
import { WORLD_SCALE } from './models3d';
import { DarkRakhwala3DRenderer } from './renderer3d';
import {
  calculateMeleeDamage,
  computeBhensaChargeGain,
  computeChapterRank,
  findCounterableThreat,
  findStealthTarget,
  loadSaveProgress,
  persistSaveProgress,
  pickBatarangTarget,
  resolvePlatformLanding,
} from './rules';
import type {
  BatBhensaState,
  CapeNode,
  ChapterConfig,
  ChapterId,
  CutsceneId,
  EnemyEntity,
  EnemyType,
  GameMode,
  GameScreen,
  HudSnapshot,
  LanternProp,
  Particle,
  Pickup,
  PlayerState,
  Projectile,
  SaveProgress,
  SmokeCloud,
  VillageKid,
  WaveSpawn,
} from './types';

const GRAVITY = -1480;
const GLIDE_FALL_SPEED = -155;
const MOVE_SPEED = 435;
const JUMP_VELOCITY = 660;
const SLIDE_SPEED = 620;

export class DarkRakhwalaEngine {
  private renderer3d: DarkRakhwala3DRenderer;
  private audio: GameAudioEngine;
  private onHudUpdate: (snapshot: HudSnapshot) => void;

  private frameId: number | null = null;
  private disposed = false;
  private lastTs = 0;
  private elapsedTime = 0;
  private hudEmitTimer = 0;
  private lastFrameDt = 0.016;
  private footstepSplashTimer = 0;

  private width = 1280;
  private height = 720;

  private screen: GameScreen = 'TITLE';
  private mode: GameMode = 'CAMPAIGN';
  private chapterId: ChapterId = 1;
  private config: ChapterConfig = CHAPTERS[1];
  private activeCutscene: CutsceneId | null = null;
  private pendingAfterCutscene: 'PLAY' | 'VICTORY' = 'PLAY';
  private save: SaveProgress;

  private waveIndex = 0;
  private waveDelayTimer = 0;

  private cameraX = 1050;
  private cameraZoom = 1;
  private targetZoom = 1;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private hitstopTimer = 0;
  private slowMoTimer = 0;
  private slowMoFactor = 1;
  private lightningTimer = 4.2;
  private lightningFlash = 0;

  private player: PlayerState;
  private bhensa: BatBhensaState;
  private enemies: EnemyEntity[] = [];
  private projectiles: Projectile[] = [];
  private lanterns: LanternProp[] = [];
  private smokeClouds: SmokeCloud[] = [];
  private pickups: Pickup[] = [];
  private kids: VillageKid[] = [];
  private particles: Particle[] = [];

  private nextId = 1;

  // Unified input state (Keyboard + Mouse + Virtual Thumb-Stick)
  private keys = new Set<string>();
  private stickX = 0;
  private stickY = 0;
  private stickJumpHeld = false;
  private stickSlideTriggered = false;
  private jumpWasPressed = false;
  private dropThroughTimer = 0;

  // Bound event listeners for clean teardown
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundResize: () => void;

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.renderer3d = new DarkRakhwala3DRenderer(container);
    this.audio = new GameAudioEngine();
    this.onHudUpdate = onHudUpdate;
    this.save = loadSaveProgress();

    this.player = this.createFreshPlayer(1050);
    this.bhensa = this.createFreshBhensa();

    this.setupTitleShowcase();

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundResize = this.handleResize.bind(this);

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('resize', this.boundResize);

    this.handleResize();
    // Draw first 3D showcase frame immediately so initial paint is never blank
    this.renderFrame();
    this.emitHud(true);

    this.lastTs = performance.now();
    this.scheduleNextFrame();
  }

  private uid(prefix: string): string {
    this.nextId += 1;
    return `${prefix}-${this.nextId}`;
  }

  private createFreshPlayer(spawnX: number): PlayerState {
    const capeNodes: CapeNode[] = [];
    for (let i = 0; i < 12; i++) {
      capeNodes.push({
        x: spawnX - i * 8,
        y: 100 - i * 4,
        ox: spawnX - i * 8,
        oy: 100 - i * 4,
      });
    }
    return {
      x: spawnX,
      y: 0,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: true,
      onPlatformId: null,
      hp: 100,
      maxHp: 100,
      score: 0,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      bhensaMeter: 35,
      invulnTimer: 0,
      action: 'IDLE',
      actionTimer: 0,
      actionDuration: 0,
      comboStep: 1,
      comboWindowTimer: 0,
      hitConnected: false,
      batarangCooldown: 0,
      smokeCooldown: 0,
      stepPhase: 0,
      glideTime: 0,
      countersLanded: 0,
      stealthTakedowns: 0,
      enemiesDefeated: 0,
      capeNodes,
    };
  }

  private createFreshBhensa(): BatBhensaState {
    return {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      facing: 1,
      timer: 0,
      duration: 2.8,
      gaitPhase: 0,
      pendantSwing: 0,
      steamCooldown: 0,
      tagFinisher: false,
    };
  }

  private setupTitleShowcase(): void {
    this.screen = 'TITLE';
    this.config = CHAPTERS[1];
    this.player = this.createFreshPlayer(1050);
    this.bhensa = this.createFreshBhensa();
    this.bhensa.active = true;
    this.bhensa.x = 880;
    this.bhensa.facing = 1;
    this.enemies = [];
    this.projectiles = [];
    this.smokeClouds = [];
    this.pickups = [];
    this.particles = [];
    this.lanterns = this.config.lanterns.map((l, idx) => ({
      id: `l-${idx}`,
      x: l.x,
      y: l.y,
      swingPhase: idx * 1.4,
      exploded: false,
      respawnTimer: 0,
      radius: 135,
    }));
    this.spawnVillageKids();
    this.cameraX = 1010;
  }

  private spawnVillageKids(): void {
    const colors = ['#d97706', '#2563eb', '#16a34a'];
    this.kids = [0, 1].map((idx) => ({
      id: this.uid('kid'),
      x: 520 + idx * 960,
      vx: idx === 0 ? 115 : -110,
      facing: idx === 0 ? 1 : -1,
      tireAngle: 0,
      scared: false,
      runPhase: idx * 2.1,
      tunicColor: colors[idx % colors.length],
      scale: 0.78 + idx * 0.06,
    }));
  }

  // ---- PUBLIC ACTIONS CALLED FROM REACT UI / TOUCH OVERLAY ----

  public startCampaign(chapter: ChapterId = 1): void {
    this.audio.start();
    this.mode = 'CAMPAIGN';
    this.chapterId = chapter;
    this.config = CHAPTERS[chapter];
    this.prepareArena();

    if (this.config.introCutscene) {
      this.screen = 'CUTSCENE';
      this.activeCutscene = this.config.introCutscene;
      this.pendingAfterCutscene = 'PLAY';
      this.audio.setIntensity(0.4);
    } else {
      this.screen = 'PLAYING';
      this.activeCutscene = null;
      this.audio.setIntensity(0.75);
      this.spawnCurrentWave();
    }
    this.emitHud(true);
  }

  public startEndless(): void {
    this.audio.start();
    this.mode = 'ENDLESS';
    this.chapterId = 1;
    this.config = ENDLESS_ARENA_CONFIG;
    this.prepareArena();
    this.screen = 'PLAYING';
    this.activeCutscene = null;
    this.audio.setIntensity(0.8);
    this.spawnCurrentWave();
    this.emitHud(true);
  }

  public completeCutscene(): void {
    this.audio.start();
    this.activeCutscene = null;
    if (this.pendingAfterCutscene === 'VICTORY') {
      this.screen = 'VICTORY';
      this.audio.setIntensity(0.4);
    } else {
      this.screen = 'PLAYING';
      this.audio.setIntensity(this.chapterId >= 4 ? 0.92 : 0.75);
      if (this.enemies.length === 0) {
        this.spawnCurrentWave();
      }
    }
    this.emitHud(true);
  }

  public togglePause(): void {
    if (this.screen === 'PLAYING') {
      this.screen = 'PAUSED';
      this.audio.setSlowMotionDuck(true);
      this.emitHud(true);
    } else if (this.screen === 'PAUSED') {
      this.screen = 'PLAYING';
      this.audio.setSlowMotionDuck(false);
      this.lastTs = performance.now();
      this.emitHud(true);
    }
  }

  public retryCurrent(): void {
    if (this.mode === 'ENDLESS') {
      this.startEndless();
    } else {
      this.audio.start();
      this.config = CHAPTERS[this.chapterId];
      this.prepareArena();
      this.screen = 'PLAYING';
      this.activeCutscene = null;
      this.audio.setIntensity(this.chapterId >= 4 ? 0.9 : 0.75);
      this.spawnCurrentWave();
      this.emitHud(true);
    }
  }

  public nextChapter(): void {
    if (this.chapterId < 5) {
      this.startCampaign((this.chapterId + 1) as ChapterId);
    } else {
      this.returnToTitle();
    }
  }

  public returnToTitle(): void {
    this.audio.setSlowMotionDuck(false);
    this.audio.setIntensity(0.35);
    this.setupTitleShowcase();
    this.emitHud(true);
  }

  public toggleMute(): void {
    this.audio.start();
    this.audio.toggleMute();
    this.emitHud(true);
  }

  public toggleTouchControls(): void {
    this.save.touchVisibleOnDesktop = !this.save.touchVisibleOnDesktop;
    persistSaveProgress(this.save);
    this.emitHud(true);
  }

  // ---- UNIFIED TOUCH / VIRTUAL STICK INPUT API ----

  public setVirtualStick(x: number, y: number): void {
    this.stickX = Math.max(-1, Math.min(1, x));
    this.stickY = Math.max(-1, Math.min(1, y));

    // Flick up -> Jump / hold up -> Cape-Glide
    if (this.stickY < -0.52) {
      if (!this.stickJumpHeld) {
        this.stickJumpHeld = true;
        this.triggerJump();
      }
    } else {
      this.stickJumpHeld = false;
    }

    // Flick down -> Slide or drop through roof
    if (this.stickY > 0.62) {
      if (!this.stickSlideTriggered) {
        this.stickSlideTriggered = true;
        this.triggerSlide();
      }
    } else {
      this.stickSlideTriggered = false;
    }
  }

  public triggerStrikeOrCounter(): void {
    if (this.screen !== 'PLAYING') return;
    this.audio.start();

    const p = this.player;
    if (p.action === 'BHENSA_RIDE' || p.action === 'TAG_FINISHER') return;

    // 1. Check Boss Stagger Finisher first!
    const staggeredBoss = this.enemies.find(
      (e) => e.type === 'DESI_SUPERMAN' && e.state === 'BOSS_STAGGER'
    );
    if (staggeredBoss && Math.abs(staggeredBoss.x - p.x) < 340) {
      this.launchTagTeamFinisher(staggeredBoss);
      return;
    }

    // 2. Context-sensitive Slow-Motion Counter / Coin Deflect
    const threat = findCounterableThreat(p, this.enemies, this.projectiles);
    if (threat.projectile) {
      this.executeProjectileCounter(threat.projectile);
      return;
    }
    if (threat.enemy) {
      this.executeMeleeCounter(threat.enemy);
      return;
    }

    // 3. Stealth Takedown inside Laal Mirch Smoke Cloud
    const stealthEnemy = findStealthTarget(p, this.enemies);
    if (stealthEnemy) {
      this.executeStealthTakedown(stealthEnemy);
      return;
    }

    // 4. Fast 3-hit Martial Arts & Jhaadu Combo
    if (
      (p.action === 'ATTACK1' || p.action === 'ATTACK2' || p.action === 'ATTACK3') &&
      p.actionTimer > p.actionDuration * 0.42
    ) {
      return;
    }

    if (p.comboWindowTimer > 0) {
      p.comboStep = p.comboStep === 1 ? 2 : p.comboStep === 2 ? 3 : 1;
    } else {
      p.comboStep = 1;
    }

    p.action = p.comboStep === 1 ? 'ATTACK1' : p.comboStep === 2 ? 'ATTACK2' : 'ATTACK3';
    p.actionDuration = p.comboStep === 3 ? 0.36 : 0.24;
    p.actionTimer = p.actionDuration;
    p.comboWindowTimer = 0.72;
    p.hitConnected = false;

    // Smart subtle auto-face nearest close enemy for Arkham free-flow feel
    const nearest = this.findNearestEnemy(170);
    if (nearest) {
      p.facing = nearest.x >= p.x ? 1 : -1;
      const lungeDist = Math.min(72, Math.max(0, Math.abs(nearest.x - p.x) - 52));
      p.vx = p.facing * (240 + lungeDist * 3.5);
    } else {
      p.vx = p.facing * 180;
    }
    this.audio.playPunch(p.comboStep === 3);
  }

  public triggerBatarang(): void {
    if (this.screen !== 'PLAYING') return;
    this.audio.start();
    const p = this.player;
    if (p.batarangCooldown > 0 || p.action === 'BHENSA_RIDE' || p.action === 'TAG_FINISHER') return;

    const target = pickBatarangTarget(p, this.enemies, this.lanterns);
    p.facing = target.x >= p.x ? 1 : -1;
    p.action = 'BATARANG';
    p.actionDuration = 0.2;
    p.actionTimer = 0.2;
    p.batarangCooldown = 0.34;

    const startX = p.x + p.facing * 24;
    const startY = p.y + 84;
    const dx = target.x - startX;
    const dy = target.y - startY;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = 880;

    this.projectiles.push({
      id: this.uid('bat'),
      kind: 'BATARANG',
      x: startX,
      y: startY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      rotation: 0,
      owner: 'PLAYER',
      targetId: target.targetId,
      life: 1.35,
      maxLife: 1.35,
      counterable: false,
      damage: 22,
      trail: [{ x: startX, y: startY }],
    });

    this.audio.playBatarangThrow();
  }

  public triggerSmokeBomb(): void {
    if (this.screen !== 'PLAYING') return;
    this.audio.start();
    const p = this.player;
    if (p.smokeCooldown > 0 || p.action === 'BHENSA_RIDE' || p.action === 'TAG_FINISHER') return;

    p.smokeCooldown = 5.0;
    p.action = 'SMOKE';
    p.actionDuration = 0.24;
    p.actionTimer = 0.24;

    const startX = p.x + p.facing * 18;
    const startY = p.y + 74;
    this.projectiles.push({
      id: this.uid('smk'),
      kind: 'SMOKE_BOMB',
      x: startX,
      y: startY,
      vx: p.facing * 320,
      vy: 230,
      rotation: 0,
      owner: 'PLAYER',
      life: 0.75,
      maxLife: 0.75,
      counterable: false,
      damage: 10,
      trail: [{ x: startX, y: startY }],
    });
    this.audio.playSmokeBomb();
  }

  public triggerBatBhensa(): void {
    if (this.screen !== 'PLAYING') return;
    this.audio.start();
    const p = this.player;

    // Allow instant Tag-Team Finisher if Desi Superman is staggered in Chapter 5!
    const staggeredBoss = this.enemies.find(
      (e) => e.type === 'DESI_SUPERMAN' && e.state === 'BOSS_STAGGER'
    );
    if (staggeredBoss) {
      this.launchTagTeamFinisher(staggeredBoss);
      return;
    }

    if (p.bhensaMeter < 100 || this.bhensa.active) return;

    p.bhensaMeter = 0;
    p.action = 'BHENSA_RIDE';
    p.actionDuration = 2.65;
    p.actionTimer = 2.65;
    p.invulnTimer = 3.1;
    p.y = 0;
    p.vy = 0;
    p.grounded = true;

    this.bhensa.active = true;
    this.bhensa.tagFinisher = false;
    this.bhensa.facing = p.facing;
    this.bhensa.x = p.x - p.facing * 260;
    this.bhensa.y = 0;
    this.bhensa.vx = p.facing * 690;
    this.bhensa.timer = 2.65;
    this.bhensa.duration = 2.65;

    this.slowMoTimer = 0.55;
    this.slowMoFactor = 0.42;
    this.targetZoom = 1.07;
    this.triggerShake(12, 0.45);
    this.audio.playWhistleAndBhensa();
    this.spawnComicText(p.x, p.y + 150, 'BAT-BHENSA CHARGE!', '#facc15', 34);
    this.emitHud(true);
  }

  public triggerJump(): void {
    if (this.screen !== 'PLAYING') return;
    const p = this.player;
    if (p.action === 'BHENSA_RIDE' || p.action === 'TAG_FINISHER') return;
    if (p.grounded) {
      p.vy = JUMP_VELOCITY;
      p.grounded = false;
      p.onPlatformId = null;
      p.action = 'JUMP';
      p.glideTime = 0;
      this.audio.playCapeWhoosh();
      this.spawnDustBurst(p.x, 4, 6);
    }
  }

  public triggerSlide(): void {
    if (this.screen !== 'PLAYING') return;
    const p = this.player;
    if (p.action === 'BHENSA_RIDE' || p.action === 'TAG_FINISHER') return;
    if (p.grounded && p.onPlatformId) {
      // Drop smoothly from rooftop back to street
      this.dropThroughTimer = 0.25;
      p.grounded = false;
      p.onPlatformId = null;
      p.y -= 10;
      p.vy = -80;
      return;
    }
    if (p.grounded && p.action !== 'SLIDE') {
      p.action = 'SLIDE';
      p.actionDuration = 0.42;
      p.actionTimer = 0.42;
      p.vx = p.facing * SLIDE_SPEED;
      p.invulnTimer = Math.max(p.invulnTimer, 0.32);
      this.audio.playCapeWhoosh();
      this.spawnDustBurst(p.x, 6, 8);
      this.renderer3d.weather.spawnLocalizedSplash(p.x * WORLD_SCALE, p.y * WORLD_SCALE, 0, 5);
    }
  }

  // ---- INTERNAL ARENA SETUP & WAVES ----

  private prepareArena(): void {
    const center = this.config.arenaWidth * 0.5;
    this.player = this.createFreshPlayer(center);
    this.bhensa = this.createFreshBhensa();
    this.enemies = [];
    this.projectiles = [];
    this.smokeClouds = [];
    this.pickups = [];
    this.particles = [];
    this.waveIndex = 0;
    this.waveDelayTimer = 0;
    this.slowMoTimer = 0;
    this.slowMoFactor = 1;
    this.hitstopTimer = 0;
    this.cameraX = center;
    this.cameraZoom = 1;
    this.targetZoom = 1;
    this.lanterns = this.config.lanterns.map((l, idx) => ({
      id: this.uid(`lan-${idx}`),
      x: l.x,
      y: l.y,
      swingPhase: idx * 1.35,
      exploded: false,
      respawnTimer: 0,
      radius: 155,
    }));
    this.spawnVillageKids();
  }

  private spawnCurrentWave(): void {
    const spawns: WaveSpawn[] =
      this.mode === 'ENDLESS'
        ? generateEndlessWave(this.waveIndex + 1)
        : this.config.waves[this.waveIndex] ?? [];

    for (const sp of spawns) {
      this.spawnEnemy(sp.type, sp.offsetX, Boolean(sp.onRoof));
    }

    const label =
      this.mode === 'ENDLESS'
        ? `WAVE ${this.waveIndex + 1}`
        : spawns.some((s) => s.type === 'DESI_SUPERMAN')
        ? 'DESI SUPERMAN ARRIVES!'
        : `WAVE ${this.waveIndex + 1} / ${this.config.waves.length}`;

    this.spawnComicText(this.player.x, 195, label, '#f59e0b', 34);
    this.emitHud(true);
  }

  private spawnEnemy(type: EnemyType, offsetX: number, onRoof: boolean): void {
    const rawX = Math.max(
      140,
      Math.min(this.config.arenaWidth - 140, this.player.x + offsetX)
    );
    let spawnY = 0;
    let spawnX = rawX;

    if (onRoof && this.config.platforms.length > 0) {
      // Pick closest roof platform
      let best = this.config.platforms[0];
      let bestDist = Infinity;
      for (const plat of this.config.platforms) {
        const cx = plat.x + plat.w * 0.5;
        const d = Math.abs(cx - rawX);
        if (d < bestDist) {
          bestDist = d;
          best = plat;
        }
      }
      spawnX = best.x + best.w * 0.5;
      spawnY = best.y;
    }

    const isCh5Boss = type === 'DESI_SUPERMAN' && this.chapterId === 5 && this.mode === 'CAMPAIGN';
    const hpMap: Record<EnemyType, number> = {
      THUG: 62,
      SHIELD_THUG: 92,
      BOTTLE_THROWER: 54,
      LOADER_RICKSHAW: 165,
      DESI_JOKER: 175,
      DESI_SUPERMAN: isCh5Boss ? 340 : 190,
    };
    const nameMap: Record<EnemyType, string> = {
      THUG: 'Gaon Bandit',
      SHIELD_THUG: 'Shield Thug',
      BOTTLE_THROWER: 'Kerosene Thrower',
      LOADER_RICKSHAW: 'Armored Loader Rickshaw',
      DESI_JOKER: 'DESI JOKER',
      DESI_SUPERMAN: 'DESI SUPERMAN',
    };

    const endlessScale = this.mode === 'ENDLESS' ? 1 + this.waveIndex * 0.1 : 1;
    const maxHp = Math.round(hpMap[type] * endlessScale);

    this.enemies.push({
      id: this.uid('en'),
      type,
      name: nameMap[type],
      x: spawnX,
      y: type === 'DESI_SUPERMAN' ? 95 : spawnY,
      vx: 0,
      vy: 0,
      facing: spawnX > this.player.x ? -1 : 1,
      hp: maxHp,
      maxHp,
      state: 'APPROACH',
      stateTimer: 1.0,
      telegraphTimer: 0,
      telegraphMax: 0.58,
      attackCooldown: 1.1 + Math.random() * 0.7,
      hitFlash: 0,
      animPhase: Math.random() * 6,
      hasShield: type === 'SHIELD_THUG',
      shieldBroken: false,
      bossPhase: 1,
      laserActive: false,
      laserAngle: Math.PI,
      laserTargetY: 0,
      laserSweeping: false,
      wheelAngle: 0,
      onRoof,
      scoreValue:
        type === 'DESI_SUPERMAN'
          ? 1200
          : type === 'DESI_JOKER'
          ? 500
          : type === 'LOADER_RICKSHAW'
          ? 380
          : 140,
    });
  }

  // ---- SPECIAL COMBAT EXECUTIONS ----

  private executeMeleeCounter(enemy: EnemyEntity): void {
    const p = this.player;
    p.facing = enemy.x >= p.x ? 1 : -1;
    p.x = enemy.x - p.facing * 58;
    p.y = enemy.y;
    p.action = 'COUNTER';
    p.actionDuration = 0.44;
    p.actionTimer = 0.44;
    p.invulnTimer = 0.65;
    p.countersLanded += 1;

    const dmgRes = calculateMeleeDamage(3, p.combo, false, true, enemy, p.facing);
    enemy.telegraphTimer = 0;
    enemy.shieldBroken = true;
    this.damageEnemy(enemy, dmgRes.damage, p.facing * 360, true);
    this.registerComboHit('COUNTER');

    this.hitstopTimer = 0.085;
    this.slowMoTimer = 0.58;
    this.slowMoFactor = 0.26;
    this.targetZoom = 1.1;
    this.triggerShake(11, 0.32);
    this.audio.playCounterParry();
    this.spawnSparks(enemy.x, enemy.y + 78, '#facc15', 18);
    this.spawnRing(enemy.x, enemy.y + 78, '#facc15', 62);
    this.spawnComicText(enemy.x, enemy.y + 150, 'COUNTER!', '#facc15', 38);
  }

  private executeProjectileCounter(proj: Projectile): void {
    const p = this.player;
    p.facing = proj.vx >= 0 ? -1 : 1;
    p.action = 'COUNTER';
    p.actionDuration = 0.38;
    p.actionTimer = 0.38;
    p.invulnTimer = 0.55;
    p.countersLanded += 1;

    proj.owner = 'PLAYER';
    proj.counterable = false;
    proj.kind = 'DEFLECTED_COIN';
    proj.damage = 52;
    proj.life = 1.6;

    // Aim reflected coin directly back at Desi Superman or nearest enemy
    const target =
      this.enemies.find((e) => e.type === 'DESI_SUPERMAN' && e.state !== 'DEAD') ??
      this.findNearestEnemy(900);
    if (target) {
      const dx = target.x - proj.x;
      const dy = target.y + 85 - proj.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      proj.vx = (dx / d) * 980;
      proj.vy = (dy / d) * 980;
      proj.targetId = target.id;
    } else {
      proj.vx = -proj.vx * 1.4;
      proj.vy = -proj.vy * 0.5;
    }

    this.registerComboHit('COIN_DEFLECT');
    this.hitstopTimer = 0.075;
    this.slowMoTimer = 0.45;
    this.slowMoFactor = 0.3;
    this.targetZoom = 1.09;
    this.triggerShake(9, 0.25);
    this.audio.playCounterParry();
    this.spawnSparks(proj.x, proj.y, '#fde047', 20);
    this.spawnComicText(proj.x, proj.y + 52, 'DEFLECTED!', '#fde047', 34);
  }

  private executeStealthTakedown(enemy: EnemyEntity): void {
    const p = this.player;
    p.facing = enemy.x >= p.x ? 1 : -1;
    p.x = enemy.x - p.facing * 44;
    p.y = enemy.y;
    p.action = 'STEALTH_STRIKE';
    p.actionDuration = 0.42;
    p.actionTimer = 0.42;
    p.invulnTimer = 0.6;
    p.stealthTakedowns += 1;

    const dmg = calculateMeleeDamage(3, p.combo, true, false, enemy, p.facing).damage;
    enemy.shieldBroken = true;
    this.damageEnemy(enemy, dmg, p.facing * 290, true);
    this.registerComboHit('STEALTH');

    this.hitstopTimer = 0.08;
    this.slowMoTimer = 0.4;
    this.slowMoFactor = 0.35;
    this.targetZoom = 1.08;
    this.triggerShake(10, 0.28);
    this.audio.playPunch(true);
    this.spawnRing(enemy.x, enemy.y + 72, '#ef4444', 56);
    this.spawnComicText(enemy.x, enemy.y + 150, 'SHADOW TAKEDOWN!', '#f87171', 32);
  }

  private launchTagTeamFinisher(boss: EnemyEntity): void {
    const p = this.player;
    p.action = 'TAG_FINISHER';
    p.actionDuration = 1.85;
    p.actionTimer = 1.85;
    p.invulnTimer = 2.5;
    p.facing = boss.x >= p.x ? 1 : -1;
    p.y = 0;

    this.bhensa.active = true;
    this.bhensa.tagFinisher = true;
    this.bhensa.facing = p.facing;
    this.bhensa.x = p.x - p.facing * 240;
    this.bhensa.y = 0;
    this.bhensa.vx = p.facing * 760;
    this.bhensa.timer = 1.85;
    this.bhensa.duration = 1.85;

    // Throw 3 converging Steel Batarangs alongside the Bat-Bhensa charge!
    for (let i = -1; i <= 1; i++) {
      const startX = p.x + p.facing * 20;
      const startY = 100 + i * 24;
      const dx = boss.x - startX;
      const dy = boss.y + 70 - startY;
      const d = Math.max(1, Math.hypot(dx, dy));
      this.projectiles.push({
        id: this.uid('fin'),
        kind: 'BATARANG',
        x: startX,
        y: startY,
        vx: (dx / d) * 920,
        vy: (dy / d) * 920,
        rotation: 0,
        owner: 'PLAYER',
        targetId: boss.id,
        life: 1.5,
        maxLife: 1.5,
        counterable: false,
        damage: 40,
        trail: [{ x: startX, y: startY }],
      });
    }

    this.slowMoTimer = 1.1;
    this.slowMoFactor = 0.34;
    this.targetZoom = 1.12;
    this.triggerShake(15, 0.7);
    this.audio.playWhistleAndBhensa();
    this.audio.playCounterParry();
    this.spawnComicText(boss.x, 195, 'TAG-TEAM FINISHER!', '#facc15', 42);
  }

  // ---- MAIN LOOP ----

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.renderer3d.isSoftwareGl) {
      this.frameId = this.renderer3d.afterDraw(() => {
        if (!this.disposed) {
          this.loop(performance.now());
        }
      });
    } else {
      this.frameId = window.requestAnimationFrame(this.loop);
    }
  }

  private loop = (ts: number): void => {
    if (this.disposed) return;
    const rawDt = Math.min(0.05, Math.max(0.001, (ts - this.lastTs) / 1000));
    this.lastTs = ts;
    this.lastFrameDt = rawDt;

    if (this.screen === 'PLAYING' || this.screen === 'TITLE') {
      this.update(rawDt);
    }
    this.renderFrame();

    this.scheduleNextFrame();
  };

  private update(rawDt: number): void {
    this.elapsedTime += rawDt;

    // Intermittent storm lightning flashes illuminating foreground & background layers
    this.lightningTimer -= rawDt;
    if (this.lightningTimer <= 0) {
      this.lightningTimer = 5.5 + Math.random() * 6.5;
      this.lightningFlash = 1.0;
      if (this.screen === 'PLAYING') {
        this.audio.playThunder();
      }
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - rawDt * 1.9);
    }

    if (this.screen === 'TITLE') {
      this.updateTitleShowcase(rawDt);
      return;
    }

    // Hitstop freeze frames for punchy combat feel
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= rawDt;
      this.updateParticles(rawDt * 0.25);
      return;
    }

    // Slow-motion easing
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= rawDt;
      this.audio.setSlowMotionDuck(true);
      if (this.slowMoTimer <= 0) {
        this.slowMoFactor = 1;
        this.targetZoom = 1;
        this.audio.setSlowMotionDuck(false);
      }
    } else {
      this.slowMoFactor += (1 - this.slowMoFactor) * Math.min(1, rawDt * 8);
      this.targetZoom += (1 - this.targetZoom) * Math.min(1, rawDt * 6);
    }

    const dt = rawDt * this.slowMoFactor;

    this.updatePlayer(dt, rawDt);
    this.updateBatBhensa(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateSmokeClouds(dt);
    this.updatePickups(dt);
    this.updateLanterns(dt);
    this.updateVillageKids(dt);
    this.updateParticles(dt);
    this.updateCamera(rawDt);
    this.checkWaveProgression(dt);

    this.hudEmitTimer -= rawDt;
    if (this.hudEmitTimer <= 0) {
      this.hudEmitTimer = 0.08;
      this.emitHud(false);
    }
  }

  private updateTitleShowcase(dt: number): void {
    // Gentle atmospheric cape wind + Bat-Bhensa breathing steam on Title Screen
    this.player.stepPhase += dt * 1.5;
    this.updateCapePhysics(dt, -26);
    this.bhensa.pendantSwing += dt * 2.2;
    this.bhensa.steamCooldown -= dt;
    if (this.bhensa.steamCooldown <= 0) {
      this.bhensa.steamCooldown = 1.1;
      this.spawnSteamPuff(this.bhensa.x + 88, 56, 1);
    }
    this.updateVillageKids(dt);
    this.updateParticles(dt);
  }

  private updatePlayer(dt: number, rawDt: number): void {
    const p = this.player;
    p.invulnTimer = Math.max(0, p.invulnTimer - rawDt);
    p.batarangCooldown = Math.max(0, p.batarangCooldown - rawDt);
    p.smokeCooldown = Math.max(0, p.smokeCooldown - rawDt);
    p.comboWindowTimer = Math.max(0, p.comboWindowTimer - dt);
    this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);

    if (p.combo > 0) {
      p.comboTimer -= rawDt;
      if (p.comboTimer <= 0) {
        p.combo = 0;
      }
    }

    // Bat-Bhensa riding overrides manual movement
    if (p.action === 'BHENSA_RIDE' || p.action === 'TAG_FINISHER') {
      p.actionTimer -= dt;
      if (this.bhensa.active) {
        p.x = this.bhensa.x + this.bhensa.facing * 8;
        p.y = 84;
        p.facing = this.bhensa.facing;
      }
      if (p.actionTimer <= 0) {
        p.action = 'IDLE';
        p.y = 0;
        p.vy = 0;
        p.grounded = true;
      }
      this.updateCapePhysics(dt, -p.facing * 80);
      return;
    }

    // Gather horizontal input from Keyboard + Virtual Thumb-Stick
    let moveInput = this.stickX;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveInput = -1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveInput = 1;

    const jumpHeld =
      this.stickJumpHeld ||
      this.keys.has('Space') ||
      this.keys.has('KeyW') ||
      this.keys.has('ArrowUp');

    if (jumpHeld && !this.jumpWasPressed) {
      this.triggerJump();
    }
    this.jumpWasPressed = jumpHeld;

    const inLockedAction =
      p.action === 'ATTACK1' ||
      p.action === 'ATTACK2' ||
      p.action === 'ATTACK3' ||
      p.action === 'COUNTER' ||
      p.action === 'STEALTH_STRIKE' ||
      p.action === 'SLIDE' ||
      p.action === 'BATARANG' ||
      p.action === 'SMOKE' ||
      p.action === 'HURT';

    if (inLockedAction) {
      p.actionTimer -= dt;
      // Friction on attack/slide momentum
      p.vx *= Math.pow(0.06, dt);

      // Melee hitbox active window
      if (
        (p.action === 'ATTACK1' || p.action === 'ATTACK2' || p.action === 'ATTACK3') &&
        !p.hitConnected &&
        p.actionTimer <= p.actionDuration * 0.65
      ) {
        this.resolvePlayerMeleeHit();
      }

      if (p.actionTimer <= 0) {
        p.action = p.grounded ? 'IDLE' : 'JUMP';
      }
    } else {
      if (Math.abs(moveInput) > 0.14) {
        p.facing = moveInput > 0 ? 1 : -1;
        p.vx = moveInput * MOVE_SPEED;
        if (p.grounded) {
          p.action = 'RUN';
          p.stepPhase += dt * 13.5 * Math.abs(moveInput);
        }
      } else {
        p.vx *= Math.pow(0.0005, dt);
        if (Math.abs(p.vx) < 8) p.vx = 0;
        if (p.grounded) p.action = 'IDLE';
      }
    }

    // Air physics & Cape-Glide when holding Jump while falling
    if (!p.grounded) {
      if (jumpHeld && p.vy < 15 && !inLockedAction) {
        p.vy = Math.max(GLIDE_FALL_SPEED, p.vy + GRAVITY * 0.22 * dt);
        p.action = 'GLIDE';
        p.glideTime += dt;
        // Forward boost while gliding
        if (Math.abs(moveInput) > 0.14) {
          p.vx = moveInput * (MOVE_SPEED * 1.12);
        }
      } else {
        p.vy += GRAVITY * dt;
      }
    }

    const wasGrounded = p.grounded;
    const prevY = p.y;
    p.x = Math.max(68, Math.min(this.config.arenaWidth - 68, p.x + p.vx * dt));
    const nextY = p.y + p.vy * dt;

    const landed = resolvePlatformLanding(
      prevY,
      nextY,
      p.x,
      p.vy,
      this.config.platforms,
      this.dropThroughTimer > 0
    );
    p.y = landed.y;
    p.vy = landed.vy;
    p.grounded = landed.grounded;
    p.onPlatformId = landed.platformId;

    // Localized rain-slicked landing splash on wet street or mud rooftop
    if (!wasGrounded && p.grounded) {
      this.renderer3d.weather.spawnLocalizedSplash(p.x * WORLD_SCALE, p.y * WORLD_SCALE, 0, 5);
    }

    // Walk off platform ledge check
    if (p.grounded && p.onPlatformId) {
      const plat = this.config.platforms.find((pl) => pl.id === p.onPlatformId);
      if (plat && (p.x < plat.x - 18 || p.x > plat.x + plat.w + 18)) {
        p.grounded = false;
        p.onPlatformId = null;
      }
    }

    // Footstep & slide puddle splashes across the rain-slicked village road
    if (p.grounded && Math.abs(p.vx) > 150) {
      this.footstepSplashTimer -= dt;
      if (this.footstepSplashTimer <= 0) {
        this.footstepSplashTimer = p.action === 'SLIDE' ? 0.07 : 0.16;
        this.renderer3d.weather.spawnLocalizedSplash(
          (p.x - p.facing * 10) * WORLD_SCALE,
          p.y * WORLD_SCALE,
          (Math.random() - 0.5) * 0.25,
          p.action === 'SLIDE' ? 3 : 2
        );
      }
    } else {
      this.footstepSplashTimer = 0;
    }

    // Water splash interaction near Village Handpump (Nalka)
    if (
      this.config.nalkaX !== undefined &&
      p.grounded &&
      Math.abs(p.vx) > 200 &&
      Math.abs(p.x - this.config.nalkaX) < 52 &&
      Math.random() < dt * 8
    ) {
      this.spawnWaterSplash(this.config.nalkaX, 18);
      this.renderer3d.weather.spawnLocalizedSplash(this.config.nalkaX * WORLD_SCALE, 0.05, 0.3, 4);
    }

    this.updateCapePhysics(dt, -p.vx * 0.12 - p.facing * 18);
  }

  private updateCapePhysics(dt: number, windX: number): void {
    const p = this.player;
    const nodes = p.capeNodes;
    if (nodes.length === 0) return;

    const anchorX = p.x - p.facing * 8;
    const anchorY = p.y + (p.action === 'SLIDE' ? 56 : 100);
    nodes[0].x = anchorX;
    nodes[0].y = anchorY;

    const segLen = p.action === 'GLIDE' ? 11 : 9.2;
    for (let i = 1; i < nodes.length; i++) {
      const n = nodes[i];
      const vx = (n.x - n.ox) * 0.86;
      const vy = (n.y - n.oy) * 0.86;
      n.ox = n.x;
      n.oy = n.y;
      const flutter = Math.sin(this.elapsedTime * 10 + i * 0.7) * 14;
      n.x += vx + (windX + flutter) * dt;
      n.y += vy + (p.action === 'GLIDE' ? 40 : -220) * dt;
    }

    // Distance constraints (3 solver iterations)
    for (let iter = 0; iter < 3; iter++) {
      nodes[0].x = anchorX;
      nodes[0].y = anchorY;
      for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1];
        const b = nodes[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(0.01, Math.hypot(dx, dy));
        const diff = (dist - segLen) / dist;
        b.x -= dx * diff;
        b.y -= dy * diff;
        if (b.y < 4) b.y = 4;
      }
    }
  }

  private resolvePlayerMeleeHit(): void {
    const p = this.player;
    const reach = p.action === 'ATTACK3' ? 128 : 104;
    let connected = false;

    for (const e of this.enemies) {
      if (e.state === 'DEAD') continue;
      const dx = e.x - p.x;
      const dy = Math.abs(e.y - p.y);
      if (dy > 95) continue;
      if (dx * p.facing < -24 || Math.abs(dx) > reach) continue;

      connected = true;
      const res = calculateMeleeDamage(p.comboStep, p.combo, false, false, e, p.facing);
      if (res.blocked) {
        this.audio.playShieldClang();
        this.spawnSparks(e.x - e.facing * 24, e.y + 72, '#94a3b8', 10);
        this.spawnComicText(e.x, e.y + 135, 'BLOCKED! SLIDE OR SMOKE!', '#cbd5e1', 20);
        e.vx = p.facing * 90;
      } else {
        this.damageEnemy(e, res.damage, p.facing * (p.comboStep === 3 ? 280 : 140), p.comboStep === 3);
        this.registerComboHit('HIT');
        this.spawnSparks(e.x, e.y + 74, p.comboStep === 3 ? '#f59e0b' : '#f8fafc', 10);
        if (p.comboStep === 3) {
          this.hitstopTimer = 0.055;
          this.triggerShake(7, 0.18);
          this.spawnComicText(e.x, e.y + 142, 'KRACK!', '#f59e0b', 30);
        }
      }
    }

    if (connected) {
      p.hitConnected = true;
    }
  }

  private updateBatBhensa(dt: number): void {
    const b = this.bhensa;
    if (!b.active) return;

    b.timer -= dt;
    b.gaitPhase += dt * 16;
    b.pendantSwing += dt * 14;
    b.x += b.vx * dt;

    // Bounce off arena edges during long charge
    if (b.x < 95 && b.facing === -1) {
      b.facing = 1;
      b.vx = Math.abs(b.vx);
    } else if (b.x > this.config.arenaWidth - 95 && b.facing === 1) {
      b.facing = -1;
      b.vx = -Math.abs(b.vx);
    }

    // Thunderous dust clouds, wet hoof splashes & nostril steam
    b.steamCooldown -= dt;
    if (b.steamCooldown <= 0) {
      b.steamCooldown = 0.09;
      this.spawnDustBurst(b.x - b.facing * 45, 8, 3);
      this.spawnSteamPuff(b.x + b.facing * 88, 56, b.facing);
      this.renderer3d.weather.spawnLocalizedSplash(
        (b.x - b.facing * 32) * WORLD_SCALE,
        0,
        (Math.random() - 0.5) * 0.5,
        4
      );
    }

    // Ram all enemies, shatter shields & armored rickshaws!
    for (const e of this.enemies) {
      if (e.state === 'DEAD') continue;
      if (Math.abs(e.x - b.x) < 115 && e.y < 145) {
        if (e.hitFlash <= 0) {
          e.shieldBroken = true;
          const dmg = b.tagFinisher ? 260 : e.type === 'LOADER_RICKSHAW' ? 120 : 88;
          this.damageEnemy(e, dmg, b.facing * 460, true);
          this.triggerShake(13, 0.28);
          this.audio.playExplosion();
          this.spawnSparks(e.x, e.y + 64, '#facc15', 16);
          this.spawnComicText(e.x, e.y + 152, b.tagFinisher ? 'KO FINISHER!' : 'SMASH!', '#facc15', 34);
        }
      }
    }

    if (b.timer <= 0) {
      b.active = false;
      b.tagFinisher = false;
    }
  }

  private updateEnemies(dt: number): void {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.state === 'DEAD') continue;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      e.animPhase += dt * 9;

      if (e.state === 'STUNNED' || e.state === 'SMOKE_BLIND' || e.state === 'HURT') {
        e.stateTimer -= dt;
        e.vx *= Math.pow(0.04, dt);
        e.x = Math.max(70, Math.min(this.config.arenaWidth - 70, e.x + e.vx * dt));
        if (e.stateTimer <= 0) {
          e.state = 'APPROACH';
        }
        continue;
      }

      if (e.type === 'DESI_SUPERMAN') {
        this.updateDesiSupermanAI(e, dt);
        continue;
      }

      if (e.type === 'LOADER_RICKSHAW') {
        this.updateLoaderRickshawAI(e, dt);
        continue;
      }

      const dx = p.x - e.x;
      const dist = Math.abs(dx);
      if (e.state === 'APPROACH') {
        e.facing = dx >= 0 ? 1 : -1;
        const preferredDist = e.type === 'BOTTLE_THROWER' ? 320 : e.type === 'DESI_JOKER' ? 210 : 84;
        const speed = e.type === 'DESI_JOKER' ? 235 : e.type === 'SHIELD_THUG' ? 145 : 185;

        if (!e.onRoof) {
          if (dist > preferredDist + 16) {
            e.vx = e.facing * speed;
          } else if (e.type === 'BOTTLE_THROWER' && dist < 180) {
            e.vx = -e.facing * speed * 0.7;
          } else {
            e.vx = 0;
          }
        } else {
          e.vx = 0;
        }

        if (dist <= preferredDist + 55 && e.attackCooldown <= 0) {
          e.state = 'WINDUP';
          e.telegraphMax = e.type === 'DESI_JOKER' ? 0.52 : 0.62;
          e.telegraphTimer = e.telegraphMax;
          e.stateTimer = e.telegraphMax;
          e.vx = 0;
        }
      } else if (e.state === 'WINDUP') {
        e.telegraphTimer -= dt;
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.telegraphTimer = 0;
          e.state = 'ATTACK';
          e.stateTimer = 0.28;
          if (e.type === 'BOTTLE_THROWER' || e.type === 'DESI_JOKER') {
            this.fireEnemyProjectile(e, e.type === 'DESI_JOKER' ? 'JOKER_CRACKER' : 'FIRE_BOTTLE');
          } else {
            e.vx = e.facing * 260;
            if (Math.abs(p.x - e.x) < 105 && Math.abs(p.y - e.y) < 80) {
              this.damagePlayer(e.type === 'SHIELD_THUG' ? 14 : 11, e.facing);
            }
          }
        }
      } else if (e.state === 'ATTACK') {
        e.stateTimer -= dt;
        e.vx *= Math.pow(0.08, dt);
        if (e.stateTimer <= 0) {
          e.state = 'APPROACH';
          e.attackCooldown = e.type === 'DESI_JOKER' ? 1.15 : 1.45 + Math.random() * 0.6;
        }
      }

      e.x = Math.max(70, Math.min(this.config.arenaWidth - 70, e.x + e.vx * dt));
    }
  }

  private updateLoaderRickshawAI(e: EnemyEntity, dt: number): void {
    const p = this.player;
    e.wheelAngle += (e.vx * dt) / 20;

    if (e.state === 'APPROACH') {
      const dx = p.x - e.x;
      if (Math.abs(dx) > 420) {
        e.facing = dx >= 0 ? 1 : -1;
        e.vx = e.facing * 220;
      } else if (e.attackCooldown <= 0) {
        e.facing = dx >= 0 ? 1 : -1;
        e.state = 'WINDUP';
        e.telegraphMax = 0.78;
        e.telegraphTimer = 0.78;
        e.stateTimer = 0.78;
        e.vx = 0;
      } else {
        e.vx *= 0.9;
      }
    } else if (e.state === 'WINDUP') {
      e.telegraphTimer -= dt;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.telegraphTimer = 0;
        e.state = 'ATTACK';
        e.stateTimer = 1.2;
        e.vx = e.facing * 490;
        this.spawnDustBurst(e.x - e.facing * 60, 8, 8);
      }
    } else if (e.state === 'ATTACK') {
      e.stateTimer -= dt;
      if (Math.abs(p.x - e.x) < 105 && p.y < 72) {
        this.damagePlayer(18, e.facing);
      }
      if (e.stateTimer <= 0 || e.x < 120 || e.x > this.config.arenaWidth - 120) {
        e.state = 'APPROACH';
        e.attackCooldown = 2.0;
        e.vx = 0;
      }
    }
    e.x = Math.max(95, Math.min(this.config.arenaWidth - 95, e.x + e.vx * dt));
  }

  private updateDesiSupermanAI(e: EnemyEntity, dt: number): void {
    const p = this.player;
    const hpRatio = e.hp / e.maxHp;
    const isCh5 = this.chapterId === 5 && this.mode === 'CAMPAIGN';

    // Phase transitions
    e.bossPhase = hpRatio <= 0.34 ? 3 : hpRatio <= 0.68 ? 2 : 1;

    // Trigger Staggered Finisher window in Chapter 5 at <= 15% HP
    if (isCh5 && hpRatio <= 0.16 && e.state !== 'BOSS_STAGGER') {
      e.state = 'BOSS_STAGGER';
      e.stateTimer = 8.0;
      e.laserActive = false;
      e.y = 0;
      e.vx = 0;
      this.spawnComicText(e.x, 195, 'STAGGERED! FINISH HIM!', '#facc15', 38);
      this.emitHud(true);
      return;
    }

    if (e.state === 'BOSS_STAGGER') {
      e.stateTimer -= dt;
      e.y = 0;
      if (e.stateTimer <= 0) {
        e.hp = Math.round(e.maxHp * 0.22);
        e.state = 'APPROACH';
      }
      return;
    }

    const dx = p.x - e.x;
    e.facing = dx >= 0 ? 1 : -1;

    if (e.state === 'APPROACH') {
      e.laserActive = false;
      const targetHoverY = e.bossPhase === 1 ? 110 : 145;
      e.y += (targetHoverY - e.y) * Math.min(1, dt * 4);
      const desiredX = p.x + (e.x >= p.x ? 350 : -350);
      const clampedX = Math.max(180, Math.min(this.config.arenaWidth - 180, desiredX));
      e.vx = Math.max(-260, Math.min(260, (clampedX - e.x) * 2.2));
      e.x += e.vx * dt;

      if (e.attackCooldown <= 0) {
        if (e.bossPhase === 1 || (e.bossPhase === 3 && Math.random() < 0.45)) {
          e.state = 'BOSS_SWEEP_LOW';
          e.stateTimer = 1.9;
          e.laserActive = true;
          e.laserAngle = e.facing === 1 ? 0.52 : Math.PI - 0.52;
          this.audio.playLaserBeam();
        } else if (e.bossPhase === 2 || Math.random() < 0.55) {
          e.state = 'BOSS_COINS';
          e.stateTimer = 1.45;
          this.fireSuperCoin(e);
        } else {
          e.state = 'BOSS_SLAM';
          e.telegraphMax = 0.72;
          e.telegraphTimer = 0.72;
          e.stateTimer = 1.1;
        }
      }
    } else if (e.state === 'BOSS_SWEEP_LOW') {
      e.stateTimer -= dt;
      e.laserActive = true;
      // Sweep crimson heat-vision beam smoothly toward player height so cape-glide clears it cleanly!
      const sweepSpeed = 0.34;
      if (e.facing === 1) {
        e.laserAngle = Math.max(-0.08, e.laserAngle - sweepSpeed * dt);
      } else {
        e.laserAngle = Math.min(Math.PI + 0.08, e.laserAngle + sweepSpeed * dt);
      }

      // Check beam collision against player
      const eyeX = e.x + e.facing * 10;
      const eyeY = e.y + 119;
      const pCenterY = p.y + (p.action === 'SLIDE' ? 30 : 62);
      const relX = p.x - eyeX;
      if (relX * e.facing > 0 && Math.abs(relX) < 880) {
        const beamYAtPlayer = eyeY - Math.tan(e.laserAngle) * relX;
        if (Math.abs(beamYAtPlayer - pCenterY) < 26) {
          this.damagePlayer(14, e.facing);
        }
      }

      if (e.stateTimer <= 0) {
        e.laserActive = false;
        e.state = 'APPROACH';
        e.attackCooldown = 1.65;
      }
    } else if (e.state === 'BOSS_COINS') {
      const prev = e.stateTimer;
      e.stateTimer -= dt;
      if (prev > 0.75 && e.stateTimer <= 0.75) {
        this.fireSuperCoin(e);
      }
      if (e.stateTimer <= 0) {
        e.state = 'APPROACH';
        e.attackCooldown = 1.8;
      }
    } else if (e.state === 'BOSS_SLAM') {
      if (e.telegraphTimer > 0) {
        e.telegraphTimer -= dt;
        e.y = Math.min(185, e.y + 120 * dt);
      } else {
        e.y = Math.max(0, e.y - 820 * dt);
        if (e.y <= 0 && e.stateTimer > 0.25) {
          e.stateTimer = 0.25;
          this.triggerShake(13, 0.35);
          this.audio.playExplosion();
          this.spawnRing(e.x, 12, '#ef4444', 120);
          this.spawnDustBurst(e.x, 10, 14);
          this.renderer3d.weather.spawnLocalizedSplash(e.x * WORLD_SCALE, 0, 0, 9);
          if (Math.abs(p.x - e.x) < 155 && p.y < 52) {
            this.damagePlayer(18, e.facing);
          }
        }
      }
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'APPROACH';
        e.attackCooldown = 1.8;
      }
    }
  }

  private fireEnemyProjectile(e: EnemyEntity, kind: 'FIRE_BOTTLE' | 'JOKER_CRACKER'): void {
    const p = this.player;
    const sx = e.x + e.facing * 20;
    const sy = e.y + 84;
    const dx = p.x - sx;
    const flightT = Math.max(0.55, Math.min(1.05, Math.abs(dx) / 480));
    const vx = dx / flightT;
    const vy = (p.y + 50 - sy - 0.5 * GRAVITY * flightT * flightT) / flightT;

    this.projectiles.push({
      id: this.uid('ep'),
      kind,
      x: sx,
      y: sy,
      vx,
      vy,
      rotation: 0,
      owner: 'ENEMY',
      life: 2.0,
      maxLife: 2.0,
      counterable: true,
      damage: 13,
      trail: [{ x: sx, y: sy }],
    });
  }

  private fireSuperCoin(e: EnemyEntity): void {
    const p = this.player;
    const sx = e.x + e.facing * 26;
    const sy = e.y + 82;
    const dx = p.x - sx;
    const dy = p.y + 68 - sy;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = 560;

    this.projectiles.push({
      id: this.uid('coin'),
      kind: 'SUPER_COIN',
      x: sx,
      y: sy,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      rotation: 0,
      owner: 'ENEMY',
      life: 2.4,
      maxLife: 2.4,
      counterable: true,
      damage: 15,
      trail: [{ x: sx, y: sy }],
    });
    this.audio.playBatarangThrow();
    this.spawnComicText(e.x, e.y + 150, 'COUNTER THE COIN!', '#fde047', 24);
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;

      // Homing guidance for player Batarangs & Deflected Coins
      if ((pr.kind === 'BATARANG' || pr.kind === 'DEFLECTED_COIN') && pr.targetId) {
        const lan = this.lanterns.find((l) => l.id === pr.targetId && !l.exploded);
        const en = this.enemies.find((e) => e.id === pr.targetId && e.state !== 'DEAD');
        const tx = lan ? lan.x : en ? en.x : null;
        const ty = lan ? lan.y : en ? en.y + 72 : null;
        if (tx !== null && ty !== null) {
          const dx = tx - pr.x;
          const dy = ty - pr.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const speed = pr.kind === 'DEFLECTED_COIN' ? 980 : 880;
          pr.vx += ((dx / dist) * speed - pr.vx) * Math.min(1, dt * 10);
          pr.vy += ((dy / dist) * speed - pr.vy) * Math.min(1, dt * 10);
        }
      }

      if (pr.kind === 'SMOKE_BOMB' || pr.kind === 'FIRE_BOTTLE' || pr.kind === 'JOKER_CRACKER') {
        pr.vy += GRAVITY * 0.72 * dt;
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.rotation += dt * 18;
      pr.trail.push({ x: pr.x, y: pr.y });
      if (pr.trail.length > 8) pr.trail.shift();

      let remove = pr.life <= 0;

      // Ground detonation
      if (pr.y <= 4) {
        if (pr.kind === 'SMOKE_BOMB') {
          this.detonateSmokeBomb(pr.x, 10);
        } else if (pr.kind === 'FIRE_BOTTLE' || pr.kind === 'JOKER_CRACKER') {
          this.spawnFireBurst(pr.x, 12, 12);
          if (Math.abs(p.x - pr.x) < 75 && p.y < 52) {
            this.damagePlayer(pr.damage, pr.vx >= 0 ? 1 : -1);
          }
        }
        remove = true;
      }

      if (!remove && pr.owner === 'PLAYER') {
        // Check Lantern hit first!
        for (const l of this.lanterns) {
          if (l.exploded) continue;
          if (Math.hypot(pr.x - l.x, pr.y - l.y) < 42) {
            this.explodeLantern(l);
            remove = true;
            break;
          }
        }
      }

      if (!remove && pr.owner === 'PLAYER') {
        for (const e of this.enemies) {
          if (e.state === 'DEAD') continue;
          const hitW = e.type === 'LOADER_RICKSHAW' ? 88 : 42;
          if (Math.abs(pr.x - e.x) < hitW && Math.abs(pr.y - (e.y + 68)) < 68) {
            if (pr.kind === 'SMOKE_BOMB') {
              this.detonateSmokeBomb(pr.x, e.y + 20);
            } else {
              const isDeflect = pr.kind === 'DEFLECTED_COIN';
              this.damageEnemy(e, pr.damage, (pr.vx >= 0 ? 1 : -1) * (isDeflect ? 320 : 120), isDeflect);
              this.registerComboHit('HIT');
              this.spawnSparks(pr.x, pr.y, isDeflect ? '#fde047' : '#e2e8f0', 12);
              if (isDeflect && e.type === 'DESI_SUPERMAN') {
                e.state = 'STUNNED';
                e.stateTimer = 1.1;
                this.spawnComicText(e.x, e.y + 160, 'STUNNED!', '#fde047', 34);
              }
            }
            remove = true;
            break;
          }
        }
      } else if (!remove && pr.owner === 'ENEMY') {
        if (Math.abs(pr.x - p.x) < 38 && Math.abs(pr.y - (p.y + 64)) < 58) {
          this.damagePlayer(pr.damage, pr.vx >= 0 ? 1 : -1);
          if (pr.kind === 'FIRE_BOTTLE' || pr.kind === 'JOKER_CRACKER') {
            this.spawnFireBurst(pr.x, pr.y, 10);
          }
          remove = true;
        }
      }

      if (remove) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private detonateSmokeBomb(x: number, y: number): void {
    this.smokeClouds.push({
      id: this.uid('cloud'),
      x,
      y,
      radius: 170,
      life: 4.8,
      maxLife: 4.8,
    });
    this.audio.playSmokeBomb();
    this.spawnRing(x, y + 30, '#dc2626', 85);
    this.spawnComicText(x, y + 115, 'LAAL MIRCH SMOKE!', '#f87171', 28);
  }

  private explodeLantern(l: LanternProp): void {
    l.exploded = true;
    l.respawnTimer = 11.0;
    this.audio.playExplosion();
    this.triggerShake(13, 0.35);
    this.spawnFireBurst(l.x, l.y - 25, 22);
    this.spawnRing(l.x, l.y - 40, '#f97316', l.radius);
    this.spawnComicText(l.x, l.y + 20, 'LALTAIN BLAST!', '#fb923c', 34);

    for (const e of this.enemies) {
      if (e.state === 'DEAD') continue;
      if (Math.abs(e.x - l.x) < l.radius + 45) {
        e.shieldBroken = true;
        this.damageEnemy(e, 74, (e.x >= l.x ? 1 : -1) * 320, true);
        this.registerComboHit('LANTERN_BLAST');
      }
    }
  }

  private updateSmokeClouds(dt: number): void {
    for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
      const c = this.smokeClouds[i];
      c.life -= dt;
      for (const e of this.enemies) {
        if (e.state === 'DEAD' || e.type === 'DESI_SUPERMAN' || e.type === 'LOADER_RICKSHAW') continue;
        if (Math.abs(e.x - c.x) < c.radius && Math.abs(e.y - c.y) < 120) {
          e.state = 'SMOKE_BLIND';
          e.stateTimer = Math.max(e.stateTimer, 0.8);
          e.telegraphTimer = 0;
        }
      }
      if (c.life <= 0) {
        this.smokeClouds.splice(i, 1);
      }
    }
  }

  private updateLanterns(dt: number): void {
    for (const l of this.lanterns) {
      if (l.exploded) {
        l.respawnTimer -= dt;
        if (l.respawnTimer <= 0) {
          l.exploded = false;
        }
      }
    }
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.life -= dt;
      if (pk.y > 0) {
        pk.vy += GRAVITY * 0.6 * dt;
        pk.y = Math.max(0, pk.y + pk.vy * dt);
      }
      if (Math.abs(pk.x - p.x) < 52 && Math.abs(pk.y - p.y) < 75) {
        p.hp = Math.min(p.maxHp, p.hp + 26);
        this.audio.playSamosaHeal();
        this.spawnComicText(p.x, p.y + 135, 'GARAM SAMOSA +26 HP', '#fde047', 24);
        this.pickups.splice(i, 1);
        this.emitHud(true);
        continue;
      }
      if (pk.life <= 0) {
        this.pickups.splice(i, 1);
      }
    }
  }

  private updateVillageKids(dt: number): void {
    const p = this.player;
    const combatHot = this.enemies.some((e) => e.state !== 'DEAD');
    for (const k of this.kids) {
      // Scatter safely away from Batman/enemies during active fights!
      if (combatHot && Math.abs(k.x - p.x) < 420) {
        k.scared = true;
        k.facing = k.x >= p.x ? 1 : -1;
        k.vx = k.facing * 270;
      } else if (!combatHot) {
        k.scared = false;
        if (k.x < 180) {
          k.facing = 1;
          k.vx = 110;
        } else if (k.x > this.config.arenaWidth - 180) {
          k.facing = -1;
          k.vx = -110;
        }
      }
      k.x += k.vx * dt;
      k.runPhase += dt * (k.scared ? 15 : 8);
      k.tireAngle += (k.vx * dt) / 14;
      if (k.scared && (k.x < -120 || k.x > this.config.arenaWidth + 120)) {
        // Stay safely off-arena until lane clears
        k.vx = 0;
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.kind === 'SPARK' || pt.kind === 'WATER') {
        pt.vy += GRAVITY * 0.45 * dt;
      }
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateCamera(rawDt: number): void {
    const halfView = this.width * 0.5;
    const lead = this.player.facing * 75;
    const desired = Math.max(
      halfView * 0.65,
      Math.min(this.config.arenaWidth - halfView * 0.65, this.player.x + lead)
    );
    this.cameraX += (desired - this.cameraX) * Math.min(1, rawDt * 6.5);
    this.cameraZoom += (this.targetZoom - this.cameraZoom) * Math.min(1, rawDt * 7.5);
    if (this.shakeTimer > 0) {
      this.shakeTimer -= rawDt;
    }
  }

  private checkWaveProgression(dt: number): void {
    const aliveCount = this.enemies.filter((e) => e.state !== 'DEAD').length;
    if (aliveCount > 0) return;

    this.waveDelayTimer += dt;
    if (this.waveDelayTimer < 1.15) return;
    this.waveDelayTimer = 0;

    if (this.mode === 'ENDLESS') {
      this.waveIndex += 1;
      if (this.waveIndex > this.save.endlessBestWave) {
        this.save.endlessBestWave = this.waveIndex;
        persistSaveProgress(this.save);
      }
      // Drop a fresh Samosa every wave cleared in Endless
      this.spawnSamosa(this.player.x + this.player.facing * 95);
      this.spawnCurrentWave();
      return;
    }

    if (this.waveIndex + 1 < this.config.waves.length) {
      this.waveIndex += 1;
      this.spawnSamosa(this.player.x + this.player.facing * 85);
      this.spawnCurrentWave();
      return;
    }

    // Chapter Cleared!
    this.handleChapterCleared();
  }

  private handleChapterCleared(): void {
    const prevCompleted = new Set(this.save.completedChapters);
    prevCompleted.add(this.chapterId);
    this.save.completedChapters = Array.from(prevCompleted).sort() as ChapterId[];
    if (this.chapterId < 5 && this.save.unlockedChapter <= this.chapterId) {
      this.save.unlockedChapter = (this.chapterId + 1) as ChapterId;
    }
    const prevBest = this.save.bestScores[this.chapterId] ?? 0;
    if (this.player.score > prevBest) {
      this.save.bestScores[this.chapterId] = this.player.score;
    }
    persistSaveProgress(this.save);

    if (this.config.outroCutscene) {
      this.screen = 'CUTSCENE';
      this.activeCutscene = this.config.outroCutscene;
      this.pendingAfterCutscene = 'VICTORY';
      this.audio.setIntensity(0.45);
    } else {
      this.screen = 'CHAPTER_CLEAR';
      this.audio.setIntensity(0.42);
    }
    this.emitHud(true);
  }

  // ---- DAMAGE & SCORING ----

  private damageEnemy(e: EnemyEntity, amount: number, knockbackVx: number, heavy: boolean): void {
    e.hp -= amount;
    e.hitFlash = 0.14;
    e.vx = knockbackVx;

    if (e.hp <= 0) {
      e.hp = 0;
      e.state = 'DEAD';
      e.laserActive = false;
      this.player.enemiesDefeated += 1;
      const mult = 1 + Math.min(this.player.combo, 20) * 0.1;
      this.player.score += Math.round(e.scoreValue * mult);
      this.spawnDustBurst(e.x, e.y + 30, 12);
      this.spawnRing(e.x, e.y + 65, '#f59e0b', 55);

      if (this.mode === 'ENDLESS' && this.player.score > this.save.endlessBestScore) {
        this.save.endlessBestScore = this.player.score;
        persistSaveProgress(this.save);
      }

      // Chance to drop Garam Samosa health pickup
      if (
        e.type === 'SHIELD_THUG' ||
        e.type === 'LOADER_RICKSHAW' ||
        e.type === 'DESI_JOKER' ||
        (this.player.hp < 55 && Math.random() < 0.45)
      ) {
        this.spawnSamosa(e.x);
      }
      this.emitHud(true);
    } else if (heavy && e.type !== 'DESI_SUPERMAN' && e.type !== 'LOADER_RICKSHAW') {
      e.state = 'HURT';
      e.stateTimer = 0.34;
      e.telegraphTimer = 0;
    }
  }

  private damagePlayer(amount: number, hitDir: 1 | -1): void {
    const p = this.player;
    if (p.invulnTimer > 0 || p.action === 'BHENSA_RIDE' || p.action === 'TAG_FINISHER') return;

    p.hp = Math.max(0, p.hp - amount);
    p.invulnTimer = 0.85;
    p.combo = 0;
    p.action = 'HURT';
    p.actionDuration = 0.28;
    p.actionTimer = 0.28;
    p.vx = hitDir * 240;

    this.triggerShake(10, 0.26);
    this.audio.playPunch(true);
    this.spawnSparks(p.x, p.y + 72, '#ef4444', 12);

    if (p.hp <= 0) {
      if (this.mode === 'ENDLESS') {
        if (p.score > this.save.endlessBestScore) this.save.endlessBestScore = p.score;
        if (this.waveIndex + 1 > this.save.endlessBestWave) this.save.endlessBestWave = this.waveIndex + 1;
        persistSaveProgress(this.save);
      }
      this.screen = 'GAME_OVER';
      this.audio.setIntensity(0.35);
    }
    this.emitHud(true);
  }

  private registerComboHit(
    event: 'HIT' | 'COUNTER' | 'STEALTH' | 'LANTERN_BLAST' | 'COIN_DEFLECT'
  ): void {
    const p = this.player;
    p.combo += 1;
    if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    p.comboTimer = 4.2;
    p.score += 25 + p.combo * 8;
    p.bhensaMeter = Math.min(100, p.bhensaMeter + computeBhensaChargeGain(event));
  }

  private findNearestEnemy(maxDist: number): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestDist = maxDist;
    for (const e of this.enemies) {
      if (e.state === 'DEAD') continue;
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  // ---- VFX HELPERS ----

  private triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  private spawnSamosa(x: number): void {
    this.pickups.push({
      id: this.uid('sam'),
      kind: 'SAMOSA',
      x,
      y: 35,
      vy: 220,
      life: 16,
      bobPhase: Math.random() * 6,
    });
  }

  private spawnSparks(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 160 + Math.random() * 320;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd + 110,
        size: 3,
        life: 0.28 + Math.random() * 0.2,
        maxLife: 0.48,
        color,
        alpha: 1,
        kind: 'SPARK',
      });
    }
  }

  private spawnDustBurst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 32,
        y: y + Math.random() * 14,
        vx: (Math.random() - 0.5) * 140,
        vy: 30 + Math.random() * 85,
        size: 10 + Math.random() * 12,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
        color: '#78614c',
        alpha: 0.52,
        kind: 'DUST',
      });
    }
  }

  private spawnSteamPuff(x: number, y: number, dir: 1 | -1): void {
    this.particles.push({
      x,
      y,
      vx: dir * (70 + Math.random() * 55),
      vy: 30 + Math.random() * 35,
      size: 9,
      life: 0.55,
      maxLife: 0.55,
      color: '#e2e8f0',
      alpha: 0.45,
      kind: 'STEAM',
    });
  }

  private spawnFireBurst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 90 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.abs(Math.sin(ang)) * spd + 60,
        size: 9 + Math.random() * 12,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        color: i % 2 === 0 ? '#f97316' : '#facc15',
        alpha: 0.9,
        kind: 'FIRE',
      });
    }
  }

  private spawnWaterSplash(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 24,
        y,
        vx: (Math.random() - 0.5) * 140,
        vy: 140 + Math.random() * 150,
        size: 3.5,
        life: 0.42,
        maxLife: 0.42,
        color: '#7dd3fc',
        alpha: 0.78,
        kind: 'WATER',
      });
    }
  }

  private spawnRing(x: number, y: number, color: string, size: number): void {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size,
      life: 0.32,
      maxLife: 0.32,
      color,
      alpha: 0.9,
      kind: 'RING',
    });
  }

  private spawnComicText(x: number, y: number, text: string, color: string, size: number): void {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 42,
      size,
      life: 0.95,
      maxLife: 0.95,
      color,
      alpha: 1,
      kind: 'COMIC_TEXT',
      text,
      rotation: (Math.random() - 0.5) * 0.14,
    });
    this.renderer3d.weather.spawnComicBillboard(x * WORLD_SCALE, y * WORLD_SCALE, text, color);
  }

  // ---- RENDERING & HUD ----

  private renderFrame(): void {
    const shakeAmt = this.shakeTimer > 0 ? this.shakeIntensity * (this.shakeTimer / 0.35) : 0;
    const shakeX = shakeAmt > 0 ? (Math.random() - 0.5) * shakeAmt : 0;
    const shakeY = shakeAmt > 0 ? (Math.random() - 0.5) * shakeAmt : 0;

    this.renderer3d.render({
      dt: this.lastFrameDt,
      time: this.elapsedTime,
      cameraX: this.cameraX,
      cameraZoom: this.cameraZoom,
      shakeX,
      shakeY,
      lightningFlash: this.lightningFlash,
      slowMoFactor: this.slowMoFactor,
      config: this.config,
      player: this.player,
      bhensa: this.bhensa,
      enemies: this.enemies,
      projectiles: this.projectiles,
      lanterns: this.lanterns,
      smokeClouds: this.smokeClouds,
      pickups: this.pickups,
      kids: this.kids,
      particles: this.particles,
      titleShowcase: this.screen === 'TITLE',
    });
  }

  private emitHud(force: boolean): void {
    if (!force && this.screen === 'TITLE') return;

    const p = this.player;
    const threat = findCounterableThreat(p, this.enemies, this.projectiles);
    const stealth = findStealthTarget(p, this.enemies);
    const boss = this.enemies.find(
      (e) => (e.type === 'DESI_SUPERMAN' || e.type === 'DESI_JOKER') && e.state !== 'DEAD'
    );
    const finisherReady = Boolean(
      boss && boss.type === 'DESI_SUPERMAN' && boss.state === 'BOSS_STAGGER'
    );

    let bossHint: string | null = null;
    if (boss?.type === 'DESI_SUPERMAN') {
      if (boss.state === 'BOSS_STAGGER') {
        bossHint = 'TAP BAT-BHENSA FOR TAG-TEAM FINISHER!';
      } else if (boss.bossPhase === 1) {
        bossHint = 'HOLD JUMP TO CAPE-GLIDE OVER CRIMSON LASERS';
      } else if (boss.bossPhase === 2) {
        bossHint = 'TAP STRIKE TO DEFLECT SUPERSONIC COINS';
      } else {
        bossHint = 'DODGE KILN SLAMS & UNLEASH BAT-BHENSA';
      }
    }

    this.onHudUpdate({
      screen: this.screen,
      mode: this.mode,
      chapterId: this.chapterId,
      chapterTitle: this.config.title,
      chapterSubtitle: this.config.subtitle,
      objective: this.config.objective,
      hint: this.config.hint,
      wave: this.waveIndex + 1,
      totalWaves: this.mode === 'ENDLESS' ? 0 : this.config.waves.length,
      hp: Math.ceil(p.hp),
      maxHp: p.maxHp,
      score: p.score,
      combo: p.combo,
      maxCombo: p.maxCombo,
      bhensaMeter: Math.round(p.bhensaMeter),
      bhensaReady: p.bhensaMeter >= 100 || finisherReady,
      bhensaActive: this.bhensa.active,
      counterAvailable: Boolean(threat.enemy || threat.projectile),
      stealthReady: Boolean(stealth),
      finisherReady,
      smokeCooldownRatio: Math.max(0, Math.min(1, p.smokeCooldown / 5.0)),
      bossName: boss ? boss.name : null,
      bossHp: boss ? Math.ceil(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      bossPhase: boss ? boss.bossPhase : 1,
      bossHint,
      muted: this.audio.isMuted(),
      touchVisible: this.save.touchVisibleOnDesktop,
      activeCutscene: this.activeCutscene,
      countersLanded: p.countersLanded,
      stealthTakedowns: p.stealthTakedowns,
      enemiesDefeated: p.enemiesDefeated,
      rank: computeChapterRank(p.score, p.hp / p.maxHp, p.maxCombo, p.countersLanded),
      endlessBestScore: this.save.endlessBestScore,
      endlessBestWave: this.save.endlessBestWave,
      unlockedChapter: this.save.unlockedChapter,
      completedChapters: this.save.completedChapters,
    });
  }

  // ---- KEYBOARD & RESIZE HANDLERS ----

  private handleKeyDown(e: KeyboardEvent): void {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    this.keys.add(e.code);

    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (this.screen === 'PLAYING' || this.screen === 'PAUSED') {
        this.togglePause();
      }
      return;
    }

    if (this.screen !== 'PLAYING') return;

    if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      this.triggerSlide();
    } else if (e.code === 'KeyJ') {
      this.triggerStrikeOrCounter();
    } else if (e.code === 'KeyK') {
      this.triggerBatarang();
    } else if (e.code === 'KeyL' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.triggerSmokeBomb();
    } else if (e.code === 'KeyE') {
      this.triggerBatBhensa();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private handleResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer3d.resize();
  }

  public dispose(): void {
    this.disposed = true;
    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId);
      window.clearTimeout(this.frameId);
      this.frameId = null;
    }
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('resize', this.boundResize);
    this.renderer3d.dispose();
    this.audio.dispose();
  }
}
