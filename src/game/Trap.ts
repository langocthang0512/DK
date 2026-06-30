import Phaser from 'phaser';

import { getTrapAnimationKey, trapDefinitions, type TrapType } from '@assets/trapAssets';
import { gameplayConfig } from '@config/gameplayConfig';

export type TrapSpawnConfig = Readonly<{
  type: TrapType;
  x: number;
  anchorY: number;
  triggerWidth?: number;
  triggerHeight?: number;
  delayMs?: number;
  cooldownMs?: number;
}>;

const DEFAULT_TRIGGER_WIDTH = 220;
const DEFAULT_TRIGGER_HEIGHT = 190;
const IDLE_SPIKE_TIP_CROP_Y = 90;
const IDLE_SPIKE_TIP_CROP_HEIGHT = 12;
const IDLE_SPIKE_TIP_EMBED_PX = 3;
const SPIKE_HITBOX_WIDTH_RATIO = 0.78;
const SPIKE_HITBOX_HEIGHT_RATIO = 0.86;

export class Trap {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly trigger: Phaser.GameObjects.Zone;
  readonly hitbox: Phaser.GameObjects.Zone;

  #triggeredAt = -Infinity;
  #lastDamageAt = -Infinity;
  #isRunning = false;
  #isArmed = true;
  #damagedThisCycle = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: TrapSpawnConfig
  ) {
    const definition = trapDefinitions[config.type];

    this.sprite = scene.physics.add
      .sprite(config.x, config.anchorY, definition.key, 0)
      .setOrigin(0.5, definition.placement === 'ground' ? 1 : 0)
      .setScale(definition.scale);
    this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.sprite.body?.destroy();

    const triggerY =
      definition.placement === 'ground'
        ? config.anchorY - (config.triggerHeight ?? DEFAULT_TRIGGER_HEIGHT) * 0.5
        : config.anchorY + (config.triggerHeight ?? DEFAULT_TRIGGER_HEIGHT) * 0.5;

    this.trigger = scene.add.zone(
      config.x,
      triggerY,
      config.triggerWidth ?? DEFAULT_TRIGGER_WIDTH,
      config.triggerHeight ?? DEFAULT_TRIGGER_HEIGHT
    );
    scene.physics.add.existing(this.trigger, true);

    this.hitbox = scene.add.zone(config.x, config.anchorY, 1, 1);
    scene.physics.add.existing(this.hitbox, true);
    this.#applyIdleVisual();
    this.#alignToAnchor();
    this.#alignHitbox();
  }

  get type(): TrapType {
    return this.config.type;
  }

  triggerTrap(time: number): void {
    if (this.#isRunning || !this.#isArmed) {
      return;
    }

    const delay = this.config.delayMs ?? gameplayConfig.traps[this.config.type].activationDelayMs;
    this.#isRunning = true;
    this.#isArmed = false;
    this.#damagedThisCycle = false;
    this.#triggeredAt = time + delay;
    this.scene.time.delayedCall(delay, () => {
      this.sprite.setVisible(true);
      this.sprite.setCrop();
      this.sprite.play(getTrapAnimationKey(this.config.type), true);
      this.sprite.once(
        Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + getTrapAnimationKey(this.config.type),
        () => {
          this.#completeCycle();
        }
      );
    });
  }

  update(time: number, player?: Phaser.GameObjects.Sprite): void {
    this.#updateRearmState(player);

    if (!this.#isRunning || time < this.#triggeredAt) {
      this.sprite.setFrame(0);
      this.#applyIdleVisual();
      this.#alignToAnchor();
      this.#alignHitbox();
      return;
    }

    if (!this.sprite.anims.isPlaying) {
      this.sprite.setCrop();
      this.sprite.play(getTrapAnimationKey(this.config.type), true);
    }

    this.#alignToAnchor();
    this.#alignHitbox();
  }

  canDamage(time: number): boolean {
    const definition = trapDefinitions[this.config.type];
    const frame = this.#currentZeroBasedFrame();
    const hasDamageFrame =
      frame >= definition.damageFrameStart && frame <= definition.damageFrameEnd;
    const canDamageThisCycle = this.config.type !== 'spike' || !this.#damagedThisCycle;

    return (
      canDamageThisCycle &&
      hasDamageFrame &&
      time - this.#lastDamageAt >=
        (this.config.cooldownMs ?? gameplayConfig.traps[this.config.type].cooldownMs)
    );
  }

  canTriggerDamage(time: number): boolean {
    return (
      this.config.type === 'spike' &&
      this.#isRunning &&
      !this.#damagedThisCycle &&
      time >= this.#triggeredAt &&
      time - this.#lastDamageAt >= (this.config.cooldownMs ?? gameplayConfig.traps.spike.cooldownMs)
    );
  }

  markDamaged(time: number): void {
    this.#lastDamageAt = time;
    if (this.config.type === 'spike') {
      this.#damagedThisCycle = true;
    }
  }

  #completeCycle(): void {
    if (trapDefinitions[this.config.type].repeat !== 0) {
      return;
    }

    this.#isRunning = false;
    this.#triggeredAt = -Infinity;
    this.sprite.stop();
    this.sprite.setFrame(0);
    this.#damagedThisCycle = false;
    this.#applyIdleVisual();
    this.#alignToAnchor();

    this.#isArmed = false;
  }

  #updateRearmState(player?: Phaser.GameObjects.Sprite): void {
    if (this.#isRunning || this.#isArmed || trapDefinitions[this.config.type].repeat !== 0) {
      return;
    }

    if (
      !player ||
      !Phaser.Geom.Intersects.RectangleToRectangle(this.trigger.getBounds(), player.getBounds())
    ) {
      this.#isArmed = true;
    }
  }

  #alignToAnchor(): void {
    const definition = trapDefinitions[this.config.type];
    const padding = definition.alignPadding[this.#currentZeroBasedFrame()] ?? 0;

    if (definition.placement === 'ground') {
      if (this.#isHiddenGroundTrap()) {
        this.sprite.y =
          this.config.anchorY +
          (definition.frameHeight - IDLE_SPIKE_TIP_CROP_Y - IDLE_SPIKE_TIP_CROP_HEIGHT) *
            definition.scale +
          IDLE_SPIKE_TIP_EMBED_PX;
        return;
      }

      this.sprite.y = this.config.anchorY + padding * definition.scale;
      return;
    }

    this.sprite.y = this.config.anchorY - padding * definition.scale;
  }

  #applyIdleVisual(): void {
    if (!this.#isHiddenGroundTrap()) {
      this.sprite.setCrop();
      this.sprite.setVisible(true);
      return;
    }

    this.sprite.setVisible(true);
    this.sprite.setCrop(
      0,
      IDLE_SPIKE_TIP_CROP_Y,
      trapDefinitions.spike.frameWidth,
      IDLE_SPIKE_TIP_CROP_HEIGHT
    );
  }

  #alignHitbox(): void {
    const definition = trapDefinitions[this.config.type];
    const hitbox = definition.hitboxes[this.#currentZeroBasedFrame()] ?? definition.hitboxes[0];
    const scale = definition.scale;
    const rawWidth = hitbox.width * scale;
    const rawHeight = hitbox.height * scale;
    const width =
      this.config.type === 'spike' ? rawWidth * SPIKE_HITBOX_WIDTH_RATIO : rawWidth;
    const height =
      this.config.type === 'spike' ? rawHeight * SPIKE_HITBOX_HEIGHT_RATIO : rawHeight;
    const frameLeft = this.sprite.x - (definition.frameWidth * scale) / 2;
    const frameTop =
      definition.placement === 'ground'
        ? this.sprite.y - definition.frameHeight * scale
        : this.sprite.y;
    const centerX = frameLeft + (hitbox.x + hitbox.width / 2) * scale;
    const centerY = frameTop + (hitbox.y + hitbox.height / 2) * scale;

    this.hitbox.setPosition(centerX, centerY);
    this.hitbox.setSize(width, height);

    const body = this.hitbox.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(width, height);
    body.updateFromGameObject();
  }

  #currentZeroBasedFrame(): number {
    const animationFrame = this.sprite.anims.currentFrame?.index;
    if (animationFrame) {
      return animationFrame - 1;
    }

    const frameName = this.sprite.frame.name;
    return typeof frameName === 'number' ? frameName : Number(frameName);
  }

  #isHiddenGroundTrap(): boolean {
    const definition = trapDefinitions[this.config.type];
    return (
      definition.placement === 'ground' &&
      (!this.#isRunning || this.scene.time.now < this.#triggeredAt)
    );
  }
}
