import Phaser from 'phaser';

import { createGameConfig } from '@config/phaserConfig';
import { Services } from '@core/Services';

export class GameBootstrap {
  #game: Phaser.Game | null = null;

  constructor(private readonly services: Services) {}

  start(parent: string): Phaser.Game {
    if (this.#game) {
      return this.#game;
    }

    this.#game = new Phaser.Game(createGameConfig(parent, this.services));
    return this.#game;
  }

  stop(): void {
    this.#game?.destroy(true);
    this.#game = null;
  }
}
