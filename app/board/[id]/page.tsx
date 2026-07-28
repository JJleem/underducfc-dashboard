import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "../../lib/admin";
import { getBoardPost, listBoardComments, getMyLikedPostIds } from "../../lib/board";
import {
  getRosterRows,
  getLineupRows,
  getStatsRows,
  getAttendanceVoteRows,
  getVoteCommentRows,
  getFeedbackRows,
  getFeaturedRows,
  getBoardCommentRows,
  getBoardPostRows,
  getBoardLikeGiverRows,
} from "../../lib/backend";
import { getMatchesRows } from "../../lib/matches-backend";
import {
  buildContexts,
  evaluatePlayer,
  evaluateLeaders,
  managerTitle,
  pickBadges,
  MANAGER_NAME,
  type EarnedTitle,
} from "../../lib/titles";
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
  const [post, comments, rosterRows, session] = await Promise.all([
    getBoardPost(postId),
    listBoardComments(postId).catch(() => []),
    getRosterRows().catch(() => [] as string[][]),
    auth(),
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
    const results = await Promise.allSettled([
      getStatsRows(), getMatchesRows(), getLineupRows(), getAttendanceVoteRows(),
      getVoteCommentRows(), getFeedbackRows(), getFeaturedRows(),
      getBoardCommentRows(), getBoardPostRows(), getBoardLikeGiverRows(),
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

    const contexts = buildContexts({
      rawStats,
      rawMatches: rows(1),
      rawLineups: rows(2),
      rawRoster: rosterRows,
      rawAttendanceVotes: rows(3),
      rawVoteComments: rows(4),
      rawFeedbacks: rows(5),
      rawBoardComments: rows(7),
      rawBoardPosts: rows(8),
      rawBoardLikeGivers: rows(9),
    });
    const leaders = evaluateLeaders(contexts);
    const featuredMap: Record<string, string[]> = {};
    rows(6).forEach((row) => {
      const name = (row[0] || "").trim();
      if (!name) return;
      const ids = [row[1], row[2], row[3]].map((v) => (v || "").trim()).filter(Boolean);
      if (ids.length) featuredMap[name] = ids;
    });
    contexts.forEach((ctx, name) => {
      const earned = evaluatePlayer(ctx);
      const lead = leaders.get(name) ?? [];
      const all = [...lead, ...earned];
      if (name === MANAGER_NAME) all.unshift(managerTitle());
      if (all.length) playerTitles[name] = pickBadges(all, featuredMap[name]);
    });
    if (!playerTitles[MANAGER_NAME]) playerTitles[MANAGER_NAME] = [managerTitle()];
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

  return (
    <BoardDetailClient
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
