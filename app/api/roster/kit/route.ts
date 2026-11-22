import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/app/lib/admin";
import { revalidateAppData, UD_TAG } from "@/app/lib/cache";
import { udPut } from "@/app/lib/underduck";

// 선수 사진 유니폼(하계/동계)은 본인만 설정 → name은 세션에서 강제(클라이언트 입력 무시).
// kit: "summer" | "winter" | ""(자동 — 동계 사진이 있으면 동계)
export async function PUT(request: NextRequest) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const session = await auth();
    const name = session?.user?.name;
    if (!name) return NextResponse.json({ error: "세션 정보 없음" }, { status: 401 });

    const { kit } = await request.json();
    if (kit !== "summer" && kit !== "winter" && kit !== "") {
      return NextResponse.json({ error: "kit 값이 올바르지 않습니다." }, { status: 400 });
    }

    await udPut("/api/underduck/roster/kit", { name, kit });
    revalidateAppData(UD_TAG.roster);
    return NextResponse.json({ ok: true, kit });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
