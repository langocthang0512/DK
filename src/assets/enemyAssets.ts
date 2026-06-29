import { gameplayConfig } from '@config/gameplayConfig';

export const enemyTypes = ['snake', 'hyena', 'scorpio', 'vulture'] as const;
export const enemyAnimationStates = ['idle', 'walk', 'attack', 'hurt', 'death'] as const;

export type EnemyType = (typeof enemyTypes)[number];
export type EnemyAnimationState = (typeof enemyAnimationStates)[number];

export type EnemyAnimationDefinition = Readonly<{
  frames: number;
  frameRate: number;
  repeat: number;
}>;

export type EnemyDefinition = Readonly<{
  type: EnemyType;
  scale: number;
  health: number;
  speed: number;
  detectRange: number;
  attackRange: number;
  attackCooldownMs: number;
  body: Readonly<{
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  }>;
  animations: Readonly<Record<EnemyAnimationState, EnemyAnimationDefinition>>;
}>;

const sharedAnimations = {
  idle: { frameRate: 6, repeat: -1 },
  walk: { frameRate: 8, repeat: -1 },
  attack: { frameRate: 8, repeat: 0 },
  hurt: { frameRate: 8, repeat: 0 },
  death: { frameRate: 7, repeat: 0 }
} as const;

const sharedGameplay = {
  health: gameplayConfig.enemy.hp,
  speed: gameplayConfig.enemy.speed,
  detectRange: gameplayConfig.enemy.detectRange,
  attackRange: gameplayConfig.enemy.attackRange,
  attackCooldownMs: gameplayConfig.enemy.attackCooldownMs
} as const;

export const enemyDefinitions = {
  snake: {
    type: 'snake',
    scale: 2.35,
    ...sharedGameplay,
    body: { width: 30, height: 14, offsetX: 17, offsetY: 34 },
    animations: {
      idle: { frames: 2, ...sharedAnimations.idle },
      walk: { frames: 4, ...sharedAnimations.walk },
      attack: { frames: 1, ...sharedAnimations.attack },
      hurt: { frames: 4, ...sharedAnimations.hurt },
      death: { frames: 6, ...sharedAnimations.death }
    }
  },
  hyena: {
    type: 'hyena',
    scale: 2.35,
    ...sharedGameplay,
    body: { width: 34, height: 28, offsetX: 12, offsetY: 20 },
    animations: {
      idle: { frames: 2, ...sharedAnimations.idle },
      walk: { frames: 4, ...sharedAnimations.walk },
      attack: { frames: 1, ...sharedAnimations.attack },
      hurt: { frames: 6, ...sharedAnimations.hurt },
      death: { frames: 6, ...sharedAnimations.death }
    }
  },
  scorpio: {
    type: 'scorpio',
    scale: 2.35,
    ...sharedGameplay,
    body: { width: 32, height: 23, offsetX: 14, offsetY: 25 },
    animations: {
      idle: { frames: 2, ...sharedAnimations.idle },
      walk: { frames: 4, ...sharedAnimations.walk },
      attack: { frames: 1, ...sharedAnimations.attack },
      hurt: { frames: 4, ...sharedAnimations.hurt },
      death: { frames: 4, ...sharedAnimations.death }
    }
  },
  vulture: {
    type: 'vulture',
    scale: 2.35,
    ...sharedGameplay,
    body: { width: 28, height: 26, offsetX: 16, offsetY: 22 },
    animations: {
      idle: { frames: 2, ...sharedAnimations.idle },
      walk: { frames: 4, ...sharedAnimations.walk },
      attack: { frames: 1, ...sharedAnimations.attack },
      hurt: { frames: 4, ...sharedAnimations.hurt },
      death: { frames: 4, ...sharedAnimations.death }
    }
  }
} as const satisfies Record<EnemyType, EnemyDefinition>;

export function getEnemyAnimationKey(type: EnemyType, state: EnemyAnimationState): string {
  return `enemy.${type}.${state}`;
}
