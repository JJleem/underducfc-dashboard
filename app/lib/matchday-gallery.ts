import { MATCHDAY_ART } from "./matchday-art";

export interface GalleryArtwork {
  id: string;
  title: string;
  src: string;
  thumb: string;
}

export const MATCHDAY_GALLERY: readonly GalleryArtwork[] = MATCHDAY_ART.map(({ src }) => {
  const file = src.split("/").pop()!;
  const id = file.replace(/\.webp$/, "");
  return {
    id,
    title: id.replace(/^gallery-/, "").replace(/-/g, " ").toUpperCase(),
    src,
    thumb: `/matchday/thumbs/${file}`,
  };
});

export function isGalleryArtworkId(id: string) {
  return MATCHDAY_GALLERY.some((art) => art.id === id);
}
