import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData, UD_TAG } from "@/app/lib/cache";
import { getMomVoteRows } from "../../lib/backend";
import { appendMomVote, deleteMomVote } from "../../lib/sheets-write";
import { requireUser } from "@/app/lib/admin";
import { auth } from "@/auth";
import { getMatchesRows } from "../../lib/matches-backend";
import { getMomVoteDeadline } from "../../lib/mom-vote-window";

async function assertVotingOpen(matchId: number, voterName: string): Promise<NextResponse | null> {
  const rows = await getMatchesRows();
  const match = rows[matchId + 1];
  if (!match) return NextResponse.json({ error: "경기를 찾을 수 없어요." }, { status: 409 });
  if (!match[11].split(",").some((name) => name.trim() === voterName)) {
    return NextResponse.json({ error: "이 경기에 참석한 선수만 투표할 수 있어요." }, { status: 403 });
  }
  if (match[6].trim() === "예정") {
    return NextResponse.json({ error: "경기가 끝난 뒤 투표할 수 있어요." }, { status: 409 });
  }
  if (match[10].trim()) return NextResponse.json({ error: "이미 MOM이 확정됐어요." }, { status: 409 });

  const deadline = getMomVoteDeadline(match[0] || "", match[1] || "");
  if (!deadline || Date.now() >= deadline.getTime()) {
    return NextResponse.json({ error: "MOM 투표가 마감됐어요." }, { status: 409 });
  }
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
  const session = await auth();
  const voterName = session?.user?.name?.trim();
  if (!session?.user?.kakaoId || !voterName) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  try {
    const { matchId, votedFor, voteType } = await request.json();
    if (matchId === undefined || !votedFor?.trim() || !voteType?.trim()) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    const numericMatchId = Number(matchId);
    const unavailable = await assertVotingOpen(numericMatchId, voterName);
    if (unavailable) return unavailable;

    // 백엔드가 같은 경기·투표자·부문의 기존 표를 한 트랜잭션에서 교체한다.
    await appendMomVote({ matchId: numericMatchId, voterName, votedFor, voteType });
    revalidateAppData(UD_TAG.momVote, UD_TAG.stats, UD_TAG.titles);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  const voterName = session?.user?.name?.trim();
  if (!session?.user?.kakaoId || !voterName) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  try {
    const { matchId, voteType } = await request.json();
    if (matchId === undefined) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    const numericMatchId = Number(matchId);
    const unavailable = await assertVotingOpen(numericMatchId, voterName);
    if (unavailable) return unavailable;
    await deleteMomVote(numericMatchId, voterName, voteType);
    revalidateAppData(UD_TAG.momVote, UD_TAG.stats, UD_TAG.titles);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
