import Phaser from 'phaser';

import {
  bossAnimationDefinitions,
  bossAnimationStates,
  getBossAnimationKey
} from '@assets/bossAssets';
import {
  enemyAnimationStates,
  enemyDefinitions,
  enemyTypes,
  getEnemyAnimationKey,
  type EnemyType
} from '@assets/enemyAssets';
import { getTrapAnimationKey, trapDefinitions, trapTypes } from '@assets/trapAssets';
import { gameplayConfig } from '@config/gameplayConfig';
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

type FinalLevelControls = Phaser.Types.Input.Keyboard.CursorKeys & {
  a: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  j: Phaser.Input.Keyboard.Key;
  x: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
};

type TerrainKind = 'ground' | 'smallPlatform' | 'vinePlatform';

type Terrain = Readonly<{
  kind: TerrainKind;
  x: number;
  y: number;
}>;

type BossArenaConfig = Readonly<{
  bossX: number;
  left: number;
  right: number;
  ceilingY: number;
}>;

type LevelConfig = Readonly<{
  key: SceneKey;
  title: string;
  worldWidth: number;
  nextScene?: SceneKey;
  finishLabel: string;
  finishRequiresBossDeath?: boolean;
  terrain: readonly Terrain[];
  enemies: readonly EnemySpawnConfig[];
  traps: readonly TrapSpawnConfig[];
  bossArena?: BossArenaConfig;
  tutorial?: readonly TutorialPrompt[];
}>;

type TutorialPrompt = Readonly<{
  text: string;
  x: number;
  y: number;
}>;

const WORLD_HEIGHT = 720;
const TILE_SIZE = gameplayConfig.tileSize;
const GROUND_Y = 570;
const GROUND_CONTACT_OFFSET = 18;
const GROUND_SURFACE_Y = GROUND_Y + GROUND_CONTACT_OFFSET;
const PLAYER_SPAWN_Y = GROUND_SURFACE_Y - 30;
const PLAYER_SCALE = 2.35;
const PLAYER_MAX_HP = gameplayConfig.player.hp;
const MOVE_SPEED = gameplayConfig.player.speed;
const AIR_CONTROL = gameplayConfig.player.airControl;
const MOVE_ACCELERATION = gameplayConfig.player.speed / 0.2;
const JUMP_SPEED = Math.sqrt(2 * 1200 * TILE_SIZE * gameplayConfig.player.jumpHeightTiles);
const DOUBLE_JUMP_MULTIPLIER = gameplayConfig.player.doubleJumpMultiplier;
const COYOTE_TIME_MS = 150;
const JUMP_BUFFER_MS = 150;
const HIT_LOCK_MS = 300;
const PLAYER_HURT_LOCK_MS = 1000;
const PLAYER_ATTACK_DAMAGE = gameplayConfig.player.attackDamage;
const PLAYER_ATTACK_COOLDOWN_MS = gameplayConfig.player.attackCooldownMs;
const PLAYER_ATTACK_RANGE = 92;
const NORMAL_STAGGER = 25;
const CRITICAL_STAGGER = 40;
const HIT_STOP_MS = 80;

const terrainDefinitions = {
  ground: {
    key: 'environment.approved.ground',
    width: 522,
    height: 44,
    contactOffsetY: GROUND_CONTACT_OFFSET,
    collisionInsetX: 0
  },
  smallPlatform: {
    key: 'environment.approved.smallPlatform',
    width: 154,
    height: 24,
    contactOffsetY: 22,
    collisionInsetX: 22
  },
  vinePlatform: {
    key: 'environment.approved.vinePlatform',
    width: 225,
    height: 26,
    contactOffsetY: 23,
    collisionInsetX: 28
  }
} as const satisfies Record<
  TerrainKind,
  Readonly<{
    key: string;
    width: number;
    height: number;
    contactOffsetY: number;
    collisionInsetX: number;
  }>
>;

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
} as const satisfies Record<
  PlayerAnimationKey,
  Readonly<{ frames: number; frameRate: number; repeat: number }>
>;

const map1Config: LevelConfig = {
  key: SceneKey.Map1,
  title: 'MAP 1 - GREEN START',
  worldWidth: 64_000,
  nextScene: SceneKey.Map2,
  finishLabel: 'MAP 2',
  terrain: [
    ...groundStrip(64_000),
    platform('smallPlatform', 13_200, 430),
    platform('smallPlatform', 13_580, 360),
    platform('vinePlatform', 14_050, 310),
    platform('smallPlatform', 33_500, 420),
    platform('vinePlatform', 34_000, 360)
  ],
  enemies: [
    enemy('snake', 24_600, 24_240, 24_940),
    enemy('snake', 42_200, 41_900, 42_700),
    enemy('snake', 54_000, 53_700, 54_500)
  ],
  traps: [spike(39_800), spike(40_160, 180), spike(51_600)],
  tutorial: [
    { text: 'MOVE', x: 620, y: 486 },
    { text: 'JUMP', x: 12_720, y: 486 },
    { text: 'ATTACK', x: 23_850, y: 486 }
  ]
};

const map2Config: LevelConfig = {
  key: SceneKey.Map2,
  title: 'MAP 2 - RUIN CROSSING',
  worldWidth: 94_000,
  nextScene: SceneKey.Map3,
  finishLabel: 'MAP 3',
  terrain: [
    ...groundStrip(94_000),
    platform('smallPlatform', 9_800, 430),
    platform('vinePlatform', 10_220, 370),
    platform('smallPlatform', 10_720, 320),
    platform('vinePlatform', 46_200, 370),
    platform('smallPlatform', 46_620, 315),
    platform('vinePlatform', 70_100, 400),
    platform('smallPlatform', 70_600, 345),
    platform('vinePlatform', 71_020, 300)
  ],
  enemies: [
    enemy('hyena', 22_500, 22_180, 22_920),
    enemy('hyena', 30_500, 30_150, 30_950),
    enemy('scorpio', 39_400, 39_050, 39_850),
    enemy('scorpio', 52_000, 51_620, 52_420),
    enemy('hyena', 68_800, 68_520, 69_200),
    enemy('scorpio', 69_700, 69_420, 70_100)
  ],
  traps: [
    axe(46_300, 392),
    axe(46_730, 338),
    spike(60_900),
    spike(61_260, 200),
    axe(70_210, 422),
    spike(73_600)
  ]
};

const map3Config: LevelConfig = {
  key: SceneKey.Map3,
  title: 'MAP 3 - FINAL ASCENT',
  worldWidth: 122_000,
  nextScene: SceneKey.FinalBoss,
  finishLabel: 'BOSS GATE',
  terrain: [
    ...groundStrip(122_000),
    platform('smallPlatform', 12_000, 430),
    platform('smallPlatform', 12_420, 365),
    platform('vinePlatform', 12_900, 305),
    platform('smallPlatform', 28_600, 420),
    platform('vinePlatform', 29_100, 355),
    platform('smallPlatform', 47_200, 440),
    platform('smallPlatform', 47_640, 370),
    platform('vinePlatform', 48_120, 310),
    platform('vinePlatform', 77_000, 395),
    platform('smallPlatform', 77_520, 335),
    platform('smallPlatform', 78_000, 285),
    platform('vinePlatform', 102_000, 390),
    platform('smallPlatform', 102_520, 330)
  ],
  enemies: [
    enemy('snake', 21_800, 21_500, 22_160),
    enemy('hyena', 36_800, 36_450, 37_250),
    enemy('scorpio', 37_760, 37_420, 38_200),
    enemy('vulture', 58_500, 58_180, 58_900),
    enemy('vulture', 74_200, 73_850, 74_620),
    enemy('hyena', 92_600, 92_200, 93_000),
    enemy('vulture', 93_450, 93_050, 93_900),
    enemy('scorpio', 109_400, 109_000, 109_850)
  ],
  traps: [
    spike(44_000),
    spike(44_360, 200),
    axe(47_320, 462),
    axe(48_240, 332),
    spike(66_000),
    axe(77_110, 418),
    spike(86_200),
    spike(86_560, 180),
    axe(102_120, 414)
  ]
};

const finalBossConfig: LevelConfig = {
  key: SceneKey.FinalBoss,
  title: 'FINAL BOSS',
  worldWidth: 7_200,
  finishLabel: 'VICTORY',
  finishRequiresBossDeath: true,
  terrain: [
    ...groundStrip(7_200),
    platform('vinePlatform', 2_580, 395),
    platform('smallPlatform', 3_280, 340),
    platform('vinePlatform', 4_050, 390),
    platform('smallPlatform', 4_820, 335)
  ],
  enemies: [],
  traps: [],
  bossArena: {
    bossX: 5_250,
    left: 1_800,
    right: 6_650,
    ceilingY: 250
  }
};

export class FinalLevelScene extends Phaser.Scene {
  #services!: Services;
  #player!: Phaser.Physics.Arcade.Sprite;
  #playerBody!: Phaser.Physics.Arcade.Body;
  #platforms!: Phaser.Physics.Arcade.StaticGroup;
  #keys!: FinalLevelControls;
  #finish!: Phaser.GameObjects.Zone;
  #statusText!: Phaser.GameObjects.Text;
  #enemies: Enemy[] = [];
  #traps: Trap[] = [];
  #boss: Boss | null = null;
  #facing: -1 | 1 = 1;
  #playerHp: number = PLAYER_MAX_HP;
  #jumpCount = 0;
  #lastGroundedAt = 0;
  #jumpBufferedAt = -Infinity;
  #hitUntil = 0;
  #playerHurtUntil = 0;
  #attackReadyAt = 0;
  #isAttacking = false;
  #isDead = false;
  #isCompleting = false;
  #comboHits = 0;
  #attackHitTargets = new Set<Enemy | Boss>();
  #currentAnimation: PlayerAnimationKey | null = null;

  constructor(private readonly config: LevelConfig) {
    super(config.key);
  }

  init(): void {
    const services = this.registry.get('services') as Services | undefined;

    if (!services) {
      throw new Error('FinalLevelScene requires services.');
    }

    this.#services = services;
  }

  create(): void {
    this.#services.events.emit('scene:ready', { key: this.config.key });
    this.#resetState();

    this.physics.world.setBounds(0, 0, this.config.worldWidth, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.config.worldWidth, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor('#232421');

    this.#createAnimations();
    this.#createMap();
    this.#createPlayer();
    this.#createEnemies();
    this.#createTraps();
    this.#createBoss();
    this.#createControls();
    this.#connectPhysics();
    this.#configureCamera();
  }

  override update(time: number): void {
    if (this.#isDead || this.#isCompleting) {
      this.#playerBody.setAccelerationX(0);
      this.#playerBody.setVelocityX(0);
      return;
    }

    const grounded = this.#playerBody.blocked.down;
    if (grounded) {
      this.#lastGroundedAt = time;
      this.#jumpCount = 0;
      this.#playerBody.setMaxVelocity(MOVE_SPEED, 900);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.#keys.up) ||
      Phaser.Input.Keyboard.JustDown(this.#keys.space)
    ) {
      this.#jumpBufferedAt = time;
    }

    const horizontal = this.#getHorizontalInput();
    const lockedByHit = time < this.#hitUntil;

    if (lockedByHit) {
      this.#playerBody.setAccelerationX(0);
      this.#playerBody.setVelocityX(0);
    } else {
      this.#move(horizontal);
      this.#tryJump(time);
      this.#tryAttack();
    }

    for (const enemy of this.#enemies) {
      enemy.update(time);
    }
    for (const trap of this.#traps) {
      trap.update(time, this.#player);
    }
    this.#boss?.update(time);

    this.#updateAnimation(time, horizontal, grounded);
    this.#updateCameraLookAhead();
  }

  #resetState(): void {
    this.#playerHp = PLAYER_MAX_HP;
    this.#jumpCount = 0;
    this.#lastGroundedAt = 0;
    this.#jumpBufferedAt = -Infinity;
    this.#hitUntil = 0;
    this.#playerHurtUntil = 0;
    this.#attackReadyAt = 0;
    this.#isAttacking = false;
    this.#isDead = false;
    this.#isCompleting = false;
    this.#comboHits = 0;
    this.#attackHitTargets.clear();
    this.#currentAnimation = null;
    this.#enemies = [];
    this.#traps = [];
    this.#boss = null;
  }

  #createAnimations(): void {
    for (const [key, meta] of Object.entries(playerAnimationMeta) as [
      PlayerAnimationKey,
      (typeof playerAnimationMeta)[PlayerAnimationKey]
    ][]) {
      this.#createAnimation(
        `player.${key}`,
        `player.${key}`,
        meta.frames,
        meta.frameRate,
        meta.repeat
      );
    }

    for (const enemyType of enemyTypes) {
      for (const state of enemyAnimationStates) {
        const definition = enemyDefinitions[enemyType].animations[state];
        this.#createAnimation(
          getEnemyAnimationKey(enemyType, state),
          getEnemyAnimationKey(enemyType, state),
          definition.frames,
          definition.frameRate,
          definition.repeat
        );
      }
    }

    for (const trapType of trapTypes) {
      const definition = trapDefinitions[trapType];
      const key = getTrapAnimationKey(trapType);
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(definition.key, {
            start: 0,
            end: definition.frames - 1
          }),
          duration: definition.durationMs,
          repeat: definition.repeat
        });
      }
    }

    for (const state of bossAnimationStates) {
      const definition = bossAnimationDefinitions[state];
      this.#createAnimation(
        getBossAnimationKey(state),
        getBossAnimationKey(state),
        definition.frames,
        definition.frameRate,
        definition.repeat
      );
    }
  }

  #createAnimation(
    key: string,
    sheetKey: string,
    frames: number,
    frameRate: number,
    repeat: number
  ): void {
    if (this.anims.exists(key)) {
      return;
    }

    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(sheetKey, {
        start: 0,
        end: frames - 1
      }),
      frameRate,
      repeat
    });
  }

  #createMap(): void {
    this.add
      .rectangle(0, 0, this.config.worldWidth, WORLD_HEIGHT, 0x232421)
      .setOrigin(0, 0)
      .setDepth(-20);
    this.#platforms = this.physics.add.staticGroup();

    for (const terrain of this.config.terrain) {
      this.#addTerrain(terrain);
    }

    this.add.text(96, 500, this.config.title, worldTextStyle()).setAlpha(0.7);
    this.#createTutorial();
    this.#createFinish();

    this.#statusText = this.add
      .text(18, 18, '', {
        color: '#f2f6ee',
        fontFamily: 'monospace',
        fontSize: '14px'
      })
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0);
  }

  #addTerrain(terrain: Terrain): void {
    const definition = terrainDefinitions[terrain.kind];
    const image = this.add.image(terrain.x, terrain.y, definition.key).setOrigin(0, 0).setDepth(5);
    image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    image.setData('terrainKind', terrain.kind);
    this.#platforms.add(image);

    const body = image.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(definition.width - definition.collisionInsetX * 2, definition.height);
    body.setOffset(definition.collisionInsetX, definition.contactOffsetY);
    body.updateFromGameObject();
  }

  #createTutorial(): void {
    if (this.config.tutorial === undefined) {
      return;
    }

    for (const prompt of this.config.tutorial) {
      const text = this.add.text(prompt.x, prompt.y, prompt.text, {
        color: '#dcebd2',
        fontFamily: 'monospace',
        fontSize: '22px'
      });
      text.setDepth(1).setAlpha(0.82);
      this.tweens.add({
        targets: text,
        alpha: 0,
        delay: 4_500,
        duration: 900
      });
    }
  }

  #createFinish(): void {
    const finishX = this.config.worldWidth - 420;
    this.add.rectangle(finishX, 500, 16, 76, 0x9fff4a).setOrigin(0.5, 1).setDepth(10);
    this.add
      .triangle(finishX + 35, 452, 0, 0, 58, 18, 0, 36, 0x9fff4a)
      .setOrigin(0.5, 0.5)
      .setDepth(10);
    this.add.text(finishX - 52, 468, this.config.finishLabel, worldTextStyle()).setDepth(10);
    this.#finish = this.add.zone(finishX, 480, 150, 170);
    this.physics.add.existing(this.#finish, true);
  }

  #createPlayer(): void {
    this.#player = this.physics.add
      .sprite(145, PLAYER_SPAWN_Y, 'player.idle', 0)
      .setOrigin(0.5, 1)
      .setScale(PLAYER_SCALE)
      .setDepth(30);
    this.#player.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.#playerBody = this.#player.body as Phaser.Physics.Arcade.Body;
    this.#playerBody.setSize(19, 38);
    this.#playerBody.setOffset(45, 42);
    this.#playerBody.setMaxVelocity(MOVE_SPEED, 900);
    this.#playerBody.setDragX(MOVE_ACCELERATION);

    this.#playAnimation('idle');
  }

  #createEnemies(): void {
    this.#enemies = this.config.enemies.map((spawn) => new Enemy(this, spawn, this.#player));
  }

  #createTraps(): void {
    this.#traps = this.config.traps.map((spawn) => new Trap(this, spawn));
  }

  #createBoss(): void {
    const arena = this.config.bossArena;
    if (arena === undefined) {
      return;
    }

    this.#boss = new Boss(this, this.#player, arena.bossX, GROUND_SURFACE_Y, {
      left: arena.left,
      right: arena.right,
      groundY: GROUND_SURFACE_Y,
      ceilingY: arena.ceilingY
    });
  }

  #createControls(): void {
    if (!this.input.keyboard) {
      throw new Error('FinalLevelScene requires keyboard input.');
    }

    this.#keys = this.input.keyboard.addKeys({
      ...this.input.keyboard.createCursorKeys(),
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      x: Phaser.Input.Keyboard.KeyCodes.X,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    }) as FinalLevelControls;
  }

  #connectPhysics(): void {
    this.physics.add.collider(
      this.#player,
      this.#platforms,
      () => this.#handlePlatformContact(),
      (_player, platformBody) => this.#canPlayerCollideWithPlatform(platformBody),
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

    if (this.#boss) {
      this.physics.add.overlap(this.#player, this.#boss.sprite, () => this.#handleBossOverlap());
    }

    this.physics.add.overlap(this.#player, this.#finish, () => this.#tryCompleteLevel());
  }

  #configureCamera(): void {
    this.cameras.main.startFollow(this.#player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(
      1280 * gameplayConfig.camera.deadZoneWidthRatio,
      720 * gameplayConfig.camera.deadZoneHeightRatio
    );
    if (this.config.key === SceneKey.FinalBoss) {
      this.cameras.main.setZoom(1 - gameplayConfig.camera.bossZoomRatio);
    }
  }

  #canPlayerCollideWithPlatform(platform: unknown): boolean {
    const body = this.#bodyFromCollider(platform);
    if (!body) {
      return true;
    }

    const terrainKind = this.#terrainKindFromCollider(platform);
    if (terrainKind === 'ground') {
      return true;
    }

    const playerCenterX = this.#playerBody.center.x;
    const playerBottom = this.#playerBody.bottom;
    const isLandingOnTop = this.#playerBody.velocity.y >= 0 && playerBottom <= body.y + 18;

    return isLandingOnTop && playerCenterX >= body.x && playerCenterX <= body.x + body.width;
  }

  #bodyFromCollider(
    value: unknown
  ): Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null {
    if (this.#isArcadeBody(value)) {
      return value;
    }

    const candidate = value as { body?: unknown } | null;
    return this.#isArcadeBody(candidate?.body) ? candidate.body : null;
  }

  #terrainKindFromCollider(value: unknown): TerrainKind | undefined {
    const candidate = value as {
      gameObject?: { getData?: (key: string) => unknown };
      getData?: (key: string) => unknown;
    } | null;
    const terrainKind =
      candidate?.getData?.('terrainKind') ?? candidate?.gameObject?.getData?.('terrainKind');

    return terrainKind === 'ground' ||
      terrainKind === 'smallPlatform' ||
      terrainKind === 'vinePlatform'
      ? terrainKind
      : undefined;
  }

  #isArcadeBody(
    value: unknown
  ): value is Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody {
    return (
      typeof value === 'object' &&
      value !== null &&
      'x' in value &&
      'y' in value &&
      'width' in value &&
      'height' in value
    );
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

    if (
      horizontal !== this.#facing &&
      this.#playerBody.blocked.down &&
      Math.abs(this.#playerBody.velocity.x) > 20
    ) {
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
    this.#playerBody.setVelocityY(
      this.#jumpCount > 1 ? -JUMP_SPEED * DOUBLE_JUMP_MULTIPLIER : -JUMP_SPEED
    );
    this.#playAnimation(this.#jumpCount > 1 ? 'jumpInBetween' : 'jumpStart', true);
  }

  #tryAttack(): void {
    if (
      !Phaser.Input.Keyboard.JustDown(this.#keys.x) &&
      !Phaser.Input.Keyboard.JustDown(this.#keys.j)
    ) {
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

    const boss = this.#boss;
    if (
      boss &&
      !boss.isDead &&
      !this.#attackHitTargets.has(boss) &&
      Phaser.Geom.Intersects.RectangleToRectangle(attackZone, boss.sprite.getBounds())
    ) {
      const hit = this.#rollPlayerHit();
      const appliedDamage = boss.hurt(hit.damage, {
        critical: hit.isCritical,
        stagger: hit.stagger
      });
      this.#attackHitTargets.add(boss);
      if (appliedDamage > 0) {
        this.#applyHitStop();
      }
    }
  }

  #rollPlayerHit(): Readonly<{ damage: number; isCritical: boolean; stagger: number }> {
    this.#comboHits += 1;
    const isCritical = Math.random() < gameplayConfig.player.criticalChance;
    const damage = Math.round(
      PLAYER_ATTACK_DAMAGE *
        this.#comboMultiplier() *
        (isCritical ? gameplayConfig.player.criticalDamageMultiplier : 1)
    );

    return {
      damage,
      isCritical,
      stagger: isCritical ? CRITICAL_STAGGER : NORMAL_STAGGER
    };
  }

  #comboMultiplier(): number {
    const combo = gameplayConfig.player.comboMultipliers.find(
      ({ minHits, maxHits }) => this.#comboHits >= minHits && this.#comboHits <= maxHits
    );

    return combo?.multiplier ?? 1;
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
      this.#damagePlayer(gameplayConfig.enemy.damage, this.time.now, {
        sourceX: enemy.sprite.x,
        knockbackX: 90,
        knockbackY: -120
      });
    }
  }

  #handleBossOverlap(): void {
    const boss = this.#boss;
    if (!boss || boss.isDead || this.#isDead) {
      return;
    }

    if (this.#isAttacking) {
      this.#damageInRange();
      return;
    }

    if (this.time.now >= this.#playerHurtUntil) {
      this.#playerBody.setAcceleration(0, 0);
      this.#playerBody.setVelocity(0, 0);
      this.#damagePlayer(boss.activeAttackDamage, this.time.now, {
        sourceX: boss.sprite.x,
        knockbackX: gameplayConfig.boss.playerHitKnockbackX,
        knockbackY: gameplayConfig.boss.playerHitKnockbackY
      });
    }
  }

  #handleTrapHit(trap: Trap): void {
    if (this.#isDead || !trap.canDamage(this.time.now) || this.time.now < this.#playerHurtUntil) {
      return;
    }

    trap.markDamaged(this.time.now);
    const damage =
      trap.type === 'axe' ? gameplayConfig.traps.axe.damage : gameplayConfig.traps.spike.damage;
    this.#damagePlayer(damage, this.time.now, {
      knockbackX: trap.type === 'axe' ? 150 : 95,
      knockbackY: trap.type === 'axe' ? -155 : -125
    });
  }

  #damagePlayer(
    damage: number,
    time: number,
    knockback: Readonly<{ sourceX?: number; knockbackX: number; knockbackY: number }>
  ): void {
    this.#playerHp = Math.max(0, this.#playerHp - damage);
    this.#playerHurtUntil = time + PLAYER_HURT_LOCK_MS;
    this.#comboHits = 0;

    if (this.#playerHp <= 0) {
      this.#die();
      return;
    }

    this.#hit(time, knockback);
  }

  #hit(
    time: number,
    knockback: Readonly<{ sourceX?: number; knockbackX: number; knockbackY: number }>
  ): void {
    this.#hitUntil = time + HIT_LOCK_MS;
    const direction =
      knockback.sourceX === undefined ? -this.#facing : this.#player.x < knockback.sourceX ? -1 : 1;
    this.#playerBody.setAccelerationX(0);
    this.#playerBody.setVelocityX(direction * knockback.knockbackX);
    this.#playerBody.setVelocityY(knockback.knockbackY);
    this.#playAnimation('hit', true);
  }

  #die(): void {
    if (this.#isDead) {
      return;
    }

    this.#isDead = true;
    this.#playerBody.setVelocity(0, 0);
    this.#playerBody.setAccelerationX(0);
    this.#playerBody.setAllowGravity(false);
    this.#playAnimation('death', true);
    this.#statusText.setText('Restarting map').setAlpha(0.95);

    this.time.delayedCall(900, () => {
      this.tweens.add({
        targets: this.#player,
        alpha: 0,
        duration: gameplayConfig.player.deathFadeMs,
        onComplete: () => this.scene.restart()
      });
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

  #handlePlatformContact(): void {
    if (this.#playerBody.blocked.down) {
      this.#jumpCount = 0;
    }
  }

  #tryCompleteLevel(): void {
    if (this.#isCompleting) {
      return;
    }

    if (this.config.finishRequiresBossDeath && !this.#boss?.isDead) {
      return;
    }

    this.#isCompleting = true;
    this.#playerBody.setVelocity(0, 0);
    this.#playerBody.setAccelerationX(0);
    this.#statusText.setText(this.config.nextScene ? 'Loading next map' : 'Victory').setAlpha(0.95);
    this.cameras.main.fadeOut(650, 0, 0, 0);
    this.time.delayedCall(700, () => {
      if (this.config.nextScene) {
        this.scene.start(this.config.nextScene);
      } else {
        this.scene.restart();
      }
    });
  }

  #updateCameraLookAhead(): void {
    const lookAhead = 1280 * gameplayConfig.camera.lookAheadRatio;
    this.cameras.main.setFollowOffset(-this.#facing * lookAhead, 0);
  }

  #playAnimation(animation: PlayerAnimationKey, force = false): void {
    if (!force && this.#currentAnimation === animation) {
      return;
    }

    this.#currentAnimation = animation;
    this.#player.play(`player.${animation}`, true);

    if (animation === 'turnAround') {
      this.#player.once(
        Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'player.turnAround',
        () => {
          this.#currentAnimation = null;
        }
      );
    }
  }
}

export class Map1Scene extends FinalLevelScene {
  constructor() {
    super(map1Config);
  }
}

export class Map2Scene extends FinalLevelScene {
  constructor() {
    super(map2Config);
  }
}

export class Map3Scene extends FinalLevelScene {
  constructor() {
    super(map3Config);
  }
}

export class FinalBossScene extends FinalLevelScene {
  constructor() {
    super(finalBossConfig);
  }
}

function groundStrip(width: number): Terrain[] {
  const tiles: Terrain[] = [];
  for (let x = 0; x < width; x += 500) {
    tiles.push(platform('ground', x, GROUND_Y));
  }

  return tiles;
}

function platform(kind: TerrainKind, x: number, y: number): Terrain {
  return { kind, x, y };
}

function enemy(
  type: EnemyType,
  x: number,
  patrolLeft: number,
  patrolRight: number
): EnemySpawnConfig {
  return {
    type,
    x,
    y: GROUND_SURFACE_Y,
    patrolLeft,
    patrolRight
  };
}

function spike(x: number, delayMs = 0): TrapSpawnConfig {
  return {
    type: 'spike',
    x,
    anchorY: GROUND_SURFACE_Y,
    triggerWidth: 190,
    delayMs,
    cooldownMs: gameplayConfig.traps.spike.cooldownMs
  };
}

function axe(x: number, anchorY: number): TrapSpawnConfig {
  return {
    type: 'axe',
    x,
    anchorY,
    triggerWidth: 260,
    triggerHeight: 230,
    cooldownMs: gameplayConfig.traps.axe.cooldownMs,
    delayMs: gameplayConfig.traps.axe.activationDelayMs
  };
}

function worldTextStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    color: '#dfe8d6',
    fontFamily: 'monospace',
    fontSize: '14px'
  };
}
