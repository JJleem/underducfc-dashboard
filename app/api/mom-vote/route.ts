import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData, UD_TAG } from "@/app/lib/cache";
import { getMomVoteRows } from "../../lib/backend";
import { appendMomVote, deleteMomVote } from "../../lib/sheets-write";
import { requireUser } from "@/app/lib/admin";
import { getMatchesRows } from "../../lib/matches-backend";
import { getMomVoteDeadline } from "../../lib/mom-vote-window";

async function assertVotingOpen(matchId: number): Promise<string | null> {
  const rows = await getMatchesRows();
  const match = rows[matchId + 1];
  if (!match) return "경기를 찾을 수 없어요.";
  if ((match[6] || "").trim() === "예정") return "경기가 끝난 뒤 투표할 수 있어요.";
  if ((match[10] || "").trim()) return "이미 MOM이 확정됐어요.";

  const deadline = getMomVoteDeadline(match[0] || "", match[1] || "");
  if (!deadline || Date.now() >= deadline.getTime()) return "MOM 투표가 마감됐어요.";
  return null;
}

export async function GET() {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const rows = await getMomVoteRows();
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
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const { matchId, voterName, votedFor, voteType } = await request.json();
    if (matchId === undefined || !voterName?.trim() || !votedFor?.trim() || !voteType?.trim()) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    const numericMatchId = Number(matchId);
    const unavailable = await assertVotingOpen(numericMatchId);
    if (unavailable) return NextResponse.json({ error: unavailable }, { status: 409 });

    // 같은 matchId + voterName + voteType 투표가 있으면 삭제 후 재등록
    await deleteMomVote(numericMatchId, voterName.trim(), voteType.trim());
    await appendMomVote({ matchId: numericMatchId, voterName, votedFor, voteType });
    revalidateAppData(UD_TAG.momVote, UD_TAG.stats, UD_TAG.titles);
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
    const { matchId, voterName, voteType } = await request.json();
    if (matchId === undefined || !voterName) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    const numericMatchId = Number(matchId);
    const unavailable = await assertVotingOpen(numericMatchId);
    if (unavailable) return NextResponse.json({ error: unavailable }, { status: 409 });
    await deleteMomVote(numericMatchId, voterName, voteType);
    revalidateAppData(UD_TAG.momVote, UD_TAG.stats, UD_TAG.titles);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
