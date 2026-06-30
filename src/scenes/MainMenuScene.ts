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

export class MainMenuScene extends Phaser.Scene {
  #services!: Services;
  #buttons: PixelButton[] = [];
  #selectedIndex = 0;
  #isStarting = false;

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
    this.#services.events.emit('scene:ready', { key: SceneKey.MainMenu });
    const { width, height } = this.scale;

    createMenuEnvironment(this);
    createPixelTitle(this, width * 0.5, height * 0.37, 'DRAGON KNIGHT', 58);

    this.#buttons = [
      createPixelButton(this, {
        x: width * 0.5,
        y: height * 0.37 + 82,
        width: 126,
        height: 30,
        label: 'START',
        onClick: () => this.#startGame()
      })
    ];
    this.#setSelected(0);

    this.time.addEvent({
      delay: 4200,
      loop: true,
      callback: () => playUiToneSequence([110], 0.01)
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
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
    this.#startGame();
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
}
