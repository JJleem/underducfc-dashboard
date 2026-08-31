import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/admin";
import { toggleLoungeLike } from "@/app/lib/lounge";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    // 캐시를 비우지 않는다 — 좋아요는 홈의 "새 글" 점(최신 글 id + 개수)을
    // 바꾸지 않고, 목록·상세는 no-store 라 늘 새로 읽는다. 여기서 비우면
    // 하트 한 번에 앱 전체 라우터 캐시가 날아간다.
    const result = await toggleLoungeLike(Number(id));
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
