import type Phaser from 'phaser';

import { BootScene } from '@scenes/BootScene';
import { ProductionScene } from '@scenes/ProductionScene';
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
    key: SceneKey.Production,
    scene: ProductionScene
  }
] as const satisfies readonly SceneRegistration[];
