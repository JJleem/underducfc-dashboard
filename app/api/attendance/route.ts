import { NextRequest, NextResponse } from "next/server";
import { getMatchesRows } from "../../lib/matches-backend";
import { getAttendanceVoteRows } from "../../lib/backend";
import { upsertAttendanceVote } from "../../lib/sheets-write";
import { requireUser } from "@/app/lib/admin";
import { auth } from "@/auth";

export async function GET() {
  try {
    const rows = await getAttendanceVoteRows();
    const votes = rows.slice(1).map((row: string[]) => ({
      matchId: Number(row[0]) || 0,
      kakaoId: row[1] || "",
      nickname: row[2] || "",
      response: row[3] || "",
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
    const session = await auth();
    const kakaoId = (session?.user as { kakaoId?: string })?.kakaoId;
    const nickname = session?.user?.name;
    if (!kakaoId || !nickname) {
      return NextResponse.json({ error: "세션 정보 없음" }, { status: 401 });
    }

    const { matchId, response } = await request.json();
    if (matchId === undefined || !response?.trim()) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    if (!["참석", "불참", "미정"].includes(response)) {
      return NextResponse.json({ error: "잘못된 응답값" }, { status: 400 });
    }
    const id = Number(matchId);
    const rawMatches = await getMatchesRows();
    const matchRow = rawMatches[id + 1];
    if (!matchRow) {
      return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
    }
    if ((matchRow[6] || "예정").trim() !== "예정") {
      return NextResponse.json({ error: "종료된 경기에는 투표할 수 없습니다." }, { status: 409 });
    }
    if ((matchRow[14] || "").trim() === "마감") {
      return NextResponse.json({ error: "이미 마감된 투표입니다." }, { status: 409 });
    }

    await upsertAttendanceVote({
      matchId: id,
      kakaoId,
      nickname,
      response,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
