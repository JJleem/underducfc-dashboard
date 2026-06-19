// app/media/page.tsx
import { getMediaRows } from "../lib/backend";
import { MediaData } from "../components/DashboardClient";
import MediaClient from "./MediaClient";

export default async function MediaPage() {
  let rawMedia: string[][] = [];
  try {
    rawMedia = await getMediaRows();
  } catch {
    rawMedia = [];
  }

  const mediaItems: MediaData[] = rawMedia
    .slice(1)
    .map((row: string[], i: number) => ({
      id: i,
      type: (row[0] || "image") as "video" | "image",
      url: row[1] || "",
      title: row[2] || "",
      uploadedAt: row[3] || "",
    }))
    .filter((item) => item.url);

  return <MediaClient media={mediaItems} />;
}
