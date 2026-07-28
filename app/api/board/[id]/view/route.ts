import { NextResponse } from "next/server";
import { incrementBoardView } from "@/app/lib/board";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return NextResponse.json({ error: "잘못된 글 번호입니다." }, { status: 400 });
    }
    const viewCount = await incrementBoardView(postId);
    return NextResponse.json({ viewCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "조회수 반영 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
