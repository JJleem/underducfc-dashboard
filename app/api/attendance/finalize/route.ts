import { NextRequest, NextResponse } from "next/server";
import { finalizeAttendance, writeMatchWeather } from "../../../lib/sheets-write";
import { requireAdmin } from "@/app/lib/admin";
import { getSheetData } from "@/app/lib/google-sheets";
import { getMatchWeather, serializeWeather } from "@/app/lib/weather";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { matchId } = await request.json();
    if (matchId === undefined) {
      return NextResponse.json({ error: "matchId 필수" }, { status: 400 });
    }

    const id = Number(matchId);
    const attendees = await finalizeAttendance(id);

    // 날씨도 함께 기록
    try {
      const rawMatches = await getSheetData("matches!A1:N50");
      const row = rawMatches[id + 1]; // header offset
      if (row) {
        const date = row[0] || "";
        const time = row[1] || "";
        const location = row[2] || "";
        const existingWeather = row[13] || ""; // N열
        if (!existingWeather) {
          const weather = await getMatchWeather(date, time, location);
          if (weather.available) {
            await writeMatchWeather(id, serializeWeather(weather));
          }
        }
      }
    } catch (e) {
      console.error("[finalize] 날씨 기록 실패 (무시):", e);
    }

    return NextResponse.json({ ok: true, attendees });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
