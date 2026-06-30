import Phaser from 'phaser';

import type { Services } from '@core/Services';
import { SceneKey } from '@scenes/SceneKey';
import {
  createMenuEnvironment,
  createPixelButton,
  createPixelTitle,
  playUiToneSequence,
  type PixelButton
} from '@ui/pixelUi';

export class EndingScene extends Phaser.Scene {
  #services!: Services;
  #button!: PixelButton;
  #isReturning = false;

  constructor() {
    super(SceneKey.Ending);
  }

  init(): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('EndingScene requires services.');
    }

    this.#services = services;
  }

  create(): void {
    this.#services.events.emit('scene:ready', { key: SceneKey.Ending });
    const { width, height } = this.scale;

    createMenuEnvironment(this, 0.42);
    createPixelTitle(this, width * 0.5, height * 0.43, 'YOU ARE THE LEGENDS', 42);
    this.#button = createPixelButton(this, {
      x: width * 0.5,
      y: height * 0.43 + 72,
      width: 164,
      height: 30,
      label: 'MAIN MENU',
      onClick: () => this.#mainMenu()
    });
    this.#button.setFocused(true);

    playUiToneSequence([392, 494, 587, 784], 0.035);

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        this.#button.setPressed(true);
        this.time.delayedCall(90, () => this.#button.setPressed(false));
        this.#mainMenu();
      }
    });

    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  #mainMenu(): void {
    if (this.#isReturning) {
      return;
    }

    this.#isReturning = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => this.scene.start(SceneKey.MainMenu));
  }
}
