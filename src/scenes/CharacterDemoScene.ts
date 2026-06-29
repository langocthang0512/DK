import Phaser from 'phaser';

import {
  enemyAnimationStates,
  enemyDefinitions,
  enemyTypes,
  getEnemyAnimationKey
} from '@assets/enemyAssets';
import type { Services } from '@core/Services';
import { Enemy, type EnemySpawnConfig } from '@game/Enemy';
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

type DemoTile = Readonly<{
  assetKey: string;
  x: number;
  y: number;
  body: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
}>;

type DemoControls = Phaser.Types.Input.Keyboard.CursorKeys & {
  a: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  j: Phaser.Input.Keyboard.Key;
  x: Phaser.Input.Keyboard.Key;
  h: Phaser.Input.Keyboard.Key;
  k: Phaser.Input.Keyboard.Key;
  r: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
};

const WORLD_WIDTH = 2280;
const WORLD_HEIGHT = 720;
const PLAYER_SCALE = 2.35;
const MOVE_SPEED = 260;
const JUMP_SPEED = 570;
const COYOTE_TIME_MS = 110;
const JUMP_BUFFER_MS = 130;
const HIT_LOCK_MS = 260;
const PLAYER_ATTACK_RANGE = 82;
const PLAYER_HURT_LOCK_MS = 650;

const animationMeta = {
  idle: { frames: 10, frameRate: 13, repeat: -1 },
  run: { frames: 10, frameRate: 17, repeat: -1 },
  jumpStart: { frames: 3, frameRate: 17, repeat: 0 },
  jumpInBetween: { frames: 2, frameRate: 17, repeat: -1 },
  fall: { frames: 3, frameRate: 17, repeat: -1 },
  attack: { frames: 4, frameRate: 17, repeat: 0 },
  hit: { frames: 1, frameRate: 17, repeat: 0 },
  death: { frames: 10, frameRate: 17, repeat: 0 },
  turnAround: { frames: 3, frameRate: 14, repeat: 0 }
} as const satisfies Record<
  PlayerAnimationKey,
  Readonly<{ frames: number; frameRate: number; repeat: number }>
>;

const demoTiles: readonly DemoTile[] = [
  ground(70, 570),
  ground(592, 570),
  platform('environment.approved.smallPlatform', 550, 410, 154, 24, 0, 0),
  platform('environment.approved.smallPlatform', 800, 340, 154, 24, 0, 0),
  platform('environment.approved.vinePlatform', 1080, 260, 225, 26, 0, 0),
  ground(1320, 570),
  platform('environment.approved.smallPlatform', 1540, 355, 154, 24, 0, 0),
  platform('environment.approved.vinePlatform', 1770, 250, 225, 26, 0, 0),
  ground(1720, 570)
];

const enemySpawns: readonly EnemySpawnConfig[] = [
  { type: 'snake', x: 735, y: 570, patrolLeft: 660, patrolRight: 900 },
  { type: 'hyena', x: 1360, y: 570, patrolLeft: 1320, patrolRight: 1510 },
  { type: 'scorpio', x: 1635, y: 570, patrolLeft: 1530, patrolRight: 1785 },
  { type: 'vulture', x: 1616, y: 355, patrolLeft: 1540, patrolRight: 1680 },
  { type: 'snake', x: 1935, y: 570, patrolLeft: 1850, patrolRight: 2040 },
  { type: 'vulture', x: 1878, y: 250, patrolLeft: 1788, patrolRight: 1950 }
];

function ground(x: number, y: number): DemoTile {
  return platform('environment.approved.ground', x, y, 522, 44, 0, 0);
}

function platform(
  assetKey: string,
  x: number,
  y: number,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number
): DemoTile {
  return {
    assetKey,
    x,
    y,
    body: {
      width,
      height,
      offsetX,
      offsetY
    }
  };
}

export class CharacterDemoScene extends Phaser.Scene {
  #services!: Services;
  #player!: Phaser.Physics.Arcade.Sprite;
  #playerBody!: Phaser.Physics.Arcade.Body;
  #platforms!: Phaser.Physics.Arcade.StaticGroup;
  #enemies: Enemy[] = [];
  #keys!: DemoControls;
  #finish!: Phaser.GameObjects.Zone;
  #statusText!: Phaser.GameObjects.Text;
  #facing: -1 | 1 = 1;
  #jumpCount = 0;
  #lastGroundedAt = 0;
  #jumpBufferedAt = -Infinity;
  #hitUntil = 0;
  #isAttacking = false;
  #isDead = false;
  #playerHurtUntil = 0;
  #currentAnimation: PlayerAnimationKey | null = null;

  constructor() {
    super(SceneKey.CharacterDemo);
  }

  init(): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('CharacterDemoScene requires services.');
    }

    this.#services = services;
  }

  create(): void {
    this.#services.debug.registerScene(this);
    this.#services.events.emit('scene:ready', { key: SceneKey.CharacterDemo });

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.#createAnimations();
    this.#createMap();
    this.#createPlayer();
    this.#createEnemies();
    this.#createControls();

    this.physics.add.collider(this.#player, this.#platforms, () => this.#handlePlatformContact());
    for (const enemy of this.#enemies) {
      this.physics.add.collider(enemy.sprite, this.#platforms);
      this.physics.add.overlap(this.#player, enemy.sprite, () => this.#handleEnemyOverlap(enemy));
    }
    this.physics.add.overlap(this.#player, this.#finish, () => this.#statusText.setText('Finish reached'));

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

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.#keys.up) ||
      Phaser.Input.Keyboard.JustDown(this.#keys.space);

    if (jumpPressed) {
      this.#jumpBufferedAt = time;
    }

    const horizontal = this.#getHorizontalInput();
    const lockedByHit = time < this.#hitUntil;

    if (!lockedByHit) {
      this.#move(horizontal);
      this.#tryJump(time);
      this.#tryAttack();
    } else {
      this.#playerBody.setVelocityX(0);
    }

    for (const enemy of this.#enemies) {
      enemy.update(time);
    }

    this.#updateAnimation(time, horizontal, grounded);
  }

  #createAnimations(): void {
    for (const [key, meta] of Object.entries(animationMeta) as [
      PlayerAnimationKey,
      (typeof animationMeta)[PlayerAnimationKey]
    ][]) {
      this.anims.create({
        key: `player.${key}`,
        frames: this.anims.generateFrameNumbers(`player.${key}`, {
          start: 0,
          end: meta.frames - 1
        }),
        frameRate: meta.frameRate,
        repeat: meta.repeat
      });
    }

    for (const enemyType of enemyTypes) {
      for (const state of enemyAnimationStates) {
        const definition = enemyDefinitions[enemyType].animations[state];

        this.anims.create({
          key: getEnemyAnimationKey(enemyType, state),
          frames: this.anims.generateFrameNumbers(getEnemyAnimationKey(enemyType, state), {
            start: 0,
            end: definition.frames - 1
          }),
          frameRate: definition.frameRate,
          repeat: definition.repeat
        });
      }
    }
  }

  #createMap(): void {
    this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x232421).setOrigin(0, 0);
    this.#platforms = this.physics.add.staticGroup();

    for (const tile of demoTiles) {
      const image = this.add.image(tile.x, tile.y, tile.assetKey).setOrigin(0, 0);
      image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.#platforms.add(image);

      const body = image.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(tile.body.width, tile.body.height);
      body.setOffset(tile.body.offsetX, tile.body.offsetY);
      body.updateFromGameObject();
    }

    this.add.text(84, 515, 'idle / run', labelStyle()).setAlpha(0.68);
    this.add.text(625, 515, 'snake zone', labelStyle()).setAlpha(0.68);
    this.add.text(1052, 222, 'double jump', labelStyle()).setAlpha(0.68);
    this.add.text(1325, 515, 'hyena / scorpio', labelStyle()).setAlpha(0.68);
    this.add.text(1778, 515, 'mixed enemy section', labelStyle()).setAlpha(0.68);
    this.add.text(1910, 515, 'safe checkpoint', labelStyle()).setAlpha(0.68);

    this.add.rectangle(2160, 500, 18, 78, 0x9fff4a).setOrigin(0.5, 1);
    this.add.triangle(2195, 448, 0, 0, 60, 18, 0, 36, 0x9fff4a).setOrigin(0.5, 0.5);
    this.add.text(2120, 462, 'FINISH', labelStyle());
    this.#finish = this.add.zone(2168, 480, 90, 160);
    this.physics.add.existing(this.#finish, true);

    this.#statusText = this.add
      .text(18, 18, 'Enemy demo: arrows/A-D move, Space/Up jump, X/J attack, H hit, K death, R reset', {
        color: '#f2f6ee',
        fontFamily: 'monospace',
        fontSize: '14px'
      })
      .setScrollFactor(0);
  }

  #createEnemies(): void {
    this.#enemies = enemySpawns.map((spawn) => new Enemy(this, spawn, this.#player));
  }

  #createPlayer(): void {
    this.#player = this.physics.add
      .sprite(150, 540, 'player.idle', 0)
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

  #createControls(): void {
    if (!this.input.keyboard) {
      throw new Error('CharacterDemoScene requires keyboard input.');
    }

    this.#keys = this.input.keyboard.addKeys({
      ...this.input.keyboard.createCursorKeys(),
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      x: Phaser.Input.Keyboard.KeyCodes.X,
      h: Phaser.Input.Keyboard.KeyCodes.H,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    }) as DemoControls;
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

  #tryAttack(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.#keys.x) && !Phaser.Input.Keyboard.JustDown(this.#keys.j)) {
      return;
    }

    this.#isAttacking = true;
    this.#player.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'player.attack', () => {
      this.#isAttacking = false;
    });
    this.#damageEnemiesInRange();
    this.#playAnimation('attack', true);
  }

  #damageEnemiesInRange(): void {
    const attackX = this.#player.x + this.#facing * PLAYER_ATTACK_RANGE * 0.5;
    const attackZone = new Phaser.Geom.Rectangle(
      attackX - PLAYER_ATTACK_RANGE * 0.5,
      this.#player.y - 92,
      PLAYER_ATTACK_RANGE,
      86
    );

    for (const enemy of this.#enemies) {
      if (enemy.isDead) {
        continue;
      }

      const enemyBounds = enemy.sprite.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(attackZone, enemyBounds)) {
        enemy.hurt();
      }
    }
  }

  #handleEnemyOverlap(enemy: Enemy): void {
    if (enemy.isDead || this.#isDead) {
      return;
    }

    if (this.#isAttacking) {
      this.#damageEnemiesInRange();
      return;
    }

    if (enemy.isAttackActive && this.time.now >= this.#playerHurtUntil) {
      this.#playerHurtUntil = this.time.now + PLAYER_HURT_LOCK_MS;
      this.#hit(this.time.now);
    }
  }

  #updateAnimation(time: number, horizontal: -1 | 0 | 1, grounded: boolean): void {
    if (this.#isAttacking || time < this.#hitUntil || this.#currentAnimation === 'turnAround') {
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

    if (horizontal !== 0) {
      this.#playAnimation('run');
    } else {
      this.#playAnimation('idle');
    }
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
