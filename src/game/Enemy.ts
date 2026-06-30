import Phaser from 'phaser';

import {
  type EnemyAnimationState,
  type EnemyDefinition,
  type EnemyType,
  enemyDefinitions,
  getEnemyAnimationKey
} from '@assets/enemyAssets';
import { gameplayConfig } from '@config/gameplayConfig';

const ENEMY_VISUAL_GROUND_OFFSET_Y = -5;

export type EnemySpawnConfig = Readonly<{
  type: EnemyType;
  x: number;
  y: number;
  patrolLeft: number;
  patrolRight: number;
}>;

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  #state: EnemyAnimationState | null = null;
  #health: number;
  #stagger = 0;
  #facing: -1 | 1 = -1;
  #lastAttackAt = -Infinity;
  #lockedUntil = 0;
  #isDead = false;
  #hasDamagedThisAttack = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: EnemySpawnConfig,
    private readonly player: Phaser.Physics.Arcade.Sprite
  ) {
    this.definition = enemyDefinitions[config.type];
    this.#health = this.definition.health;
    this.sprite = scene.physics.add
      .sprite(
        config.x,
        config.y + ENEMY_VISUAL_GROUND_OFFSET_Y,
        getEnemyAnimationKey(config.type, 'idle'),
        0
      )
      .setOrigin(0.5, 1)
      .setScale(this.definition.scale)
      .setDepth(20)
      .setVisible(true)
      .setAlpha(1);
    this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.definition.body.width, this.definition.body.height);
    body.setOffset(this.definition.body.offsetX, this.definition.body.offsetY);
    body.setMaxVelocity(this.definition.speed, 900);
    body.setAllowGravity(false);
    body.setCollideWorldBounds(false);

    this.#play('idle');
  }

  readonly definition: EnemyDefinition;

  get isDead(): boolean {
    return this.#isDead || !this.sprite.active;
  }

  get isAttackActive(): boolean {
    return this.#state === 'attack' && this.sprite.anims.getProgress() > 0.35;
  }

  get health(): number {
    return this.#health;
  }

  get stagger(): number {
    return this.#stagger;
  }

  get type(): EnemyType {
    return this.config.type;
  }

  tryApplyAttackHit(playerBounds: Phaser.Geom.Rectangle): boolean {
    if (!this.isAttackActive || this.#hasDamagedThisAttack) {
      return false;
    }

    if (!Phaser.Geom.Intersects.RectangleToRectangle(this.#attackBounds(), playerBounds)) {
      return false;
    }

    this.#hasDamagedThisAttack = true;
    return true;
  }

  update(time: number): void {
    if (!this.sprite.active) {
      return;
    }

    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (!body) {
      return;
    }

    if (this.#isDead) {
      body.setVelocityX(0);
      return;
    }

    if (time < this.#lockedUntil) {
      body.setVelocityX(0);
      return;
    }

    const distanceX = this.player.x - this.sprite.x;
    const distanceY = Math.abs(this.player.y - this.sprite.y);
    const absDistanceX = Math.abs(distanceX);
    const seesPlayer = absDistanceX <= this.definition.detectRange && distanceY < 90;

    const atLeftEdge = this.sprite.x <= this.config.patrolLeft;
    const atRightEdge = this.sprite.x >= this.config.patrolRight;
    const playerIsOutsideLeft = distanceX < 0 && atLeftEdge;
    const playerIsOutsideRight = distanceX > 0 && atRightEdge;

    if (seesPlayer && !playerIsOutsideLeft && !playerIsOutsideRight) {
      this.#facing = distanceX < 0 ? -1 : 1;
    } else if (atLeftEdge) {
      this.#facing = 1;
    } else if (atRightEdge) {
      this.#facing = -1;
    }

    this.sprite.x = Phaser.Math.Clamp(
      this.sprite.x,
      this.config.patrolLeft,
      this.config.patrolRight
    );
    this.sprite.setFlipX(this.#facing > 0);

    if (seesPlayer && absDistanceX <= this.definition.attackRange) {
      this.#attack(time);
      return;
    }

    body.setVelocityX(this.#facing * this.definition.speed);
    this.#play('walk');
  }

  hurt(damage = 1, stagger = 25): void {
    if (this.#isDead || this.#state === 'hurt') {
      return;
    }

    this.#health -= damage;
    this.#stagger = Math.min(100, this.#stagger + stagger);

    if (this.#health <= 0) {
      this.#die();
      return;
    }

    this.#lockedUntil = this.scene.time.now + 600;
    if (this.#stagger >= 100) {
      this.#stagger = 0;
    }
    this.#play('hurt', true);
  }

  #attack(time: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    if (time - this.#lastAttackAt < this.definition.attackCooldownMs) {
      this.#play('idle');
      return;
    }

    this.#lastAttackAt = time;
    this.#lockedUntil = time + 340;
    this.#hasDamagedThisAttack = false;
    this.#play('attack', true);
  }

  #attackBounds(): Phaser.Geom.Rectangle {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const height = Math.max(body.height * this.definition.scale, 44);
    const y = this.sprite.y - height;
    const width = this.definition.attackRange;
    const x = this.#facing < 0 ? this.sprite.x - width : this.sprite.x;

    return new Phaser.Geom.Rectangle(x, y, width, height);
  }

  #die(): void {
    this.#isDead = true;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
    if (body) {
      body.enable = false;
    }
    this.#play('death', true);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: gameplayConfig.enemy.deathRemoveMs,
      onComplete: () => this.sprite.destroy()
    });
  }

  #play(state: EnemyAnimationState, force = false): void {
    if (!force && this.#state === state) {
      return;
    }

    this.#state = state;
    this.sprite.play(getEnemyAnimationKey(this.config.type, state), true);
  }
}
