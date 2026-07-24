import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/app/lib/admin";
import { revalidateAppData } from "@/app/lib/cache";
import { udPut } from "@/app/lib/underduck";

// 선호 포지션은 본인만 설정 → name은 세션에서 강제(클라이언트 입력 무시).
export async function PUT(request: NextRequest) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const session = await auth();
    const name = session?.user?.name;
    if (!name) return NextResponse.json({ error: "세션 정보 없음" }, { status: 401 });

    const { positions } = await request.json();
    if (!Array.isArray(positions)) {
      return NextResponse.json({ error: "positions 배열이 필요합니다." }, { status: 400 });
    }
    const cleaned = positions
      .map((p: unknown) => String(p).trim())
      .filter(Boolean)
      .slice(0, 3);

    await udPut("/api/underduck/roster/pref-pos", { name, pref_pos: cleaned.join(",") });
    revalidateAppData();
    return NextResponse.json({ ok: true, pref_pos: cleaned });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
