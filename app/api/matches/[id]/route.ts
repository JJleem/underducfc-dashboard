import { NextRequest, NextResponse } from "next/server";
import { updateMatchResult } from "@/app/lib/sheets-write";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = Number(id);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "잘못된 경기 ID" }, { status: 400 });
    }
    const body = await req.json();
    const { result, ourScore, theirScore, goals, assists, attendees } = body;
    await updateMatchResult(matchId, {
      result: result || "예정",
      ourScore: ourScore ?? "",
      theirScore: theirScore ?? "",
      goals: goals ?? "",
      assists: assists ?? "",
      attendees: attendees ?? "",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
