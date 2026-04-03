import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "../../lib/google-sheets";
import { appendFeedback, deleteFeedback } from "../../lib/sheets-write";

export async function GET() {
  try {
    const rows = await getSheetData("feedback!A1:D500");
    const feedbacks = rows.slice(1).map((row: string[]) => ({
      matchId: Number(row[0]) || 0,
      timestamp: row[1] || "",
      name: row[2] || "",
      message: row[3] || "",
    }));
    return NextResponse.json(feedbacks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, name, message } = body;

    if (matchId === undefined || !name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    await appendFeedback({ matchId: Number(matchId), name, message });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { matchId, timestamp, name, message } = await request.json();
    if (matchId === undefined || !timestamp || !name || !message) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    await deleteFeedback(Number(matchId), timestamp, name, message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
