import Phaser from 'phaser';

import { bossAnimationDefinitions, bossAnimationStates, getBossAnimationKey } from '@assets/bossAssets';
import {
  enemyAnimationStates,
  enemyDefinitions,
  enemyTypes,
  getEnemyAnimationKey
} from '@assets/enemyAssets';
import { getTrapAnimationKey, trapDefinitions, trapTypes } from '@assets/trapAssets';
import type { Services } from '@core/Services';
import { Boss } from '@game/Boss';
import { Enemy, type EnemySpawnConfig } from '@game/Enemy';
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

type VerticalSliceControls = Phaser.Types.Input.Keyboard.CursorKeys & {
  a: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  j: Phaser.Input.Keyboard.Key;
  x: Phaser.Input.Keyboard.Key;
  h: Phaser.Input.Keyboard.Key;
  k: Phaser.Input.Keyboard.Key;
  r: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
  one: Phaser.Input.Keyboard.Key;
  two: Phaser.Input.Keyboard.Key;
  three: Phaser.Input.Keyboard.Key;
  four: Phaser.Input.Keyboard.Key;
  five: Phaser.Input.Keyboard.Key;
  six: Phaser.Input.Keyboard.Key;
};

type Tile = Readonly<{
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}>;

const WORLD_WIDTH = 7600;
const WORLD_HEIGHT = 720;
const TILE_SIZE = 64;
const GROUND_Y = 570;
const TERRAIN_CONTACT_OFFSETS: Readonly<Record<string, number>> = {
  'environment.approved.ground': 18,
  'environment.approved.smallPlatform': 22,
  'environment.approved.vinePlatform': 23
};
const TERRAIN_COLLISION_INSETS: Readonly<Record<string, number>> = {
  'environment.approved.ground': 0,
  'environment.approved.smallPlatform': 22,
  'environment.approved.vinePlatform': 28
};
const GROUND_CONTACT_OFFSET = 18;
const GROUND_SURFACE_Y = GROUND_Y + GROUND_CONTACT_OFFSET;
const PLAYER_SPAWN_Y = GROUND_SURFACE_Y - 30;
const PLAYER_SCALE = 2.35;
const PLAYER_MAX_HP = 100;
const MOVE_SPEED = TILE_SIZE * 3;
const AIR_CONTROL = 0.75;
const ACCELERATION_TIME_SECONDS = 0.2;
const MOVE_ACCELERATION = MOVE_SPEED / ACCELERATION_TIME_SECONDS;
const JUMP_SPEED = Math.sqrt(2 * 1200 * TILE_SIZE * 2.5);
const DOUBLE_JUMP_MULTIPLIER = 0.85;
const COYOTE_TIME_MS = 150;
const JUMP_BUFFER_MS = 150;
const HIT_LOCK_MS = 300;
const DEFAULT_HIT_KNOCKBACK_X = 90;
const DEFAULT_HIT_KNOCKBACK_Y = -140;
const BOSS_HIT_KNOCKBACK_X = 0;
const BOSS_HIT_KNOCKBACK_Y = 0;
const PLAYER_ATTACK_DAMAGE = 20;
const PLAYER_ATTACK_COOLDOWN_MS = 450;
const PLAYER_ATTACK_RANGE = 92;
const PLAYER_HURT_LOCK_MS = 1000;
const CRITICAL_CHANCE = 0.1;
const CRITICAL_MULTIPLIER = 1.5;
const NORMAL_STAGGER = 25;
const CRITICAL_STAGGER = 40;
const HIT_STOP_MS = 80;
const ENEMY_DAMAGE = 15;
const SPIKE_DAMAGE = 25;
const AXE_DAMAGE = 35;

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

const platformTiles: readonly Tile[] = [
  platform('environment.approved.smallPlatform', 780, 330, 154, 24),
  platform('environment.approved.smallPlatform', 1060, 300, 154, 24),
  platform('environment.approved.vinePlatform', 1350, 335, 225, 26),
  platform('environment.approved.smallPlatform', 4320, 355, 154, 24),
  platform('environment.approved.vinePlatform', 5060, 355, 225, 26),
  platform('environment.approved.smallPlatform', 5440, 410, 154, 24)
];

const enemySpawns: readonly EnemySpawnConfig[] = [
  { type: 'snake', x: 1880, y: GROUND_SURFACE_Y, patrolLeft: 1820, patrolRight: 1940 },
  { type: 'hyena', x: 2120, y: GROUND_SURFACE_Y, patrolLeft: 2060, patrolRight: 2180 },
  { type: 'scorpio', x: 2360, y: GROUND_SURFACE_Y, patrolLeft: 2300, patrolRight: 2420 },
  { type: 'vulture', x: 2600, y: 355, patrolLeft: 2540, patrolRight: 2660 },
  { type: 'snake', x: 5160, y: GROUND_SURFACE_Y, patrolLeft: 5060, patrolRight: 5260 }
];

const trapSpawns: readonly TrapSpawnConfig[] = [
  { type: 'spike', x: 3820, anchorY: GROUND_SURFACE_Y, triggerWidth: 190, cooldownMs: 1000 },
  { type: 'spike', x: 4040, anchorY: GROUND_SURFACE_Y, triggerWidth: 190, delayMs: 180, cooldownMs: 1000 },
  { type: 'axe', x: 4435, anchorY: 378, triggerWidth: 260, triggerHeight: 230, cooldownMs: 2000 },
  { type: 'axe', x: 5185, anchorY: 378, triggerWidth: 260, triggerHeight: 230, cooldownMs: 2000 },
  { type: 'spike', x: 5360, anchorY: GROUND_SURFACE_Y, triggerWidth: 190, cooldownMs: 1000 }
];

function platform(key: string, x: number, y: number, width: number, height: number): Tile {
  return { key, x, y, width, height };
}

export class VerticalSliceScene extends Phaser.Scene {
  #services!: Services;
  #player!: Phaser.Physics.Arcade.Sprite;
  #playerBody!: Phaser.Physics.Arcade.Body;
  #platforms!: Phaser.Physics.Arcade.StaticGroup;
  #enemies: Enemy[] = [];
  #traps: Trap[] = [];
  #boss!: Boss;
  #keys!: VerticalSliceControls;
  #finish!: Phaser.GameObjects.Zone;
  #statusText!: Phaser.GameObjects.Text;
  #facing: -1 | 1 = 1;
  #playerHp = PLAYER_MAX_HP;
  #jumpCount = 0;
  #lastGroundedAt = 0;
  #jumpBufferedAt = -Infinity;
  #hitUntil = 0;
  #playerHurtUntil = 0;
  #attackReadyAt = 0;
  #isAttacking = false;
  #isDead = false;
  #comboHits = 0;
  #attackHitTargets = new Set<Enemy | Boss>();
  #currentAnimation: PlayerAnimationKey | null = null;

  constructor() {
    super(SceneKey.VerticalSlice);
  }

  init(): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('VerticalSliceScene requires services.');
    }

    this.#services = services;
  }

  create(): void {
    this.#services.debug.registerScene(this);
    this.#services.events.emit('scene:ready', { key: SceneKey.VerticalSlice });
    this.#resetValidationState();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.#createAnimations();
    this.#createMap();
    this.#createPlayer();
    this.#createEnemies();
    this.#createTraps();
    this.#createBoss();
    this.#createControls();

    this.physics.add.collider(
      this.#player,
      this.#platforms,
      () => this.#handlePlatformContact(),
      (_player, platform) => this.#canPlayerCollideWithPlatform(platform),
      this
    );
    for (const enemy of this.#enemies) {
      this.physics.add.collider(enemy.sprite, this.#platforms);
      this.physics.add.overlap(this.#player, enemy.sprite, () => this.#handleEnemyOverlap(enemy));
    }
    for (const trap of this.#traps) {
      this.physics.add.overlap(this.#player, trap.trigger, () => trap.triggerTrap(this.time.now));
      this.physics.add.overlap(this.#player, trap.hitbox, () => this.#handleTrapHit(trap));
    }
    this.physics.add.overlap(this.#player, this.#boss.sprite, () => this.#handleBossOverlap());
    this.physics.add.overlap(this.#player, this.#finish, () => {
      if (this.#boss.isDead) {
        this.#statusText.setText('Vertical slice complete');
      }
    });

    this.cameras.main.startFollow(this.#player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(220, 130);
  }

  #resetValidationState(): void {
    this.#playerHp = PLAYER_MAX_HP;
    this.#comboHits = 0;
    this.#attackHitTargets.clear();
    this.#playerHurtUntil = 0;
    this.#attackReadyAt = 0;
    this.#isAttacking = false;
    this.#isDead = false;
    this.#currentAnimation = null;
  }

  override update(time: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.#keys.r)) {
      this.scene.restart();
      return;
    }

    this.#tryDebugCheckpoint();

    if (this.#isDead) {
      this.#playerBody.setAccelerationX(0);
      this.#playerBody.setVelocityX(0);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.#keys.k)) {
      this.#playDebugDeath();
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
      this.#playerBody.setMaxVelocity(MOVE_SPEED, 900);
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
      this.#playerBody.setAccelerationX(0);
      this.#playerBody.setVelocityX(0);
    }

    for (const enemy of this.#enemies) {
      enemy.update(time);
    }
    for (const trap of this.#traps) {
      trap.update(time, this.#player);
    }
    this.#boss.update(time);

    this.#updateAnimation(time, horizontal, grounded);
    this.#updateCompletionStatus();
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

    for (const trapType of trapTypes) {
      const definition = trapDefinitions[trapType];
      this.anims.create({
        key: getTrapAnimationKey(trapType),
        frames: this.anims.generateFrameNumbers(definition.key, { start: 0, end: definition.frames - 1 }),
        duration: definition.durationMs,
        repeat: definition.repeat
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

  #createMap(): void {
    this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x232421).setOrigin(0, 0);
    this.#platforms = this.physics.add.staticGroup();

    for (let x = 0; x < WORLD_WIDTH; x += 500) {
      this.#addTile(platform('environment.approved.ground', x, GROUND_Y, 522, 44));
    }

    for (const tile of platformTiles) {
      this.#addTile(tile);
    }

    this.#addSectionLabel(90, '1  PLAYER TEST');
    this.#addSectionLabel(860, '2  PLATFORM EDGE TEST');
    this.#addSectionLabel(1940, '3  ENEMY TEST');
    this.#addSectionLabel(3780, '4  TRAP TEST');
    this.#addSectionLabel(5060, '5  MIXED TEST');
    this.#addSectionLabel(6100, '6  BOSS TEST');
    this.#addSectionLabel(7320, 'FINISH');

    this.add.text(250, 515, 'flat run / jump / double jump / attack', labelStyle()).setAlpha(0.7);
    this.add.text(900, 300, 'center stands / edge falls', labelStyle()).setAlpha(0.7);
    this.add.text(1840, 515, 'snake', labelStyle()).setAlpha(0.7);
    this.add.text(2070, 515, 'hyena', labelStyle()).setAlpha(0.7);
    this.add.text(2300, 515, 'scorpio', labelStyle()).setAlpha(0.7);
    this.add.text(2530, 320, 'vulture', labelStyle()).setAlpha(0.7);
    this.add.text(3830, 515, 'spike timing', labelStyle()).setAlpha(0.7);
    this.add.text(4310, 515, 'axe timing', labelStyle()).setAlpha(0.7);
    this.add.text(5060, 515, 'platform + enemy + trap', labelStyle()).setAlpha(0.7);
    this.add.text(6300, 515, 'boss arena', labelStyle()).setAlpha(0.7);

    this.add.rectangle(7440, 500, 18, 78, 0x9fff4a).setOrigin(0.5, 1);
    this.add.triangle(7475, 448, 0, 0, 60, 18, 0, 36, 0x9fff4a).setOrigin(0.5, 0.5);
    this.#finish = this.add.zone(7450, 480, 140, 160);
    this.physics.add.existing(this.#finish, true);

    this.#statusText = this.add
      .text(18, 18, 'Validation map: A/D move, Space/Up double jump, X/J attack, H hit, K death anim, R reset, 1-6 checkpoints', {
        color: '#f2f6ee',
        fontFamily: 'monospace',
        fontSize: '14px'
      })
      .setScrollFactor(0);
  }

  #addTile(tile: Tile): void {
    const image = this.add.image(tile.x, tile.y, tile.key).setOrigin(0, 0);
    image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    image.setData('terrainKey', tile.key);
    this.#platforms.add(image);

    const body = image.body as Phaser.Physics.Arcade.StaticBody;
    const contactOffsetY = TERRAIN_CONTACT_OFFSETS[tile.key] ?? 0;
    const collisionInsetX = TERRAIN_COLLISION_INSETS[tile.key] ?? 0;
    body.setSize(tile.width - collisionInsetX * 2, tile.height);
    body.setOffset(collisionInsetX, contactOffsetY);
    body.updateFromGameObject();
  }

  #addSectionLabel(x: number, label: string): void {
    this.add.text(x, 515, label, labelStyle()).setAlpha(0.82);
  }

  #createPlayer(): void {
    this.#player = this.physics.add
      .sprite(145, PLAYER_SPAWN_Y, 'player.idle', 0)
      .setOrigin(0.5, 1)
      .setScale(PLAYER_SCALE);
    this.#player.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.#playerBody = this.#player.body as Phaser.Physics.Arcade.Body;
    this.#playerBody.setSize(19, 38);
    this.#playerBody.setOffset(45, 42);
    this.#playerBody.setMaxVelocity(MOVE_SPEED, 900);
    this.#playerBody.setDragX(MOVE_ACCELERATION);

    this.#playAnimation('idle');
  }

  #createEnemies(): void {
    this.#enemies = enemySpawns.map((spawn) => new Enemy(this, spawn, this.#player));
  }

  #createTraps(): void {
    this.#traps = trapSpawns.map((spawn) => new Trap(this, spawn));
  }

  #createBoss(): void {
    this.#boss = new Boss(this, this.#player, 6750, GROUND_SURFACE_Y, {
      left: 6100,
      right: 7250,
      groundY: GROUND_SURFACE_Y,
      ceilingY: 350
    });
  }

  #createControls(): void {
    if (!this.input.keyboard) {
      throw new Error('VerticalSliceScene requires keyboard input.');
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
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      four: Phaser.Input.Keyboard.KeyCodes.FOUR,
      five: Phaser.Input.Keyboard.KeyCodes.FIVE,
      six: Phaser.Input.Keyboard.KeyCodes.SIX
    }) as VerticalSliceControls;

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (this.#isDead) {
        return;
      }

      switch (event.key) {
        case '1':
          this.#warpTo(145);
          break;
        case '2':
          this.#warpTo(840);
          break;
        case '3':
          this.#warpTo(2200);
          break;
        case '4':
          this.#warpTo(3740);
          break;
        case '5':
          this.#warpTo(4980);
          break;
        case '6':
          this.#warpTo(6280);
          break;
      }
    });
  }

  #canPlayerCollideWithPlatform(platform: unknown): boolean {
    const platformCandidate = platform as {
      body?: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
      gameObject?: { getData?: (key: string) => unknown };
      getData?: (key: string) => unknown;
    };
    const platformBody = platformCandidate.body ?? (this.#isArcadeBody(platform) ? platform : null);

    if (!platformBody) {
      return true;
    }

    const terrainKey = (platformCandidate.getData?.('terrainKey') ?? platformCandidate.gameObject?.getData?.('terrainKey')) as
      | string
      | undefined;

    if (terrainKey === 'environment.approved.ground') {
      return true;
    }

    const playerCenterX = this.#playerBody.center.x;
    const platformLeft = platformBody.x;
    const platformRight = platformBody.x + platformBody.width;
    const playerBottom = this.#playerBody.bottom;
    const platformTop = platformBody.y;
    const isLandingOnTop = this.#playerBody.velocity.y >= 0 && playerBottom <= platformTop + 18;

    return isLandingOnTop && playerCenterX >= platformLeft && playerCenterX <= platformRight;
  }

  #isArcadeBody(value: unknown): value is Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody {
    return typeof value === 'object' && value !== null && 'x' in value && 'y' in value && 'width' in value && 'height' in value;
  }

  #tryDebugCheckpoint(): void {
    if (Phaser.Input.Keyboard.JustDown(this.#keys.one)) {
      this.#warpTo(145);
    } else if (Phaser.Input.Keyboard.JustDown(this.#keys.two)) {
      this.#warpTo(840);
    } else if (Phaser.Input.Keyboard.JustDown(this.#keys.three)) {
      this.#warpTo(2200);
    } else if (Phaser.Input.Keyboard.JustDown(this.#keys.four)) {
      this.#warpTo(3740);
    } else if (Phaser.Input.Keyboard.JustDown(this.#keys.five)) {
      this.#warpTo(4980);
    } else if (Phaser.Input.Keyboard.JustDown(this.#keys.six)) {
      this.#warpTo(6280);
    }
  }

  #warpTo(x: number): void {
    this.#player.setPosition(x, PLAYER_SPAWN_Y);
    this.#playerBody.setVelocity(0, 0);
    this.#playerBody.setAccelerationX(0);
    this.#playerBody.setAllowGravity(true);
    this.cameras.main.centerOn(x, PLAYER_SPAWN_Y);
    this.#playerHp = PLAYER_MAX_HP;
    this.#jumpCount = 0;
    this.#comboHits = 0;
    this.#jumpBufferedAt = -Infinity;
    this.#hitUntil = 0;
    this.#playerHurtUntil = 0;
    this.#attackReadyAt = 0;
    this.#isDead = false;
    this.#statusText.setText('Debug checkpoint loaded');
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
      this.#playerBody.setAccelerationX(0);
      return;
    }

    if (horizontal !== this.#facing && this.#playerBody.blocked.down && Math.abs(this.#playerBody.velocity.x) > 20) {
      this.#playAnimation('turnAround', true);
    }

    this.#facing = horizontal;
    this.#player.setFlipX(horizontal < 0);
    const controlMultiplier = this.#playerBody.blocked.down ? 1 : AIR_CONTROL;
    this.#playerBody.setAccelerationX(horizontal * MOVE_ACCELERATION * controlMultiplier);
    this.#playerBody.setMaxVelocity(MOVE_SPEED * controlMultiplier, 900);
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
    this.#playerBody.setVelocityY(this.#jumpCount > 1 ? -JUMP_SPEED * DOUBLE_JUMP_MULTIPLIER : -JUMP_SPEED);
    this.#playAnimation(this.#jumpCount > 1 ? 'jumpInBetween' : 'jumpStart', true);
  }

  #tryAttack(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.#keys.x) && !Phaser.Input.Keyboard.JustDown(this.#keys.j)) {
      return;
    }

    if (this.time.now < this.#attackReadyAt) {
      return;
    }

    this.#attackReadyAt = this.time.now + PLAYER_ATTACK_COOLDOWN_MS;
    this.#attackHitTargets.clear();
    this.#isAttacking = true;
    this.#player.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'player.attack', () => {
      this.#isAttacking = false;
    });
    this.#damageInRange();
    this.#playAnimation('attack', true);
  }

  #damageInRange(): void {
    const attackX = this.#player.x + this.#facing * PLAYER_ATTACK_RANGE * 0.5;
    const attackZone = new Phaser.Geom.Rectangle(
      attackX - PLAYER_ATTACK_RANGE * 0.5,
      this.#player.y - 98,
      PLAYER_ATTACK_RANGE,
      94
    );

    for (const enemy of this.#enemies) {
      if (
        !enemy.isDead &&
        !this.#attackHitTargets.has(enemy) &&
        Phaser.Geom.Intersects.RectangleToRectangle(attackZone, enemy.sprite.getBounds())
      ) {
        const hit = this.#rollPlayerHit();
        enemy.hurt(hit.damage, hit.stagger);
        this.#attackHitTargets.add(enemy);
        this.#applyHitStop();
      }
    }

    if (
      !this.#boss.isDead &&
      !this.#attackHitTargets.has(this.#boss) &&
      Phaser.Geom.Intersects.RectangleToRectangle(attackZone, this.#boss.sprite.getBounds())
    ) {
      const hit = this.#rollPlayerHit();
      const appliedDamage = this.#boss.hurt(hit.damage, { critical: hit.isCritical, stagger: hit.stagger });
      this.#attackHitTargets.add(this.#boss);
      if (appliedDamage > 0) {
        this.#applyHitStop();
      }
    }
  }

  #rollPlayerHit(): Readonly<{ damage: number; isCritical: boolean; stagger: number; comboMultiplier: number }> {
    this.#comboHits += 1;
    const comboMultiplier = this.#comboMultiplier();
    const isCritical = Math.random() < CRITICAL_CHANCE;
    const damage = Math.round(PLAYER_ATTACK_DAMAGE * comboMultiplier * (isCritical ? CRITICAL_MULTIPLIER : 1));

    return {
      damage,
      isCritical,
      stagger: isCritical ? CRITICAL_STAGGER : NORMAL_STAGGER,
      comboMultiplier
    };
  }

  #comboMultiplier(): number {
    if (this.#comboHits >= 11) {
      return 1.3;
    }

    if (this.#comboHits >= 7) {
      return 1.2;
    }

    return this.#comboHits >= 4 ? 1.1 : 1;
  }

  #applyHitStop(): void {
    this.physics.world.timeScale = 0.01;
    this.time.delayedCall(HIT_STOP_MS, () => {
      this.physics.world.timeScale = 1;
    });
  }

  #handleEnemyOverlap(enemy: Enemy): void {
    if (enemy.isDead || this.#isDead) {
      return;
    }

    if (this.#isAttacking) {
      this.#damageInRange();
      return;
    }

    if (enemy.isAttackActive && this.time.now >= this.#playerHurtUntil) {
      this.#damagePlayer(ENEMY_DAMAGE, this.time.now);
    }
  }

  #handleBossOverlap(): void {
    if (this.#boss.isDead || this.#isDead) {
      return;
    }

    if (this.#isAttacking) {
      this.#damageInRange();
      return;
    }

    if (this.time.now >= this.#playerHurtUntil) {
      this.#playerBody.setAcceleration(0, 0);
      this.#playerBody.setVelocity(0, 0);
      this.#damagePlayer(this.#boss.activeAttackDamage, this.time.now, {
        sourceX: this.#boss.sprite.x,
        knockbackX: BOSS_HIT_KNOCKBACK_X,
        knockbackY: BOSS_HIT_KNOCKBACK_Y
      });
    }
  }

  #handleTrapHit(trap: Trap): void {
    if (this.#isDead || !trap.canDamage(this.time.now) || this.time.now < this.#playerHurtUntil) {
      return;
    }

    trap.markDamaged(this.time.now);
    this.#damagePlayer(trap.type === 'axe' ? AXE_DAMAGE : SPIKE_DAMAGE, this.time.now);
  }

  #damagePlayer(
    damage: number,
    time: number,
    knockback: Readonly<{ sourceX?: number; knockbackX?: number; knockbackY?: number }> = {}
  ): void {
    this.#playerHp = Math.max(1, this.#playerHp - damage);
    this.#playerHurtUntil = time + PLAYER_HURT_LOCK_MS;
    this.#comboHits = 0;

    this.#hit(time, knockback);
  }

  #playDebugDeath(): void {
    this.#isDead = true;
    this.#playerBody.setVelocity(0, 0);
    this.#playerBody.setAccelerationX(0);
    this.#playerBody.setAllowGravity(false);
    this.#playAnimation('death', true);
    this.#statusText.setText('Debug death animation - recovering');
    this.time.delayedCall(900, () => {
      this.#isDead = false;
      this.#playerHp = PLAYER_MAX_HP;
      this.#playerBody.setAllowGravity(true);
      this.#hitUntil = 0;
      this.#playAnimation('idle', true);
      this.#statusText.setText('Immortal recovered');
    });
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

  #updateCompletionStatus(): void {
    if (this.#boss.isDead) {
      this.#statusText.setText('Boss defeated - finish is open');
    }
  }

  #handlePlatformContact(): void {
    if (this.#playerBody.blocked.down) {
      this.#jumpCount = 0;
    }
  }

  #hit(
    time: number,
    knockback: Readonly<{ sourceX?: number; knockbackX?: number; knockbackY?: number }> = {}
  ): void {
    this.#hitUntil = time + HIT_LOCK_MS;
    const direction = knockback.sourceX === undefined ? -this.#facing : this.#player.x < knockback.sourceX ? -1 : 1;
    this.#playerBody.setAccelerationX(0);
    this.#playerBody.setVelocityX(direction * (knockback.knockbackX ?? DEFAULT_HIT_KNOCKBACK_X));
    this.#playerBody.setVelocityY(knockback.knockbackY ?? DEFAULT_HIT_KNOCKBACK_Y);
    this.#playAnimation('hit', true);
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
