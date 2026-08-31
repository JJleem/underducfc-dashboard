import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/admin";
import { createLoungeComment } from "@/app/lib/lounge";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { message, emoticon } = await request.json();
    const text = typeof message === "string" ? message.trim() : "";
    // 이모티콘만 달아도 댓글이다. 둘 다 없을 때만 막는다.
    if (!text && !emoticon) {
      return NextResponse.json({ error: "댓글이나 이모티콘을 넣어주세요." }, { status: 400 });
    }
    // 작성자는 넘기지 않는다 — 백엔드가 신원 헤더에서 채운다.
    const comment = await createLoungeComment(Number(id), {
      ...(text ? { message: text } : {}),
      ...(emoticon ? { emoticon: String(emoticon) } : {}),
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
