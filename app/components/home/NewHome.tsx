// 새 홈 — B안 히어로(상태 기반) + 인스타 피드형 경기 목록.
//
// 실제 홈과 /home-preview 가 이 한 파일을 같이 쓴다. 미리보기는 preview 를 켜서
// 상태·레이아웃 스위치를 더 띄울 뿐, 그리는 내용은 완전히 같다.
// (두 벌로 두면 한쪽만 고쳐지는 순간 "미리보기에선 됐는데" 가 시작된다)
//
// 실제 `/`는 이 화면으로 확정됐다. `/home-preview`는 상태별 확인 용도로만 남긴다.

import Link from "next/link";
import { Bell, MapPin } from "lucide-react";
import { auth } from "@/auth";
import { isAdmin } from "../../lib/admin";
import { getMatchesRows, getMyLikedMatchIds } from "../../lib/matches-backend";
import {
  getAttendanceVoteRows,
  getFeedbackRows,
  getLineupRows,
  getNoticeRows,
  getRosterRows,
  getStatsRows,
  getMomVoteRows,
  getFeaturedRows,
} from "../../lib/backend";
import { parseSubstitutions } from "../../lib/lineup";
import { buildMatchStorylines, type Storyline } from "../../lib/storylines";
import { pickBadges, type EarnedTitle } from "../../lib/titles";
import { getTeamTitleData } from "../../lib/titles-cache";
import type { LineupData, MatchData } from "../../lib/match-types";
import {
  HOME_STATES,
  HOME_STATE_LABEL,
  isHomeState,
  isUndecided,
  resolveHomeState,
  type HomeState,
} from "../../lib/home-state";
import HomeHero, { type HeroMatch } from "./HomeHero";
import Disclosure from "./Disclosure";
import MatchRow from "./MatchRow";
import FeedList from "./FeedList";
import NoticeEditor from "./NoticeEditor";
import { type MomVote as MomVoteData } from "./MomVote";
import { type Feedback } from "./FeedbackThread";
import MatchFeed from "./MatchFeed";
import AppHeader from "./AppHeader";

/** 백엔드가 "08:00:00" 으로 주는 경우가 있어 홈과 같은 규칙으로 정규화한다. */
function normalizeTime(raw: string): string {
  if (!raw) return "미정";
  const m = raw.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "미정";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** 히어로는 몰라도 되지만 경기 목록·다음 경기 판정에 필요한 필드.
    (컴포넌트 MatchRow 와 헷갈리지 않게 이름을 나눈다) */
interface MatchRecord extends HeroMatch {
  type: string;
  attendanceStatus: "진행중" | "마감";
  goals: string;
  assists: string;
}

function toMatch(row: string[], id: number): MatchRecord {
  return {
    id,
    date: row[0] || "",
    time: normalizeTime(row[1]),
    location: row[2] || "미정",
    opponent: row[3] || "미정",
    ourScore: row[4] || "-",
    theirScore: row[5] || "-",
    result: row[6] || "예정",
    type: row[7] || "일반 매칭",
    goals: row[8] || "",
    assists: row[9] || "",
    mom: row[10] || "",
    attendees: row[11] || "",
    photos: row[12] || "",
    weather: row[13] || "",
    attendanceStatus: row[14] === "마감" ? "마감" : "진행중",
  };
}

export default async function NewHome({
  forcedState,
  list,
  preview = false,
  previewVote,
}: {
  /** 미리보기에서 상태를 강제로 그려볼 때만 쓴다. */
  forcedState?: string;
  /** "feed"(기본) | "list". 미리보기 비교용으로 남겨둔 스위치. */
  list?: string;
  preview?: boolean;
  /** 미리보기에서 출석 투표 뒤 평시 상태를 재현할 때만 쓴다. */
  previewVote?: string;
}) {
  const forced = forcedState;
  // 경기 목록을 두 방향으로 만들어 두고 여기서 고른다.
  //   list  — 커뮤니티 목록. 한 줄에 다 담고 눌러서 편다. 한 화면에 6~8경기.
  //   feed  — 인스타 피드. 경기 하나가 게시물 하나. 사진이 먼저, 접지 않는다.
  // 둘은 전제가 반대라 섞으면 어느 쪽도 아니게 된다. 그래서 통째로 갈아 끼운다.
  // 인스타 피드로 확정. list 는 미리보기에서 예전 안과 비교할 때만 쓴다.
  const layout: "list" | "feed" = list === "list" ? "list" : "feed";
  const session = await auth();
  const kakaoId = (session?.user as { kakaoId?: string } | undefined)?.kakaoId ?? "";
  const userName = session?.user?.name?.trim() || undefined;
  const admin = isAdmin(session?.user);

  const [rawMatches, rawVotes, rawNotices, rawLineups, rawRoster, rawFeedback, rawStats, rawMomVotes, rawFeatured, myLikedMatchIds] =
    await Promise.all([
      getMatchesRows(),
      getAttendanceVoteRows().catch((): string[][] => []),
      getNoticeRows().catch((): string[][] => []),
      getLineupRows().catch((): string[][] => []),
      getRosterRows().catch((): string[][] => []),
      getFeedbackRows().catch((): string[][] => []),
      getStatsRows().catch((): string[][] => []),
      getMomVoteRows().catch((): string[][] => []),
      getFeaturedRows().catch((): string[][] => []),
      // 로그인했으면 내가 누른 좋아요를 같이 받아 온다. 실패해도 피드는 그대로 뜬다.
      kakaoId
        ? getMyLikedMatchIds(kakaoId).catch(() => new Set<number>())
        : Promise.resolve(new Set<number>()),
    ]);

  const matches = rawMatches.slice(1).map(toMatch);

  // 좋아요 수는 경기 행의 P열로 함께 실려 온다(경기당 추가 왕복 없음).
  const likeCountByMatch: Record<number, number> = {};
  rawMatches.slice(1).forEach((row, id) => {
    const count = Number(row[15]);
    if (count > 0) likeCountByMatch[id] = count;
  });

  // 홈과 같은 기준: 예정 + 야유회 아님 + 투표 안 마감, 그중 가장 이른 경기.
  // (야유회는 결과가 안 채워져 result 가 비는데, 그걸 빼지 않으면 지난 야유회가
  //  영원히 "다음 경기"로 잡힌다.)
  const nextMatch =
    [...matches]
      .filter((m) => m.result === "예정" && m.type !== "야유회" && m.attendanceStatus !== "마감")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;

  const played = matches.filter((m) => m.result !== "예정" && m.type !== "야유회");
  const lastMatch =
    [...played].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;

  const nextVotes = nextMatch
    ? rawVotes.slice(1).filter((r) => Number(r[0]) === nextMatch.id)
    : [];
  const count = (response: string) => nextVotes.filter((r) => (r[3] || "").trim() === response).length;
  const votes = {
    attending: count("참석"),
    maybe: count("미정"),
    absent: count("불참"),
    total: 0,
  };
  votes.total = votes.attending + votes.maybe + votes.absent;

  const myVote = kakaoId
    ? nextVotes.find((r) => (r[1] || "").trim() === kakaoId)?.[3]?.trim()
    : undefined;
  const simulatedVote =
    preview && ["참석", "미정", "불참"].includes(previewVote || "") ? previewVote : undefined;
  const heroMyVote = simulatedVote || myVote;
  const heroVotes = { ...votes };
  if (simulatedVote && simulatedVote !== myVote) {
    if (myVote === "참석") heroVotes.attending = Math.max(0, heroVotes.attending - 1);
    else if (myVote === "미정") heroVotes.maybe = Math.max(0, heroVotes.maybe - 1);
    else if (myVote === "불참") heroVotes.absent = Math.max(0, heroVotes.absent - 1);
    else heroVotes.total += 1;

    if (simulatedVote === "참석") heroVotes.attending += 1;
    else if (simulatedVote === "미정") heroVotes.maybe += 1;
    else if (simulatedVote === "불참") heroVotes.absent += 1;
  }

  const detected = resolveHomeState({
    nextMatch: nextMatch ? { date: nextMatch.date, opponent: nextMatch.opponent } : null,
    lastMatch: lastMatch
      ? { date: lastMatch.date, mom: lastMatch.mom, photos: lastMatch.photos }
      : null,
    hasMyVote: !!myVote,
    loggedIn: !!kakaoId,
  });
  const state: HomeState = isHomeState(forced) ? forced : detected;

  // ── 미리보기 전용 각색 ────────────────────────────────────
  // 상태를 강제로 그려볼 때, 지금 데이터가 그 상태를 대표하지 못하는 경우가 있다.
  //   · D-DAY  → 다음 경기는 시간·장소가 미정이라 "킥오프 08:00"이 안 나온다
  //   · 경기 직후 → 지난 경기는 MOM 이 이미 채워져 MOM 투표 블록이 숨는다
  // 둘 다 제품 동작으로는 맞다. 다만 그러면 레이아웃을 볼 수가 없어서, 강제 전환일
  // 때만 실제 경기 데이터를 빌려와 그 칸을 채운다. 자동 판정일 땐 손대지 않는다.
  const isForced = isHomeState(forced);
  const today = new Date().toISOString().slice(0, 10);
  // id 는 그대로 둔다 — 바꾸면 그 경기에 딸린 라인업·참석자를 못 찾는다.
  const heroNext =
    isForced && state === "dday" && lastMatch
      ? { ...lastMatch, date: today, result: "예정" }
      : nextMatch;
  const heroLast =
    isForced && state === "afterMatch" && lastMatch ? { ...lastMatch, mom: "" } : lastMatch;
  const staged =
    isForced && ((state === "dday" && lastMatch) || (state === "afterMatch" && lastMatch));


  const notice = rawNotices[1];
  // 예정 경기도 목록에 넣는다. 원래 홈은 경기가 잡히는 순간 카드가 생겨서 경기 전에
  // 거기 댓글이 달렸다(8/8 경기에도 이미 한 개 달려 있다). 끝난 경기만 보여주면
  // 그 대화 자리가 통째로 사라진다. 히어로는 "지금 할 일", 이 줄은 "얘기하는 자리"다.
  const upcoming = [...matches]
    .filter((m) => m.result === "예정" && m.type !== "야유회")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  // 피드는 전체를 다 흘린다. 화면에 붙이는 건 FeedList 가 스크롤에 맞춰 나눠서 한다.
  const recent = [
    ...upcoming,
    ...[...played].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  ];
  // ── 경기 카드용 파생 데이터 (실제 홈과 같은 가공) ──────────
  const rosterMap: Record<string, string> = {};
  const captainRoles: Record<string, string> = {};
  rawRoster.slice(1).forEach((r) => {
    const name = (r[1] || "").trim();
    if (!name) return;
    rosterMap[name] = (r[0] || "").trim() || "?";
    const role = (r[5] || "").trim().toUpperCase();
    if (role === "C" || role === "VC") captainRoles[name] = role;
  });

  // 쿼터 라벨("1Q–4Q")과 뷰어 첫 탭이 어긋나지 않게 순서를 맞춰 둔다.
  const QUARTER_ORDER = ["예상", "1Q", "2Q", "3Q", "4Q", "5Q", "6Q"];
  const lineupsByMatch: Record<number, LineupData[]> = {};
  rawLineups.slice(1).forEach((r) => {
    const id = Number(r[0]);
    if (Number.isNaN(id)) return;
    (lineupsByMatch[id] ||= []).push({
      matchId: id,
      quarter: r[1] || "",
      formation: r[2] || "",
      players: Array.from({ length: 11 }, (_, i) => r[3 + i] || ""),
      subs: Array.from({ length: 9 }, (_, i) => r[14 + i] || "").filter(Boolean),
      substitutions: parseSubstitutions(r[23]),
      positions: r[24] || "",
      tactic: r[25] || "",
      instructions: r[26] || "",
    });
  });
  Object.values(lineupsByMatch).forEach((list) =>
    list.sort((a, b) => QUARTER_ORDER.indexOf(a.quarter) - QUARTER_ORDER.indexOf(b.quarter))
  );

  // 경기별 출석 투표 집계. 예정 경기 줄에 "참석 6"을 띄우려면 다음 경기 것만으론 부족하다.
  const votesByMatch: Record<number, { attending: number; maybe: number; absent: number }> = {};
  rawVotes.slice(1).forEach((r) => {
    const id = Number(r[0]);
    if (Number.isNaN(id)) return;
    const bucket = (votesByMatch[id] ||= { attending: 0, maybe: 0, absent: 0 });
    const response = (r[3] || "").trim();
    if (response === "참석") bucket.attending += 1;
    else if (response === "미정") bucket.maybe += 1;
    else if (response === "불참") bucket.absent += 1;
  });

  // 주목 포인트 — 홈과 같은 함수(lib/storylines)를 쓴다. 화면마다 다른 말을 하면 안 된다.
  const playerStats: Record<
    string,
    { apps: number; goals: number; assists: number; mom: number; pos?: string }
  > = {};
  rawStats.slice(1).forEach((r) => {
    const name = (r[1] || "").trim();
    if (!name) return;
    playerStats[name] = {
      pos: r[2],
      apps: Number(r[3]) || 0,
      goals: Number(r[4]) || 0,
      assists: Number(r[5]) || 0,
      mom: Number(r[6]) || 0,
    };
  });
  // 라인업 뷰어에 들어갈 칭호. 기존 홈과 같은 기준(대표 칭호 우선, 없으면 자동 상위 3).
  // 안 넘기면 LineupViewer 가 조용히 빈 값으로 그려서 칭호가 통째로 사라진다.
  const { allTitles } = await getTeamTitleData();
  const featuredMap: Record<string, string[]> = {};
  rawFeatured.forEach((r) => {
    const name = (r[0] || "").trim();
    if (!name) return;
    const ids = [r[1], r[2], r[3]].map((x) => (x || "").trim()).filter(Boolean);
    if (ids.length) featuredMap[name] = ids;
  });
  const playerTitles: Record<string, EarnedTitle[]> = {};
  Object.entries(allTitles).forEach(([name, all]) => {
    playerTitles[name] = pickBadges(all, featuredMap[name]);
  });

  const storylinesByMatch: Record<number, Storyline[]> = {};
  matches.forEach((m) => {
    const att = (m.attendees || "").split(",").map((x) => x.trim()).filter(Boolean);
    storylinesByMatch[m.id] = buildMatchStorylines(m, matches, att, playerStats);
  });

  // MOM 투표 — 시트: A=matchId B=voterName C=votedFor D=voteType
  const momVotesByMatch: Record<number, MomVoteData[]> = {};
  rawMomVotes.slice(1).forEach((r) => {
    const id = Number(r[0]);
    if (Number.isNaN(id)) return;
    (momVotesByMatch[id] ||= []).push({
      matchId: id,
      voterName: (r[1] || "").trim(),
      votedFor: (r[2] || "").trim(),
      voteType: (r[3] || "").trim(),
    });
  });

  // 이름 → 포지션. MOM 투표에서 공격·수비 후보를 나누는 데 쓴다(기존 홈과 같은 기준).
  const positions: Record<string, string> = {};
  rawStats.slice(1).forEach((r) => {
    const name = (r[1] || "").trim();
    if (name) positions[name] = (r[2] || "").trim().toUpperCase();
  });

  // 관리자 폼(참석자·득점자 고르기)에서 쓸 전체 선수 이름
  const rosterNames = rawRoster.slice(1).map((r) => (r[1] || "").trim()).filter(Boolean);

  const feedbackByMatch: Record<number, Feedback[]> = {};
  rawFeedback.slice(1).forEach((r) => {
    const id = Number(r[0]);
    if (Number.isNaN(id)) return;
    (feedbackByMatch[id] ||= []).push({
      timestamp: r[1] || "",
      name: (r[2] || "").trim() || "익명",
      message: r[3] || "",
    });
  });

  return (
    <main className="relative mx-auto min-h-dvh max-w-md bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-zinc-100">
      {/* 미리보기 전용 스위치 — 실제 홈에는 없다 */}
      {preview && (
      <div className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/85 px-3 safe-header-py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#09090b]/85">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="shrink-0 pr-1 text-[9px] font-black tracking-[0.14em] text-gray-400">
            PREVIEW
          </span>
          {HOME_STATES.map((s) => {
            const on = s === state;
            return (
              <Link
                key={s}
                href={`/home-preview?state=${s}&list=${layout}`}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black transition-colors ${
                  on
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "border border-gray-200 text-gray-400 dark:border-white/10 dark:text-gray-500"
                }`}
              >
                {HOME_STATE_LABEL[s]}
                {s === detected && <span className="ml-1 opacity-60">•</span>}
              </Link>
            );
          })}
        </div>
        {/* 경기 목록 레이아웃 — 두 방향을 나란히 비교하기 위한 스위치 */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="shrink-0 pr-1 text-[9px] font-black tracking-[0.14em] text-gray-400">
            LIST
          </span>
          {(["list", "feed"] as const).map((l) => (
            <Link
              key={l}
              href={`/home-preview?state=${state}&list=${l}`}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black transition-colors ${
                layout === l
                  ? "bg-[#FF8FA3] text-white"
                  : "border border-gray-200 text-gray-400 dark:border-white/10 dark:text-gray-500"
              }`}
            >
              {l === "list" ? "커뮤니티 목록" : "인스타 피드"}
            </Link>
          ))}
        </div>
      </div>
      )}

      <AppHeader newMatchRoster={admin ? rosterNames : undefined} />

      {staged && (
        <p className="px-5 pt-2 text-[9px] font-bold text-gray-400 dark:text-white/35">
          이 상태는 레이아웃 확인용으로 지난 경기 데이터를 빌려 왔어요.
        </p>
      )}

      <HomeHero
        state={state}
        nextMatch={heroNext}
        lastMatch={heroLast}
        votes={heroVotes}
        myVote={heroMyVote}
        userName={userName}
        lineups={heroNext ? lineupsByMatch[heroNext.id] || [] : []}
        storylines={heroNext ? storylinesByMatch[heroNext.id] || [] : []}
        rosterMap={rosterMap}
        captainRoles={captainRoles}
        momVotes={heroLast ? momVotesByMatch[heroLast.id] || [] : []}
        positions={positions}
        playerStats={playerStats}
        playerTitles={playerTitles}
        isAdmin={admin}
        momCountdownPreview={preview && state === "afterMatch"}
        attendancePreview={preview}
        attendancePreviewNextHref={`/home-preview?state=${
          state === "dday"
            ? "dday"
            : heroNext && isUndecided(heroNext.opponent)
              ? "matching"
              : "idle"
        }&list=${layout}`}
      />

      {/* 공지 — 카드가 아니라 한 줄(규칙 03). 다만 이탈하지 않고 그 자리에서 펼친다.
          제목만 보고 페이지를 옮겨야 내용을 읽을 수 있으면 한 뎁스가 그냥 늘어난다. */}
      {notice && (
        <div className="mx-4 mt-3 flex items-start gap-1 border-y border-gray-200 py-3 dark:border-white/[0.08]">
          <div className="min-w-0 flex-1">
          <Disclosure
            className="text-left"
            seenKey="notice"
            /* 날짜·제목만 넣으면 본문만 고쳤을 때 표시가 안 뜬다 — 알림은 나가는데
               화면은 조용한 상태가 된다. 내용까지 넣어 무엇이 바뀌든 잡히게 한다. */
            seenStamp={`${notice[0] || ""}|${notice[1] || ""}|${notice[2] || ""}`}
            summary={
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Bell width={14} height={14} strokeWidth={2.2} className="shrink-0 text-gray-400" />
                <span className="truncate text-[11.5px] font-black">{notice[1] || "공지"}</span>
                <span className="shrink-0 text-[9px] font-bold text-gray-400">{notice[0]}</span>
              </span>
            }
          >
            <p className="whitespace-pre-line text-[11px] font-semibold leading-[1.7] text-gray-600 dark:text-white/60">
              {notice[2] || ""}
            </p>

            {/* 장소가 적힌 공지엔 지도가 따라온다(실제 홈과 같은 임베드).
                펼친 자리에 같이 나오므로 뎁스는 늘지 않는다. */}
            {notice[4] && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(notice[4])}&output=embed&hl=ko&z=15`}
                  title={`${notice[4]} 지도`}
                  className="h-40 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="flex items-center gap-2 bg-white px-3 py-2.5 dark:bg-[#141416]">
                  <MapPin width={14} height={14} strokeWidth={2.2} className="shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1]" />
                  <span className="flex-1 truncate text-[11.5px] font-bold text-gray-700 dark:text-gray-300">
                    {notice[4]}
                  </span>
                  <a
                    href={`https://map.kakao.com/link/search/${encodeURIComponent(notice[4])}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10.5px] font-black text-gray-500 dark:bg-white/10 dark:text-gray-400"
                  >
                    길찾기
                  </a>
                </div>
              </div>
            )}
          </Disclosure>
          </div>
          {admin && (
            <NoticeEditor
              initial={{
                date: notice[0] || "",
                title: notice[1] || "",
                content: notice[2] || "",
                important: notice[3] === "Y",
                location: notice[4] || "",
              }}
            />
          )}
        </div>
      )}

      <section className={layout === "feed" ? "pb-6 pt-2" : "px-4 pb-6 pt-4"}>
        {/* 경기 목록 — 두 방향 중 하나를 통째로 갈아 끼운다 */}
        <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <FeedList>
          {recent.map((m, idx) => {
            const match: MatchData = { ...m };
            const common = {
              match,
              lineups: lineupsByMatch[m.id] || [],
              rosterMap,
              captainRoles,
              feedbacks: feedbackByMatch[m.id] || [],
              votes: votesByMatch[m.id],
              storylines: storylinesByMatch[m.id] || [],
              userName,
              isAdmin: admin,
              momVotes: momVotesByMatch[m.id] || [],
              roster: rosterNames,
              positions,
              momCountdownPreview: preview && m.id === lastMatch?.id,
              playerStats,
              playerTitles,
            };
            return layout === "feed" ? (
              <MatchFeed
                key={m.id}
                {...common}
                firstInFeed={idx === 0}
                likeCount={likeCountByMatch[m.id] || 0}
                likedByMe={myLikedMatchIds.has(m.id)}
              />
            ) : (
              <MatchRow key={m.id} {...common} />
            );
          })}
          </FeedList>
        </div>

      </section>
    </main>
  );
}
