// auth.ts — Auth.js v5 (카카오 로그인)
// 카카오는 "로그인 순간"의 신원 확인용으로만 사용하고, 이후는 우리 JWT 세션으로 유지.
import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { upsertUser } from "@/app/lib/sheets-write";
import { isPseudonym, resolvePseudonym } from "@/app/lib/underduck";
import { isRawKakaoIdAdmin } from "@/app/lib/admin";

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
        token.rawKakaoId = String(kakao.id ?? "");
        const p = kakao.kakao_account?.profile;
        if (p?.nickname) token.name = normalizeMemberName(p.nickname);
        if (p?.profile_image_url) token.picture = p.profile_image_url;
      }
      token.name = normalizeMemberName(token.name);

      // 세션에 노출하는 kakaoId는 카카오 원본이 아니라 백엔드 가명 ID(pid)다.
      // 백엔드가 pid만 저장·반환하므로, 소유권 비교가 성립하려면 세션도 pid여야 한다.
      //
      // 세션 maxAge가 1년이라 가명화 배포 시점에 이미 발급된 토큰에는 원본 ID가
      // 들어 있다. 그 토큰도 여기서 한 번 pid로 교체된다(재로그인 불필요).
      const current = typeof token.kakaoId === "string" ? token.kakaoId : "";
      if (!isPseudonym(current)) {
        const raw = (token.rawKakaoId as string | undefined) || current;
        if (raw) {
          token.rawKakaoId = raw;
          try {
            token.kakaoId = await resolvePseudonym(raw);
          } catch (e) {
            // 백엔드 일시 장애로 로그인이 막히지 않게 한다. 다음 요청에 재시도된다.
            console.error("kakao_id 가명화 실패(다음 요청에 재시도):", e);
          }
        }
      }

      // 관리자 판정은 화이트리스트(ADMIN_KAKAO_IDS, 원본 ID 기준)와 대조해야 하므로
      // 원본은 토큰에만 남기고 세션으로는 내보내지 않는다. 매 요청 재평가되므로
      // 화이트리스트를 바꾸면 재로그인 없이 반영된다.
      token.isAdmin = isRawKakaoIdAdmin(token.rawKakaoId as string | undefined);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { kakaoId?: string; isAdmin?: boolean };
        u.kakaoId = token.kakaoId as string;   // 가명 ID(pid)
        u.isAdmin = Boolean(token.isAdmin);
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
