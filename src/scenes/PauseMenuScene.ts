import Phaser from 'phaser';

import type { Services } from '@core/Services';
import { SceneKey } from '@scenes/SceneKey';
import { createPixelButton, createPixelTitle, type PixelButton } from '@ui/pixelUi';

type PauseMenuData = Readonly<{
  parentScene?: string;
}>;

export class PauseMenuScene extends Phaser.Scene {
  #services!: Services;
  #parentScene: string = SceneKey.Map1;
  #buttons: PixelButton[] = [];
  #selectedIndex = 0;
  #isClosing = false;

  constructor() {
    super(SceneKey.PauseMenu);
  }

  init(data: PauseMenuData): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('PauseMenuScene requires services.');
    }

    this.#services = services;
    this.#parentScene = data.parentScene ?? SceneKey.Map1;
  }

  create(): void {
    this.#services.events.emit('scene:ready', { key: SceneKey.PauseMenu });
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.36).setOrigin(0, 0).setDepth(1000);
    createPixelTitle(this, width * 0.5, height * 0.38, 'PAUSED', 44);

    this.#buttons = [
      createPixelButton(this, {
        x: width * 0.5,
        y: height * 0.5,
        width: 150,
        height: 30,
        label: 'RESUME',
        onClick: () => this.#resume()
      }),
      createPixelButton(this, {
        x: width * 0.5,
        y: height * 0.5 + 44,
        width: 150,
        height: 30,
        label: 'MAIN MENU',
        onClick: () => this.#mainMenu()
      })
    ];
    this.#setSelected(0);

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
        this.#setSelected(this.#selectedIndex - 1);
      } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
        this.#setSelected(this.#selectedIndex + 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        this.#pressSelected();
      } else if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
        this.#resume();
      }
    });

    this.cameras.main.fadeIn(200, 0, 0, 0);
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
      this.#resume();
    } else {
      this.#mainMenu();
    }
  }

  #resume(): void {
    if (this.#isClosing) {
      return;
    }

    this.#isClosing = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.resume(this.#parentScene);
      this.scene.stop();
    });
  }

  #mainMenu(): void {
    if (this.#isClosing) {
      return;
    }

    this.#isClosing = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.stop(this.#parentScene);
      this.scene.start(SceneKey.MainMenu);
    });
  }
}
