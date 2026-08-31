import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/admin";
import { deleteLoungeComment } from "@/app/lib/lounge";

/** 본인 또는 운영진만 삭제. 소유권 검사는 백엔드가 신원 헤더로 한다([[../route.ts]]). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const { id, cid } = await params;
    await deleteLoungeComment(Number(id), Number(cid));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
