import Phaser from 'phaser';

import { env } from '@config/env';

export class DebugMode {
  readonly enabled = env.debug;

  registerScene(scene: Phaser.Scene): void {
    if (!this.enabled) {
      return;
    }

    scene.game.events.emit('debug:scene-registered', scene.scene.key);
  }
}
