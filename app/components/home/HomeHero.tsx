// 홈 히어로 — B안(프로필 히어로 문법) 골격에 D안(상태 기반) 내용을 얹은 것.
//
// 골격은 상태와 무관하게 하나다: 카드로 감싸지 않고 페이지 배경 위에 직접 올리고,
// 오른쪽 위에 포지션 글로우 대신 팀 핑크 글로우 + 로고 워터마크를 깐다.
// (프로필 히어로와 같은 문법이라 두 화면이 한 앱으로 읽힌다.)
// 바뀌는 건 그 안에 들어가는 "지금 할 일" 뿐이다.

import Link from "next/link";
import { CalendarDays, Check, Clock, Flame, MapPin } from "lucide-react";
import LineupViewer from "../LineupViewer";
import type { SeasonStat } from "../FormationField";
import type { EarnedTitle } from "../../lib/titles";
import type { LineupData } from "../../lib/match-types";
import { parseWeather, weatherEmoji } from "../../lib/weather";
import { matchdayMessage } from "../../lib/matchday-message";
import { getDDay, isUndecided, type HomeState } from "../../lib/home-state";
import { isCasualMatch, matchLogo } from "./match-result";
import type { Storyline } from "../../lib/storylines";
import MomVote, { type MomVote as MomVoteData } from "./MomVote";
import AttendanceHeroVote from "./AttendanceHeroVote";
import HeroStateTransition from "./HeroStateTransition";
import HeroLocationActions from "./HeroLocationActions";

const PINK = "text-[#FF8FA3] dark:text-[#FFB6C1]";

// ── 디자인 스케일 ───────────────────────────────────────────
// MatchRow·Disclosure 와 같은 값을 쓴다. 화면마다 아이콘 크기가 다르면
// 같은 뜻의 아이콘이 다른 무게로 읽힌다.
//   12 메타(본문 옆 보조 아이콘) · 14 조작(버튼·화살표) · 30/38 얼굴
const ICON = { meta: 12, action: 14 } as const;
const STROKE = { base: 2.2, bold: 2.6 } as const;

export interface HeroMatch {
  id: number;
  date: string;
  time: string;
  location: string;
  opponent: string;
  weather: string;
  ourScore: string;
  theirScore: string;
  result: string;
  /** 일반 매칭 · 풋살 · 야유회. 자체전은 여기가 아니라 result 에 들어간다. */
  type: string;
  mom: string;
  attendees: string;
  photos: string;
}

export interface HomeHeroProps {
  state: HomeState;
  nextMatch: HeroMatch | null;
  lastMatch: HeroMatch | null;
  votes: { attending: number; maybe: number; absent: number; total: number };
  myVote?: string;
  userName?: string;
  /**
   * 등록된 다음 경기 라인업은 홈 상태와 관계없이 바로 펼쳐서 보여 준다.
   * 경기 카드와 같은 LineupViewer 를 써서 표현과 조작법은 한 가지로 유지한다.
   */
  lineups?: LineupData[];
  rosterMap?: Record<string, string>;
  captainRoles?: Record<string, string>;
  /** 라인업 뷰어가 쓰는 시즌 기록·칭호. 안 넘기면 칭호가 통째로 안 뜬다. */
  playerStats?: Record<string, SeasonStat>;
  playerTitles?: Record<string, EarnedTitle[]>;
  /** 관리자면 라인업 편집 링크를 띄운다. */
  isAdmin?: boolean;
  /**
   * 주목 포인트. 히어로에는 팀 서사 한 줄만 세운다.
   * 세 개를 이모지 붙여 쌓으면 헤드라인("팀 4연패 중")이 각주("최동권 20경기 출전")와
   * 같은 무게가 돼서 결국 아무것도 안 읽힌다. 개인 기록은 경기 줄을 펼쳤을 때 다 나온다.
   */
  storylines?: Storyline[];
  momVotes?: MomVoteData[];
  positions?: Record<string, string>;
  momCountdownPreview?: boolean;
  attendancePreview?: boolean;
  attendancePreviewNextHref?: string;
}

/** 히어로용 한 줄. 팀 서사를 먼저 찾고, 없으면 우선순위 최상위 하나. */
function headline(storylines: Storyline[]): Storyline | null {
  return storylines.find((s) => s.kind === "team") ?? storylines[0] ?? null;
}

/** "2026-08-08" → "8월 8일 토" */
function formatDate(dateStr: string): { full: string; weekday: string } {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { full: dateStr, weekday: "" };
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return { full: `${d.getMonth() + 1}월 ${d.getDate()}일`, weekday };
}

/** 경기 요일 중 토요일만 팀 UI의 수비 포지션과 같은 파란색으로 구분한다. */
function WeekdayLabel({ weekday }: { weekday: string }) {
  if (!weekday) return null;
  return (
    <span className={weekday === "토" ? "text-blue-500 dark:text-blue-400" : undefined}>
      {weekday}
    </span>
  );
}

/** 모든 경기 전 히어로에서 오른쪽 상단에 동일하게 쓰는 날씨 요약. */
function HeroWeather({ weather }: { weather: ReturnType<typeof parseWeather> }) {
  if (!weather.available) return null;
  return (
    <p className="min-w-0 truncate text-right text-[10px] font-bold text-gray-500 dark:text-white/50">
      {weatherEmoji(weather.icon)} {weather.temp}° {weather.description}
      {weather.pop >= 40 && ` · 강수 ${weather.pop}%`}
    </p>
  );
}

/**
 * 주목 포인트 한 줄. 이모지 대신 lucide 아이콘을 쓴다 —
 * 기기·OS마다 다르게 그려지는 이모지가 나머지 아이콘과 톤이 어긋나던 문제(프로필에서 이미 정리).
 */
function Headline({ lead }: { lead: Storyline }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-white/50">
      <Flame width={ICON.meta} height={ICON.meta} strokeWidth={STROKE.bold} className="shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1]" />
      <span className="truncate">{lead.text}</span>
    </p>
  );
}

/** 히어로 배경 장식. 상태가 뭐든 이건 항상 같아야 골격이 하나로 읽힌다. */
function HeroBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute -top-12 -right-8 h-40 w-40 rounded-full bg-[#FF8FA3]"
        style={{ opacity: 0.17, filter: "blur(46px)" }}
      />
      {/* 로고를 그대로 깔면 알파 없는 네이비 사각형이 깔린다. 밝기를 알파로 바꾼
          underduck-mark.png 를 마스크로 써서 모양만 남긴다(프로필 히어로와 동일). */}
      <div
        className="pointer-events-none absolute -right-4 top-1 h-28 w-28 bg-gray-900/[0.05] dark:bg-white/[0.06]"
        style={{
          WebkitMaskImage: "url(/underduck-mark.png)",
          maskImage: "url(/underduck-mark.png)",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          maskPosition: "center",
        }}
      />
    </>
  );
}

/** 출석 막대 + 숫자. 여러 상태에서 같은 모양으로 나와야 해서 한 군데로 모았다. */
function AttendanceBar({
  votes,
  myVote,
}: {
  votes: HomeHeroProps["votes"];
  myVote?: string;
}) {
  if (votes.total === 0) {
    return (
      <p className="text-[10px] font-bold text-gray-400 dark:text-white/40">
        아직 등록된 투표가 없어요.
      </p>
    );
  }
  const pct = (n: number) => `${(n / votes.total) * 100}%`;
  return (
    <>
      <div className="flex h-[7px] overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
        {votes.attending > 0 && <div className="bg-[#FF8FA3]" style={{ width: pct(votes.attending) }} />}
        {votes.maybe > 0 && <div className="bg-amber-400" style={{ width: pct(votes.maybe) }} />}
        {votes.absent > 0 && <div className="bg-gray-400 dark:bg-white/25" style={{ width: pct(votes.absent) }} />}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2.5 text-[9.5px] font-black">
          <span className={PINK}>참석 <span className="tabular-nums">{votes.attending}</span></span>
          <span className="text-amber-500 dark:text-amber-400">미정 <span className="tabular-nums">{votes.maybe}</span></span>
          <span className="text-gray-400 dark:text-white/40">불참 <span className="tabular-nums">{votes.absent}</span></span>
        </div>
        {myVote && (
          <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 dark:text-white/40">
            나는 {myVote} <Check width={ICON.meta} height={ICON.meta} strokeWidth={STROKE.bold} />
          </span>
        )}
      </div>
    </>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="press-cta flex items-center justify-center rounded-xl bg-[#FF8FA3] py-2.5 text-[11px] font-black text-white shadow-sm"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="press-cta flex items-center justify-center rounded-xl bg-gray-100 py-2.5 text-[11px] font-black text-gray-700 dark:bg-white/10 dark:text-white/85"
    >
      {children}
    </Link>
  );
}

export default function HomeHero({
  state,
  nextMatch,
  lastMatch,
  votes,
  myVote,
  userName,
  lineups = [],
  rosterMap = {},
  captainRoles = {},
  playerStats,
  playerTitles = {},
  isAdmin = false,
  storylines = [],
  momVotes = [],
  positions = {},
  momCountdownPreview = false,
  attendancePreview = false,
  attendancePreviewNextHref,
}: HomeHeroProps) {
  const lead = headline(storylines);
  const stateMatchId = state === "afterMatch" ? lastMatch?.id : nextMatch?.id;
  return (
    <section className="relative overflow-hidden px-4 pt-5 pb-1">
      <HeroBackdrop />
      <HeroStateTransition stateKey={`${state}:${stateMatchId ?? "none"}`}>
        {state === "needVote" && nextMatch && (
          <NeedVote
            match={nextMatch}
            votes={votes}
            userName={userName}
            myVote={myVote}
            preview={attendancePreview}
            previewNextHref={attendancePreviewNextHref}
          />
        )}
        {state === "dday" && nextMatch && (
          <DDay
            match={nextMatch}
            userName={userName}
            myVote={myVote}
            preview={attendancePreview}
            previewNextHref={attendancePreviewNextHref}
          />
        )}
        {state === "afterMatch" && lastMatch && (
          <AfterMatch
            match={lastMatch}
            userName={userName}
            momVotes={momVotes}
            positions={positions}
            momCountdownPreview={momCountdownPreview}
          />
        )}
        {state === "matching" && nextMatch && (
          <Matching match={nextMatch} votes={votes} myVote={myVote} lead={lead} />
        )}
        {state === "idle" && nextMatch && (
          <Upcoming match={nextMatch} votes={votes} myVote={myVote} lead={lead} />
        )}
        {/* 라인업 — 올라온 순간부터 상태와 관계없이 바로 보여 준다.
            쿼터 선택과 상세 보기는 LineupViewer 안에 이미 있으므로 바깥에 별도의
            접기 버튼을 두지 않는다. */}
        {state !== "afterMatch" && nextMatch && lineups.length > 0 && (
          <div className="mt-4">
            <LineupViewer
              match={nextMatch}
              lineups={lineups}
              rosterMap={rosterMap}
              captainRoles={captainRoles}
              playerStats={playerStats}
              playerTitles={playerTitles}
              editHref={isAdmin ? `/matches/${nextMatch.id}/edit` : undefined}
            />
          </div>
        )}

        {/* 예정 경기가 아예 없을 때. 상태 판정은 idle 로 떨어지지만 그릴 게 없다. */}
        {!nextMatch && state !== "afterMatch" && (
          <p className="py-8 text-center text-[12px] font-bold text-gray-400 dark:text-gray-600">
            다음 경기가 아직 등록되지 않았어요.
          </p>
        )}
      </HeroStateTransition>
    </section>
  );
}

/* ── 상태별 내용 ────────────────────────────────────────── */

/** 투표 필요 — 홈에서 제일 큰 자리를 질문 하나가 가져간다. */
function NeedVote({
  match,
  votes,
  userName,
  myVote,
  preview,
  previewNextHref,
}: {
  match: HeroMatch;
  votes: HomeHeroProps["votes"];
  userName?: string;
  myVote?: string;
  preview: boolean;
  previewNextHref?: string;
}) {
  const dDay = getDDay(match.date);
  const { full, weekday } = formatDate(match.date);
  const weather = parseWeather(match.weather);
  return (
    <div className="relative pb-3">
      <div className="flex items-center justify-between gap-3">
        <p className={`shrink-0 text-[10px] font-black tracking-[0.18em] tabular-nums ${PINK}`}>
          {/* 날짜를 못 읽으면 null 이라 그냥 두면 "D-null" 이 찍힌다. 그때는 D 표기를 뺀다. */}
          {dDay !== null && (
            <>
              {dDay === 0 ? "D-DAY" : dDay < 0 ? `D+${Math.abs(dDay)}` : `D-${dDay}`} ·{" "}
            </>
          )}
          {full} <WeekdayLabel weekday={weekday} />
        </p>
        <HeroWeather weather={weather} />
      </div>
      <h2 className="mt-2.5 text-[25px] font-black leading-[1.24] tracking-[-0.04em] text-gray-900 dark:text-white">
        {userName ? `${userName}님,` : "이번 주,"}
        <br />
        이번 주 나오시나요?
      </h2>

      <div className="mt-3">
        <p className="truncate text-[13px] font-black text-gray-800 dark:text-white/80">
          {isUndecided(match.opponent) ? "상대 미정" : `vs ${match.opponent}`}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-bold text-gray-500 dark:text-white/50">
          <span className="flex items-center gap-1">
            <Clock width={ICON.meta} height={ICON.meta} strokeWidth={STROKE.base} />
            {isUndecided(match.time) ? "시간 미정" : match.time}
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <MapPin width={ICON.meta} height={ICON.meta} strokeWidth={STROKE.base} className="shrink-0" />
            <span className="truncate">
              {isUndecided(match.location) ? "장소 미정" : match.location}
            </span>
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-[11px] font-bold text-gray-500 dark:text-white/50">
        {votes.total > 0
          ? `${votes.total}명 중 ${votes.attending}명이 참석이라고 답했어요`
          : "아직 아무도 답하지 않았어요"}
      </p>

      <AttendanceHeroVote
        matchId={match.id}
        userName={userName}
        initialResponse={myVote}
        preview={preview}
        previewNextHref={previewNextHref}
      />
    </div>
  );
}

/**
 * 오늘 경기 — 남은 건 "몇 시에 어디로"뿐이다.
 *
 * 길찾기만 앱 밖(카카오맵)으로 나가고, 라인업과 참석자는 그 자리에서 편다.
 * 경기 당일 아침에 제일 자주 하는 확인이라 홈에서 끝나야 뎁스가 안 늘어난다.
 */
function DDay({
  match,
  userName,
  myVote,
  preview,
  previewNextHref,
}: {
  match: HeroMatch;
  userName?: string;
  myVote?: string;
  preview: boolean;
  previewNextHref?: string;
}) {
  const dDay = getDDay(match.date);
  const weather = parseWeather(match.weather);
  const cheer = matchdayMessage(`${match.id}-${match.date}`, weather.pop);

  return (
    <div className="relative pb-3">
      <div className="flex items-center justify-between gap-3">
        <p className={`shrink-0 text-[10px] font-black tracking-[0.2em] ${PINK}`}>
          {dDay === 1 ? "내일 경기 · D-1" : "오늘 경기 · D-DAY"}
        </p>
        <HeroWeather weather={weather} />
      </div>
      <h2 className="mt-1.5 text-[26px] font-black leading-none tracking-[-0.04em] text-gray-900 dark:text-white">
        {isUndecided(match.time) ? "시간 미정" : `${match.time} 킥오프`}
      </h2>
      <p className="mt-2 text-[12px] font-black text-gray-700 dark:text-white/70">{cheer}</p>

      <HeroLocationActions location={match.location} matchId={match.id} className="mt-3" />

      {!myVote && (
        <div className="mt-4">
          <p className="text-[11px] font-black text-gray-700 dark:text-white/70">
            아직 참석 여부를 알려주지 않았어요
          </p>
          <AttendanceHeroVote
            matchId={match.id}
            userName={userName}
            initialResponse={myVote}
            preview={preview}
            previewNextHref={previewNextHref}
            className="mt-2.5"
          />
        </div>
      )}

    </div>
  );
}

/** 경기 직후 — 스코어를 크게 놓고, 아직 안 채운 것(MOM·사진)만 재촉한다. */
function AfterMatch({
  match,
  userName,
  momVotes,
  positions,
  momCountdownPreview,
}: {
  match: HeroMatch;
  userName?: string;
  momVotes: MomVoteData[];
  positions: Record<string, string>;
  momCountdownPreview: boolean;
}) {
  const attendees = match.attendees.split(",").map((s) => s.trim()).filter(Boolean);
  const { full } = formatDate(match.date);
  // 자체전·풋살·야유회는 MOM 투표를 열지 않는다(match-result.isCasualMatch).
  const needsMom = !match.mom.trim() && !isCasualMatch(match.result, match.type, match.opponent);
  const resultLabel =
    match.result === "승"
      ? "승리"
      : match.result === "무"
        ? "무승부"
        : match.result === "패"
          ? "패배"
          : match.result || "경기 종료";
  return (
    <div className="pb-3">
      <p className="text-center text-[9.5px] font-black tracking-[0.18em] text-gray-400 dark:text-white/40">
        {full} · {isUndecided(match.opponent) ? "상대 미정" : match.opponent}
      </p>
      <p className="mt-1.5 text-center text-[44px] font-black leading-none tracking-[-0.05em] tabular-nums text-gray-900 dark:text-white">
        <span className="text-gray-400 dark:text-white/40">{match.ourScore}</span>
        <span className="mx-1.5 text-gray-300 dark:text-white/20">:</span>
        {match.theirScore}
      </p>
      <p className="mt-1.5 text-center text-[11px] font-black text-gray-400 dark:text-white/40">
        {resultLabel}
        <span className="mx-1.5 text-gray-300 dark:text-white/20">·</span>
        모두 고생하셨습니다
      </p>

      {needsMom && attendees.length > 0 && (
        <MomVote
          matchId={match.id}
          matchDate={match.date}
          matchTime={match.time}
          attendees={attendees}
          votes={momVotes}
          userName={userName}
          positions={positions}
          countdownPreview={momCountdownPreview}
          variant="hero"
        />
      )}
    </div>
  );
}

/** 매칭 대기 — "vs 미정"이라고 쓰는 대신 지금 벌어지는 일을 그대로 쓴다. */
function Matching({
  match,
  votes,
  myVote,
  lead,
}: {
  match: HeroMatch;
  votes: HomeHeroProps["votes"];
  myVote?: string;
  lead: Storyline | null;
}) {
  const dDay = getDDay(match.date);
  const { full, weekday } = formatDate(match.date);
  const weather = parseWeather(match.weather);
  return (
    <div className="pb-3">
      <div className="flex items-center justify-between gap-3">
        <p className="shrink-0 text-[9px] font-black tracking-[0.2em] text-gray-400 dark:text-white/40">
          NEXT MATCH
        </p>
        <HeroWeather weather={weather} />
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[21px] font-black leading-[1.15] tracking-[-0.035em] text-gray-900 dark:text-white">
            {full}{" "}
            <span className="text-gray-400 dark:text-white/40">
              <WeekdayLabel weekday={weekday} />
            </span>
          </h2>
          <p className="mt-2 text-[12px] font-black text-gray-700 dark:text-white/70">
            상대를 찾는 중이에요
          </p>
          {lead && <Headline lead={lead} />}
        </div>
        {dDay !== null && (
          <p className={`shrink-0 text-[40px] font-black leading-[0.85] tracking-[-0.05em] tabular-nums ${PINK}`}>
            D-{dDay}
          </p>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-gray-200 px-2 py-[3px] text-[9px] font-black text-gray-400 dark:border-white/10 dark:text-white/40">
          상대 확정 대기
        </span>
        {isUndecided(match.location) && (
          <span className="rounded-full border border-gray-200 px-2 py-[3px] text-[9px] font-black text-gray-400 dark:border-white/10 dark:text-white/40">
            장소 미정
          </span>
        )}
        {isUndecided(match.time) && (
          <span className="rounded-full border border-gray-200 px-2 py-[3px] text-[9px] font-black text-gray-400 dark:border-white/10 dark:text-white/40">
            시간 미정
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[9.5px] font-black tracking-[0.14em] text-gray-400 dark:text-white/40">
          참석 현황
        </p>
        <AttendanceBar votes={votes} myVote={myVote} />
      </div>

      <div className="mt-4 grid grid-cols-[2fr_1fr] gap-2">
        <PrimaryLink href="/vote">{myVote ? "내 투표 바꾸기" : "출석 투표하기"}</PrimaryLink>
        <SecondaryLink href={`/matches/${match.id}`}>상세</SecondaryLink>
      </div>
    </div>
  );
}

/** 평시 — 상대도 정해졌고 내 투표도 끝났다. B안 기본형. */
function Upcoming({
  match,
  votes,
  myVote,
  lead,
}: {
  match: HeroMatch;
  votes: HomeHeroProps["votes"];
  myVote?: string;
  lead: Storyline | null;
}) {
  const dDay = getDDay(match.date);
  const { full, weekday } = formatDate(match.date);
  const logo = matchLogo(match);
  const weather = parseWeather(match.weather);
  return (
    <div className="pb-3">
      <div className="flex items-center justify-between gap-3">
        <p className="shrink-0 text-[9px] font-black tracking-[0.2em] text-gray-400 dark:text-white/40">
          NEXT MATCH
        </p>
        <HeroWeather weather={weather} />
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-[21px] font-black leading-none tracking-[-0.035em] text-gray-900 dark:text-white">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-5 w-5 shrink-0 rounded-full bg-white object-contain ring-1 ring-black/5" />
            )}
            <span className="truncate">{match.opponent}</span>
          </h2>
          <p className="mt-2 flex items-center gap-1.5 text-[10.5px] font-bold text-gray-500 dark:text-white/50">
            <CalendarDays width={ICON.meta} height={ICON.meta} strokeWidth={STROKE.base} className="shrink-0" />
            <span>
              {full} <WeekdayLabel weekday={weekday} /> {!isUndecided(match.time) && `· ${match.time}`}
            </span>
          </p>
          <HeroLocationActions location={match.location} matchId={match.id} />
          {lead && <Headline lead={lead} />}
        </div>
        <div className="shrink-0 text-right">
          {dDay !== null && (
            <p className={`text-[40px] font-black leading-[0.85] tracking-[-0.05em] tabular-nums ${PINK}`}>
              {dDay === 0 ? "D-DAY" : dDay < 0 ? `D+${Math.abs(dDay)}` : `D-${dDay}`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <AttendanceBar votes={votes} myVote={myVote} />
      </div>

      <div className="mt-4 grid grid-cols-[2fr_1fr] gap-2">
        <PrimaryLink href="/vote">{myVote ? "투표 확인하기" : "출석 투표하기"}</PrimaryLink>
        <SecondaryLink href={`/matches/${match.id}`}>상세</SecondaryLink>
      </div>
    </div>
  );
}
