import { NextRequest, NextResponse } from "next/server";
import { appendMatch } from "@/app/lib/sheets-write";
import { getMatches } from "@/app/lib/matches-backend";
import { sendPushToAll } from "@/app/lib/send-push";
import { getMatchWeather, serializeWeather } from "@/app/lib/weather";

/** "YYYY-MM-DD" 두 날짜의 절대 일수 차이(UTC 기준으로 파싱해 TZ 영향 제거). */
function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`);
  return Math.abs(ms) / 86_400_000;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 다음 주 토요일 날짜 계산
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilNextSaturday = ((6 - dayOfWeek + 7) % 7) || 7;
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + daysUntilNextSaturday);

    const dateStr = `${nextSaturday.getFullYear()}-${String(nextSaturday.getMonth() + 1).padStart(2, "0")}-${String(nextSaturday.getDate()).padStart(2, "0")}`;

    // 중복 방지: 목표 토요일과 ±3일 이내에 이미 매치가 있으면 건너뛴다.
    // (예: 예외적으로 금/일요일 경기를 미리 만들어 둔 주 → 토요일 매치 자동 생성 방지)
    const existing = await getMatches();
    const clash = existing.find(
      (m) => m.date && daysBetween(m.date, dateStr) <= 3
    );
    if (clash) {
      console.log(`[cron] 인접 매치(${clash.date}) 존재 → ${dateStr} 생성 건너뜀`);
      return NextResponse.json({ ok: true, skipped: true, date: dateStr, reason: `nearby match ${clash.date}` });
    }

    // 날씨 조회 시도 (5일 이내면 가능)
    let weatherStr = "";
    try {
      const weather = await getMatchWeather(dateStr, "미정", "미정");
      if (weather.available) weatherStr = serializeWeather(weather);
    } catch (e) {
      console.error("[cron] 날씨 조회 실패 (무시):", e);
    }

    await appendMatch({
      date: dateStr,
      time: "미정",
      location: "미정",
      opponent: "미정",
      type: "일반 매칭",
      weather: weatherStr,
    });

    try {
      await sendPushToAll({
        title: "다음 주 출석 투표가 열렸어요",
        body: `${dateStr} 경기 참석 여부를 투표해주세요!`,
        url: "/vote",
      });
    } catch (e) {
      console.error("[push] 투표 알림 실패:", e);
    }

    return NextResponse.json({ ok: true, date: dateStr, weather: weatherStr || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[cron] create-match 실패:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
