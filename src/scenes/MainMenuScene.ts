import Phaser from 'phaser';

import type { Services } from '@core/Services';
import { SceneKey } from '@scenes/SceneKey';
import {
  createCoverImageBackground,
  createFantasyPixelButton,
  createFantasyPixelTitle,
  playUiToneSequence,
  type PixelButton
} from '@ui/pixelUi';

export class MainMenuScene extends Phaser.Scene {
  #services!: Services;
  #buttons: PixelButton[] = [];
  #selectedIndex = 0;
  #isStarting = false;
  #isQuitting = false;

  constructor() {
    super(SceneKey.MainMenu);
  }

  init(): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('MainMenuScene requires services.');
    }

    this.#services = services;
  }

  create(): void {
    this.#buttons = [];
    this.#selectedIndex = 0;
    this.#isStarting = false;
    this.#isQuitting = false;
    this.#services.events.emit('scene:ready', { key: SceneKey.MainMenu });
    const { width, height } = this.scale;

    createCoverImageBackground(this, {
      key: 'ui.mainMenuBackground',
      darken: 0.08
    });
    this.add.rectangle(0, 0, width, height, 0x0d0a08, 0.16).setOrigin(0, 0).setDepth(900);
    createFantasyPixelTitle(this, width * 0.5, height * 0.36, 'DRAGON KNIGHT', 72);

    this.#buttons = [
      createFantasyPixelButton(this, {
        x: width * 0.5,
        y: height * 0.36 + 105,
        width: 238,
        height: 54,
        label: 'START',
        onClick: () => this.#startGame()
      }),
      createFantasyPixelButton(this, {
        x: width * 0.5,
        y: height * 0.36 + 174,
        width: 238,
        height: 54,
        label: 'QUIT',
        onClick: () => this.#quitGame()
      })
    ];
    this.#setSelected(0);

    this.time.addEvent({
      delay: 4200,
      loop: true,
      callback: () => playUiToneSequence([110], 0.01)
    });

    this.input.keyboard?.removeAllListeners('keydown');
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
        this.#setSelected(this.#selectedIndex - 1);
      } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
        this.#setSelected(this.#selectedIndex + 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        this.#pressSelected();
      }
    });

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  #setSelected(index: number): void {
    this.#selectedIndex = Phaser.Math.Wrap(index, 0, this.#buttons.length);
    this.#buttons.forEach((button, buttonIndex) => {
      button.setFocused(buttonIndex === this.#selectedIndex);
    });
  }

  #pressSelected(): void {
    const selected = this.#buttons[this.#selectedIndex];
    if (!selected) {
      return;
    }

    selected.setPressed(true);
    this.time.delayedCall(90, () => selected.setPressed(false));

    if (this.#selectedIndex === 0) {
      this.#startGame();
    } else {
      this.#quitGame();
    }
  }

  #startGame(): void {
    if (this.#isStarting) {
      return;
    }

    this.#isStarting = true;
    playUiToneSequence([392, 523], 0.025);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => this.scene.start(SceneKey.Map1));
  }

  #quitGame(): void {
    if (this.#isQuitting || this.#isStarting) {
      return;
    }

    this.#isQuitting = true;
    playUiToneSequence([196, 147], 0.018);
    this.cameras.main.fadeOut(240, 0, 0, 0);
    this.time.delayedCall(260, () => {
      window.close();
      this.game.destroy(true);
    });
  }
}
