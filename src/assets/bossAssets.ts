export const bossAnimationStates = [
  'idle',
  'walk',
  'takeOff',
  'flight',
  'landing',
  'hurt',
  'dead',
  'attack1',
  'attack2',
  'special'
] as const;

export type BossAnimationState = (typeof bossAnimationStates)[number];

export type BossAnimationDefinition = Readonly<{
  frames: number;
  frameRate: number;
  repeat: number;
}>;

export const bossAnimationDefinitions = {
  idle: { frames: 6, frameRate: 10, repeat: -1 },
  walk: { frames: 6, frameRate: 10, repeat: -1 },
  takeOff: { frames: 5, frameRate: 10, repeat: 0 },
  flight: { frames: 6, frameRate: 10, repeat: -1 },
  landing: { frames: 3, frameRate: 10, repeat: 0 },
  hurt: { frames: 4, frameRate: 10, repeat: 0 },
  dead: { frames: 3, frameRate: 10, repeat: 0 },
  attack1: { frames: 4, frameRate: 10, repeat: 0 },
  attack2: { frames: 6, frameRate: 10, repeat: 0 },
  special: { frames: 6, frameRate: 10, repeat: 0 }
} as const satisfies Record<BossAnimationState, BossAnimationDefinition>;

export function getBossAnimationKey(state: BossAnimationState): string {
  return `boss.dragon.${state}`;
}
