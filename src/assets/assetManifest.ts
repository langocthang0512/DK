export type ImageAsset = Readonly<{
  key: string;
  url: string;
}>;

export type AudioAsset = Readonly<{
  key: string;
  urls: readonly string[];
}>;

export type AssetManifest = Readonly<{
  images: readonly ImageAsset[];
  audio: readonly AudioAsset[];
}>;

const floorTiles2Themes = ['spring', 'autumn', 'winter'] as const;
const floorTiles2Pieces = [
  'solidBlock',
  'hollowBlock',
  'smallBlock',
  'wideStep',
  'archColumn',
  'rightCluster',
  'floatingPlatform'
] as const;

export const assetManifest: AssetManifest = {
  images: floorTiles2Themes.flatMap((theme) =>
    floorTiles2Pieces.map((piece) => ({
      key: `environment.floorTiles2.${theme}.${piece}`,
      url: `/assets/environment/floor-tiles2/${theme}/${piece}.png`
    }))
  ),
  audio: []
};
