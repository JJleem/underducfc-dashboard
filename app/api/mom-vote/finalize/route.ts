import { NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { requireAdmin } from "@/app/lib/admin";
import { finalizeMomVotes } from "@/app/lib/finalize-mom";

// 관리자 수동 실행. 정기 확정은 크론이 한다(app/api/cron/finalize-mom).
export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const finalized = await finalizeMomVotes();
    revalidateAppData();
    return NextResponse.json({ ok: true, finalized });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[MOM finalize error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
