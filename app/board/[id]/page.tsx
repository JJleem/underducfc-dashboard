import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "../../lib/admin";
import { getBoardPost, listBoardComments, getMyLikedPostIds, listBoardPosts } from "../../lib/board";
import { getRosterRows, getStatsRows, getFeaturedRows } from "../../lib/backend";
import {
  pickBadges,
  type EarnedTitle,
} from "../../lib/titles";
import { getTeamTitleData } from "../../lib/titles-cache";
import BoardDetailClient from "./BoardDetailClient";

export const dynamic = "force-dynamic";

type Stat = { apps: number; goals: number; assists: number; mom: number; pos?: string };

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) notFound();

  // 클릭 후 대기 시간을 줄이려 병렬 fetch (기존엔 순차 왕복 → 버벅임)
  const [post, comments, rosterRows, session, allPosts] = await Promise.all([
    getBoardPost(postId),
    listBoardComments(postId).catch(() => []),
    getRosterRows().catch(() => [] as string[][]),
    auth(),
    // 위아래 스와이프로 넘길 이웃 글. 목록 순서(최신순)를 그대로 쓴다.
    listBoardPosts().catch(() => []),
  ]);
  if (!post) notFound();

  // 이름 → 등번호 맵 (댓글 앞 등번호 배지용, 피드백 댓글과 동일 스타일)
  const rosterMap: Record<string, string> = {};
  rosterRows.slice(1).forEach((r) => {
    const name = (r[1] || "").trim();
    if (name) rosterMap[name] = r[0] || "";
  });

  // 이름 → 주장 역할 (F=비고: C / VC)
  const captainRoles: Record<string, string> = {};
  rosterRows.slice(1).forEach((r) => {
    const name = (r[1] || "").trim();
    const role = (r[5] || "").trim().toUpperCase();
    if (name && (role === "C" || role === "VC")) captainRoles[name] = role;
  });

  // 전술 글이면 경기 라인업과 똑같이 얼굴·칭호·시즌 기록을 붙인다.
  // 유튜브 글은 이 데이터가 필요 없으므로 아예 받아오지 않는다.
  const playerStats: Record<string, Stat> = {};
  const playerTitles: Record<string, EarnedTitle[]> = {};

  if (post.lineup) {
    // 칭호 계산에 쓰던 나머지 소스는 titles-cache 로 옮겨갔다. 여기 남는 건
    // 시즌 기록(stats) 과 대표 칭호(featured) 둘뿐이다 → rows(0), rows(1).
    const results = await Promise.allSettled([
      getStatsRows(), getFeaturedRows(),
    ]);
    const rows = (i: number): string[][] =>
      results[i].status === "fulfilled"
        ? (results[i] as PromiseFulfilledResult<string[][]>).value
        : [];

    const rawStats = rows(0);
    rawStats.slice(1).forEach((row) => {
      const name = (row[1] || "").trim();
      if (!name) return;
      playerStats[name] = {
        apps: Number(row[3]) || 0,
        goals: Number(row[4]) || 0,
        assists: Number(row[5]) || 0,
        mom: Number(row[6]) || 0,
        pos: row[2] || "-",
      };
    });

    // 칭호 산출은 45초 캐시된 팀 전체 결과를 재사용한다(요청마다 다시 계산하지 않는다).
    const { allTitles } = await getTeamTitleData();
    const featuredMap: Record<string, string[]> = {};
    rows(1).forEach((row) => {
      const name = (row[0] || "").trim();
      if (!name) return;
      const ids = [row[1], row[2], row[3]].map((v) => (v || "").trim()).filter(Boolean);
      if (ids.length) featuredMap[name] = ids;
    });
    Object.entries(allTitles).forEach(([name, all]) => {
      playerTitles[name] = pickBadges(all, featuredMap[name]);
    });
  }

  const currentUser = session?.user
    ? {
        kakaoId: (session.user as { kakaoId?: string }).kakaoId ?? "",
        name: session.user.name ?? "",
      }
    : null;

  if (currentUser?.kakaoId) {
    try {
      const liked = await getMyLikedPostIds(currentUser.kakaoId);
      post.likedByMe = liked.has(post.id);
    } catch {
      /* 무시 */
    }
  }

  // 목록에서 위 = 더 최신, 아래 = 더 오래된 글.
  // 스와이프는 눈에 안 보이므로 글 아래에 링크로도 둔다 → 제목·작성자까지 넘긴다.
  const at = allPosts.findIndex((p) => p.id === postId);
  const brief = (p: (typeof allPosts)[number]) => ({
    id: p.id,
    title: p.title,
    author: p.author,
  });
  const prev = at > 0 ? brief(allPosts[at - 1]) : null;
  const next = at >= 0 && at < allPosts.length - 1 ? brief(allPosts[at + 1]) : null;

  return (
    <BoardDetailClient
      prev={prev}
      next={next}
      post={post}
      comments={comments}
      currentUser={currentUser}
      admin={isAdmin(session?.user)}
      rosterMap={rosterMap}
      captainRoles={captainRoles}
      playerStats={playerStats}
      playerTitles={playerTitles}
    />
  );
}
