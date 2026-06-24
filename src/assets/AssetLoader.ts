import type Phaser from 'phaser';

import { assetManifest } from '@assets/assetManifest';

export class AssetLoader {
  loadManifest(loader: Phaser.Loader.LoaderPlugin): void {
    for (const image of assetManifest.images) {
      loader.image(image.key, image.url);
    }

    for (const audio of assetManifest.audio) {
      loader.audio(audio.key, [...audio.urls]);
    }
  }
}
