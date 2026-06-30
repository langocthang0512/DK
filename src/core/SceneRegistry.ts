import type Phaser from 'phaser';

import { BootScene } from '@scenes/BootScene';
import { EndingScene } from '@scenes/EndingScene';
import { Map1Scene, Map2Scene, Map3Scene, Map4Scene } from '@scenes/FinalLevelScene';
import { MainMenuScene } from '@scenes/MainMenuScene';
import { PauseMenuScene } from '@scenes/PauseMenuScene';
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
    key: SceneKey.MainMenu,
    scene: MainMenuScene
  },
  {
    key: SceneKey.PauseMenu,
    scene: PauseMenuScene
  },
  {
    key: SceneKey.Ending,
    scene: EndingScene
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
    key: SceneKey.Map4,
    scene: Map4Scene
  }
] as const satisfies readonly SceneRegistration[];
