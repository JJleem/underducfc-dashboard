// auth.ts — Auth.js v5 (카카오 로그인)
// 카카오는 "로그인 순간"의 신원 확인용으로만 사용하고, 이후는 우리 JWT 세션으로 유지.
import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { upsertUser } from "@/app/lib/sheets-write";

type KakaoProfile = {
  id?: number | string;
  kakao_account?: {
    profile?: { nickname?: string; profile_image_url?: string };
  };
};

const MEMBER_NAME_ALIASES: Record<string, string> = {
  준수: "김준수",
  성원: "백성원",
  창의: "홍창의",
};

const normalizeMemberName = (name?: string | null) => {
  const trimmed = name?.trim() ?? "";
  return MEMBER_NAME_ALIASES[trimmed] ?? trimmed;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Kakao],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365, // 1년 — 거의 안 풀림
    updateAge: 60 * 60 * 24, // 하루 1회 갱신 → 활동하면 만료 자동 연장
  },
  trustHost: true,
  callbacks: {
    async jwt({ token, profile, account }) {
      // 최초 로그인 시에만 profile 존재
      if (account && profile) {
        const kakao = profile as KakaoProfile;
        token.kakaoId = String(kakao.id ?? "");
        const p = kakao.kakao_account?.profile;
        if (p?.nickname) token.name = normalizeMemberName(p.nickname);
        if (p?.profile_image_url) token.picture = p.profile_image_url;
      }
      token.name = normalizeMemberName(token.name);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { kakaoId?: string }).kakaoId = token.kakaoId as string;
        session.user.name = normalizeMemberName(token.name);
      }
      return session;
    },
  },
  events: {
    // 로그인할 때마다 users 시트에 기록(신규 생성 / 기존 갱신).
    // 시트 오류가 로그인 자체를 막지 않도록 try/catch.
    async signIn({ profile }) {
      try {
        const kakao = profile as KakaoProfile;
        if (kakao?.id) {
          const p = kakao.kakao_account?.profile;
          await upsertUser({
            kakaoId: String(kakao.id),
            nickname: normalizeMemberName(p?.nickname),
            profileImage: p?.profile_image_url ?? "",
          });
        }
      } catch (e) {
        console.error("users 시트 upsert 실패:", e);
      }
    },
  },
});
