import Phaser from 'phaser';

import type { Services } from '@core/Services';
import { sceneRegistry } from '@core/SceneRegistry';

export function createGameConfig(parent: string, services: Services): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#111111',
    pixelArt: true,
    roundPixels: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: {
          x: 0,
          y: 1200
        },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: sceneRegistry.map(({ scene }) => scene),
    callbacks: {
      preBoot: (game) => {
        game.registry.set('services', services);
      }
    }
  };
}
