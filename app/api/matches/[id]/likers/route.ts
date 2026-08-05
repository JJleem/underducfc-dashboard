import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/admin";
import { getMatchLikers } from "@/app/lib/matches-backend";

// 좋아요 누른 사람 목록 — 드로어를 열 때만 부른다(피드 첫 로드를 무겁게 하지 않게).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json({ likers: await getMatchLikers(Number(id)) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
