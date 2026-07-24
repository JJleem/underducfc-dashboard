import { NextRequest, NextResponse } from "next/server";
import { isAdmin, currentKakaoId } from "@/app/lib/admin";
import { getBoardPost, deleteBoardPost } from "@/app/lib/board";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const kakaoId = await currentKakaoId();
  if (!kakaoId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const postId = Number(id);
    const post = await getBoardPost(postId);
    if (!post) return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

    // 작성자 본인 또는 관리자만 삭제 가능.
    if (post.kakaoId !== kakaoId && !isAdmin(kakaoId)) {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }

    await deleteBoardPost(postId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
