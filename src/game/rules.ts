import type {
  ChapterId,
  EnemyEntity,
  LanternProp,
  Platform,
  PlayerState,
  Projectile,
  SaveProgress,
} from './types';

export const SAVE_STORAGE_KEY = 'dark_rakhwala_gaon_save_v1';

export const DEFAULT_SAVE: SaveProgress = {
  unlockedChapter: 1,
  completedChapters: [],
  bestScores: {},
  endlessBestScore: 0,
  endlessBestWave: 0,
  touchVisibleOnDesktop: true,
};

export function loadSaveProgress(): SaveProgress {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveProgress>;
    const unlocked = parsed.unlockedChapter;
    const validUnlocked: ChapterId =
      unlocked === 1 || unlocked === 2 || unlocked === 3 || unlocked === 4 || unlocked === 5
        ? unlocked
        : 1;
    return {
      unlockedChapter: validUnlocked,
      completedChapters: Array.isArray(parsed.completedChapters) ? parsed.completedChapters : [],
      bestScores: parsed.bestScores ?? {},
      endlessBestScore: typeof parsed.endlessBestScore === 'number' ? parsed.endlessBestScore : 0,
      endlessBestWave: typeof parsed.endlessBestWave === 'number' ? parsed.endlessBestWave : 0,
      touchVisibleOnDesktop:
        typeof parsed.touchVisibleOnDesktop === 'boolean' ? parsed.touchVisibleOnDesktop : true,
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function persistSaveProgress(save: SaveProgress): void {
  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Ignore storage quota / iframe restrictions
  }
}

export function calculateMeleeDamage(
  comboStep: 1 | 2 | 3,
  comboCount: number,
  isStealth: boolean,
  isCounter: boolean,
  target: Pick<EnemyEntity, 'hasShield' | 'shieldBroken' | 'facing' | 'state'>,
  attackerFacing: 1 | -1
): { damage: number; blocked: boolean; shieldShattered: boolean } {
  if (isStealth) {
    return { damage: 85, blocked: false, shieldShattered: true };
  }
  if (isCounter) {
    return { damage: 46 + Math.min(comboCount * 2, 24), blocked: false, shieldShattered: true };
  }

  const frontalShield =
    target.hasShield &&
    !target.shieldBroken &&
    target.state !== 'SMOKE_BLIND' &&
    target.state !== 'STUNNED' &&
    target.facing !== attackerFacing;

  if (frontalShield) {
    return { damage: 4, blocked: true, shieldShattered: false };
  }

  const base = comboStep === 3 ? 28 : comboStep === 2 ? 19 : 15;
  const comboBonus = Math.min(Math.floor(comboCount * 1.4), 18);
  return { damage: base + comboBonus, blocked: false, shieldShattered: false };
}

export function computeBhensaChargeGain(
  event: 'HIT' | 'COUNTER' | 'STEALTH' | 'LANTERN_BLAST' | 'COIN_DEFLECT'
): number {
  switch (event) {
    case 'HIT':
      return 6;
    case 'COUNTER':
      return 22;
    case 'STEALTH':
      return 24;
    case 'LANTERN_BLAST':
      return 18;
    case 'COIN_DEFLECT':
      return 28;
  }
}

export function findCounterableThreat(
  player: Pick<PlayerState, 'x' | 'y'>,
  enemies: EnemyEntity[],
  projectiles: Projectile[]
): { enemy: EnemyEntity | null; projectile: Projectile | null } {
  // Prioritize counterable supersonic coins / incoming fire bottles first
  let bestProj: Projectile | null = null;
  let bestProjDist = 230;
  for (const p of projectiles) {
    if (p.owner !== 'ENEMY' || !p.counterable) continue;
    const dist = Math.hypot(p.x - player.x, p.y - (player.y + 62));
    if (dist < bestProjDist) {
      bestProjDist = dist;
      bestProj = p;
    }
  }
  if (bestProj) {
    return { enemy: null, projectile: bestProj };
  }

  let bestEnemy: EnemyEntity | null = null;
  let bestDist = 215;
  for (const e of enemies) {
    if (e.state === 'DEAD') continue;
    if (e.telegraphTimer > 0 && (e.state === 'WINDUP' || e.state === 'BOSS_SLAM')) {
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestEnemy = e;
      }
    }
  }
  return { enemy: bestEnemy, projectile: null };
}

export function findStealthTarget(
  player: Pick<PlayerState, 'x' | 'y'>,
  enemies: EnemyEntity[]
): EnemyEntity | null {
  let best: EnemyEntity | null = null;
  let bestDist = 175;
  for (const e of enemies) {
    if (e.state !== 'SMOKE_BLIND') continue;
    if (e.type === 'DESI_SUPERMAN' || e.type === 'LOADER_RICKSHAW') continue;
    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = e;
    }
  }
  return best;
}

export function pickBatarangTarget(
  player: Pick<PlayerState, 'x' | 'y' | 'facing'>,
  enemies: EnemyEntity[],
  lanterns: LanternProp[]
): { x: number; y: number; targetId?: string; isLantern?: boolean } {
  // 1. Check if an overhead unexploded lantern has an enemy underneath it and is roughly ahead
  for (const l of lanterns) {
    if (l.exploded) continue;
    const dx = l.x - player.x;
    if (Math.abs(dx) > 540 || dx * player.facing < -60) continue;
    const hasEnemyUnder = enemies.some(
      (e) => e.state !== 'DEAD' && Math.abs(e.x - l.x) < l.radius + 70
    );
    if (hasEnemyUnder) {
      return { x: l.x, y: l.y, targetId: l.id, isLantern: true };
    }
  }

  // 2. Otherwise pick nearest living enemy preferably in facing direction
  let bestEnemy: EnemyEntity | null = null;
  let bestScore = Infinity;
  for (const e of enemies) {
    if (e.state === 'DEAD') continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 720) continue;
    const directionPenalty = dx * player.facing < -35 ? 240 : 0;
    const score = dist + directionPenalty;
    if (score < bestScore) {
      bestScore = score;
      bestEnemy = e;
    }
  }

  if (bestEnemy) {
    return { x: bestEnemy.x, y: bestEnemy.y + 68, targetId: bestEnemy.id };
  }

  return { x: player.x + player.facing * 420, y: player.y + 72 };
}

export function resolvePlatformLanding(
  prevY: number,
  nextY: number,
  x: number,
  vy: number,
  platforms: Platform[],
  dropThrough: boolean
): { y: number; vy: number; grounded: boolean; platformId: string | null } {
  if (nextY <= 0) {
    return { y: 0, vy: 0, grounded: true, platformId: null };
  }

  if (!dropThrough && vy <= 0) {
    for (const p of platforms) {
      const withinX = x >= p.x - 16 && x <= p.x + p.w + 16;
      const crossedTop = prevY >= p.y - 6 && nextY <= p.y;
      if (withinX && crossedTop) {
        return { y: p.y, vy: 0, grounded: true, platformId: p.id };
      }
    }
  }

  return { y: nextY, vy, grounded: false, platformId: null };
}

export function computeChapterRank(
  score: number,
  hpRatio: number,
  maxCombo: number,
  countersLanded: number
): 'S' | 'A' | 'B' | 'C' {
  const total = score + Math.round(hpRatio * 600) + maxCombo * 40 + countersLanded * 120;
  if (total >= 3200) return 'S';
  if (total >= 2100) return 'A';
  if (total >= 1200) return 'B';
  return 'C';
}
