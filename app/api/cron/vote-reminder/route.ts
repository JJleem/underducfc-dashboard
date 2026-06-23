import { NextRequest, NextResponse } from "next/server";
import { getMatchesRows } from "@/app/lib/matches-backend";
import { sendPushToAll } from "@/app/lib/send-push";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await getMatchesRows();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 투표가 열려있는(예정 + 진행중) 다가오는 경기가 있을 때만 알림
    const openMatch = rows.slice(1).find((row) => {
      const date = row[0];
      const result = row[6] || "예정";
      const status = row[14]; // O열: "마감"이면 마감
      if (!date) return false;
      const matchDate = new Date(date);
      if (Number.isNaN(matchDate.getTime())) return false;
      matchDate.setHours(0, 0, 0, 0);
      return result === "예정" && status !== "마감" && matchDate >= today;
    });

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
