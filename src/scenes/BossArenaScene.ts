import Phaser from 'phaser';

import { bossAnimationDefinitions, bossAnimationStates, getBossAnimationKey } from '@assets/bossAssets';
import type { Services } from '@core/Services';
import { Boss } from '@game/Boss';
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

type BossArenaControls = Phaser.Types.Input.Keyboard.CursorKeys & {
  a: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  j: Phaser.Input.Keyboard.Key;
  x: Phaser.Input.Keyboard.Key;
  h: Phaser.Input.Keyboard.Key;
  k: Phaser.Input.Keyboard.Key;
  r: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
};

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 720;
const GROUND_Y = 660;
const PLAYER_SCALE = 2.35;
const MOVE_SPEED = 260;
const JUMP_SPEED = 570;
const COYOTE_TIME_MS = 110;
const JUMP_BUFFER_MS = 130;
const PLAYER_ATTACK_RANGE = 94;
const PLAYER_HURT_LOCK_MS = 680;

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

export class BossArenaScene extends Phaser.Scene {
  #services!: Services;
  #player!: Phaser.Physics.Arcade.Sprite;
  #playerBody!: Phaser.Physics.Arcade.Body;
  #boss!: Boss;
  #platforms!: Phaser.Physics.Arcade.StaticGroup;
  #keys!: BossArenaControls;
  #finish!: Phaser.GameObjects.Zone;
  #finishMarker!: Phaser.GameObjects.Container;
  #statusText!: Phaser.GameObjects.Text;
  #bossHealthText!: Phaser.GameObjects.Text;
  #facing: -1 | 1 = 1;
  #jumpCount = 0;
  #lastGroundedAt = 0;
  #jumpBufferedAt = -Infinity;
  #hitUntil = 0;
  #playerHurtUntil = 0;
  #isAttacking = false;
  #isDead = false;
  #currentAnimation: PlayerAnimationKey | null = null;

  constructor() {
    super(SceneKey.BossArena);
  }

  init(): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('BossArenaScene requires services.');
    }

    this.#services = services;
  }

  create(): void {
    this.#services.debug.registerScene(this);
    this.#services.events.emit('scene:ready', { key: SceneKey.BossArena });

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.#createAnimations();
    this.#createArena();
    this.#createPlayer();
    this.#boss = new Boss(this, this.#player, 2260, GROUND_Y, {
      left: 120,
      right: WORLD_WIDTH - 180,
      groundY: GROUND_Y,
      ceilingY: 420
    });
    this.#createControls();

    this.physics.add.collider(this.#player, this.#platforms, () => this.#handlePlatformContact());
    this.physics.add.overlap(this.#player, this.#boss.sprite, () => this.#handleBossOverlap());
    this.physics.add.overlap(this.#player, this.#finish, () => {
      if (this.#boss.isDead) {
        this.#statusText.setText('Boss arena complete');
      }
    });

    this.cameras.main.startFollow(this.#player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(260, 150);
    this.cameras.main.scrollY = 0;
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
    const lockedByHit = time < this.#hitUntil;

    if (!lockedByHit) {
      this.#move(horizontal);
      this.#tryJump(time);
      this.#tryAttack();
    } else {
      this.#playerBody.setVelocityX(0);
    }

    this.#boss.update(time);
    this.#updateAnimation(time, horizontal, grounded);
    this.#updateBossUi();
    this.cameras.main.scrollY = 0;
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

    for (const state of bossAnimationStates) {
      const definition = bossAnimationDefinitions[state];
      this.anims.create({
        key: getBossAnimationKey(state),
        frames: this.anims.generateFrameNumbers(getBossAnimationKey(state), {
          start: 0,
          end: definition.frames - 1
        }),
        frameRate: definition.frameRate,
        repeat: definition.repeat
      });
    }
  }

  #createArena(): void {
    this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x232421).setOrigin(0, 0);
    this.#platforms = this.physics.add.staticGroup();

    for (let x = 40; x < WORLD_WIDTH - 40; x += 522) {
      const ground = this.add.image(x, GROUND_Y, 'environment.approved.ground').setOrigin(0, 0);
      ground.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.#platforms.add(ground);
      const body = ground.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(522, 44);
      body.setOffset(0, 0);
      body.updateFromGameObject();
    }

    this.add.text(110, GROUND_Y - 60, 'SPAWN', labelStyle()).setAlpha(0.72);
    this.add.text(1730, GROUND_Y - 60, 'BOSS STARTS RIGHT - WALKS LEFT', labelStyle()).setAlpha(0.72);
    this.add.text(2580, GROUND_Y - 60, 'FINISH AFTER BOSS DEATH', labelStyle()).setAlpha(0.72);

    this.#finishMarker = this.add.container(2760, GROUND_Y - 58, [
      this.add.rectangle(0, 0, 18, 78, 0x9fff4a).setOrigin(0.5, 1),
      this.add.triangle(34, -52, 0, 0, 60, 18, 0, 36, 0x9fff4a).setOrigin(0.5, 0.5)
    ]);
    this.#finishMarker.setAlpha(0.25);
    this.#finish = this.add.zone(2765, GROUND_Y - 76, 120, 160);
    this.physics.add.existing(this.#finish, true);

    this.#statusText = this.add
      .text(18, 18, 'Boss arena: arrows/A-D move, Space/Up double jump, X/J attack, H hit, K death, R reset', {
        color: '#f2f6ee',
        fontFamily: 'monospace',
        fontSize: '14px'
      })
      .setScrollFactor(0);
    this.#bossHealthText = this.add
      .text(18, 42, 'Boss HP: 12', {
        color: '#ffdfdf',
        fontFamily: 'monospace',
        fontSize: '14px'
      })
      .setScrollFactor(0);
  }

  #createPlayer(): void {
    this.#player = this.physics.add
      .sprite(170, GROUND_Y - 28, 'player.idle', 0)
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
      throw new Error('BossArenaScene requires keyboard input.');
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
    }) as BossArenaControls;
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
    this.#damageBossInRange();
    this.#playAnimation('attack', true);
  }

  #damageBossInRange(): void {
    if (this.#boss.isDead) {
      return;
    }

    const attackX = this.#player.x + this.#facing * PLAYER_ATTACK_RANGE * 0.5;
    const attackZone = new Phaser.Geom.Rectangle(attackX - PLAYER_ATTACK_RANGE * 0.5, this.#player.y - 100, PLAYER_ATTACK_RANGE, 98);

    if (Phaser.Geom.Intersects.RectangleToRectangle(attackZone, this.#boss.sprite.getBounds())) {
      this.#boss.hurt();
    }
  }

  #handleBossOverlap(): void {
    if (this.#boss.isDead || this.#isDead) {
      return;
    }

    if (this.#isAttacking) {
      this.#damageBossInRange();
      return;
    }

    if (this.#boss.isAttackActive && this.time.now >= this.#playerHurtUntil) {
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

    this.#playAnimation(horizontal !== 0 ? 'run' : 'idle');
  }

  #updateBossUi(): void {
    this.#bossHealthText.setText(`Boss HP: ${Math.max(0, this.#boss.health).toString()}`);

    if (this.#boss.isDead) {
      this.#finishMarker.setAlpha(1);
      this.#statusText.setText('Boss defeated - finish trigger unlocked');
    }
  }

  #handlePlatformContact(): void {
    if (this.#playerBody.blocked.down) {
      this.#jumpCount = 0;
    }
  }

  #hit(time: number): void {
    this.#hitUntil = time + 280;
    this.#playerBody.setVelocityX(-this.#facing * 110);
    this.#playerBody.setVelocityY(-150);
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
