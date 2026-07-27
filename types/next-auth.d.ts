// next-auth 세션·JWT 타입 확장.
//
// `kakaoId`는 카카오 원본 ID가 아니라 **백엔드 가명 ID(pid)** 다.
// 원본 ID는 관리자 화이트리스트 대조에만 필요해서 JWT(`rawKakaoId`)에만 남기고
// 세션으로는 절대 내보내지 않는다. [[auth.ts]] 참조.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      /** 백엔드 가명 ID(pid) — HMAC-SHA256 hex 64자 */
      kakaoId?: string;
      isAdmin?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** 백엔드 가명 ID(pid) */
    kakaoId?: string;
    /** 카카오 원본 ID — 관리자 화이트리스트 대조 전용. 세션으로 내보내지 않는다. */
    rawKakaoId?: string;
    isAdmin?: boolean;
  }
}
