import Phaser from 'phaser';

import {
  type EnvironmentPiece,
  type EnvironmentTheme,
  getEnvironmentAssetKey
} from '@assets/environmentTiles';
import type { Services } from '@core/Services';
import { SceneKey } from '@scenes/SceneKey';

type TileInstance = Readonly<{
  theme: EnvironmentTheme;
  piece: EnvironmentPiece;
  x: number;
  y: number;
  scale?: number;
  collides?: boolean;
  alpha?: number;
}>;

type BiomeBand = Readonly<{
  theme: EnvironmentTheme;
  x: number;
  width: number;
  color: number;
  label: string;
}>;

const WORLD_WIDTH = 3440;
const WORLD_HEIGHT = 720;
const TILE_SCALE = 2;
const GROUND_Y = 520;

const biomeBands: readonly BiomeBand[] = [
  { theme: 'spring', x: 0, width: 1128, color: 0x172318, label: 'SPRING' },
  { theme: 'autumn', x: 1128, width: 1128, color: 0x2b1d12, label: 'AUTUMN' },
  { theme: 'winter', x: 2256, width: 1184, color: 0x17212b, label: 'WINTER' }
];

const mapTiles: readonly TileInstance[] = [
  ...groundRun('spring', 40, 5),
  ...groundRun('autumn', 980, 5),
  ...groundRun('winter', 1920, 8),
  { theme: 'spring', piece: 'wideStep', x: 510, y: 426, collides: true },
  { theme: 'autumn', piece: 'wideStep', x: 1490, y: 426, collides: true },
  { theme: 'winter', piece: 'wideStep', x: 2510, y: 426, collides: true },
  ...floatingRun('spring', 760, 370, 2),
  ...floatingRun('autumn', 1660, 340, 2),
  ...floatingRun('winter', 2670, 365, 2),
  { theme: 'spring', piece: 'hollowBlock', x: 330, y: 270, alpha: 0.62 },
  { theme: 'autumn', piece: 'rightCluster', x: 1330, y: 250, alpha: 0.7 },
  { theme: 'winter', piece: 'smallBlock', x: 2920, y: 328, collides: true }
];

function groundRun(theme: EnvironmentTheme, startX: number, count: number): readonly TileInstance[] {
  return Array.from({ length: count }, (_, index) => ({
    theme,
    piece: 'solidBlock',
    x: startX + index * 188,
    y: GROUND_Y,
    collides: true
  }));
}

function floatingRun(
  theme: EnvironmentTheme,
  startX: number,
  y: number,
  count: number
): readonly TileInstance[] {
  return Array.from({ length: count }, (_, index) => ({
    theme,
    piece: 'floatingPlatform',
    x: startX + index * 188,
    y,
    collides: true
  }));
}

export class EnvironmentShowcaseScene extends Phaser.Scene {
  #services!: Services;
  #player!: Phaser.GameObjects.Rectangle;
  #playerBody!: Phaser.Physics.Arcade.Body;
  #cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  #staticTiles!: Phaser.Physics.Arcade.StaticGroup;
  #finish!: Phaser.GameObjects.Zone;
  #statusText!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKey.EnvironmentShowcase);
  }

  init(): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('EnvironmentShowcaseScene requires services.');
    }

    this.#services = services;
  }

  create(): void {
    this.#services.debug.registerScene(this);
    this.#services.events.emit('scene:ready', { key: SceneKey.EnvironmentShowcase });

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.#staticTiles = this.physics.add.staticGroup();
    this.#drawBiomeBackgrounds();
    this.#createTiles();
    this.#createMarkers();
    this.#createPlayer();

    if (!this.input.keyboard) {
      throw new Error('EnvironmentShowcaseScene requires keyboard input.');
    }

    this.#cursors = this.input.keyboard.createCursorKeys();
    this.physics.add.collider(this.#player, this.#staticTiles);
    this.physics.add.overlap(this.#player, this.#finish, () => this.#completeShowcase());
    this.cameras.main.startFollow(this.#player, true, 0.12, 0.12);
  }

  override update(): void {
    const left = this.#cursors.left.isDown;
    const right = this.#cursors.right.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.#cursors.up);

    if (left) {
      this.#playerBody.setVelocityX(-230);
    } else if (right) {
      this.#playerBody.setVelocityX(230);
    } else {
      this.#playerBody.setVelocityX(0);
    }

    if (jump && this.#playerBody.blocked.down) {
      this.#playerBody.setVelocityY(-520);
    }
  }

  #drawBiomeBackgrounds(): void {
    for (const band of biomeBands) {
      this.add.rectangle(band.x, 0, band.width, WORLD_HEIGHT, band.color, 0.4).setOrigin(0, 0);
      this.add
        .text(band.x + 28, 58, band.label, {
          color: '#f5f5f5',
          fontFamily: 'monospace',
          fontSize: '18px',
          fontStyle: '700'
        })
        .setAlpha(0.65)
        .setScrollFactor(1);
    }
  }

  #createTiles(): void {
    for (const tile of mapTiles) {
      const image = this.add
        .image(tile.x, tile.y, getEnvironmentAssetKey(tile.theme, tile.piece))
        .setOrigin(0, 0)
        .setScale(tile.scale ?? TILE_SCALE)
        .setAlpha(tile.alpha ?? 1);

      image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

      if (tile.collides) {
        this.#staticTiles.add(image);
        const body = image.body as Phaser.Physics.Arcade.StaticBody;
        body.updateFromGameObject();
      }
    }
  }

  #createMarkers(): void {
    this.add.rectangle(132, 482, 18, 76, 0x3da5ff).setOrigin(0.5, 1);
    this.add.triangle(166, 430, 0, 0, 60, 18, 0, 36, 0x3da5ff).setOrigin(0.5, 0.5);
    this.add.text(94, 438, 'SPAWN', {
      color: '#d9f0ff',
      fontFamily: 'monospace',
      fontSize: '14px'
    });

    this.add.rectangle(3180, 482, 18, 76, 0xaaff4f).setOrigin(0.5, 1);
    this.add.triangle(3214, 430, 0, 0, 60, 18, 0, 36, 0xaaff4f).setOrigin(0.5, 0.5);
    this.add.text(3138, 438, 'FINISH', {
      color: '#edffd4',
      fontFamily: 'monospace',
      fontSize: '14px'
    });

    this.#finish = this.add.zone(3185, 440, 90, 140);
    this.physics.add.existing(this.#finish, true);
    this.#statusText = this.add
      .text(20, 20, 'Environment tile showcase', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '18px'
      })
      .setScrollFactor(0);
  }

  #createPlayer(): void {
    this.#player = this.add.rectangle(132, 452, 26, 34, 0x75d7ff).setStrokeStyle(2, 0x07151d);
    this.physics.add.existing(this.#player);

    this.#playerBody = this.#player.body as Phaser.Physics.Arcade.Body;
    this.#playerBody.setCollideWorldBounds(true);
    this.#playerBody.setSize(26, 34);
    this.#playerBody.setMaxVelocity(260, 700);
  }

  #completeShowcase(): void {
    this.#statusText.setText('Showcase complete');
  }
}
