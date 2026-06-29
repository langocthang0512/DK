import Phaser from 'phaser';

import { getTrapAnimationKey, trapDefinitions, trapTypes } from '@assets/trapAssets';
import type { Services } from '@core/Services';
import { Trap, type TrapSpawnConfig } from '@game/Trap';
import { SceneKey } from '@scenes/SceneKey';

type PlayerAnimationKey =
  | 'idle'
  | 'run'
  | 'jumpStart'
  | 'jumpInBetween'
  | 'fall'
  | 'attack'
  | 'hit'
  | 'death'
  | 'turnAround';

type TrapTestControls = Phaser.Types.Input.Keyboard.CursorKeys & {
  a: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  h: Phaser.Input.Keyboard.Key;
  k: Phaser.Input.Keyboard.Key;
  r: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
};

type Tile = Readonly<{
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}>;

const WORLD_WIDTH = 3600;
const WORLD_HEIGHT = 720;
const GROUND_Y = 570;
const PLAYER_SCALE = 2.35;
const MOVE_SPEED = 260;
const JUMP_SPEED = 570;
const COYOTE_TIME_MS = 110;
const JUMP_BUFFER_MS = 130;
const HIT_LOCK_MS = 300;
const HURT_COOLDOWN_MS = 760;

const playerAnimationMeta = {
  idle: { frames: 10, frameRate: 13, repeat: -1 },
  run: { frames: 10, frameRate: 17, repeat: -1 },
  jumpStart: { frames: 3, frameRate: 17, repeat: 0 },
  jumpInBetween: { frames: 2, frameRate: 17, repeat: -1 },
  fall: { frames: 3, frameRate: 17, repeat: -1 },
  attack: { frames: 4, frameRate: 17, repeat: 0 },
  hit: { frames: 1, frameRate: 17, repeat: 0 },
  death: { frames: 10, frameRate: 17, repeat: 0 },
  turnAround: { frames: 3, frameRate: 14, repeat: 0 }
} as const satisfies Record<PlayerAnimationKey, Readonly<{ frames: number; frameRate: number; repeat: number }>>;

const tiles: readonly Tile[] = [
  ground(0),
  ground(500),
  ground(1000),
  ground(1500),
  ground(2000),
  ground(2500),
  ground(3000),
  platform('environment.approved.smallPlatform', 610, 390, 154, 24),
  platform('environment.approved.vinePlatform', 890, 330, 225, 26),
  platform('environment.approved.smallPlatform', 1220, 415, 154, 24),
  platform('environment.approved.vinePlatform', 2420, 340, 225, 26)
];

const trapSpawns: readonly TrapSpawnConfig[] = [
  { type: 'axe', x: 680, anchorY: 414, triggerWidth: 260, triggerHeight: 230 },
  { type: 'axe', x: 1000, anchorY: 356, triggerWidth: 280, triggerHeight: 250, delayMs: 220 },
  { type: 'axe', x: 1290, anchorY: 439, triggerWidth: 260, triggerHeight: 230, delayMs: 440 },
  { type: 'spike', x: 1670, anchorY: GROUND_Y, triggerWidth: 220 },
  { type: 'spike', x: 1870, anchorY: GROUND_Y, triggerWidth: 220, delayMs: 280 },
  { type: 'spike', x: 2070, anchorY: GROUND_Y, triggerWidth: 220, delayMs: 560 },
  { type: 'axe', x: 2530, anchorY: 366, triggerWidth: 300, triggerHeight: 260, delayMs: 120 },
  { type: 'spike', x: 2480, anchorY: GROUND_Y, triggerWidth: 220 },
  { type: 'spike', x: 2680, anchorY: GROUND_Y, triggerWidth: 220, delayMs: 360 }
];

function ground(x: number): Tile {
  return platform('environment.approved.ground', x, GROUND_Y, 522, 44);
}

function platform(key: string, x: number, y: number, width: number, height: number): Tile {
  return { key, x, y, width, height };
}

export class TrapTestScene extends Phaser.Scene {
  #services!: Services;
  #player!: Phaser.Physics.Arcade.Sprite;
  #playerBody!: Phaser.Physics.Arcade.Body;
  #platforms!: Phaser.Physics.Arcade.StaticGroup;
  #traps: Trap[] = [];
  #keys!: TrapTestControls;
  #finish!: Phaser.GameObjects.Zone;
  #statusText!: Phaser.GameObjects.Text;
  #facing: -1 | 1 = 1;
  #jumpCount = 0;
  #lastGroundedAt = 0;
  #jumpBufferedAt = -Infinity;
  #hitUntil = 0;
  #hurtUntil = 0;
  #isDead = false;
  #currentAnimation: PlayerAnimationKey | null = null;

  constructor() {
    super(SceneKey.TrapTest);
  }

  init(): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('TrapTestScene requires services.');
    }

    this.#services = services;
  }

  create(): void {
    this.#services.debug.registerScene(this);
    this.#services.events.emit('scene:ready', { key: SceneKey.TrapTest });

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.#createAnimations();
    this.#createMap();
    this.#createPlayer();
    this.#createTraps();
    this.#createControls();

    this.physics.add.collider(this.#player, this.#platforms, () => this.#handlePlatformContact());
    for (const trap of this.#traps) {
      this.physics.add.overlap(this.#player, trap.trigger, () => trap.triggerTrap(this.time.now));
      this.physics.add.overlap(this.#player, trap.hitbox, () => this.#handleTrapHit(trap));
    }
    this.physics.add.overlap(this.#player, this.#finish, () => this.#statusText.setText('Trap test complete'));

    this.cameras.main.startFollow(this.#player, true, 0.14, 0.14);
    this.cameras.main.setDeadzone(180, 120);
  }

  override update(time: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.#keys.r)) {
      this.scene.restart();
      return;
    }

    if (this.#isDead) {
      this.#playerBody.setVelocityX(0);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.#keys.k)) {
      this.#die();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.#keys.h)) {
      this.#hit(time);
      return;
    }

    const grounded = this.#playerBody.blocked.down;
    if (grounded) {
      this.#lastGroundedAt = time;
      this.#jumpCount = 0;
    }

    if (Phaser.Input.Keyboard.JustDown(this.#keys.up) || Phaser.Input.Keyboard.JustDown(this.#keys.space)) {
      this.#jumpBufferedAt = time;
    }

    const horizontal = this.#getHorizontalInput();
    if (time < this.#hitUntil) {
      this.#playerBody.setVelocityX(0);
    } else {
      this.#move(horizontal);
      this.#tryJump(time);
    }

    for (const trap of this.#traps) {
      trap.update(time, this.#player);
    }

    this.#updateAnimation(time, horizontal, grounded);
  }

  #createAnimations(): void {
    for (const [key, meta] of Object.entries(playerAnimationMeta) as [
      PlayerAnimationKey,
      (typeof playerAnimationMeta)[PlayerAnimationKey]
    ][]) {
      this.anims.create({
        key: `player.${key}`,
        frames: this.anims.generateFrameNumbers(`player.${key}`, { start: 0, end: meta.frames - 1 }),
        frameRate: meta.frameRate,
        repeat: meta.repeat
      });
    }

    for (const trapType of trapTypes) {
      const definition = trapDefinitions[trapType];
      this.anims.create({
        key: getTrapAnimationKey(trapType),
        frames: this.anims.generateFrameNumbers(definition.key, { start: 0, end: definition.frames - 1 }),
        duration: definition.durationMs,
        repeat: definition.repeat
      });
    }
  }

  #createMap(): void {
    this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x232421).setOrigin(0, 0);
    this.#platforms = this.physics.add.staticGroup();

    for (const tile of tiles) {
      const image = this.add.image(tile.x, tile.y, tile.key).setOrigin(0, 0);
      image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.#platforms.add(image);

      const body = image.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(tile.width, tile.height);
      body.setOffset(0, 0);
      body.updateFromGameObject();
    }

    this.add.text(92, 515, 'SPAWN / SAFE', labelStyle()).setAlpha(0.72);
    this.add.text(600, 515, 'AXE / HANGING TRAPS', labelStyle()).setAlpha(0.72);
    this.add.text(1410, 515, 'SAFE GROUND', labelStyle()).setAlpha(0.72);
    this.add.text(1600, 515, 'HIDDEN SPIKES - RUN THROUGH', labelStyle()).setAlpha(0.72);
    this.add.text(2380, 515, 'COMBINED', labelStyle()).setAlpha(0.72);
    this.add.text(3220, 515, 'SAFE FINISH', labelStyle()).setAlpha(0.72);

    this.add.rectangle(3360, 500, 18, 78, 0x9fff4a).setOrigin(0.5, 1);
    this.add.triangle(3395, 448, 0, 0, 60, 18, 0, 36, 0x9fff4a).setOrigin(0.5, 0.5);
    this.#finish = this.add.zone(3370, 480, 120, 160);
    this.physics.add.existing(this.#finish, true);

    this.#statusText = this.add
      .text(18, 18, 'Trap test: arrows/A-D move, Space/Up double jump, H hit, K death, R reset', {
        color: '#f2f6ee',
        fontFamily: 'monospace',
        fontSize: '14px'
      })
      .setScrollFactor(0);
  }

  #createPlayer(): void {
    this.#player = this.physics.add
      .sprite(145, 540, 'player.idle', 0)
      .setOrigin(0.5, 1)
      .setScale(PLAYER_SCALE);
    this.#player.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.#playerBody = this.#player.body as Phaser.Physics.Arcade.Body;
    this.#playerBody.setSize(24, 38);
    this.#playerBody.setOffset(43, 42);
    this.#playerBody.setMaxVelocity(320, 820);
    this.#playerBody.setDragX(1600);

    this.#playAnimation('idle');
  }

  #createTraps(): void {
    this.#traps = trapSpawns.map((spawn) => new Trap(this, spawn));
  }

  #createControls(): void {
    if (!this.input.keyboard) {
      throw new Error('TrapTestScene requires keyboard input.');
    }

    this.#keys = this.input.keyboard.addKeys({
      ...this.input.keyboard.createCursorKeys(),
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      h: Phaser.Input.Keyboard.KeyCodes.H,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    }) as TrapTestControls;
  }

  #getHorizontalInput(): -1 | 0 | 1 {
    if (this.#keys.left.isDown || this.#keys.a.isDown) {
      return -1;
    }

    if (this.#keys.right.isDown || this.#keys.d.isDown) {
      return 1;
    }

    return 0;
  }

  #move(horizontal: -1 | 0 | 1): void {
    if (horizontal === 0) {
      this.#playerBody.setVelocityX(0);
      return;
    }

    if (horizontal !== this.#facing && this.#playerBody.blocked.down && Math.abs(this.#playerBody.velocity.x) > 20) {
      this.#playAnimation('turnAround', true);
    }

    this.#facing = horizontal;
    this.#player.setFlipX(horizontal < 0);
    this.#playerBody.setVelocityX(horizontal * MOVE_SPEED);
  }

  #tryJump(time: number): void {
    if (time - this.#jumpBufferedAt > JUMP_BUFFER_MS) {
      return;
    }

    const canUseCoyote = time - this.#lastGroundedAt <= COYOTE_TIME_MS && this.#jumpCount === 0;
    const canDoubleJump = !this.#playerBody.blocked.down && this.#jumpCount < 2;

    if (!canUseCoyote && !canDoubleJump && !this.#playerBody.blocked.down) {
      return;
    }

    this.#jumpBufferedAt = -Infinity;
    this.#jumpCount += 1;
    this.#playerBody.setVelocityY(this.#jumpCount > 1 ? -JUMP_SPEED * 0.9 : -JUMP_SPEED);
    this.#playAnimation(this.#jumpCount > 1 ? 'jumpInBetween' : 'jumpStart', true);
  }

  #handleTrapHit(trap: Trap): void {
    if (this.#isDead || !trap.canDamage(this.time.now) || this.time.now < this.#hurtUntil) {
      return;
    }

    trap.markDamaged(this.time.now);
    this.#hurtUntil = this.time.now + HURT_COOLDOWN_MS;
    this.#hit(this.time.now);
  }

  #updateAnimation(time: number, horizontal: -1 | 0 | 1, grounded: boolean): void {
    if (time < this.#hitUntil || this.#currentAnimation === 'turnAround') {
      return;
    }

    if (!grounded) {
      if (this.#playerBody.velocity.y < -80) {
        this.#playAnimation(this.#jumpCount > 1 ? 'jumpInBetween' : 'jumpStart');
      } else if (this.#playerBody.velocity.y > 110) {
        this.#playAnimation('fall');
      }
      return;
    }

    this.#playAnimation(horizontal !== 0 ? 'run' : 'idle');
  }

  #handlePlatformContact(): void {
    if (this.#playerBody.blocked.down) {
      this.#jumpCount = 0;
    }
  }

  #hit(time: number): void {
    this.#hitUntil = time + HIT_LOCK_MS;
    this.#playerBody.setVelocityX(-this.#facing * 90);
    this.#playerBody.setVelocityY(-140);
    this.#playAnimation('hit', true);
  }

  #die(): void {
    this.#isDead = true;
    this.#playerBody.setVelocity(0, 0);
    this.#playerBody.setAllowGravity(false);
    this.#playAnimation('death', true);
    this.#statusText.setText('Death animation playing - press R to reset');
  }

  #playAnimation(animation: PlayerAnimationKey, force = false): void {
    if (!force && this.#currentAnimation === animation) {
      return;
    }

    this.#currentAnimation = animation;
    this.#player.play(`player.${animation}`, true);

    if (animation === 'turnAround') {
      this.#player.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'player.turnAround', () => {
        this.#currentAnimation = null;
      });
    }
  }
}

function labelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    color: '#dfe8d6',
    fontFamily: 'monospace',
    fontSize: '13px'
  };
}
