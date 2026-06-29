import Phaser from 'phaser';

import { gameplayConfig } from '@config/gameplayConfig';
import type { Services } from '@core/Services';
import { SceneKey } from '@scenes/SceneKey';

export class BootScene extends Phaser.Scene {
  #services!: Services;

  constructor() {
    super(SceneKey.Boot);
  }

  init(): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('BootScene requires services.');
    }

    this.#services = services;
  }

  preload(): void {
    this.#services.assets.loadManifest(this.load);
  }

  create(): void {
    this.#services.debug.registerScene(this);
    this.#services.events.emit('scene:ready', { key: SceneKey.Boot });
    this.scene.start(gameplayConfig.production.bootScene);
  }
}
