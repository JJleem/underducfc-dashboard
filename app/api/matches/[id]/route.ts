import { NextRequest, NextResponse } from "next/server";
import { updateMatchResult } from "@/app/lib/sheets-write";
import { sendPushToAll } from "@/app/lib/send-push";

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
    const { date, time, location, opponent, type, result, ourScore, theirScore, goals, assists, attendees } = body;
    await updateMatchResult(matchId, {
      date: date ?? "",
      time: time ?? "",
      location: location ?? "",
      opponent: opponent ?? "",
      type: type ?? "",
      result: result || "예정",
      ourScore: ourScore ?? "",
      theirScore: theirScore ?? "",
      goals: goals ?? "",
      assists: assists ?? "",
      attendees: attendees ?? "",
    });
    if (result && result !== "예정") {
      const resultEmoji: Record<string, string> = { 승: "🏆", 무: "🤝", 패: "😓", 자체전: "⚽" };
      const emoji = resultEmoji[result] || "⚽";
      sendPushToAll({
        title: `${emoji} 경기 결과가 입력됐어요`,
        body: `vs ${opponent || "상대팀"} ${ourScore ?? ""} : ${theirScore ?? ""} (${result})`,
        url: "/",
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
