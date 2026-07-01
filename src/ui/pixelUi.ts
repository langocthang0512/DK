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

type CoverImageOptions = Readonly<{
  key: string;
  depth?: number;
  darken?: number;
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

const fantasyButtonPalette = {
  outline: 0x21120a,
  edge: 0x4b2411,
  shadow: 0x170b06,
  idle: 0x8a4a22,
  hover: 0xb5682d,
  pressed: 0x6d3418,
  highlight: 0xe4a04e,
  bevel: 0x5f2b14,
  rivet: 0x23140f,
  rivetLight: 0xd4a368,
  leaf: 0x3b8f3e,
  text: '#fff0cf',
  textShadow: '#2b160c'
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

export function createFantasyPixelButton(
  scene: Phaser.Scene,
  { x, y, width, height, label, onClick }: PixelButtonOptions
): PixelButton {
  const container = scene.add.container(x, y).setSize(width, height).setDepth(1200);
  const bg = scene.add.graphics();
  const text = scene.add
    .text(0, -2, label, {
      color: fantasyButtonPalette.text,
      fontFamily: 'monospace',
      fontSize: String(Math.max(18, Math.round(height * 0.42))) + 'px',
      fontStyle: 'bold',
      stroke: fantasyButtonPalette.textShadow,
      strokeThickness: 5
    })
    .setOrigin(0.5, 0.5);
  const zone = scene.add
    .zone(0, 0, width, height)
    .setOrigin(0.5, 0.5)
    .setInteractive({ useHandCursor: true });

  let isHover = false;
  let isPressed = false;
  let isFocused = false;

  const drawLeaf = (side: -1 | 1, yOffset: number): void => {
    const leafX = side * (width * 0.5 + 5);
    bg.fillStyle(fantasyButtonPalette.leaf, isHover || isFocused ? 0.95 : 0.72);
    bg.fillTriangle(
      leafX,
      -height * 0.22 + yOffset,
      leafX + side * 17,
      -height * 0.08 + yOffset,
      leafX + side * 3,
      height * 0.07 + yOffset
    );
    bg.fillTriangle(
      leafX - side * 2,
      height * 0.03 + yOffset,
      leafX + side * 15,
      height * 0.17 + yOffset,
      leafX + side * 2,
      height * 0.28 + yOffset
    );
  };

  const draw = (): void => {
    bg.clear();
    const fill = isPressed
      ? fantasyButtonPalette.pressed
      : isHover || isFocused
        ? fantasyButtonPalette.hover
        : fantasyButtonPalette.idle;
    const yOffset = isPressed ? 3 : 0;
    const corner = 7;
    const left = -width * 0.5;
    const top = -height * 0.5 + yOffset;

    bg.fillStyle(fantasyButtonPalette.shadow, 0.86);
    bg.fillRoundedRect(left + 6, top + 8, width, height, corner);
    bg.fillStyle(fantasyButtonPalette.outline, 1);
    bg.fillRoundedRect(left - 3, top - 3, width + 6, height + 6, corner);
    bg.fillStyle(fantasyButtonPalette.edge, 1);
    bg.fillRoundedRect(left, top, width, height, corner);
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(left + 5, top + 5, width - 10, height - 12, 5);
    bg.fillStyle(fantasyButtonPalette.highlight, 0.72);
    bg.fillRect(left + 16, top + 8, width - 32, 3);
    bg.fillStyle(fantasyButtonPalette.bevel, 1);
    bg.fillRect(left + 12, top + height - 10, width - 24, 4);

    for (const side of [-1, 1] as const) {
      const rivetX = side * (width * 0.5 - 20);
      bg.fillStyle(fantasyButtonPalette.rivet, 1);
      bg.fillCircle(rivetX, yOffset - 2, 6);
      bg.fillStyle(fantasyButtonPalette.rivetLight, 0.75);
      bg.fillCircle(rivetX - 2, yOffset - 4, 2);
      drawLeaf(side, yOffset);
    }

    if (isFocused) {
      bg.lineStyle(2, 0xffd57a, 0.95);
      bg.strokeRoundedRect(left + 7, top + 7, width - 14, height - 16, 4);
    }

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

export function createFantasyPixelTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize: number
): Phaser.GameObjects.Text {
  const shadow = scene.add
    .text(x + 5, y + 7, text, {
      color: '#2a160e',
      fontFamily: 'monospace',
      fontSize: String(fontSize) + 'px',
      fontStyle: 'bold',
      stroke: '#120905',
      strokeThickness: Math.max(7, Math.round(fontSize * 0.12))
    })
    .setOrigin(0.5, 0.5)
    .setDepth(1199)
    .setAlpha(0.74);

  const title = scene.add
    .text(x, y, text, {
      color: '#fff0c9',
      fontFamily: 'monospace',
      fontSize: String(fontSize) + 'px',
      fontStyle: 'bold',
      stroke: '#3a1b10',
      strokeThickness: Math.max(7, Math.round(fontSize * 0.13))
    })
    .setOrigin(0.5, 0.5)
    .setDepth(1200);

  title.setData('shadow', shadow);
  return title;
}

export function createCoverImageBackground(scene: Phaser.Scene, options: CoverImageOptions): void {
  const { width, height } = scene.scale;
  const texture = scene.textures.get(options.key);
  const image = scene.add
    .image(width * 0.5, height * 0.5, options.key)
    .setDepth(options.depth ?? -30);
  const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
  const imageWidth = source?.width ?? width;
  const imageHeight = source?.height ?? height;
  const scale = Math.max(width / imageWidth, height / imageHeight);

  image.setScale(scale);

  if ((options.darken ?? 0) > 0) {
    scene.add
      .rectangle(0, 0, width, height, 0x000000, options.darken)
      .setOrigin(0, 0)
      .setDepth((options.depth ?? -30) + 1);
  }
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
