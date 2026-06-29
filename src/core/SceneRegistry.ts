import type Phaser from 'phaser';

import { BootScene } from '@scenes/BootScene';
import { FinalBossScene, Map1Scene, Map2Scene, Map3Scene } from '@scenes/FinalLevelScene';
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
  },
  {
    key: SceneKey.Map1,
    scene: Map1Scene
  },
  {
    key: SceneKey.Map2,
    scene: Map2Scene
  },
  {
    key: SceneKey.Map3,
    scene: Map3Scene
  },
  {
    key: SceneKey.FinalBoss,
    scene: FinalBossScene
  }
] as const satisfies readonly SceneRegistration[];
