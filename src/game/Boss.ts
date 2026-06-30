import Phaser from 'phaser';

import { type BossAnimationState, getBossAnimationKey } from '@assets/bossAssets';
import { gameplayConfig } from '@config/gameplayConfig';

type BossMode = 'ground' | 'takingOff' | 'flying' | 'landing' | 'hurt' | 'dead' | 'attacking';

const BOSS_SCALE = gameplayConfig.boss.scale;
const GROUND_MOVE_SPEED = gameplayConfig.boss.groundSpeed;
const FLIGHT_OFFSET_Y = 110;
const BOSS_MAX_HEALTH: number = gameplayConfig.boss.hp;
const bossPhaseStagger = {
  1: 220,
  2: 160,
  3: 110
} as const;
const bossPhaseArmor = {
  1: 0.3,
  2: 0.2,
  3: 0
} as const;
const bossVisibleBottomPadding = {
  idle: 17,
  walk: 17,
  takeOff: 17,
  flight: 18,
  landing: 17,
  hurt: 17,
  dead: 17,
  attack1: 17,
  attack2: 17,
  special: 18
} as const satisfies Record<BossAnimationState, number>;

export class Boss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  #mode: BossMode = 'ground';
  #state: BossAnimationState = 'idle';
  #health = BOSS_MAX_HEALTH;
  #stagger = 0;
  #facing: -1 | 1 = -1;
  #nextAttackAt = 0;
  #nextSpecialAt = 12000;
  #nextFlightAt = 9000;
  #landAt = 0;
  #hurtUntil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    x: number,
    y: number,
    private readonly arena: Readonly<{
      left: number;
      right: number;
      groundY: number;
      ceilingY: number;
    }>
  ) {
    this.sprite = scene.physics.add
      .sprite(x, y, getBossAnimationKey('idle'), 0)
      .setOrigin(0.5, 1)
      .setScale(BOSS_SCALE)
      .setFlipX(true)
      .setDepth(20);
    this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    const body = this.body;
    body.setSize(112, 62);
    body.setOffset(32, 42);
    body.setMaxVelocity(360, 760);
    body.setDragX(1200);
    body.setAllowGravity(false);
    body.setImmovable(true);

    this.#play('idle');
    this.#snapToGround();
  }

  get isDead(): boolean {
    return this.#mode === 'dead' || !this.sprite.active;
  }

  get health(): number {
    return this.#health;
  }

  get phase(): 1 | 2 | 3 {
    if (this.#health > 150) {
      return 1;
    }

    return this.#health > 70 ? 2 : 3;
  }

  get stagger(): number {
    return this.#stagger;
  }

  get maxStagger(): number {
    return bossPhaseStagger[this.phase];
  }

  get activeAttackDamage(): number {
    if (!this.isAttackActive) {
      return gameplayConfig.boss.touchDamage;
    }

    if (this.#state === 'attack1') {
      return gameplayConfig.boss.attack1Damage;
    }

    return this.#state === 'attack2'
      ? gameplayConfig.boss.attack2Damage
      : gameplayConfig.boss.specialDamage;
  }

  get isAttackActive(): boolean {
    return (
      this.#mode === 'attacking' &&
      (this.#state === 'attack1' || this.#state === 'attack2' || this.#state === 'special') &&
      this.sprite.anims.getProgress() > 0.35
    );
  }

  update(time: number): void {
    if (this.isDead) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
      body?.setVelocity(0, 0);
      return;
    }

    if (time < this.#hurtUntil) {
      return;
    }

    this.#facePlayer();

    if (this.#mode === 'takingOff' || this.#mode === 'landing' || this.#mode === 'attacking') {
      return;
    }

    if (this.#mode === 'flying') {
      this.#updateFlight(time);
      return;
    }

    this.#snapToGround();
    this.#updateGround(time);
  }

  hurt(damage = 1, options: Readonly<{ critical?: boolean; stagger?: number }> = {}): number {
    if (this.isDead || this.#mode === 'hurt') {
      return 0;
    }

    const recoverMode: BossMode = this.#mode === 'flying' ? 'flying' : 'ground';
    const criticalAdjustedDamage = options.critical ? damage * 0.5 + damage * 0.5 * 1.5 : damage;
    const appliedDamage = Math.max(
      1,
      Math.round(criticalAdjustedDamage * (1 - bossPhaseArmor[this.phase]))
    );
    this.#health -= appliedDamage;
    this.#stagger = Math.min(this.maxStagger, this.#stagger + (options.stagger ?? 25));

    if (this.#health <= 0) {
      this.#die();
      return appliedDamage;
    }

    this.#mode = 'hurt';
    this.#hurtUntil = this.scene.time.now + 420;
    this.body.setVelocity(0, 0);
    this.#play('hurt', true);
    if (this.#stagger >= this.maxStagger) {
      this.#stagger = 0;
    }
    this.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + getBossAnimationKey('hurt'),
      () => {
        if (!this.isDead) {
          this.#mode = recoverMode;
          if (recoverMode === 'ground') {
            this.#snapToGround();
          }
        }
      }
    );

    return appliedDamage;
  }

  #updateGround(time: number): void {
    const distance = this.player.x - this.sprite.x;
    const absDistance = Math.abs(distance);

    if (absDistance > 900) {
      this.#play('idle');
      this.#stopOnGround();
      return;
    }

    if (this.phase >= 2 && time >= this.#nextFlightAt && absDistance > 300) {
      this.#takeOff(time);
      return;
    }

    if (this.phase === 3 && time >= this.#nextSpecialAt && absDistance < 520) {
      this.#attack('special', time, 1200);
      return;
    }

    if (time >= this.#nextAttackAt && absDistance < 260) {
      this.#attack(this.phase === 1 || absDistance < 150 ? 'attack1' : 'attack2', time, 1200);
      return;
    }

    if (absDistance > 130) {
      this.#play('walk');
      this.sprite.x = Phaser.Math.Clamp(
        this.sprite.x +
          Math.sign(distance) * GROUND_MOVE_SPEED * (this.scene.game.loop.delta / 1000),
        this.arena.left,
        this.arena.right
      );
      this.#snapToGround();
    } else {
      this.#play('idle');
      this.#stopOnGround();
    }
  }

  #updateFlight(time: number): void {
    const targetX = Phaser.Math.Clamp(
      this.player.x + this.#facing * -120,
      this.arena.left + 160,
      this.arena.right - 160
    );
    const targetY = Phaser.Math.Clamp(
      this.arena.groundY - FLIGHT_OFFSET_Y,
      this.arena.ceilingY,
      this.arena.groundY - 80
    );
    this.body.setVelocity((targetX - this.sprite.x) * 0.8, (targetY - this.sprite.y) * 0.7);
    this.#play('flight');

    if (
      this.phase === 3 &&
      time >= this.#nextSpecialAt &&
      Math.abs(this.player.x - this.sprite.x) < 430
    ) {
      this.#attack('special', time, 1200);
      return;
    }

    if (time >= this.#landAt) {
      this.#land();
    }
  }

  #takeOff(time: number): void {
    this.#mode = 'takingOff';
    this.body.setVelocity(0, 0);
    this.#snapToGround();
    this.#play('takeOff', true);
    this.#snapToGround();
    this.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + getBossAnimationKey('takeOff'),
      () => {
        if (this.isDead) {
          return;
        }

        this.#mode = 'flying';
        this.sprite.y = Phaser.Math.Clamp(
          this.arena.groundY - FLIGHT_OFFSET_Y,
          this.arena.ceilingY,
          this.arena.groundY - 80
        );
        this.#landAt = time + (this.phase === 3 ? 1900 : 2600);
      }
    );
  }

  #land(): void {
    this.#mode = 'landing';
    this.body.setVelocity(0, 0);
    this.sprite.y = Phaser.Math.Clamp(
      this.arena.groundY - FLIGHT_OFFSET_Y,
      this.arena.ceilingY,
      this.arena.groundY - 80
    );
    this.#play('landing', true);
    this.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + getBossAnimationKey('landing'),
      () => {
        if (this.isDead) {
          return;
        }

        this.#snapToGround();
        this.#mode = 'ground';
        this.#nextFlightAt = this.scene.time.now + 9000;
      }
    );
  }

  #attack(state: 'attack1' | 'attack2' | 'special', time: number, cooldown: number): void {
    this.#mode = 'attacking';
    this.body.setVelocity(0, 0);
    this.#play(state, true);
    this.#nextAttackAt = time + cooldown;

    if (state === 'special') {
      this.#nextSpecialAt = time + Phaser.Math.Between(10_000, 15_000);
    }

    this.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + getBossAnimationKey(state),
      () => {
        if (this.isDead) {
          return;
        }

        this.#mode =
          state === 'special' && this.sprite.y < this.arena.groundY - 40 ? 'flying' : 'ground';
      }
    );
  }

  #die(): void {
    this.#mode = 'dead';
    const body = this.body;
    body.setVelocity(0, 0);
    body.enable = false;
    this.#play('dead', true);
    this.#snapToGround();
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      delay: gameplayConfig.boss.deathRemoveMs - gameplayConfig.boss.deathFadeMs,
      duration: gameplayConfig.boss.deathFadeMs,
      onComplete: () => this.sprite.destroy()
    });
  }

  #facePlayer(): void {
    this.#facing = this.player.x < this.sprite.x ? -1 : 1;
    this.sprite.setFlipX(this.#facing < 0);
  }

  #play(state: BossAnimationState, force = false): void {
    if (!force && this.#state === state) {
      return;
    }

    this.#state = state;
    this.sprite.play(getBossAnimationKey(state), true);
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  #snapToGround(): void {
    this.sprite.y = this.arena.groundY + bossVisibleBottomPadding[this.#state] * BOSS_SCALE;
    this.body.setVelocity(0, 0);
  }

  #stopOnGround(): void {
    this.body.setVelocity(0, 0);
    this.#snapToGround();
  }
}
