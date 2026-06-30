import Phaser from 'phaser';

export type PixelButton = Readonly<{
  container: Phaser.GameObjects.Container;
  setFocused: (focused: boolean) => void;
  setPressed: (pressed: boolean) => void;
}>;

type PixelButtonOptions = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
}>;

const buttonPalette = {
  outline: 0x061915,
  shadow: 0x1d5e49,
  idle: 0x66c783,
  hover: 0x7bdc91,
  pressed: 0x48a86e,
  highlight: 0x95ed9f,
  text: '#07120f'
} as const;

export function createPixelButton(
  scene: Phaser.Scene,
  { x, y, width, height, label, onClick }: PixelButtonOptions
): PixelButton {
  const container = scene.add.container(x, y).setSize(width, height).setDepth(1200);
  const bg = scene.add.graphics();
  const text = scene.add
    .text(0, -1, label, {
      color: buttonPalette.text,
      fontFamily: 'monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      stroke: '#99e6a1',
      strokeThickness: 1
    })
    .setOrigin(0.5, 0.5);
  const zone = scene.add
    .zone(0, 0, width, height)
    .setOrigin(0.5, 0.5)
    .setInteractive({ useHandCursor: true });

  let isHover = false;
  let isPressed = false;
  let isFocused = false;

  const draw = (): void => {
    bg.clear();
    const fill = isPressed
      ? buttonPalette.pressed
      : isHover || isFocused
        ? buttonPalette.hover
        : buttonPalette.idle;
    const yOffset = isPressed ? 1 : 0;

    bg.fillStyle(buttonPalette.outline, 1);
    bg.fillRoundedRect(-width / 2 - 2, -height / 2 - 2 + yOffset, width + 4, height + 4, 3);
    bg.fillStyle(buttonPalette.shadow, 1);
    bg.fillRoundedRect(-width / 2, -height / 2 + 3 + yOffset, width, height, 3);
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-width / 2, -height / 2 + yOffset, width, height - 3, 3);
    bg.fillStyle(buttonPalette.highlight, 0.95);
    bg.fillRect(-width / 2 + 4, -height / 2 + 3 + yOffset, width - 8, 2);
    text.y = yOffset - 2;
  };

  zone.on('pointerover', () => {
    isHover = true;
    draw();
  });
  zone.on('pointerout', () => {
    isHover = false;
    isPressed = false;
    draw();
  });
  zone.on('pointerdown', () => {
    isPressed = true;
    draw();
  });
  zone.on('pointerup', () => {
    isPressed = false;
    draw();
    onClick();
  });

  container.add([bg, text, zone]);
  draw();

  return {
    container,
    setFocused: (focused: boolean) => {
      isFocused = focused;
      draw();
    },
    setPressed: (pressed: boolean) => {
      isPressed = pressed;
      draw();
    }
  };
}

export function createPixelTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize: number
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      color: '#e7f3de',
      fontFamily: 'monospace',
      fontSize: String(fontSize) + 'px',
      fontStyle: 'bold',
      stroke: '#111711',
      strokeThickness: Math.max(5, Math.round(fontSize * 0.14))
    })
    .setOrigin(0.5, 0.5)
    .setDepth(1200);
}

export function createMenuEnvironment(scene: Phaser.Scene, darken = 0): void {
  const { width, height } = scene.scale;

  scene.add.rectangle(0, 0, width, height, 0x222421).setOrigin(0, 0).setDepth(-20);
  scene.add
    .rectangle(0, height - 96, width, 96, 0x171917)
    .setOrigin(0, 0)
    .setDepth(-19);

  for (let x = -18; x < width + 520; x += 500) {
    scene.add
      .image(x, height - 116, 'environment.approved.ground')
      .setOrigin(0, 0)
      .setDepth(-5);
  }

  const small = scene.add
    .image(width * 0.25, height * 0.64, 'environment.approved.smallPlatform')
    .setOrigin(0.5, 0)
    .setDepth(-8);
  const vine = scene.add
    .image(width * 0.72, height * 0.6, 'environment.approved.vinePlatform')
    .setOrigin(0.5, 0)
    .setDepth(-8);

  scene.tweens.add({
    targets: [small, vine],
    y: '+=4',
    duration: 2600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  if (darken > 0) {
    scene.add.rectangle(0, 0, width, height, 0x000000, darken).setOrigin(0, 0).setDepth(900);
  }
}

export function playUiToneSequence(frequencies: readonly number[], volume = 0.035): void {
  try {
    const context = new AudioContext();
    const start = context.currentTime + 0.02;
    const step = 0.11;

    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * step;
      const noteEnd = noteStart + step * 0.86;

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.linearRampToValueAtTime(volume, noteStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd);
    });
    const closeDelayMs = (frequencies.length + 1) * step * 1000;
    window.setTimeout(() => {
      void context.close().catch(() => undefined);
    }, closeDelayMs);
  } catch {
    // Browsers may block WebAudio before user interaction.
  }
}
