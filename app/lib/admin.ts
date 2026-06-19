// app/lib/admin.ts — 관리자 권한 게이팅
// 관리자 = env ADMIN_KAKAO_IDS(콤마 구분) 화이트리스트. 신원은 카카오 로그인 세션(kakaoId).
import { auth } from "@/auth";
import { NextResponse } from "next/server";

/** kakaoId가 관리자 화이트리스트에 포함되는지 */
export function isAdmin(kakaoId?: string | null): boolean {
  if (!kakaoId) return false;
  const ids = (process.env.ADMIN_KAKAO_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(kakaoId);
}

/** 현재 로그인 세션의 kakaoId (비로그인 시 null) */
export async function currentKakaoId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { kakaoId?: string } | undefined)?.kakaoId ?? null;
}

/** 라우트 가드: 관리자면 null, 아니면 에러 응답(401/403)을 반환 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const kakaoId = await currentKakaoId();
  if (!kakaoId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!isAdmin(kakaoId)) return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  return null;
}

/** 라우트 가드: 로그인 회원이면 null, 아니면 에러 응답(401)을 반환 */
export async function requireUser(): Promise<NextResponse | null> {
  const kakaoId = await currentKakaoId();
  if (!kakaoId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return null;
}
