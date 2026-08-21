// app/lib/titles-cache.ts
//
// 칭호 산출 결과를 요청 간 캐시한다.
//
// 왜: `/`, `/board/[id]`, `/matches/[id]`, `/players/[name]` 네 페이지가 모두
// buildContexts + evaluateLeaders + evaluatePlayer 를 **요청마다** 처음부터 다시 돌린다.
// 네 페이지 합쳐 관측 기간에 약 6천 요청이고 회당 10~14ms 라 무시할 양이 아니었다.
//
// 그런데 입력은 udReadOpts(45초) 로 이미 캐시된 같은 데이터다. 즉 45초 동안은
// 아무리 다시 계산해도 **결과가 똑같다**. 그래서 결과 자체를 같은 45초/같은 태그로 캐시한다.
//
// 실측(선수 38명 · 경기 24 · 라인업 49행):
//   매 요청 계산   13.69 ms
//   캐시 역직렬화   0.22 ms   (페이로드 50KB)
//
// 신선도 계약은 그대로다. 태그가 UD_READ_TAG 라서 쓰기 라우트의 revalidateAppData()
// 가 데이터 캐시를 비울 때 이 결과도 같이 버려진다. 그래서 "경기 결과 저장했는데
// 칭호만 45초 동안 옛것" 같은 어긋남이 생기지 않는다.
//
// ⚠️ unstable_cache 콜백 안에서는 cookies()/headers() 를 읽을 수 없다.
//    여기서 부르는 read 래퍼는 전부 GET 이고, underduckFetch 는 신원 헤더를
//    쓰기(method !== "GET")에만 붙이므로 세션을 건드리지 않는다.

import { unstable_cache } from "next/cache";
import { UD_READ_REVALIDATE, UD_READ_TAG, UD_TAG } from "./cache";
import { getMatchesRows } from "./matches-backend";
import {
  getStatsRows,
  getRosterRows,
  getLineupRows,
  getAttendanceVoteRows,
  getVoteCommentRows,
  getFeedbackRows,
  getBoardCommentRows,
  getBoardPostRows,
  getBoardLikeGiverRows,
} from "./backend";
import {
  buildContexts,
  evaluateLeaders,
  evaluatePlayer,
  managerTitle,
  MANAGER_NAME,
  type EarnedTitle,
  type PosGroup,
} from "./titles";

export interface TeamTitleData {
  /**
   * 선수별 획득 칭호 전부 — 감독 → 리더(팀 1위) → 자동 칭호 순.
   * 칭호가 하나도 없는 선수는 키가 없다(호출부에서 `?? []`).
   */
  allTitles: Record<string, EarnedTitle[]>;
  /** 선수별 포지션 라인업 등장 쿼터 수. 프로필의 포지션 출전 분포·주 포지션 판정용. */
  posLineupCounts: Record<string, Record<PosGroup, number>>;
}

async function computeTeamTitleData(): Promise<TeamTitleData> {
  // 선택 소스는 기존 호출부와 같이 실패 시 빈 배열로 폴백한다(칭호 일부만 빠지고 페이지는 산다).
  const optional = (): string[][] => [];
  const [
    rawStats,
    rawRoster,
    rawMatches,
    rawLineups,
    rawAttendanceVotes,
    rawVoteComments,
    rawFeedbacks,
    rawBoardComments,
    rawBoardPosts,
    rawBoardLikeGivers,
  ] = await Promise.all([
    getStatsRows(),
    getRosterRows(),
    getMatchesRows(),
    getLineupRows().catch(optional),
    getAttendanceVoteRows().catch(optional),
    getVoteCommentRows().catch(optional),
    getFeedbackRows().catch(optional),
    getBoardCommentRows().catch(optional),
    getBoardPostRows().catch(optional),
    getBoardLikeGiverRows().catch(optional),
  ]);

  const contexts = buildContexts({
    rawStats,
    rawMatches,
    rawLineups,
    rawRoster,
    rawAttendanceVotes,
    rawVoteComments,
    rawFeedbacks,
    rawBoardComments,
    rawBoardPosts,
    rawBoardLikeGivers,
  });
  const leaders = evaluateLeaders(contexts);

  const allTitles: Record<string, EarnedTitle[]> = {};
  const posLineupCounts: Record<string, Record<PosGroup, number>> = {};
  contexts.forEach((ctx, name) => {
    const all = [...(leaders.get(name) ?? []), ...evaluatePlayer(ctx)];
    if (name === MANAGER_NAME) all.unshift(managerTitle());
    if (all.length) allTitles[name] = all;
    posLineupCounts[name] = ctx.posLineupCounts;
  });
  // 감독이 stats 에 없으면(선수로 안 뜀) 감독 뱃지만 단독 부여 — 기존 각 페이지와 동일.
  if (!allTitles[MANAGER_NAME]) allTitles[MANAGER_NAME] = [managerTitle()];

  return { allTitles, posLineupCounts };
}

/** 팀 전체 칭호 산출 결과. 45초 캐시 + UD_READ_TAG 무효화. */
export const getTeamTitleData = unstable_cache(
  computeTeamTitleData,
  ["underduck-team-titles"],
  { revalidate: UD_READ_REVALIDATE, tags: [UD_READ_TAG, UD_TAG.titles] },
);
