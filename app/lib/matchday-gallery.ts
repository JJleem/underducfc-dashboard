import { FLAGS_2526, MATCHDAY_ART } from "./matchday-art";

/** 새 작품 묶음을 공개할 때 버전을 올리면 기존 방문자에게도 NEW가 다시 보인다. */
export const MATCHDAY_GALLERY_SEEN_KEY = "ud-gallery-seen-v3";

export interface GalleryArtwork {
  id: string;
  title: string;
  src: string;
  thumb: string;
}

// 갤러리는 로테이션에서 빠진 지난 시즌 깃발까지 전부 보여 준다.
export const MATCHDAY_GALLERY: readonly GalleryArtwork[] = [...MATCHDAY_ART, ...FLAGS_2526].map(({ src, title }) => {
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
