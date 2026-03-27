import { NextRequest, NextResponse } from "next/server";
import { writeLineup } from "../../lib/sheets-write";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, quarter, formation, players, subs } = body;

    if (matchId === undefined || !quarter || !formation) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    await writeLineup({ matchId, quarter, formation, players: players || [], subs: subs || [] });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
