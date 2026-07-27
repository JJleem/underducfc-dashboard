// app/lib/admin.ts — 관리자 권한 게이팅
//
// 관리자 = env ADMIN_KAKAO_IDS(콤마 구분) 화이트리스트. 값은 **카카오 원본 ID** 기준이다.
//
// 세션의 `kakaoId`는 백엔드 가명 ID(pid)라 화이트리스트와 직접 대조할 수 없다.
// 그래서 판정은 로그인 토큰 안에서 원본 ID로 한 번 하고([[auth.ts]] jwt 콜백),
// 결과 불리언만 세션에 실어 내보낸다. 여기서는 그 불리언을 읽는다.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

type SessionUser = { kakaoId?: string; isAdmin?: boolean };

/**
 * 카카오 **원본** ID가 관리자 화이트리스트에 있는지.
 * auth.ts의 jwt 콜백 전용 — 원본 ID를 가진 곳은 거기뿐이다.
 */
export function isRawKakaoIdAdmin(rawKakaoId?: string | null): boolean {
  if (!rawKakaoId) return false;
  const ids = (process.env.ADMIN_KAKAO_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(rawKakaoId);
}

/** 세션 사용자 객체가 관리자인지. 페이지·컴포넌트는 이걸 쓴다. */
export function isAdmin(user?: SessionUser | null): boolean {
  return Boolean(user?.isAdmin);
}

/** 현재 로그인 세션의 가명 ID(pid). 비로그인 시 null. */
export async function currentKakaoId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as SessionUser | undefined)?.kakaoId ?? null;
}

/** 현재 로그인 세션이 관리자인지. route handler / server component에서 쓴다. */
export async function currentIsAdmin(): Promise<boolean> {
  const session = await auth();
  return Boolean((session?.user as SessionUser | undefined)?.isAdmin);
}

/** 라우트 가드: 관리자면 null, 아니면 에러 응답(401/403)을 반환 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.kakaoId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  return null;
}

/** 라우트 가드: 로그인 회원이면 null, 아니면 에러 응답(401)을 반환 */
export async function requireUser(): Promise<NextResponse | null> {
  const kakaoId = await currentKakaoId();
  if (!kakaoId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return null;
}
