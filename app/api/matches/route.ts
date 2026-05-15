import { NextRequest, NextResponse } from "next/server";
import { appendMatch } from "@/app/lib/sheets-write";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, time, location, opponent, type } = body;
    if (!date) {
      return NextResponse.json({ error: "날짜는 필수입니다." }, { status: 400 });
    }
    await appendMatch({
      date,
      time: time || "미정",
      location: location || "미정",
      opponent: opponent || "미정",
      type: type || "일반 매칭",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
