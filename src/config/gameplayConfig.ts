const TILE_SIZE = 64;

export const gameplayConfig = {
  tileSize: TILE_SIZE,
  production: {
    testMode: false,
    bootScene: 'map-1'
  },
  player: {
    hp: 100,
    speedTilesPerSecond: 4,
    speed: TILE_SIZE * 4,
    jumpHeightTiles: 2.5,
    doubleJumpMultiplier: 0.85,
    airControl: 0.75,
    attackDamage: 20,
    attackCooldownMs: 450,
    attackRangeWidthMultiplier: 1.2,
    criticalChance: 0.1,
    criticalDamageMultiplier: 1.5,
    comboMultipliers: [
      { minHits: 1, maxHits: 3, multiplier: 1 },
      { minHits: 4, maxHits: 6, multiplier: 1.1 },
      { minHits: 7, maxHits: 10, multiplier: 1.2 },
      { minHits: 11, maxHits: Number.POSITIVE_INFINITY, multiplier: 1.3 }
    ],
    deathFadeMs: 500
  },
  enemy: {
    hp: 40,
    damage: 15,
    speedRatioToPlayer: 0.7,
    speed: TILE_SIZE * 4 * 0.7,
    detectRangeTiles: 6,
    detectRange: TILE_SIZE * 6,
    attackRangeTiles: 1,
    attackRange: TILE_SIZE,
    attackCooldownMs: 1500,
    deathRemoveMs: 500
  },
  traps: {
    spike: {
      damage: 25,
      cooldownMs: 1000,
      activationDelayMs: 0
    },
    axe: {
      damage: 35,
      cooldownMs: 2000,
      activationDelayMs: 250
    }
  },
  boss: {
    hp: 220,
    scale: 3,
    groundSpeed: 65,
    touchDamage: 10,
    attack1Damage: 18,
    attack2Damage: 25,
    specialDamage: 35,
    playerHitKnockbackX: 0,
    playerHitKnockbackY: 0,
    deathRemoveMs: 1200,
    deathFadeMs: 500
  },
  tutorial: {
    mapOnly: 1,
    prompts: ['MOVE', 'JUMP', 'ATTACK'],
    autoDisappear: true
  },
  camera: {
    sideFollow: true,
    follow: 6,
    lookAheadRatio: 0.15,
    deadZoneWidthRatio: 0.2,
    deadZoneHeightRatio: 0.1,
    bossZoomRatio: 0.1
  }
} as const;
