import { NextRequest, NextResponse } from "next/server";
import { isVoteClosed } from "@/app/lib/vote-deadline";
import { getMatchesRows } from "@/app/lib/matches-backend";
import { sendPushToAll } from "@/app/lib/send-push";
import { isRestWeek } from "@/app/lib/home-state";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await getMatchesRows();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 다가오는 예정 일정(야유회 제외)을 가까운 순으로
    const upcoming = rows
      .slice(1)
      .filter((row) => {
        const date = row[0];
        if (!date || (row[6] || "예정") !== "예정") return false;
        if ((row[7] || "").replace(/\s+/g, "") === "야유회") return false;
        const matchDate = new Date(date);
        if (Number.isNaN(matchDate.getTime())) return false;
        matchDate.setHours(0, 0, 0, 0);
        return matchDate >= today;
      })
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    // 이번 주가 휴식이면 보내지 않는다. 복귀전 투표가 미리 열려 있어도 그렇다 —
    // "마감 전이에요" 는 이번 주 경기 얘기인데, 이번 주엔 경기가 없다.
    if (upcoming[0] && isRestWeek(upcoming[0][7])) {
      return NextResponse.json({ ok: true, skipped: "휴식 주" });
    }

    // 투표가 열려있는(예정 + 진행중) 다가오는 경기가 있을 때만 알림
    // 전날 23:00(KST)이 지난 경기도 마감으로 본다.
    const openMatch = upcoming.find((row) => !isRestWeek(row[7]) && !isVoteClosed(row[0], row[14]));

    if (!openMatch) {
      return NextResponse.json({ ok: true, skipped: "열린 투표 없음" });
    }

    await sendPushToAll({
      title: "출석 투표 마감 전이에요",
      body: "아직 투표 안 하셨다면 잊지 말고 참석 여부 투표해주세요!",
      url: "/vote",
    });

    return NextResponse.json({ ok: true, matchDate: openMatch[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[cron] vote-reminder 실패:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
