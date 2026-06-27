export const environmentThemes = ['spring', 'autumn', 'winter'] as const;

export type EnvironmentTheme = (typeof environmentThemes)[number];

export const environmentPieces = [
  'solidBlock',
  'hollowBlock',
  'smallBlock',
  'wideStep',
  'archColumn',
  'rightCluster',
  'floatingPlatform'
] as const;

export type EnvironmentPiece = (typeof environmentPieces)[number];

export type EnvironmentTileDefinition = Readonly<{
  key: EnvironmentPiece;
  width: number;
  height: number;
  collides: boolean;
  role: 'ground' | 'platform' | 'edge' | 'decoration';
}>;

export type AutotileRule = Readonly<{
  when: readonly string[];
  use: EnvironmentPiece;
}>;

export type PlatformComposition = Readonly<{
  key: string;
  pieces: readonly EnvironmentPiece[];
  repeatable: boolean;
}>;

export const environmentTileDefinitions = {
  solidBlock: {
    key: 'solidBlock',
    width: 94,
    height: 94,
    collides: true,
    role: 'ground'
  },
  hollowBlock: {
    key: 'hollowBlock',
    width: 94,
    height: 94,
    collides: false,
    role: 'decoration'
  },
  smallBlock: {
    key: 'smallBlock',
    width: 64,
    height: 68,
    collides: true,
    role: 'edge'
  },
  wideStep: {
    key: 'wideStep',
    width: 126,
    height: 94,
    collides: true,
    role: 'ground'
  },
  archColumn: {
    key: 'archColumn',
    width: 64,
    height: 96,
    collides: true,
    role: 'edge'
  },
  rightCluster: {
    key: 'rightCluster',
    width: 96,
    height: 158,
    collides: false,
    role: 'decoration'
  },
  floatingPlatform: {
    key: 'floatingPlatform',
    width: 94,
    height: 30,
    collides: true,
    role: 'platform'
  }
} as const satisfies Record<EnvironmentPiece, EnvironmentTileDefinition>;

export const environmentAutotileRules = [
  {
    when: ['top', 'left', 'right', 'bottom'],
    use: 'solidBlock'
  },
  {
    when: ['top', 'left', 'right'],
    use: 'wideStep'
  },
  {
    when: ['topOnly'],
    use: 'floatingPlatform'
  },
  {
    when: ['edge', 'vertical'],
    use: 'archColumn'
  },
  {
    when: ['detail', 'readability'],
    use: 'hollowBlock'
  }
] as const satisfies readonly AutotileRule[];

export const platformCompositions = [
  {
    key: 'flatGroundRun',
    pieces: ['solidBlock'],
    repeatable: true
  },
  {
    key: 'raisedStep',
    pieces: ['wideStep', 'archColumn'],
    repeatable: false
  },
  {
    key: 'shortFloatingPlatform',
    pieces: ['floatingPlatform'],
    repeatable: true
  }
] as const satisfies readonly PlatformComposition[];

export function getEnvironmentAssetKey(theme: EnvironmentTheme, piece: EnvironmentPiece): string {
  return `environment.floorTiles2.${theme}.${piece}`;
}
