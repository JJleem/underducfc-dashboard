import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/app/lib/admin";
import { revalidateAppData, UD_TAG } from "@/app/lib/cache";
import { deleteLoungePost, updateLoungePost, LOUNGE_STATUSES } from "@/app/lib/lounge";

/** 운영진 전용 — 상태 변경·답변. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { status, adminReply } = await request.json();
    if (status !== undefined && !LOUNGE_STATUSES.includes(status)) {
      return NextResponse.json({ error: "알 수 없는 상태입니다." }, { status: 400 });
    }
    if (status === undefined && adminReply === undefined) {
      return NextResponse.json({ error: "바꿀 내용이 없습니다." }, { status: 400 });
    }
    const post = await updateLoungePost(Number(id), {
      status,
      adminReply: adminReply === undefined ? undefined : String(adminReply).trim(),
    });
    return NextResponse.json(post);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 본인 또는 운영진만 삭제. 소유권 검사는 **백엔드**가 신원 헤더로 한다.
 * 전술게시판처럼 프론트에서 대조하려면 남의 글에 작성자 식별자를 딸려 보내야 하는데,
 * 그건 익명 게시판에서 하면 안 되는 일이다.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    await deleteLoungePost(Number(id));
    revalidateAppData(UD_TAG.lounge);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
