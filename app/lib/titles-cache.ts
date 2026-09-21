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
// 시즌제 이후로는 한 번에 **두 벌**을 낸다(통산 / 해당 시즌). 계산은 두 배지만
// 여전히 30ms 미만이고 캐시가 다 받아낸다. 두 벌을 한 캐시 항목에 함께 담는 이유는
// 프로필이 둘 다 필요해서다 — 따로 캐시하면 같은 raw 데이터를 두 번 읽는다.
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
import { seasonLabel } from "./seasons";
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
  SEASON_TITLES,
  type EarnedTitle,
  type PosGroup,
} from "./titles";

export interface TeamTitleData {
  /**
   * 선수별 표시용 칭호 전부 — 감독 → 리더(시즌 1위) → 통산 자동 칭호 순.
   * 칭호가 하나도 없는 선수는 키가 없다(호출부에서 `?? []`).
   *
   * 라인업 뷰어·게시판·대표 칭호(featured)가 쓰는 "그 선수의 칭호" 기본 목록이다.
   * 순서와 구성은 시즌제 이전과 같다 — 리더는 원래도 "지금 팀 내 1위"였고,
   * 시즌이 생긴 지금 그 뜻이 곧 "이번 시즌 1위"이기 때문이다.
   */
  allTitles: Record<string, EarnedTitle[]>;
  /**
   * 그 시즌 기록만으로 딴 칭호 (리더 + 시즌 등급/달성).
   * 프로필의 "시즌" 섹션 전용. 등급 컷은 통산의 약 1/4 이다(titles.SEASON_OVERRIDES).
   */
  seasonTitles: Record<string, EarnedTitle[]>;
  /** 전 기간 누적으로 딴 칭호 (감독 → 통산 자동 칭호). 프로필의 "통산" 섹션 전용. */
  careerTitles: Record<string, EarnedTitle[]>;
  /** 선수별 포지션 라인업 등장 쿼터 수(통산). 프로필의 주 포지션 판정용. */
  posLineupCounts: Record<string, Record<PosGroup, number>>;
  /** 같은 것의 **그 시즌** 버전. 시즌 베스트 11 을 뽑을 때 쓴다. */
  seasonPosQuarters: Record<string, Record<PosGroup, number>>;
}

async function computeTeamTitleData(seasonId: string): Promise<TeamTitleData> {
  // 선택 소스는 기존 호출부와 같이 실패 시 빈 배열로 폴백한다(칭호 일부만 빠지고 페이지는 산다).
  const optional = (): string[][] => [];
  const [
    rawStats,
    rawSeasonStats,
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
    // 시즌 등급은 시즌 출전·골·도움 위에서 매겨야 한다. 통산 stats 를 그대로 쓰면
    // "시즌 3경기 출전인데 시즌 골게터 GOAT" 같은 게 나온다.
    getStatsRows(seasonId).catch(optional),
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

  const sources = {
    rawMatches,
    rawLineups,
    rawRoster,
    rawAttendanceVotes,
    rawVoteComments,
    rawFeedbacks,
    rawBoardComments,
    rawBoardPosts,
    rawBoardLikeGivers,
  };

  const careerContexts = buildContexts({ ...sources, rawStats });
  const seasonContexts = buildContexts({ ...sources, rawStats: rawSeasonStats }, { seasonId });

  // 리더는 임계값이 아니라 "지금 팀 내 1위" 라서 시즌 기록으로 뽑는다.
  // 통산 1위를 따로 주지는 않는다 — 왕관이 두 종류가 되면 어느 쪽이 진짜인지 흐려진다.
  // 리더도 시즌 칭호다. **여기서 한 번만** 태그해 allTitles·seasonTitles 가 같은 객체를
  // 쓰게 한다 — 한쪽만 태그하면 같은 득점왕이 `career:lead_goals` 와
  // `season:2627:lead_goals` 라는 서로 다른 대표 키를 갖게 되고, 대표로 걸어둔 게
  // 화면에 따라 붙었다 떨어졌다 한다.
  const label = seasonLabel(seasonId);
  const tagSeason = (t: EarnedTitle): EarnedTitle => ({
    ...t,
    scope: "season",
    seasonId,
    seasonLabel: label,
  });
  const leaders = new Map(
    [...evaluateLeaders(seasonContexts)].map(([name, ts]) => [name, ts.map(tagSeason)]),
  );

  const allTitles: Record<string, EarnedTitle[]> = {};
  const seasonTitles: Record<string, EarnedTitle[]> = {};
  const careerTitles: Record<string, EarnedTitle[]> = {};
  const posLineupCounts: Record<string, Record<PosGroup, number>> = {};
  const seasonPosQuarters: Record<string, Record<PosGroup, number>> = {};

  careerContexts.forEach((ctx, name) => {
    const career = evaluatePlayer(ctx);
    if (name === MANAGER_NAME) career.unshift(managerTitle());
    if (career.length) careerTitles[name] = career;

    const all = [...(leaders.get(name) ?? []), ...evaluatePlayer(ctx)];
    if (name === MANAGER_NAME) all.unshift(managerTitle());
    if (all.length) allTitles[name] = all;

    posLineupCounts[name] = ctx.posLineupCounts;
  });

  seasonContexts.forEach((ctx, name) => {
    // scope="season" 이 뱃지 모양·재질을 가른다(육각 + 브러시드).
    // 리더는 variant 가 우선이라 톱니 메달을 그대로 유지한다 — 왕관은 한 종류여야 한다.
    // 리더는 이미 태그돼 있다. 나머지 시즌 자동 칭호만 여기서 태그한다.
    const season = [
      ...(leaders.get(name) ?? []),
      ...evaluatePlayer(ctx, SEASON_TITLES).map(tagSeason),
    ];
    if (season.length) seasonTitles[name] = season;
    seasonPosQuarters[name] = ctx.posLineupCounts;
  });

  // 리더만 있고 통산 칭호가 하나도 없는 선수(시즌 첫 경기 득점왕 등)도 allTitles 에 있어야 한다.
  leaders.forEach((earned, name) => {
    if (!allTitles[name]) allTitles[name] = [...earned];
  });

  // 감독이 stats 에 없으면(선수로 안 뜀) 감독 뱃지만 단독 부여 — 기존 각 페이지와 동일.
  if (!allTitles[MANAGER_NAME]) allTitles[MANAGER_NAME] = [managerTitle()];
  if (!careerTitles[MANAGER_NAME]) careerTitles[MANAGER_NAME] = [managerTitle()];

  return { allTitles, seasonTitles, careerTitles, posLineupCounts, seasonPosQuarters };
}

/**
 * 팀 전체 칭호 산출 결과. 45초 캐시 + UD_READ_TAG 무효화.
 *
 * seasonId 는 캐시 키에 포함된다(unstable_cache 가 인자를 키에 넣는다) —
 * 지난 시즌을 열어 본 뒤 현재 시즌으로 돌아와도 서로 섞이지 않는다.
 */
export const getTeamTitleData = unstable_cache(
  computeTeamTitleData,
  ["underduck-team-titles"],
  { revalidate: UD_READ_REVALIDATE, tags: [UD_READ_TAG, UD_TAG.titles] },
);
