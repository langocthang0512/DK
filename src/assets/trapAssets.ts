export const trapTypes = ['axe', 'spike'] as const;

export type TrapType = (typeof trapTypes)[number];

export type TrapPlacement = 'ground' | 'hanging';

export type TrapHitbox = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type TrapAnimationDefinition = Readonly<{
  key: string;
  frames: number;
  durationMs: number;
  repeat: number;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  placement: TrapPlacement;
  alignPadding: readonly number[];
  damageFrameStart: number;
  damageFrameEnd: number;
  hitboxes: readonly TrapHitbox[];
}>;

export const trapDefinitions = {
  axe: {
    key: 'trap.axe.cycle',
    frames: 50,
    durationMs: 3035,
    repeat: -1,
    frameWidth: 128,
    frameHeight: 128,
    scale: 2.25,
    placement: 'hanging',
    alignPadding: [
      10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
      10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
      10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
      10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
      10, 10, 10, 10, 10, 10, 10, 10, 10, 10
    ],
    damageFrameStart: 19,
    damageFrameEnd: 42,
    hitboxes: [
      { x: 63, y: 33, width: 21, height: 8 }, { x: 63, y: 33, width: 21, height: 8 },
      { x: 63, y: 33, width: 21, height: 8 }, { x: 63, y: 33, width: 46, height: 8 },
      { x: 63, y: 33, width: 46, height: 8 }, { x: 63, y: 33, width: 46, height: 8 },
      { x: 63, y: 33, width: 46, height: 8 }, { x: 63, y: 33, width: 46, height: 8 },
      { x: 63, y: 33, width: 21, height: 8 }, { x: 63, y: 33, width: 21, height: 8 },
      { x: 63, y: 33, width: 21, height: 8 }, { x: 62, y: 33, width: 24, height: 8 },
      { x: 62, y: 33, width: 24, height: 8 }, { x: 63, y: 33, width: 21, height: 8 },
      { x: 62, y: 33, width: 24, height: 8 }, { x: 62, y: 33, width: 24, height: 8 },
      { x: 62, y: 33, width: 24, height: 8 }, { x: 62, y: 33, width: 28, height: 9 },
      { x: 61, y: 33, width: 46, height: 11 }, { x: 15, y: 33, width: 93, height: 53 },
      { x: 14, y: 33, width: 76, height: 40 }, { x: 17, y: 33, width: 50, height: 33 },
      { x: 15, y: 33, width: 53, height: 27 }, { x: 21, y: 33, width: 47, height: 33 },
      { x: 34, y: 33, width: 34, height: 45 }, { x: 56, y: 33, width: 25, height: 48 },
      { x: 59, y: 33, width: 24, height: 47 }, { x: 59, y: 33, width: 24, height: 47 },
      { x: 56, y: 33, width: 25, height: 48 }, { x: 52, y: 33, width: 25, height: 48 },
      { x: 49, y: 33, width: 24, height: 48 }, { x: 49, y: 33, width: 24, height: 48 },
      { x: 46, y: 33, width: 24, height: 47 }, { x: 47, y: 33, width: 24, height: 47 },
      { x: 49, y: 33, width: 24, height: 48 }, { x: 47, y: 33, width: 24, height: 47 },
      { x: 46, y: 33, width: 24, height: 47 }, { x: 46, y: 33, width: 52, height: 47 },
      { x: 46, y: 33, width: 50, height: 47 }, { x: 46, y: 33, width: 52, height: 47 },
      { x: 46, y: 33, width: 51, height: 47 }, { x: 46, y: 33, width: 49, height: 47 },
      { x: 46, y: 33, width: 50, height: 47 }, { x: 53, y: 33, width: 43, height: 45 },
      { x: 59, y: 33, width: 38, height: 43 }, { x: 60, y: 33, width: 38, height: 40 },
      { x: 62, y: 33, width: 35, height: 36 }, { x: 63, y: 33, width: 42, height: 27 },
      { x: 64, y: 33, width: 47, height: 12 }, { x: 63, y: 33, width: 21, height: 8 }
    ]
  },
  spike: {
    key: 'trap.spike.cycle',
    frames: 27,
    durationMs: 2520,
    repeat: 0,
    frameWidth: 128,
    frameHeight: 128,
    scale: 2.25,
    placement: 'ground',
    alignPadding: [
      0, 0, 0, 0, 0, 0, 0, 11, 31,
      31, 30, 30, 30, 30, 30, 26, 22, 18,
      15, 10, 6, 0, 0, 0, 0, 0, 0
    ],
    damageFrameStart: 8,
    damageFrameEnd: 20,
    hitboxes: [
      { x: 40, y: 90, width: 47, height: 38 }, { x: 40, y: 91, width: 47, height: 37 },
      { x: 40, y: 90, width: 47, height: 38 }, { x: 39, y: 91, width: 47, height: 37 },
      { x: 41, y: 91, width: 47, height: 37 }, { x: 40, y: 91, width: 47, height: 37 },
      { x: 40, y: 91, width: 47, height: 37 }, { x: 40, y: 80, width: 47, height: 39 },
      { x: 38, y: 52, width: 47, height: 47 }, { x: 40, y: 52, width: 46, height: 47 },
      { x: 40, y: 52, width: 47, height: 48 }, { x: 40, y: 52, width: 47, height: 48 },
      { x: 40, y: 52, width: 47, height: 48 }, { x: 40, y: 52, width: 47, height: 48 },
      { x: 40, y: 52, width: 47, height: 48 }, { x: 40, y: 56, width: 47, height: 48 },
      { x: 40, y: 60, width: 47, height: 48 }, { x: 40, y: 64, width: 47, height: 48 },
      { x: 40, y: 67, width: 47, height: 48 }, { x: 40, y: 72, width: 47, height: 48 },
      { x: 40, y: 76, width: 47, height: 48 }, { x: 40, y: 85, width: 47, height: 43 },
      { x: 40, y: 91, width: 47, height: 37 }, { x: 40, y: 90, width: 47, height: 38 },
      { x: 40, y: 90, width: 47, height: 38 }, { x: 40, y: 90, width: 47, height: 38 },
      { x: 40, y: 90, width: 47, height: 38 }
    ]
  }
} as const satisfies Record<TrapType, TrapAnimationDefinition>;

export function getTrapAnimationKey(type: TrapType): string {
  return `trap.${type}.cycle`;
}
