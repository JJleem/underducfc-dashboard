import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { finalizeMomVotes } from "@/app/lib/finalize-mom";

// 매일 12:00 KST 안전망. 실제 즉시 확정은 MOM 화면의 마감 감지가 요청한다.
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
