import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "../../lib/google-sheets";
import { appendMomVote, deleteMomVote } from "../../lib/sheets-write";

export async function GET() {
  try {
    const rows = await getSheetData("mom_vote!A1:E500");
    const votes = rows.slice(1).map((row: string[]) => ({
      matchId: Number(row[0]) || 0,
      voterName: row[1] || "",
      votedFor: row[2] || "",
      voteType: row[3] || "공격",
      timestamp: row[4] || "",
    }));
    return NextResponse.json(votes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { matchId, voterName, votedFor, voteType } = await request.json();
    if (matchId === undefined || !voterName?.trim() || !votedFor?.trim() || !voteType?.trim()) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    // 같은 matchId + voterName + voteType 투표가 있으면 삭제 후 재등록
    await deleteMomVote(Number(matchId), voterName.trim(), voteType.trim());
    await appendMomVote({ matchId: Number(matchId), voterName, votedFor, voteType });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { matchId, voterName, voteType } = await request.json();
    if (matchId === undefined || !voterName) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    await deleteMomVote(Number(matchId), voterName, voteType);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
