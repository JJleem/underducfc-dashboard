import { NextRequest, NextResponse } from "next/server";
import { getFeedbackRows } from "../../lib/backend";
import { appendFeedback, deleteFeedback } from "../../lib/sheets-write";
import { requireUser, isAdmin } from "@/app/lib/admin";
import { auth } from "@/auth";

export async function GET() {
  try {
    const rows = await getFeedbackRows();
    const feedbacks = rows.slice(1).map((row: string[]) => ({
      matchId: Number(row[0]) || 0,
      timestamp: row[1] || "",
      name: row[2] || "",
      message: row[3] || "",
    }));
    return NextResponse.json(feedbacks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const body = await request.json();
    const { matchId, name, message } = body;

    if (matchId === undefined || !name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    await appendFeedback({ matchId: Number(matchId), name, message });
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
    const { matchId, timestamp, name, message } = await request.json();
    if (matchId === undefined || !timestamp || !name || !message) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    // 본인 댓글이거나 어드민만 삭제 가능
    const session = await auth();
    const userName = session?.user?.name;
    const kakaoId = (session?.user as { kakaoId?: string } | undefined)?.kakaoId ?? null;
    if (!isAdmin(kakaoId) && name !== userName) {
      return NextResponse.json({ error: "본인의 댓글만 삭제할 수 있습니다." }, { status: 403 });
    }

    await deleteFeedback(Number(matchId), timestamp, name, message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
