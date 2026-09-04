import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { finalizeMomVotes } from "@/app/lib/finalize-mom";

// 매주 월요일 12:00 KST. 토요일 경기의 투표는 일요일 정오쯤 닫히므로 여유가 있다.
// 확정할 게 없으면 아무것도 쓰지 않는다(멱등).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const finalized = await finalizeMomVotes();
    if (finalized.length === 0) {
      return NextResponse.json({ ok: true, skipped: "확정할 경기 없음" });
    }
    finalized.forEach(({ matchId, mom }) => console.log(`[cron] MOM 확정 match ${matchId} → ${mom}`));
    revalidateAppData();
    return NextResponse.json({ ok: true, finalized });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[cron] finalize-mom 실패:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
