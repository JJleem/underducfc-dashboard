export interface GalleryArtwork {
  id: string;
  title: string;
  src: string;
  thumb: string;
}

const item = (id: string, title: string): GalleryArtwork => ({
  id,
  title,
  src: `/matchday/gallery-${id}.webp`,
  thumb: `/matchday/thumbs/gallery-${id}.webp`,
});

export const MATCHDAY_GALLERY = [
  item("final-night-1", "FINAL NIGHT I"),
  item("final-night-2", "FINAL NIGHT II"),
  item("final-night-3", "FINAL NIGHT III"),
  item("final-night-6", "THE THREE IV"),
  item("final-night-7", "THE THREE V"),
  item("final-night-all", "ALL TOGETHER"),
  item("group-archive", "TEAM ARCHIVE"),
  item("coach", "TACTICAL ARCHITECT"),
  item("hyunjun", "THE STEP"),
] as const satisfies readonly GalleryArtwork[];

export function isGalleryArtworkId(id: string) {
  return MATCHDAY_GALLERY.some((art) => art.id === id);
}
