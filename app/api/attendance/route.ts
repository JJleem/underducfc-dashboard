import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "../../lib/google-sheets";
import { upsertAttendanceVote } from "../../lib/sheets-write";
import { requireUser } from "@/app/lib/admin";
import { auth } from "@/auth";

export async function GET() {
  try {
    const rows = await getSheetData("attendance_vote!A1:E500");
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

    await upsertAttendanceVote({
      matchId: Number(matchId),
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
