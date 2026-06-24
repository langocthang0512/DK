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

export const assetManifest: AssetManifest = {
  images: [],
  audio: []
};
