import type Phaser from 'phaser';

import { BootScene } from '@scenes/BootScene';
import { EnvironmentShowcaseScene } from '@scenes/EnvironmentShowcaseScene';
import { SceneKey } from '@scenes/SceneKey';

export type SceneRegistration = Readonly<{
  key: SceneKey;
  scene: typeof Phaser.Scene;
}>;

export const sceneRegistry = [
  {
    key: SceneKey.Boot,
    scene: BootScene
  },
  {
    key: SceneKey.EnvironmentShowcase,
    scene: EnvironmentShowcaseScene
  }
] as const satisfies readonly SceneRegistration[];
