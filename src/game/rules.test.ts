import assert from 'node:assert/strict';
import { CHAPTERS, generateEndlessWave } from './chapters';
import {
  calculateMeleeDamage,
  computeBhensaChargeGain,
  computeChapterRank,
  findCounterableThreat,
  findStealthTarget,
  pickBatarangTarget,
  resolvePlatformLanding,
} from './rules';
import type { EnemyEntity, LanternProp, Platform, Projectile } from './types';

function makeEnemy(overrides: Partial<EnemyEntity> = {}): EnemyEntity {
  return {
    id: 'e1',
    type: 'THUG',
    name: 'Gaon Bandit',
    x: 400,
    y: 0,
    vx: 0,
    vy: 0,
    facing: -1,
    hp: 60,
    maxHp: 60,
    state: 'APPROACH',
    stateTimer: 1,
    telegraphTimer: 0,
    telegraphMax: 0.6,
    attackCooldown: 1,
    hitFlash: 0,
    animPhase: 0,
    hasShield: false,
    shieldBroken: false,
    bossPhase: 1,
    laserActive: false,
    laserAngle: 0,
    laserTargetY: 0,
    laserSweeping: false,
    wheelAngle: 0,
    onRoof: false,
    scoreValue: 140,
    ...overrides,
  };
}

// 1. Frontal shield mitigates regular punches, but Counter & Stealth shatter shields
const shieldThug = makeEnemy({ hasShield: true, facing: -1 });
const blockedHit = calculateMeleeDamage(1, 0, false, false, shieldThug, 1);
assert.equal(blockedHit.blocked, true);
assert.ok(blockedHit.damage <= 5);

const counterHit = calculateMeleeDamage(3, 5, false, true, shieldThug, 1);
assert.equal(counterHit.blocked, false);
assert.equal(counterHit.shieldShattered, true);
assert.ok(counterHit.damage >= 50);

const stealthHit = calculateMeleeDamage(1, 0, true, false, shieldThug, 1);
assert.equal(stealthHit.blocked, false);
assert.ok(stealthHit.damage >= 80);

// 2. Counter detector prioritizes counterable supersonic coins and windup enemies
const windupEnemy = makeEnemy({ x: 350, state: 'WINDUP', telegraphTimer: 0.4 });
const superCoin: Projectile = {
  id: 'c1',
  kind: 'SUPER_COIN',
  x: 310,
  y: 70,
  vx: -400,
  vy: 0,
  rotation: 0,
  owner: 'ENEMY',
  life: 1.5,
  maxLife: 2,
  counterable: true,
  damage: 15,
  trail: [],
};
const coinThreat = findCounterableThreat({ x: 240, y: 0 }, [windupEnemy], [superCoin]);
assert.equal(coinThreat.projectile?.id, 'c1');

const meleeThreat = findCounterableThreat({ x: 240, y: 0 }, [windupEnemy], []);
assert.equal(meleeThreat.enemy?.id, 'e1');

// 3. Stealth takedown detects smoke-blinded thugs, ignores bosses
const blindedThug = makeEnemy({ x: 320, state: 'SMOKE_BLIND' });
assert.equal(findStealthTarget({ x: 250, y: 0 }, [blindedThug])?.id, 'e1');

// 4. Batarang auto-prioritizes overhead explosive lantern with enemy underneath
const lantern: LanternProp = {
  id: 'lan-1',
  x: 520,
  y: 230,
  swingPhase: 0,
  exploded: false,
  respawnTimer: 0,
  radius: 140,
};
const enemyUnderLantern = makeEnemy({ x: 540, y: 0 });
const batarangAim = pickBatarangTarget({ x: 300, y: 0, facing: 1 }, [enemyUnderLantern], [lantern]);
assert.equal(batarangAim.isLantern, true);
assert.equal(batarangAim.targetId, 'lan-1');

// 5. Platform rooftop landing & drop-through
const platforms: Platform[] = [{ id: 'roof1', x: 200, y: 160, w: 300, h: 20, kind: 'ROOF_MUD' }];
const landedRoof = resolvePlatformLanding(170, 154, 300, -120, platforms, false);
assert.equal(landedRoof.grounded, true);
assert.equal(landedRoof.platformId, 'roof1');
assert.equal(landedRoof.y, 160);

const dropped = resolvePlatformLanding(165, 150, 300, -120, platforms, true);
assert.equal(dropped.grounded, false);

// 6. All 5 Campaign Chapters & Endless Mode waves are properly populated
assert.equal(Object.keys(CHAPTERS).length, 5);
assert.equal(CHAPTERS[1].introCutscene, 'INTRO');
assert.equal(CHAPTERS[4].introCutscene, 'CH4_INFERNO');
assert.equal(CHAPTERS[5].outroCutscene, 'CH5_FINALE');
assert.ok(generateEndlessWave(5).some((w) => w.type === 'DESI_SUPERMAN'));
assert.ok(computeBhensaChargeGain('COUNTER') > computeBhensaChargeGain('HIT'));
assert.equal(computeChapterRank(2600, 1.0, 15, 4), 'S');

console.log('All Dark Rakhwala 2.5D rules tests passed!');
