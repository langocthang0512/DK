import Phaser from 'phaser';

import type { Services } from '@core/Services';
import { SceneKey } from '@scenes/SceneKey';
import { createFantasyPixelButton, createFantasyPixelTitle, type PixelButton } from '@ui/pixelUi';

type PauseMenuData = Readonly<{
  parentScene?: string;
}>;

export class PauseMenuScene extends Phaser.Scene {
  #services!: Services;
  #parentScene: string = SceneKey.Map1;
  #buttons: PixelButton[] = [];
  #selectedIndex = 0;
  #isClosing = false;
  #acceptInputAt = 0;

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
    this.#buttons = [];
    this.#selectedIndex = 0;
    this.#isClosing = false;
    this.#services.events.emit('scene:ready', { key: SceneKey.PauseMenu });
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.36).setOrigin(0, 0).setDepth(1000);
    this.#createPanel(width, height);
    createFantasyPixelTitle(this, width * 0.5, height * 0.35, 'PAUSED', 54);
    this.#acceptInputAt = this.time.now + 180;

    this.#buttons = [
      createFantasyPixelButton(this, {
        x: width * 0.5,
        y: height * 0.5,
        width: 236,
        height: 52,
        label: 'RESUME',
        onClick: () => this.#resume()
      }),
      createFantasyPixelButton(this, {
        x: width * 0.5,
        y: height * 0.5 + 68,
        width: 236,
        height: 52,
        label: 'MAIN MENU',
        onClick: () => this.#mainMenu()
      })
    ];
    this.#setSelected(0);

    this.input.keyboard?.removeAllListeners('keydown');
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      event.preventDefault();
      if (this.time.now < this.#acceptInputAt || this.#isClosing) {
        return;
      }

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

  #createPanel(width: number, height: number): void {
    const panelWidth = 390;
    const panelHeight = 320;
    const x = width * 0.5 - panelWidth * 0.5;
    const y = height * 0.5 - panelHeight * 0.5;
    const panel = this.add.graphics().setDepth(1090);

    panel.fillStyle(0x130c08, 0.78);
    panel.fillRoundedRect(x + 7, y + 9, panelWidth, panelHeight, 8);
    panel.fillStyle(0x3a2113, 0.94);
    panel.fillRoundedRect(x, y, panelWidth, panelHeight, 8);
    panel.fillStyle(0x7a451f, 0.92);
    panel.fillRoundedRect(x + 8, y + 8, panelWidth - 16, panelHeight - 16, 5);
    panel.fillStyle(0x2a180e, 0.42);
    panel.fillRect(x + 18, y + 18, panelWidth - 36, panelHeight - 36);
    panel.lineStyle(3, 0xe19a48, 0.75);
    panel.strokeRoundedRect(x + 10, y + 10, panelWidth - 20, panelHeight - 20, 5);
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
      this.input.keyboard?.resetKeys();
      this.scene.resume(this.#parentScene);
      this.scene.stop(SceneKey.PauseMenu);
    });
  }

  #mainMenu(): void {
    if (this.#isClosing) {
      return;
    }

    this.#isClosing = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.input.keyboard?.resetKeys();
      this.scene.stop(this.#parentScene);
      this.scene.start(SceneKey.MainMenu);
    });
  }
}
