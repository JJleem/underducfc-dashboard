import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/admin";
import { createLoungePost } from "@/app/lib/lounge";

export async function POST(request: NextRequest) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const { category, title, body } = await request.json();
    if (category !== "suggestion" && category !== "chat") {
      return NextResponse.json({ error: "글 종류를 골라주세요." }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: "제목은 필수입니다." }, { status: 400 });
    }
    if (!body?.trim()) {
      return NextResponse.json({ error: "내용은 필수입니다." }, { status: 400 });
    }

    // 작성자는 넘기지 않는다 — 백엔드가 신원 헤더에서 채운다.
    const post = await createLoungePost({
      category,
      title: title.trim(),
      body: body.trim(),
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
