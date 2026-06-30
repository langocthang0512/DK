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

type HealthBar = {
  target: Enemy | Boss;
  graphics: Phaser.GameObjects.Graphics;
  maxHealth: number;
  width: number;
  yOffset: number;
  displayedRatio: number;
};

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
  worldWidth: 20_500,
  nextScene: SceneKey.Map2,
  finishLabel: 'MAP 2',
  terrain: [
    ...groundStrip(20_500),
    platform('smallPlatform', 2_000, 425),
    platform('vinePlatform', 2_480, 365),
    platform('smallPlatform', 3_050, 310),
    platform('smallPlatform', 4_620, 420),
    platform('vinePlatform', 5_050, 355),
    platform('smallPlatform', 6_500, 405),
    platform('smallPlatform', 6_920, 340),
    platform('vinePlatform', 8_150, 390),
    platform('smallPlatform', 9_020, 330),
    platform('vinePlatform', 10_750, 400),
    platform('smallPlatform', 11_300, 340),
    platform('vinePlatform', 13_260, 390),
    platform('smallPlatform', 14_150, 330),
    platform('vinePlatform', 16_500, 395),
    platform('smallPlatform', 17_300, 335)
  ],
  enemies: [
    enemy('snake', 2_720, 2_420, 3_050),
    enemyAt('snake', 3_130, smallSurface(310), 3_060, 3_250),
    enemy('hyena', 4_050, 3_720, 4_380),
    enemy('snake', 5_700, 5_400, 6_020),
    enemyAt('scorpio', 6_995, smallSurface(340), 6_920, 7_080),
    enemy('snake', 7_750, 7_420, 8_060),
    enemyAt('hyena', 8_260, vineSurface(390), 8_170, 8_360),
    enemy('snake', 9_700, 9_360, 10_040),
    enemyAt('snake', 11_390, smallSurface(340), 11_310, 11_470),
    enemy('scorpio', 12_320, 11_980, 12_650),
    enemyAt('hyena', 13_380, vineSurface(390), 13_270, 13_500),
    enemy('snake', 14_950, 14_620, 15_290),
    enemy('hyena', 16_050, 15_720, 16_380),
    enemyAt('snake', 16_620, vineSurface(395), 16_520, 16_760),
    enemyAt('scorpio', 17_380, smallSurface(335), 17_300, 17_460),
    enemy('snake', 18_650, 18_320, 18_980)
  ],
  traps: [
    spike(3_800),
    axe(5_130, platformBottom('vinePlatform', 355)),
    spikeAt(5_070, vineSurface(355), 180),
    spike(6_100, 130),
    spikeAt(6_990, smallSurface(340)),
    axe(8_260, platformBottom('vinePlatform', 390)),
    spike(9_450),
    spikeAt(11_360, smallSurface(340), 120),
    axe(13_370, platformBottom('vinePlatform', 390)),
    spike(15_400),
    spikeAt(17_360, smallSurface(335), 180)
  ],
  tutorial: [
    { text: 'MOVE', x: 620, y: 486 },
    { text: 'JUMP', x: 1_850, y: 486 },
    { text: 'ATTACK', x: 3_450, y: 486 }
  ]
};

const map2Config: LevelConfig = {
  key: SceneKey.Map2,
  title: 'MAP 2 - RUIN CROSSING',
  worldWidth: 22_500,
  nextScene: SceneKey.Map3,
  finishLabel: 'MAP 3',
  terrain: [
    ...groundStrip(22_500),
    platform('smallPlatform', 1_850, 420),
    platform('vinePlatform', 2_350, 360),
    platform('smallPlatform', 3_450, 405),
    platform('vinePlatform', 3_980, 345),
    platform('smallPlatform', 5_200, 415),
    platform('smallPlatform', 5_720, 350),
    platform('vinePlatform', 7_100, 390),
    platform('smallPlatform', 7_650, 330),
    platform('vinePlatform', 9_150, 405),
    platform('smallPlatform', 9_720, 345),
    platform('vinePlatform', 11_250, 385),
    platform('smallPlatform', 11_820, 330),
    platform('vinePlatform', 13_650, 395),
    platform('smallPlatform', 14_250, 335),
    platform('vinePlatform', 16_250, 395),
    platform('smallPlatform', 16_850, 335),
    platform('vinePlatform', 18_750, 390),
    platform('smallPlatform', 19_350, 330)
  ],
  enemies: [
    enemy('hyena', 2_760, 2_420, 3_100),
    enemyAt('snake', 3_520, smallSurface(405), 3_450, 3_610),
    enemy('scorpio', 4_760, 4_420, 5_100),
    enemyAt('hyena', 5_820, smallSurface(350), 5_720, 5_930),
    enemy('snake', 6_480, 6_160, 6_820),
    enemyAt('scorpio', 7_220, vineSurface(390), 7_120, 7_350),
    enemy('hyena', 8_480, 8_140, 8_820),
    enemyAt('scorpio', 9_800, smallSurface(345), 9_720, 9_900),
    enemy('hyena', 10_650, 10_320, 10_980),
    enemyAt('snake', 11_900, smallSurface(330), 11_820, 12_000),
    enemy('scorpio', 12_620, 12_280, 12_960),
    enemyAt('hyena', 13_760, vineSurface(395), 13_660, 13_910),
    enemy('scorpio', 14_900, 14_560, 15_240),
    enemy('hyena', 15_720, 15_390, 16_040),
    enemyAt('scorpio', 16_360, vineSurface(395), 16_260, 16_500),
    enemyAt('hyena', 16_930, smallSurface(335), 16_850, 17_080),
    enemy('snake', 17_980, 17_640, 18_320),
    enemyAt('scorpio', 18_860, vineSurface(390), 18_760, 19_000),
    enemy('hyena', 19_940, 19_600, 20_280),
    enemy('scorpio', 20_650, 20_320, 20_980)
  ],
  traps: [
    spike(2_980),
    axe(3_560, platformBottom('smallPlatform', 405)),
    spikeAt(3_520, smallSurface(405), 140),
    spike(4_380, 160),
    axe(5_830, platformBottom('smallPlatform', 350)),
    spike(6_900),
    axe(7_220, platformBottom('vinePlatform', 390)),
    spikeAt(7_170, vineSurface(390), 180),
    spike(8_920, 130),
    axe(9_820, platformBottom('smallPlatform', 345)),
    spikeAt(9_790, smallSurface(345)),
    spike(11_020),
    axe(11_910, platformBottom('smallPlatform', 330)),
    spike(12_900, 180),
    axe(13_770, platformBottom('vinePlatform', 395)),
    spikeAt(13_730, vineSurface(395), 100),
    spike(15_350),
    axe(16_360, platformBottom('vinePlatform', 395)),
    spikeAt(16_330, vineSurface(395), 180),
    axe(18_870, platformBottom('vinePlatform', 390)),
    spike(20_240, 150)
  ]
};

const map3Config: LevelConfig = {
  key: SceneKey.Map3,
  title: 'MAP 3 - FINAL ASCENT',
  worldWidth: 24_500,
  nextScene: SceneKey.Map4,
  finishLabel: 'MAP 4',
  terrain: [
    ...groundStrip(24_500),
    platform('smallPlatform', 1_700, 420),
    platform('vinePlatform', 2_200, 360),
    platform('smallPlatform', 2_760, 305),
    platform('smallPlatform', 4_150, 410),
    platform('vinePlatform', 4_650, 350),
    platform('smallPlatform', 5_200, 292),
    platform('smallPlatform', 6_600, 425),
    platform('smallPlatform', 7_080, 360),
    platform('vinePlatform', 7_560, 305),
    platform('vinePlatform', 9_150, 395),
    platform('smallPlatform', 9_700, 335),
    platform('smallPlatform', 10_200, 285),
    platform('vinePlatform', 11_900, 385),
    platform('smallPlatform', 12_480, 330),
    platform('vinePlatform', 14_350, 395),
    platform('smallPlatform', 14_930, 335),
    platform('vinePlatform', 16_700, 390),
    platform('smallPlatform', 17_280, 330),
    platform('vinePlatform', 19_050, 385),
    platform('smallPlatform', 19_650, 325),
    platform('vinePlatform', 21_250, 380),
    platform('smallPlatform', 21_860, 320)
  ],
  enemies: [
    enemy('snake', 2_950, 2_620, 3_280),
    enemyAt('vulture', 4_740, vineSurface(350), 4_660, 4_860),
    enemy('hyena', 5_840, 5_500, 6_180),
    enemyAt('scorpio', 7_170, smallSurface(360), 7_080, 7_260),
    enemy('vulture', 8_220, 7_880, 8_560),
    enemyAt('vulture', 9_280, vineSurface(395), 9_160, 9_420),
    enemy('scorpio', 10_900, 10_560, 11_240),
    enemyAt('hyena', 12_560, smallSurface(330), 12_480, 12_680),
    enemy('vulture', 13_450, 13_100, 13_780),
    enemyAt('scorpio', 14_450, vineSurface(395), 14_360, 14_560),
    enemy('hyena', 15_650, 15_320, 15_980),
    enemyAt('vulture', 16_820, vineSurface(390), 16_710, 16_960),
    enemy('snake', 17_900, 17_560, 18_230),
    enemyAt('scorpio', 19_150, vineSurface(385), 19_060, 19_270),
    enemy('vulture', 20_150, 19_820, 20_480),
    enemyAt('vulture', 21_390, vineSurface(380), 21_260, 21_520),
    enemy('scorpio', 22_300, 21_960, 22_640)
  ],
  traps: [
    spike(2_520),
    axe(2_300, platformBottom('vinePlatform', 360)),
    spikeAt(2_260, vineSurface(360), 150),
    spike(3_680, 180),
    axe(4_750, platformBottom('vinePlatform', 350)),
    spikeAt(4_700, vineSurface(350)),
    spike(5_980),
    axe(7_180, platformBottom('smallPlatform', 360)),
    spikeAt(7_150, smallSurface(360), 140),
    spike(8_650),
    axe(9_270, platformBottom('vinePlatform', 395)),
    spikeAt(9_230, vineSurface(395)),
    spike(10_750, 120),
    axe(12_560, platformBottom('smallPlatform', 330)),
    spikeAt(12_530, smallSurface(330), 160),
    spike(13_850),
    axe(14_460, platformBottom('vinePlatform', 395)),
    spike(15_900, 180),
    axe(16_820, platformBottom('vinePlatform', 390)),
    spikeAt(16_780, vineSurface(390)),
    spike(18_400),
    axe(19_160, platformBottom('vinePlatform', 385)),
    spike(20_680, 130),
    axe(21_400, platformBottom('vinePlatform', 380)),
    spikeAt(21_360, vineSurface(380), 180)
  ]
};

const map4Config: LevelConfig = {
  key: SceneKey.Map4,
  title: 'MAP 4 - FINAL BOSS',
  worldWidth: 6_800,
  finishLabel: 'VICTORY',
  finishRequiresBossDeath: true,
  terrain: [
    ...groundStrip(6_800),
    platform('vinePlatform', 2_220, 395),
    platform('smallPlatform', 3_020, 340),
    platform('vinePlatform', 3_900, 390),
    platform('smallPlatform', 4_760, 335)
  ],
  enemies: [],
  traps: [],
  bossArena: {
    bossX: 4_900,
    left: 1_400,
    right: 6_250,
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
  #playerHpText!: Phaser.GameObjects.Text;
  #enemies: Enemy[] = [];
  #traps: Trap[] = [];
  #boss: Boss | null = null;
  #healthBars: HealthBar[] = [];
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
    this.#createHealthBars();
    this.#createHud();
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
    this.#updateHealthBars();
    this.#updateHud();

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
    this.#healthBars = [];
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

  #createHud(): void {
    this.add
      .text(18, 16, 'DRAGON KNIGHT', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '22px',
        stroke: '#121512',
        strokeThickness: 5
      })
      .setScrollFactor(0)
      .setDepth(500);

    this.#playerHpText = this.add
      .text(20, 44, '', {
        color: '#8df45a',
        fontFamily: 'monospace',
        fontSize: '15px',
        stroke: '#121512',
        strokeThickness: 4
      })
      .setScrollFactor(0)
      .setDepth(500);
    this.#updateHud();
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

  #createHealthBars(): void {
    this.#healthBars = this.#enemies.map((enemy) => ({
      target: enemy,
      graphics: this.add.graphics().setDepth(60),
      maxHealth: enemy.definition.health,
      width: Phaser.Math.Clamp(enemy.sprite.displayWidth * 0.7, 32, 86),
      yOffset: enemy.sprite.displayHeight + 16,
      displayedRatio: 1
    }));

    if (this.#boss) {
      this.#healthBars.push({
        target: this.#boss,
        graphics: this.add.graphics().setDepth(60),
        maxHealth: gameplayConfig.boss.hp,
        width: Phaser.Math.Clamp(this.#boss.sprite.displayWidth * 0.72, 160, 320),
        yOffset: this.#boss.sprite.displayHeight + 24,
        displayedRatio: 1
      });
    }
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
      this.physics.add.overlap(this.#player, trap.trigger, () => this.#handleTrapTrigger(trap));
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
    if (this.config.key === SceneKey.Map4) {
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

  #handleTrapTrigger(trap: Trap): void {
    trap.triggerTrap(this.time.now);

    if (trap.type !== 'spike' || this.#isDead || this.time.now < this.#playerHurtUntil) {
      return;
    }

    if (trap.canTriggerDamage(this.time.now)) {
      trap.markDamaged(this.time.now);
      this.#damagePlayer(gameplayConfig.traps.spike.damage, this.time.now, {
        knockbackX: 95,
        knockbackY: -125
      });
    }
  }

  #updateHud(): void {
    this.#playerHpText.setText(`HP ${String(this.#playerHp)} / ${String(PLAYER_MAX_HP)}`);
  }

  #updateHealthBars(): void {
    for (const bar of this.#healthBars) {
      const sprite = bar.target.sprite;
      if (bar.target.isDead || !sprite.active) {
        bar.graphics.clear();
        continue;
      }

      const ratio = Phaser.Math.Clamp(bar.target.health / bar.maxHealth, 0, 1);
      bar.displayedRatio = Phaser.Math.Linear(bar.displayedRatio, ratio, 0.16);
      const x = sprite.x - bar.width * 0.5;
      const y = sprite.y - bar.yOffset;
      bar.graphics.clear();
      bar.graphics.fillStyle(0x101410, 0.86);
      bar.graphics.fillRect(x - 2, y - 2, bar.width + 4, 8);
      bar.graphics.fillStyle(0x63e84a, 1);
      bar.graphics.fillRect(x, y, bar.width * bar.displayedRatio, 4);
    }
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

export class Map4Scene extends FinalLevelScene {
  constructor() {
    super(map4Config);
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

function enemyAt(
  type: EnemyType,
  x: number,
  y: number,
  patrolLeft: number,
  patrolRight: number
): EnemySpawnConfig {
  return {
    type,
    x,
    y,
    patrolLeft,
    patrolRight
  };
}

function spike(x: number, delayMs = 0): TrapSpawnConfig {
  return spikeAt(x, GROUND_SURFACE_Y, delayMs);
}

function spikeAt(x: number, anchorY: number, delayMs = 0): TrapSpawnConfig {
  return {
    type: 'spike',
    x,
    anchorY,
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

function smallSurface(y: number): number {
  return platformSurface('smallPlatform', y);
}

function vineSurface(y: number): number {
  return platformSurface('vinePlatform', y);
}

function platformSurface(kind: TerrainKind, y: number): number {
  return y + terrainDefinitions[kind].contactOffsetY;
}

function platformBottom(kind: TerrainKind, y: number): number {
  return y + terrainDefinitions[kind].contactOffsetY + 6;
}

function worldTextStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    color: '#dfe8d6',
    fontFamily: 'monospace',
    fontSize: '14px'
  };
}
