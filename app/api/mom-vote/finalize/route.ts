import { NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { requireUser } from "@/app/lib/admin";
import { finalizeMomVotes } from "@/app/lib/finalize-mom";

// 로그인 회원이 투표 마감을 감지하면 호출한다. 입력값 없이 서버가 마감 경기만 확정한다.
export async function POST() {
  const denied = await requireUser();
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
