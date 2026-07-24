import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/app/lib/admin";
import { toggleBoardLike } from "@/app/lib/board";

// 좋아요 토글 — 인당 1번(kakaoId는 세션에서 강제).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const session = await auth();
    const kakaoId = (session?.user as { kakaoId?: string })?.kakaoId;
    if (!kakaoId) return NextResponse.json({ error: "세션 정보 없음" }, { status: 401 });

    const { id } = await params;
    const result = await toggleBoardLike(Number(id), kakaoId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
