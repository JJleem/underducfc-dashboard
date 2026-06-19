import { NextRequest, NextResponse } from "next/server";
import { getVoteCommentRows } from "../../lib/backend";
import { appendVoteComment, deleteVoteComment } from "../../lib/sheets-write";
import { requireUser } from "@/app/lib/admin";
import { auth } from "@/auth";
import { isAdmin } from "@/app/lib/admin";

export async function GET() {
  try {
    const rows = await getVoteCommentRows();
    const comments = rows.slice(1).filter((r: string[]) => r[0]).map((row: string[]) => ({
      matchId: Number(row[0]) || 0,
      kakaoId: row[1] || "",
      nickname: row[2] || "",
      message: row[3] || "",
      timestamp: row[4] || "",
    }));
    return NextResponse.json(comments);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const session = await auth();
    const kakaoId = (session?.user as { kakaoId?: string })?.kakaoId;
    const nickname = session?.user?.name;
    if (!kakaoId || !nickname) {
      return NextResponse.json({ error: "세션 정보 없음" }, { status: 401 });
    }

    const { matchId, message } = await request.json();
    if (matchId === undefined || !message?.trim()) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    await appendVoteComment({ matchId: Number(matchId), kakaoId, nickname, message });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const session = await auth();
    const kakaoId = (session?.user as { kakaoId?: string })?.kakaoId;
    if (!kakaoId) {
      return NextResponse.json({ error: "세션 정보 없음" }, { status: 401 });
    }

    const { matchId, timestamp, targetKakaoId } = await request.json();
    // 본인 또는 관리자만 삭제 가능
    const deleteTarget = targetKakaoId || kakaoId;
    if (deleteTarget !== kakaoId && !isAdmin(kakaoId)) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    await deleteVoteComment(Number(matchId), deleteTarget, timestamp);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
