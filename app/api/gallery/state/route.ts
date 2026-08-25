import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/app/lib/admin";
import { getGalleryState } from "@/app/lib/gallery";
export async function GET() {
  const denied = await requireUser(); if (denied) return denied;
  const s = await auth(); const id = (s?.user as { kakaoId?: string })?.kakaoId;
  if (!id) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json(await getGalleryState(id), { headers: { "Cache-Control": "private, no-store" } });
}
