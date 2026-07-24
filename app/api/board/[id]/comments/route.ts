import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/app/lib/admin";
import { listBoardComments, createBoardComment } from "@/app/lib/board";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return NextResponse.json(await listBoardComments(Number(id)));
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const session = await auth();
    const kakaoId = (session?.user as { kakaoId?: string })?.kakaoId;
    const author = session?.user?.name;
    if (!kakaoId || !author) {
      return NextResponse.json({ error: "세션 정보 없음" }, { status: 401 });
    }

    const { id } = await params;
    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "댓글 내용을 입력하세요." }, { status: 400 });
    }

    const comment = await createBoardComment(Number(id), {
      kakaoId,
      author,
      message: message.trim(),
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
