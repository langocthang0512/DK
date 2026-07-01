import type Phaser from 'phaser';

export type ImageAsset = Readonly<{
  key: string;
  url: string;
}>;

export type AudioAsset = Readonly<{
  key: string;
  urls: readonly string[];
}>;

export type SpritesheetAsset = Readonly<{
  key: string;
  url: string;
  frameConfig: Phaser.Types.Loader.FileTypes.ImageFrameConfig;
}>;

export type AssetManifest = Readonly<{
  images: readonly ImageAsset[];
  spritesheets: readonly SpritesheetAsset[];
  audio: readonly AudioAsset[];
}>;

const playerAnimations = [
  ['idle', 120, 80],
  ['run', 120, 80],
  ['jumpStart', 120, 80],
  ['jumpInBetween', 120, 80],
  ['fall', 120, 80],
  ['attack', 120, 80],
  ['hit', 120, 80],
  ['death', 120, 80],
  ['turnAround', 120, 80]
] as const;

const enemyNames = ['snake', 'hyena', 'scorpio', 'vulture'] as const;
const enemyAnimations = ['idle', 'walk', 'attack', 'hurt', 'death'] as const;
const trapAnimations = [
  ['axe', 128, 128],
  ['spike', 128, 128]
] as const;
const bossAnimations = [
  ['idle', 174, 114],
  ['walk', 204, 108],
  ['takeOff', 354, 170],
  ['flight', 222, 182],
  ['landing', 216, 188],
  ['hurt', 174, 114],
  ['dead', 198, 104],
  ['attack1', 184, 114],
  ['attack2', 230, 114],
  ['special', 228, 220]
] as const;

export const assetManifest: AssetManifest = {
  images: [
    {
      key: 'environment.approved.ground',
      url: '/assets/approved-environment/ground.png'
    },
    {
      key: 'environment.approved.smallPlatform',
      url: '/assets/approved-environment/small-platform.png'
    },
    {
      key: 'environment.approved.vinePlatform',
      url: '/assets/approved-environment/vine-platform.png'
    },
    {
      key: 'ui.mainMenuBackground',
      url: '/assets/ui/main-menu-background.png'
    }
  ],
  spritesheets: [
    ...playerAnimations.map(([name, frameWidth, frameHeight]) => ({
      key: `player.${name}`,
      url: `/assets/player/${name}.png`,
      frameConfig: {
        frameWidth,
        frameHeight
      }
    })),
    ...enemyNames.flatMap((enemy) =>
      enemyAnimations.map((animation) => ({
        key: `enemy.${enemy}.${animation}`,
        url: `/assets/enemies/${enemy}/${animation}.png`,
        frameConfig: {
          frameWidth: 48,
          frameHeight: 48
        }
      }))
    ),
    ...trapAnimations.map(([trap, frameWidth, frameHeight]) => ({
      key: `trap.${trap}.cycle`,
      url: `/assets/traps/${trap}/${trap}.png`,
      frameConfig: {
        frameWidth,
        frameHeight
      }
    })),
    ...bossAnimations.map(([animation, frameWidth, frameHeight]) => ({
      key: `boss.dragon.${animation}`,
      url: `/assets/boss/${animation}.png`,
      frameConfig: {
        frameWidth,
        frameHeight
      }
    }))
  ],
  audio: []
};
