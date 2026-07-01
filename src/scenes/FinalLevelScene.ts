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
  escape: Phaser.Input.Keyboard.Key;
  p: Phaser.Input.Keyboard.Key;
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
const PLAYER_ATTACK_ACTIVE_MS = 260;
const PLAYER_ATTACK_RANGE = 92;
const NORMAL_STAGGER = 25;
const CRITICAL_STAGGER = 40;
const HEALTH_BAR_GAP = 5;
const PLAYER_BODY_OFFSET_Y = 37;
const ENEMY_HIT_KNOCKBACK_X = 0;
const ENEMY_HIT_KNOCKBACK_Y = 0;
const BOSS_HIT_KNOCKBACK_X = 0;
const BOSS_HIT_KNOCKBACK_Y = 0;
const COMBAT_STABILITY_MS = 450;
const COMBAT_MAX_FRAME_DELTA_X = 48;
const COMBAT_MAX_FRAME_DELTA_Y = 80;
const COMBAT_MAX_VELOCITY_X = MOVE_SPEED;
const COMBAT_MAX_VELOCITY_Y = 900;
const enemyAttackDamage = {
  snake: 5,
  hyena: 10,
  scorpio: 10,
  vulture: 10
} as const satisfies Record<EnemyType, number>;

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
    platform('smallPlatform', 3_650, 405),
    platform('smallPlatform', 4_620, 420),
    platform('vinePlatform', 5_050, 355),
    platform('smallPlatform', 5_720, 300),
    platform('smallPlatform', 6_500, 405),
    platform('smallPlatform', 6_920, 340),
    platform('smallPlatform', 7_460, 370),
    platform('vinePlatform', 8_150, 390),
    platform('smallPlatform', 9_020, 330),
    platform('smallPlatform', 9_850, 365),
    platform('vinePlatform', 10_750, 400),
    platform('smallPlatform', 11_300, 340),
    platform('smallPlatform', 12_050, 410),
    platform('vinePlatform', 13_260, 390),
    platform('smallPlatform', 14_150, 330),
    platform('smallPlatform', 15_250, 365),
    platform('vinePlatform', 16_500, 395),
    platform('smallPlatform', 17_300, 335),
    platform('smallPlatform', 18_050, 405)
  ],
  enemies: [
    enemy('snake', 2_720, 2_420, 3_050),
    enemy('snake', 3_130, 2_980, 3_300),
    enemy('hyena', 4_050, 3_720, 4_380),
    enemy('snake', 5_700, 5_400, 6_020),
    enemy('scorpio', 7_020, 6_820, 7_250),
    enemy('snake', 7_750, 7_420, 8_060),
    enemy('snake', 8_260, 8_050, 8_470),
    enemy('snake', 9_700, 9_360, 10_040),
    enemy('snake', 11_420, 11_210, 11_640),
    enemy('scorpio', 12_320, 11_980, 12_650),
    enemy('snake', 13_380, 13_140, 13_620),
    enemy('snake', 14_950, 14_620, 15_290),
    enemy('hyena', 16_050, 15_720, 16_380),
    enemy('snake', 16_620, 16_430, 16_850),
    enemy('scorpio', 17_420, 17_240, 17_650),
    enemy('snake', 18_650, 18_320, 18_980)
  ],
  traps: [
    spike(3_800),
    axe(5_130, platformBottom('vinePlatform', 355)),
    spikeOnPlatform('vinePlatform', 5_050, 355, 180),
    spike(6_100, 130),
    spikeOnPlatform('smallPlatform', 6_920, 340),
    axe(8_260, platformBottom('vinePlatform', 390)),
    spike(9_450),
    spikeOnPlatform('smallPlatform', 11_300, 340, 120),
    axe(13_370, platformBottom('vinePlatform', 390)),
    spike(15_400),
    spikeOnPlatform('smallPlatform', 17_300, 335, 180)
  ],
  tutorial: [
    { text: 'Arrow Keys to Move', x: 650, y: 205 },
    { text: 'Up Arrow to Jump', x: 650, y: 295 },
    { text: 'J to Attack', x: 650, y: 385 }
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
    platform('smallPlatform', 2_920, 315),
    platform('smallPlatform', 3_450, 405),
    platform('vinePlatform', 3_980, 345),
    platform('smallPlatform', 5_200, 415),
    platform('smallPlatform', 5_720, 350),
    platform('smallPlatform', 6_340, 300),
    platform('vinePlatform', 7_100, 390),
    platform('smallPlatform', 7_650, 330),
    platform('smallPlatform', 8_360, 370),
    platform('vinePlatform', 9_150, 405),
    platform('smallPlatform', 9_720, 345),
    platform('vinePlatform', 11_250, 385),
    platform('smallPlatform', 11_820, 330),
    platform('smallPlatform', 12_520, 370),
    platform('vinePlatform', 13_650, 395),
    platform('smallPlatform', 14_250, 335),
    platform('smallPlatform', 15_150, 390),
    platform('vinePlatform', 16_250, 395),
    platform('smallPlatform', 16_850, 335),
    platform('smallPlatform', 17_600, 380),
    platform('vinePlatform', 18_750, 390),
    platform('smallPlatform', 19_350, 330),
    platform('smallPlatform', 20_100, 385)
  ],
  enemies: [
    enemy('hyena', 2_760, 2_420, 3_100),
    enemy('snake', 3_520, 3_320, 3_740),
    enemy('scorpio', 4_760, 4_420, 5_100),
    enemy('snake', 5_820, 5_620, 6_040),
    enemy('snake', 6_480, 6_160, 6_820),
    enemy('scorpio', 7_220, 7_020, 7_450),
    enemy('hyena', 8_480, 8_140, 8_820),
    enemy('scorpio', 9_800, 9_600, 10_020),
    enemy('hyena', 10_650, 10_320, 10_980),
    enemy('snake', 11_900, 11_700, 12_120),
    enemy('scorpio', 12_620, 12_280, 12_960),
    enemy('hyena', 13_760, 13_560, 13_980),
    enemy('scorpio', 14_900, 14_560, 15_240),
    enemy('hyena', 15_720, 15_390, 16_040),
    enemy('scorpio', 16_360, 16_160, 16_580),
    enemy('snake', 16_930, 16_730, 17_150),
    enemy('snake', 17_980, 17_640, 18_320),
    enemy('scorpio', 18_860, 18_660, 19_080),
    enemy('hyena', 19_940, 19_600, 20_280),
    enemy('scorpio', 20_650, 20_320, 20_980)
  ],
  traps: [
    spike(2_980),
    axe(3_560, platformBottom('smallPlatform', 405)),
    spikeOnPlatform('smallPlatform', 3_450, 405, 140),
    spike(4_380, 160),
    axe(5_830, platformBottom('smallPlatform', 350)),
    spike(6_900),
    axe(7_220, platformBottom('vinePlatform', 390)),
    spikeOnPlatform('vinePlatform', 7_100, 390, 180),
    spike(8_920, 130),
    axe(9_820, platformBottom('smallPlatform', 345)),
    spikeOnPlatform('smallPlatform', 9_720, 345),
    spike(11_020),
    axe(11_910, platformBottom('smallPlatform', 330)),
    spike(12_900, 180),
    axe(13_770, platformBottom('vinePlatform', 395)),
    spikeOnPlatform('vinePlatform', 13_650, 395, 100),
    spike(15_350),
    axe(16_360, platformBottom('vinePlatform', 395)),
    spikeOnPlatform('vinePlatform', 16_250, 395, 180),
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
    platform('smallPlatform', 3_420, 365),
    platform('smallPlatform', 4_150, 410),
    platform('vinePlatform', 4_650, 350),
    platform('smallPlatform', 5_200, 292),
    platform('smallPlatform', 5_900, 380),
    platform('smallPlatform', 6_600, 425),
    platform('smallPlatform', 7_080, 360),
    platform('vinePlatform', 7_560, 305),
    platform('smallPlatform', 8_250, 370),
    platform('vinePlatform', 9_150, 395),
    platform('smallPlatform', 9_700, 335),
    platform('smallPlatform', 10_200, 285),
    platform('smallPlatform', 10_950, 370),
    platform('vinePlatform', 11_900, 385),
    platform('smallPlatform', 12_480, 330),
    platform('smallPlatform', 13_260, 385),
    platform('vinePlatform', 14_350, 395),
    platform('smallPlatform', 14_930, 335),
    platform('smallPlatform', 15_700, 385),
    platform('vinePlatform', 16_700, 390),
    platform('smallPlatform', 17_280, 330),
    platform('smallPlatform', 18_050, 385),
    platform('vinePlatform', 19_050, 385),
    platform('smallPlatform', 19_650, 325),
    platform('smallPlatform', 20_450, 380),
    platform('vinePlatform', 21_250, 380),
    platform('smallPlatform', 21_860, 320)
  ],
  enemies: [
    enemy('snake', 2_950, 2_620, 3_280),
    enemy('vulture', 4_740, 4_540, 4_970),
    enemy('hyena', 5_840, 5_500, 6_180),
    enemy('scorpio', 7_170, 6_970, 7_390),
    enemy('vulture', 8_220, 7_880, 8_560),
    enemy('vulture', 9_280, 9_080, 9_510),
    enemy('scorpio', 10_900, 10_560, 11_240),
    enemy('hyena', 12_560, 12_360, 12_790),
    enemy('vulture', 13_450, 13_100, 13_780),
    enemy('scorpio', 14_450, 14_250, 14_670),
    enemy('hyena', 15_650, 15_320, 15_980),
    enemy('vulture', 16_820, 16_620, 17_050),
    enemy('snake', 17_900, 17_560, 18_230),
    enemy('scorpio', 19_150, 18_950, 19_370),
    enemy('vulture', 20_150, 19_820, 20_480),
    enemy('vulture', 21_390, 21_190, 21_620),
    enemy('scorpio', 22_300, 21_960, 22_640)
  ],
  traps: [
    spike(2_520),
    axe(2_300, platformBottom('vinePlatform', 360)),
    spikeOnPlatform('vinePlatform', 2_200, 360, 150),
    spike(3_680, 180),
    axe(4_750, platformBottom('vinePlatform', 350)),
    spikeOnPlatform('vinePlatform', 4_650, 350),
    spike(5_980),
    axe(7_180, platformBottom('smallPlatform', 360)),
    spikeOnPlatform('smallPlatform', 7_080, 360, 140),
    spike(8_650),
    axe(9_270, platformBottom('vinePlatform', 395)),
    spikeOnPlatform('vinePlatform', 9_150, 395),
    spike(10_750, 120),
    axe(12_560, platformBottom('smallPlatform', 330)),
    spikeOnPlatform('smallPlatform', 12_480, 330, 160),
    spike(13_850),
    axe(14_460, platformBottom('vinePlatform', 395)),
    spike(15_900, 180),
    axe(16_820, platformBottom('vinePlatform', 390)),
    spikeOnPlatform('vinePlatform', 16_700, 390),
    spike(18_400),
    axe(19_160, platformBottom('vinePlatform', 385)),
    spike(20_680, 130),
    axe(21_400, platformBottom('vinePlatform', 380)),
    spikeOnPlatform('vinePlatform', 21_250, 380, 180)
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
  #attackActiveUntil = 0;
  #isAttacking = false;
  #isDead = false;
  #isCompleting = false;
  #comboHits = 0;
  #attackHitTargets = new Set<Enemy | Boss>();
  #currentAnimation: PlayerAnimationKey | null = null;
  #combatStabilityUntil = 0;
  #lastPlayerX = 0;
  #lastPlayerY = 0;
  #hasPlayerPositionSample = false;

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
    this.events.off('resume');
    this.events.on('resume', () => {
      this.#resetPauseKeys();
    });
  }

  override update(time: number): void {
    if (this.#isDead || this.#isCompleting) {
      this.#playerBody.setAccelerationX(0);
      this.#playerBody.setVelocityX(0);
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.#keys.escape) ||
      Phaser.Input.Keyboard.JustDown(this.#keys.p)
    ) {
      this.#openPauseMenu();
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
    this.#refreshAttackState(time);
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
      this.#handleEnemyAttack(enemy);
    }
    for (const trap of this.#traps) {
      trap.update(time, this.#player);
    }
    this.#boss?.update(time);
    this.#updateHealthBars();
    this.#updateHud();
    this.#guardPlayerCombatStability(time);

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
    this.#attackActiveUntil = 0;
    this.#isAttacking = false;
    this.#isDead = false;
    this.#isCompleting = false;
    this.#comboHits = 0;
    this.#attackHitTargets.clear();
    this.#currentAnimation = null;
    this.#combatStabilityUntil = 0;
    this.#lastPlayerX = 0;
    this.#lastPlayerY = 0;
    this.#hasPlayerPositionSample = false;
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
        fontSize: '18px',
        stroke: '#111711',
        strokeThickness: 4
      });
      text.setDepth(1).setAlpha(0.82);
      this.#createTutorialKeys(prompt);
      this.tweens.add({
        targets: text,
        alpha: 0,
        delay: 8_000,
        duration: 900
      });
    }
  }

  #createTutorialKeys(prompt: TutorialPrompt): void {
    const labels = prompt.text.includes('Move')
      ? ['<', '>']
      : prompt.text.includes('Jump')
        ? ['^']
        : ['J'];
    const keyWidth = 30;
    const gap = 6;
    const totalWidth = labels.length * keyWidth + (labels.length - 1) * gap;
    const startX = prompt.x - totalWidth * 0.5 + keyWidth * 0.5;
    const y = prompt.y + 38;

    labels.forEach((label, index) => {
      const x = startX + index * (keyWidth + gap);
      const bg = this.add.graphics().setDepth(1).setAlpha(0.82);
      bg.fillStyle(0x07120f, 1);
      bg.fillRoundedRect(x - keyWidth * 0.5 - 2, y - 14, keyWidth + 4, 28, 3);
      bg.fillStyle(0x66c783, 1);
      bg.fillRoundedRect(x - keyWidth * 0.5, y - 12, keyWidth, 23, 3);
      bg.fillStyle(0x95ed9f, 0.9);
      bg.fillRect(x - keyWidth * 0.5 + 4, y - 9, keyWidth - 8, 2);

      const keyText = this.add
        .text(x, y - 1, label, {
          color: '#07120f',
          fontFamily: 'monospace',
          fontSize: '16px',
          fontStyle: 'bold'
        })
        .setOrigin(0.5, 0.5)
        .setDepth(1)
        .setAlpha(0.82);

      this.tweens.add({
        targets: [bg, keyText],
        alpha: 0,
        delay: 8_000,
        duration: 900
      });
    });
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
    this.#playerBody.setOffset(45, PLAYER_BODY_OFFSET_Y);
    this.#playerBody.setMaxVelocity(MOVE_SPEED, 900);
    this.#playerBody.setDragX(MOVE_ACCELERATION);
    this.#samplePlayerPosition();

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
      yOffset: enemy.sprite.displayHeight + HEALTH_BAR_GAP,
      displayedRatio: 1
    }));

    if (this.#boss) {
      this.#healthBars.push({
        target: this.#boss,
        graphics: this.add.graphics().setDepth(60),
        maxHealth: gameplayConfig.boss.hp,
        width: Phaser.Math.Clamp(this.#boss.sprite.displayWidth * 0.72, 160, 320),
        yOffset: this.#boss.sprite.displayHeight + HEALTH_BAR_GAP,
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
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      p: Phaser.Input.Keyboard.KeyCodes.P
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
    this.#attackActiveUntil = this.time.now + PLAYER_ATTACK_ACTIVE_MS;
    this.#attackHitTargets.clear();
    this.#isAttacking = true;
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
        this.#armCombatStability(this.time.now);
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
        this.#armCombatStability(this.time.now);
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
    this.#armCombatStability(this.time.now);
  }

  #handleEnemyOverlap(enemy: Enemy): void {
    if (enemy.isDead || this.#isDead) {
      return;
    }

    if (this.#isPlayerAttackActive()) {
      this.#damageInRange();
      return;
    }

    this.#handleEnemyAttack(enemy);
  }

  #handleEnemyAttack(enemy: Enemy): void {
    if (
      enemy.isDead ||
      this.#isDead ||
      this.time.now < this.#playerHurtUntil ||
      !enemy.tryApplyAttackHit(this.#player.getBounds())
    ) {
      return;
    }

    this.#damagePlayer(enemyAttackDamage[enemy.type], this.time.now, {
      sourceX: enemy.sprite.x,
      knockbackX: ENEMY_HIT_KNOCKBACK_X,
      knockbackY: ENEMY_HIT_KNOCKBACK_Y
    });
  }

  #handleBossOverlap(): void {
    const boss = this.#boss;
    if (!boss || boss.isDead || this.#isDead) {
      return;
    }

    if (this.#isPlayerAttackActive()) {
      this.#damageInRange();
      return;
    }

    if (this.time.now >= this.#playerHurtUntil) {
      this.#playerBody.setAcceleration(0, 0);
      this.#playerBody.setVelocity(0, 0);
      this.#damagePlayer(boss.activeAttackDamage, this.time.now, {
        sourceX: boss.sprite.x,
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

    if (
      trap.canTriggerDamage(this.time.now) &&
      Phaser.Geom.Intersects.RectangleToRectangle(this.#player.getBounds(), trap.hitbox.getBounds())
    ) {
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
    this.#isAttacking = false;
    this.#attackActiveUntil = 0;

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
    this.#armCombatStability(time);
    const direction =
      knockback.sourceX === undefined ? -this.#facing : this.#player.x < knockback.sourceX ? -1 : 1;
    this.#playerBody.setAcceleration(0, 0);
    this.#playerBody.setVelocity(
      direction * Phaser.Math.Clamp(knockback.knockbackX, 0, COMBAT_MAX_VELOCITY_X),
      Phaser.Math.Clamp(knockback.knockbackY, -COMBAT_MAX_VELOCITY_Y, COMBAT_MAX_VELOCITY_Y)
    );
    this.#playAnimation('hit', true);
  }

  #armCombatStability(time: number): void {
    this.#combatStabilityUntil = Math.max(this.#combatStabilityUntil, time + COMBAT_STABILITY_MS);
  }

  #guardPlayerCombatStability(time: number): void {
    if (!this.#hasPlayerPositionSample) {
      this.#samplePlayerPosition();
      return;
    }

    if (time > this.#combatStabilityUntil) {
      this.#samplePlayerPosition();
      return;
    }

    const deltaX = this.#player.x - this.#lastPlayerX;
    const deltaY = this.#player.y - this.#lastPlayerY;
    const clampedX =
      Math.abs(deltaX) > COMBAT_MAX_FRAME_DELTA_X
        ? this.#lastPlayerX + Math.sign(deltaX) * COMBAT_MAX_FRAME_DELTA_X
        : this.#player.x;
    const clampedY =
      Math.abs(deltaY) > COMBAT_MAX_FRAME_DELTA_Y
        ? this.#lastPlayerY + Math.sign(deltaY) * COMBAT_MAX_FRAME_DELTA_Y
        : this.#player.y;

    if (clampedX !== this.#player.x || clampedY !== this.#player.y) {
      this.#player.setPosition(clampedX, clampedY);
      this.#playerBody.reset(clampedX, clampedY);
    }

    this.#playerBody.setVelocity(
      Phaser.Math.Clamp(this.#playerBody.velocity.x, -COMBAT_MAX_VELOCITY_X, COMBAT_MAX_VELOCITY_X),
      Phaser.Math.Clamp(this.#playerBody.velocity.y, -COMBAT_MAX_VELOCITY_Y, COMBAT_MAX_VELOCITY_Y)
    );
    this.#samplePlayerPosition();
  }

  #samplePlayerPosition(): void {
    this.#lastPlayerX = this.#player.x;
    this.#lastPlayerY = this.#player.y;
    this.#hasPlayerPositionSample = true;
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
    if (
      this.#isPlayerAttackActive(time) ||
      time < this.#hitUntil ||
      this.#currentAnimation === 'turnAround'
    ) {
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
    const fadeMs = this.config.nextScene ? 650 : 1000;
    this.cameras.main.fadeOut(fadeMs, 0, 0, 0);
    this.time.delayedCall(fadeMs + 50, () => {
      if (this.config.nextScene) {
        this.scene.start(this.config.nextScene);
      } else {
        this.scene.start(SceneKey.Ending);
      }
    });
  }

  #openPauseMenu(): void {
    if (this.scene.isActive(SceneKey.PauseMenu)) {
      return;
    }

    this.#resetPauseKeys();
    this.scene.launch(SceneKey.PauseMenu, {
      parentScene: this.sys.settings.key
    });
    this.scene.bringToTop(SceneKey.PauseMenu);
    this.scene.pause(this.sys.settings.key);
  }

  #resetPauseKeys(): void {
    this.#keys.escape.reset();
    this.#keys.p.reset();
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

  #isPlayerAttackActive(time = this.time.now): boolean {
    this.#refreshAttackState(time);
    return this.#isAttacking;
  }

  #refreshAttackState(time: number): void {
    if (this.#isAttacking && time >= this.#attackActiveUntil) {
      this.#isAttacking = false;
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

function spikeOnPlatform(
  kind: TerrainKind,
  platformX: number,
  platformY: number,
  delayMs = 0
): TrapSpawnConfig {
  const definition = terrainDefinitions[kind];
  return spikeAt(platformX + definition.width / 2, platformSurface(kind, platformY), delayMs);
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
