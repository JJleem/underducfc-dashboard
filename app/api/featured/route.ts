import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { auth } from "@/auth";
import { writeFeaturedTitles } from "../../lib/sheets-write";

// 대표 칭호 저장: 로그인한 본인(카카오 닉네임 = 선수명)만 자기 것 저장 가능
export async function POST(req: NextRequest) {
  const session = await auth();
  const name = session?.user?.name?.trim();
  const user = session?.user as
    | { name?: string | null; kakaoId?: string; isAdmin?: boolean }
    | undefined;
  if (!name || !user?.kakaoId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { titleIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const ids = Array.isArray(body.titleIds)
    ? body.titleIds.map((x) => String(x)).filter(Boolean).slice(0, 3)
    : [];

  try {
    // 이 라우트에서 확인한 세션 신원을 그대로 백엔드에 전달한다.
    // 쓰기 헬퍼 안에서 auth()를 다시 부르면 요청 문맥에 따라 신원 헤더가 빠져
    // 백엔드가 개인 칭호 변경을 거부할 수 있다.
    await writeFeaturedTitles(name, ids, {
      userId: user.kakaoId,
      isAdmin: user.isAdmin,
    });
    revalidateAppData();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
