import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/app/lib/admin";
import { toggleGalleryLike } from "@/app/lib/gallery";
import { isGalleryArtworkId } from "@/app/lib/matchday-gallery";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser(); if (denied) return denied;
  const { id } = await params; if (!isGalleryArtworkId(id)) return NextResponse.json({ error: "작품 없음" }, { status: 404 });
  const s = await auth(); const uid = (s?.user as { kakaoId?: string })?.kakaoId;
  if (!uid) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const r = await toggleGalleryLike(id, uid); return NextResponse.json({ liked: r.liked, likeCount: r.like_count });
}
