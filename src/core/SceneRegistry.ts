import type Phaser from 'phaser';

import { BootScene } from '@scenes/BootScene';
import { SceneKey } from '@scenes/SceneKey';

export type SceneRegistration = Readonly<{
  key: SceneKey;
  scene: typeof Phaser.Scene;
}>;

export const sceneRegistry = [
  {
    key: SceneKey.Boot,
    scene: BootScene
  }
] as const satisfies readonly SceneRegistration[];
