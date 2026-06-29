import Phaser from 'phaser';

import type { Services } from '@core/Services';
import { SceneKey } from '@scenes/SceneKey';

export class ProductionScene extends Phaser.Scene {
  #services!: Services;

  constructor() {
    super(SceneKey.Production);
  }

  init(): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('ProductionScene requires services.');
    }

    this.#services = services;
  }

  create(): void {
    this.#services.events.emit('scene:ready', { key: SceneKey.Production });
    this.cameras.main.setBackgroundColor('#232421');
  }
}
