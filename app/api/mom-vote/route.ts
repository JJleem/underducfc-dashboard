import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "../../lib/google-sheets";
import { appendMomVote, deleteMomVote } from "../../lib/sheets-write";

export async function GET() {
  try {
    const rows = await getSheetData("mom_vote!A1:D500");
    const votes = rows.slice(1).map((row: string[]) => ({
      matchId: Number(row[0]) || 0,
      voterName: row[1] || "",
      votedFor: row[2] || "",
      timestamp: row[3] || "",
    }));
    return NextResponse.json(votes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { matchId, voterName, votedFor } = await request.json();
    if (matchId === undefined || !voterName?.trim() || !votedFor?.trim()) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    // 기존 투표가 있으면 먼저 삭제 후 재등록 (투표 변경)
    await deleteMomVote(Number(matchId), voterName.trim());
    await appendMomVote({ matchId: Number(matchId), voterName, votedFor });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { matchId, voterName } = await request.json();
    if (matchId === undefined || !voterName) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    await deleteMomVote(Number(matchId), voterName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
