import { MATCHDAY_ART } from "./matchday-art";

/** 새 작품 묶음을 공개할 때 버전을 올리면 기존 방문자에게도 NEW가 다시 보인다. */
export const MATCHDAY_GALLERY_SEEN_KEY = "ud-gallery-seen-v2";

export interface GalleryArtwork {
  id: string;
  title: string;
  src: string;
  thumb: string;
}

export const MATCHDAY_GALLERY: readonly GalleryArtwork[] = MATCHDAY_ART.map(({ src, title }) => {
  const file = src.split("/").pop()!;
  const id = file.replace(/\.(?:webp|png|jpe?g)$/i, "");
  return {
    id,
    title: title ?? id.replace(/^gallery-/, "").replace(/-/g, " ").toUpperCase(),
    src,
    thumb: `/matchday/thumbs/${file}`,
  };
});

export function isGalleryArtworkId(id: string) {
  return MATCHDAY_GALLERY.some((art) => art.id === id);
}
