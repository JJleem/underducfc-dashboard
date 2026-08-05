"use client";
// 경기 하나 = 게시물 하나. 인스타 피드 문법으로 끝까지 민 쪽.
//
// 목록(MatchRow)과 정반대 전제다. 목록은 "한 화면에 몇 경기가 보이나"가 기준이고,
// 여기는 "경기 하나가 얼마나 잘 보이나"가 기준이다. 그래서 접지 않는다 — 스크롤로 읽는다.
// 사진이 먼저 나오고, 글은 사진 아래에 붙는다. 인스타에서 캡션이 그런 것과 같다.
//
// 사진이 없는 경기도 리듬이 끊기면 안 되므로 같은 정사각형 자리에 스코어를 크게 세운다.
//
// 읽기 전용이다. 좋아요처럼 동작하지 않을 버튼은 아예 두지 않는다.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Crown,
  ClipboardList,
  Loader2,
  MessageCircle,
  Pencil,
  Sparkles,
  Users,
} from "lucide-react";
import LineupViewer from "../LineupViewer";
import type { SeasonStat } from "../FormationField";
import type { EarnedTitle } from "../../lib/titles";
import ModalPortal from "../ModalPortal";
import type { LineupData, MatchData } from "../DashboardClient";
import { getOpponentLogo } from "../../lib/opponent-logos";
import {
  hasScore,
  isInternalMatch,
  resultTextTone,
  resultWord,
} from "./match-result";
import { getDDay } from "../../lib/home-state";
import type { Storyline } from "../../lib/storylines";
import Storylines from "./Storylines";
import { shareStoryCard } from "../../lib/draw-story-card";
import { feedbackTimestamp, type Feedback } from "./FeedbackThread";
import PhotoUploader from "./PhotoUploader";
import DetailSheet from "./DetailSheet";
import PlayerFace from "../PlayerFace";
import MomVote, { type MomVote as MomVoteData } from "./MomVote";
import MatchEditor, { type EditableMatch } from "./MatchEditor";
import CommentSheet from "./CommentSheet";
import { FEED_SUMMARY_ROW, FeedSummaryEnd, FeedSummaryLabel } from "./FeedSummary";
import PinchZoomImage from "../PinchZoomImage";
import AppToast from "../AppToast";
import useAppOverlay from "../useAppOverlay";


// ── 디자인 스케일 (피드) ─────────────────────────────────────
// 목록보다 한 단계씩 크다. 여백으로 읽히는 화면이라 작은 글씨를 쓸 이유가 없다.
//   아이콘  17 액션 · 32 팀 로고
//   글자    11 보조 · 13 본문 · 15 강조 · 34 스코어
const ICON = { action: 17, logo: 32 } as const;

const full = (url: string) =>
  url.replace("/upload/", "/upload/c_fill,w_1080,h_1080,q_auto,f_auto/");

function shortDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function SportsSoccerIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm200-500 54-18 16-54q-32-48-77-82.5T574-786l-54 38v56l160 112Zm-400 0 160-112v-56l-54-38q-54 17-99 51.5T210-652l16 54 54 18Zm-42 308 46-4 30-54-58-174-56-20-40 30q0 65 18 118.5T238-272Zm293 108q25-4 49-12l28-60-26-44H378l-26 44 28 60q24 8 49 12t51 4q26 0 51-4ZM390-360h180l56-160-146-102-144 102 54 160Zm332 88q42-50 60-103.5T800-494l-40-28-56 18-58 174 30 54 46 4Z" />
    </svg>
  );
}

function ShoeCleatsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M222-79q-32 0-61.5-12T108-127l-7-7q-9-8-11.5-20t2.5-23l194-495q8-20 27.5-30.5T354-708l58 11q17 4 32.5-2.5T471-717q14-15 18.5-31.5T489-782l-5-15q-5-16-1.5-32.5T498-858l43-43q17-18 42.5-18t42.5 17l181 184q22 23 22.5 54.5T809-609l19 19q6 7 10.5 14.5T843-560q0 7-3 14t-11 15q-12 11-28.5 11.5T772-531l-18-19-28 29 18 18q11 11 11 28t-11 28q-12 11-28.5 11.5T687-447l-18-17-112 114 17 16q12 12 12 28.5T574-277q-12 11-28.5 11.5T517-277l-16-17-28 29 16 16q11 11 11 28t-11 28q-12 11-28.5 11.5T432-193l-16-15-28 28 16 15q11 12 11 28.5T404-108q-12 11-28.5 11.5T347-108l-16-16q-23 23-50.5 34T222-79Zm-57-283q5-11 8-19.5l3-8.5-22 56 3.5-8.5Q161-351 165-362Zm39-100q5-11 8-19.5l3-8.5-22 56 3.5-8.5Q200-451 204-462Zm39-100q5-11 8-19l3-8-22 55 3.5-8.5Q239-551 243-562Zm-21 402q17 0 31.5-6t25.5-18l471-478-166-169-20 20q12 40 4.5 78T528-662q-26 26-60 38.5t-71 4.5l-41-8-25 61 23 8q11 5 16 16t1 22q-4 12-15 18t-23 1l-24-9-17 44 19 7q11 5 16.5 16t1.5 22q-4 12-15.5 17.5t-23.5.5l-20-7-17 44 16 6q11 5 16 15.5t1 21.5q-4 12-15.5 18t-23.5 1l-16-6-54 136q10 7 21.5 10.5T222-160Zm242-336Z" />
    </svg>
  );
}

export default function MatchFeed({
  match,
  lineups,
  rosterMap,
  captainRoles,
  feedbacks,
  votes,
  storylines = [],
  userName,
  isAdmin = false,
  playerStats,
  playerTitles = {},
  momVotes = [],
  roster = [],
  positions = {},
  momCountdownPreview = false,
  firstInFeed = false,
}: {
  match: MatchData;
  lineups: LineupData[];
  rosterMap: Record<string, string>;
  captainRoles: Record<string, string>;
  feedbacks: Feedback[];
  votes?: { attending: number; maybe: number; absent: number };
  storylines?: Storyline[];
  userName?: string;
  isAdmin?: boolean;
  /** 라인업 뷰어가 쓰는 시즌 기록·칭호. 안 넘기면 칭호가 통째로 안 뜬다. */
  playerStats?: Record<string, SeasonStat>;
  playerTitles?: Record<string, EarnedTitle[]>;
  momVotes?: MomVoteData[];
  roster?: string[];
  positions?: Record<string, string>;
  momCountdownPreview?: boolean;
  /** 피드 첫 게시물. 첫 장만 즉시 받아 첫 화면이 빈 채로 뜨지 않게 한다. */
  firstInFeed?: boolean;
}) {
  // 캐러셀 현재 장수. 인디케이터가 없으면 사진이 더 있다는 걸 알 방법이 없다.
  const [slide, setSlide] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSlide, setLightboxSlide] = useState(0);
  const lightboxTrack = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const closeLightbox = useAppOverlay(lightboxOpen, () => setLightboxOpen(false));

  useEffect(() => {
    if (!lightboxOpen) return;
    const frame = requestAnimationFrame(() => {
      const track = lightboxTrack.current;
      if (track) track.scrollLeft = lightboxSlide * track.clientWidth;
    });
    return () => cancelAnimationFrame(frame);
    // 처음 열릴 때 선택한 사진으로만 맞춘다. 스크롤 중 slide 변경에는 개입하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen]);

  useEffect(() => {
    if (!shareError) return;
    const timer = window.setTimeout(() => setShareError(null), 2200);
    return () => window.clearTimeout(timer);
  }, [shareError]);

  const logo = getOpponentLogo(match.opponent);
  const photos = (match.photos || "").split(",").map((s) => s.trim()).filter((s) => s.startsWith("http"));
  const attendees = (match.attendees || "").split(",").map((s) => s.trim()).filter(Boolean);
  const goals = (match.goals || "").split(",").map((s) => s.trim()).filter(Boolean);
  const assists = (match.assists || "").split(",").map((s) => s.trim());
  const previewFeedbacks = feedbacks.slice(-2);
  // 확정 MOM. 투표 집계(momVotes)와 다른 값이다 — 이건 시트에 확정 저장된 결과고,
  // 공동 수상이 "A / B" 또는 "A,B" 로 들어온다.
  const momRaw = (match.mom || "").trim();
  const momParts = momRaw.split("/");
  const splitMomNames = (raw: string) => raw.split(",").map((s) => s.trim()).filter(Boolean);
  const moms = momParts.flatMap(splitMomNames);
  // 확정 저장값의 `/` 앞뒤가 공격/수비 투표 결과다. 선수의 현재 포지션으로
  // 다시 추론하면 NSW 경기처럼 수비 MOM이 MF인 경우 역할이 뒤바뀐다.
  const confirmedMomGroups = momRaw.includes("/")
    ? { attack: splitMomNames(momParts[0] || ""), defense: splitMomNames(momParts[1] || "") }
    : undefined;
  const won = match.result === "승";
  // 자체전은 승패가 없다. 스코어도 비어 있어서 그냥 두면 "- : - 패배"가 뜬다.
  const internal = isInternalMatch(match.result, match.opponent);
  const scored = hasScore(match.ourScore, match.theirScore);
  const upcoming = match.result === "예정";
  const dDay = upcoming ? getDDay(match.date) : null;
  const showMom = !upcoming && attendees.length > 0;
  const showFollowUp = showMom || storylines.length > 0;

  return (
    <article className="pb-8">
      {/* 게시물 헤더 — 인스타의 계정 줄 자리. 여기선 상대팀이 그 자리다. */}
      <header className="flex items-center gap-2.5 px-4 py-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            width={ICON.logo}
            height={ICON.logo}
            className="shrink-0 rounded-full bg-white object-cover ring-1 ring-black/[0.06] dark:ring-white/10"
          />
        ) : (
          <span
            style={{ width: ICON.logo, height: ICON.logo }}
            className="flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-[13px] font-black text-gray-400 dark:bg-white/10"
          >
            {match.opponent.trim().charAt(0) || "?"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black tracking-[-0.01em] text-gray-900 dark:text-white">
            {internal ? match.opponent : `vs ${match.opponent}`}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-bold text-gray-400 dark:text-white/35">
            {shortDate(match.date)} · {match.location}
          </p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Link
              href={`/matches/${match.id}/edit`}
              aria-label="라인업 설정"
              title="라인업 설정"
              className="flex w-9 flex-col items-center gap-0.5 py-0.5 text-[#FF8FA3] active:opacity-60 dark:text-[#FFB6C1]"
            >
              <ClipboardList width={17} height={17} strokeWidth={2.2} />
              <span className="text-[8px] font-black leading-none">라인업</span>
            </Link>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="경기 수정"
              title="경기 수정"
              className="flex w-9 flex-col items-center gap-0.5 py-0.5 text-gray-400 active:opacity-60 dark:text-white/40"
            >
              <Pencil width={17} height={17} strokeWidth={2.2} />
              <span className="text-[8px] font-black leading-none">편집</span>
            </button>
          </div>
        )}
      </header>

      {/* 이미지 — 화면 폭 그대로. 여기선 게시물 자체라 풀블리드가 맞다.
          여러 장이면 옆으로 넘긴다(스냅). */}
      {photos.length > 0 ? (
        <div className="relative">
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              setSlide(Math.round(el.scrollLeft / el.clientWidth));
            }}
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {photos.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => {
                  setLightboxSlide(i);
                  setLightboxOpen(true);
                }}
                aria-label={`경기 사진 ${i + 1} 크게 보기`}
                className="w-full shrink-0 snap-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={full(url)}
                  alt=""
                  loading={firstInFeed && i === 0 ? "eager" : "lazy"}
                  fetchPriority={firstInFeed && i === 0 ? "high" : undefined}
                  draggable={false}
                  className="aspect-square w-full bg-gray-100 object-cover dark:bg-white/5"
                />
              </button>
            ))}
          </div>

          {photos.length > 1 && (
            <>
              {/* 오른쪽 위 장수 — 인스타가 쓰는 방식 */}
              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-black tabular-nums text-white backdrop-blur-sm">
                {slide + 1}/{photos.length}
              </span>
              {/* 아래 점 — 몇 장인지 한눈에 */}
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {photos.map((url, i) => (
                  <span
                    key={url}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      i === slide ? "bg-white" : "bg-white/45"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : upcoming ? (
        // 예정 경기도 피드에 자리를 갖는다. 스코어 대신 카운트다운을 세운다.
        <div
          className="flex aspect-square w-full flex-col items-center justify-center"
          style={{ background: "linear-gradient(160deg,#FFD9E1 0%,#FF8FA3 100%)" }}
        >
          <p className="text-[13px] font-black tracking-[0.24em] text-white/70">NEXT MATCH</p>
          <p className="mt-3 text-[64px] font-black leading-none tracking-[-0.05em] tabular-nums text-white">
            {dDay === 0 ? "D-DAY" : `D-${dDay}`}
          </p>
          <p className="mt-4 text-[13px] font-bold text-white/80">
            {shortDate(match.date)}
            {match.time && match.time !== "미정" ? ` · ${match.time}` : ""}
          </p>
        </div>
      ) : (
        // 사진이 없는 완료 경기는 공유 카드의 나이트 매치 문법만 가져온다.
        // 카드 이미지를 그대로 재사용하면 아래 결과·득점·MOM과 내용이 전부 중복된다.
        <div
          className="relative aspect-square w-full overflow-hidden bg-[#070d20] text-center text-white"
          style={{
            background:
              "radial-gradient(circle at 14% 5%,rgba(147,197,253,.16),transparent 34%),radial-gradient(circle at 86% 0%,rgba(255,182,193,.20),transparent 38%),linear-gradient(160deg,#070d20 0%,#111d3d 52%,#070d20 100%)",
          }}
        >
          <div className="pointer-events-none absolute -left-[15%] top-[4%] h-[72%] w-[38%] -rotate-[22deg] bg-gradient-to-r from-white/[0.055] to-transparent blur-xl" />
          <div className="pointer-events-none absolute -right-[15%] top-[2%] h-[72%] w-[38%] rotate-[22deg] bg-gradient-to-l from-[#FFB6C1]/[0.08] to-transparent blur-xl" />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 bg-white/[0.045]"
            style={{
              WebkitMaskImage: "url(/underduck-mark.png)",
              maskImage: "url(/underduck-mark.png)",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            }}
          />

          <div className="relative z-10 flex h-full flex-col px-6 py-[clamp(18px,5vw,28px)]">
            <div>
              <p className="text-[10px] font-black tracking-[0.28em] text-white/35">
                MATCH RESULT
              </p>
              <p className="mt-1.5 text-[12px] font-black tracking-[0.08em] text-[#FFB6C1]">
                UNDERDUCK FC
              </p>
            </div>

            <div className="my-auto w-full">
              <div className="grid grid-cols-2 gap-10 px-1 text-[11px] font-black text-white/65">
                <span className="truncate">{internal ? "언더덕 A" : "언더덕"}</span>
                <span className="truncate">{internal ? "언더덕 B" : match.opponent}</span>
              </div>

              {scored ? (
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center text-[clamp(52px,17vw,72px)] font-black leading-none tracking-[-0.055em] tabular-nums">
                  <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{match.ourScore}</span>
                  <span className="px-3 text-[0.58em] text-white/20">:</span>
                  <span className="text-white/85">{match.theirScore}</span>
                </div>
              ) : (
                <p className="mt-4 text-[32px] font-black leading-tight tracking-[-0.04em] text-white/85">
                  {internal ? "자체전" : "기록 없음"}
                </p>
              )}

              <span
                className={`${goals.length > 0 ? "mt-3" : "mt-5"} inline-flex min-w-16 justify-center rounded-full border px-4 py-1.5 text-[11px] font-black ${
                  won
                    ? "border-[#FF8FA3]/70 bg-[#FF8FA3] text-white shadow-[0_0_28px_rgba(255,143,163,.28)]"
                    : internal
                      ? "border-violet-300/25 bg-violet-300/10 text-violet-200"
                      : "border-white/10 bg-white/[0.06] text-white/55"
                }`}
              >
                {resultWord(match.result)}
              </span>

              {goals.length > 0 && (
                <div className="mx-auto mt-3 w-full max-w-[280px] rounded-xl border border-white/[0.09] bg-white/[0.045] px-3 py-2.5 backdrop-blur-[2px]">
                  <p className="mb-1.5 text-[8px] font-black tracking-[0.2em] text-white/35">
                    GOALS
                  </p>
                  <div className="space-y-1 text-center">
                    {goals.slice(0, 3).map((scorer, i) => (
                      <div
                        key={`${scorer}-result-${i}`}
                        className="flex min-w-0 items-center justify-center gap-1.5"
                      >
                        <SportsSoccerIcon className="h-3 w-3 shrink-0 text-[#FF8FA3]" />
                        <b className="truncate text-[10.5px] font-black text-white/85">
                          {scorer}
                        </b>
                        {assists[i] && (
                          <span className="flex shrink-0 items-center gap-1 text-[9.5px] font-bold text-[#FFB6C1]">
                            <span className="text-white/20">·</span>
                            <b className="font-black">A</b>
                            {assists[i]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {goals.length > 3 && (
                    <p className="mt-1 text-center text-[9px] font-black text-white/30">
                      외 {goals.length - 3}골
                    </p>
                  )}
                </div>
              )}
            </div>

            {moms.length > 0 ? (
              <div className="flex min-h-9 items-center justify-center gap-2.5 text-left">
                <span className="flex shrink-0 items-center gap-1 text-[9px] font-black tracking-[0.12em] text-amber-300">
                  <Crown width={12} height={12} fill="currentColor" strokeWidth={2} />
                  MOM
                </span>
                <span className="h-4 w-px bg-white/10" />
                <span className="flex min-w-0 items-center justify-center gap-3">
                  {moms.slice(0, 2).map((name) => (
                    <span key={name} className="flex min-w-0 items-center gap-1.5">
                      <span className="rounded-full ring-2 ring-[#FFB6C1]/30">
                        <PlayerFace name={name} size={26} />
                      </span>
                      <b className="max-w-16 truncate text-[10.5px] font-black text-white/75">
                        {name}
                      </b>
                    </span>
                  ))}
                  {moms.length > 2 && (
                    <span className="text-[9px] font-black text-white/35">+{moms.length - 2}</span>
                  )}
                </span>
              </div>
            ) : (
              <p className="min-h-9 text-[10px] font-bold text-white/25">
                {shortDate(match.date)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 액션 줄 — 아이콘은 먼저 읽히고, 짧은 이름으로 기능을 확인한다.
          라인업의 핑크 점은 등록된 라인업이 있다는 표시다. */}
      <div className="flex items-start gap-1 px-4 pt-3.5">
        <CommentSheet
          title="댓글"
          subtitle={`${match.opponent} · ${shortDate(match.date)}`}
          className="flex w-11 flex-col items-center gap-1 text-gray-700 active:opacity-60 dark:text-white/70"
          matchId={match.id}
          feedbacks={feedbacks}
          userName={userName}
          isAdmin={isAdmin}
          trigger={
            <>
              <span className="flex h-[18px] items-center gap-1">
                <MessageCircle width={ICON.action} height={ICON.action} strokeWidth={2} />
                {feedbacks.length > 0 && (
                  <span className="text-[11px] font-black tabular-nums">{feedbacks.length}</span>
                )}
              </span>
              <span className="text-[9px] font-bold leading-none text-gray-400 dark:text-white/35">
                댓글
              </span>
            </>
          }
        />

        {attendees.length > 0 && (
          <DetailSheet
            title={`참석 ${attendees.length}명`}
            subtitle={`${match.opponent} · ${shortDate(match.date)}`}
            className="flex w-11 flex-col items-center gap-1 text-gray-700 active:opacity-60 dark:text-white/70"
            trigger={
              <>
                <span className="flex h-[18px] items-center gap-1">
                  <Users width={ICON.action} height={ICON.action} strokeWidth={2} />
                  <span className="text-[11px] font-black tabular-nums">{attendees.length}</span>
                </span>
                <span className="text-[9px] font-bold leading-none text-gray-400 dark:text-white/35">
                  명단
                </span>
              </>
            }
          >
            <div className="flex flex-wrap gap-2">
              {attendees.map((name) => (
                <Link
                  key={name}
                  href={`/players/${encodeURIComponent(name)}`}
                  className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-1 pr-3 text-[12px] font-bold text-gray-700 active:opacity-60 dark:bg-white/[0.07] dark:text-white/70"
                >
                  <PlayerFace name={name} size={22} />
                  {name}
                </Link>
              ))}
            </div>
          </DetailSheet>
        )}

        {lineups.length > 0 && (
          <DetailSheet
            title="라인업"
            subtitle={`${match.opponent} · ${shortDate(match.date)}`}
            className="flex w-11 flex-col items-center gap-1 text-gray-700 active:opacity-60 dark:text-white/70"
            contentClassName="h-auto max-h-[92dvh] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[92dvh]"
            trigger={
              <>
                <span className="flex h-[18px] items-center gap-1">
                  <span className="relative">
                    <ClipboardList width={ICON.action} height={ICON.action} strokeWidth={2} />
                    <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#FF8FA3] ring-2 ring-white dark:bg-[#FFB6C1] dark:ring-[#161618]" />
                  </span>
                  <span className="text-[11px] font-black tabular-nums">{lineups.length}</span>
                </span>
                <span className="text-[9px] font-bold leading-none text-gray-400 dark:text-white/35">
                  라인업
                </span>
              </>
            }
          >
            <LineupViewer
              match={match}
              lineups={lineups}
              rosterMap={rosterMap}
              captainRoles={captainRoles}
              playerStats={playerStats}
              playerTitles={playerTitles}
              editHref={isAdmin ? `/matches/${match.id}/edit` : undefined}
            />
          </DetailSheet>
        )}

        {/* 사진 올리기 — 관리자만. 경기가 끝난 뒤 채우는 흐름이라 예정 경기엔 안 띄운다. */}
        {isAdmin && !upcoming && (
          <PhotoUploader matchId={match.id} count={photos.length} />
        )}

        {/* 결과 카드 공유 — 끝난 경기에만. 예정 경기는 스코어·MOM 이 비어 있어서
            카드를 만들어봐야 빈 판이 나온다(눌러도 아무 일도 안 일어난 것처럼 보였다). */}
        {!upcoming && (
        <button
          type="button"
          onClick={async () => {
            setSharing(true);
            try {
              await shareStoryCard(match);
            } catch (e) {
              if (e instanceof Error && e.name !== "AbortError") {
                setShareError("공유 이미지를 만들지 못했어요. 다시 시도해 주세요.");
              }
            } finally {
              setSharing(false);
            }
          }}
          disabled={sharing}
          aria-label="인스타에 결과 공유"
          className="ml-auto flex w-11 flex-col items-center gap-1 text-gray-700 active:opacity-60 disabled:opacity-40 dark:text-white/70"
        >
          <span className="flex h-[18px] items-center">
            {sharing ? (
              <Loader2 width={ICON.action} height={ICON.action} className="animate-spin" />
            ) : (
              <Sparkles width={ICON.action} height={ICON.action} strokeWidth={2} />
            )}
          </span>
          <span className="text-[9px] font-bold leading-none text-gray-400 dark:text-white/35">
            공유
          </span>
        </button>
        )}
      </div>

      {/* 캡션 — 인스타에서 사진 밑에 글이 붙는 자리.
          여기 남는 건 "경기 자체의 사실"뿐이다: 스코어, 득점, 그리고 훅 몇 개. */}
      <div className="px-4 pt-3">
        {upcoming && votes && (
          <Link
            href="/vote"
            aria-label={`${match.opponent} 경기 출석 투표하기`}
            className={`${FEED_SUMMARY_ROW} text-[13px] font-bold text-gray-700 dark:text-white/70`}
          >
            <span className="flex min-w-0 flex-1 items-center">
              <span className="font-black text-[#FF8FA3] dark:text-[#FFB6C1]">
                참석 {votes.attending}
              </span>
              <span className="mx-2 text-gray-300 dark:text-white/20">·</span>
              <span className="font-black text-amber-500 dark:text-amber-400">
                미정 {votes.maybe}
              </span>
              <span className="mx-2 text-gray-300 dark:text-white/20">·</span>
              <span className="text-gray-500 dark:text-white/50">불참 {votes.absent}</span>
            </span>
            <FeedSummaryEnd />
          </Link>
        )}
        {!upcoming && (
          <div
            className={`border-t border-gray-100 dark:border-white/[0.06] ${
              showFollowUp ? "" : "border-b"
            }`}
          >
            <div className="flex min-h-10 items-center gap-2 py-2.5">
              <FeedSummaryLabel>경기 결과</FeedSummaryLabel>
              {scored ? (
                <span className="min-w-0 flex-1 text-[15px] font-black tabular-nums text-gray-900 dark:text-white">
                  <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">
                    {match.ourScore}
                  </span>
                  <span className="mx-1.5 text-gray-300 dark:text-white/25">:</span>
                  {match.theirScore}
                </span>
              ) : (
                <span className="min-w-0 flex-1 text-[12px] font-bold text-gray-400 dark:text-white/35">
                  스코어 기록 없음
                </span>
              )}
              <span className={`shrink-0 text-[12px] font-black ${resultTextTone(match.result)}`}>
                {resultWord(match.result)}
              </span>
            </div>

            {/* 득점자와 도움을 한 골 단위로 짝지어 보여 준다. */}
            {goals.length > 0 && (
              <div className="flex items-start gap-2 border-t border-gray-100 py-2.5 dark:border-white/[0.06]">
                <FeedSummaryLabel>득점</FeedSummaryLabel>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {goals.map((scorer, i) => (
                    <div
                      key={`${scorer}-${i}`}
                      className="flex min-w-0 items-center justify-between gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <SportsSoccerIcon className="h-3.5 w-3.5 shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1]" />
                        <span className="truncate text-[13px] font-black text-gray-900 dark:text-white">
                          {scorer}
                        </span>
                      </span>
                      {assists[i] && (
                        <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-bold text-gray-400 dark:text-white/35">
                          <ShoeCleatsIcon className="h-3.5 w-3.5 shrink-0" />
                          <b className="font-black text-gray-600 dark:text-white/55">{assists[i]}</b> 도움
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MOM과 주목 포인트는 한 경기의 후일담이다. 카드 대신 옅은 색면으로만
            묶어 두 정보가 같은 레벨임을 보여준다. */}
        {showFollowUp && (
          <div
            className={`-mx-4 bg-gradient-to-r from-[#FF8FA3]/[0.07] via-[#FF8FA3]/[0.025] to-transparent px-4 dark:from-[#FFB6C1]/[0.14] dark:via-[#FFB6C1]/[0.05] ${
              upcoming ? "mt-2" : ""
            }`}
          >
            {showMom && (
              <MomVote
                matchId={match.id}
                matchDate={match.date}
                matchTime={match.time}
                attendees={attendees}
                votes={momVotes}
                userName={userName}
                positions={positions}
                confirmedMoms={moms}
                confirmedMomGroups={confirmedMomGroups}
                countdownPreview={momCountdownPreview}
              />
            )}

            {storylines.length > 0 && (
              <div className={showMom ? "border-t border-[#FF8FA3]/15 dark:border-[#FFB6C1]/10" : ""}>
                <DetailSheet
                  title="주목 포인트"
                  subtitle={`${match.opponent} · ${shortDate(match.date)}`}
                  className={FEED_SUMMARY_ROW}
                  contentClassName="h-auto max-h-[88dvh] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[88dvh]"
                  trigger={
                    <>
                      <FeedSummaryLabel>주목 포인트</FeedSummaryLabel>
                      <span className="min-w-0 flex-1 overflow-hidden">
                        <Storylines items={storylines} limit={2} singleLine />
                      </span>
                      <FeedSummaryEnd label={`${storylines.length}개`} />
                    </>
                  }
                >
                  <Storylines items={storylines} />
                </DetailSheet>
              </div>
            )}
          </div>
        )}

        {/* 댓글 — 마지막 하나만. 누르면 전체가 드로어로 열린다. */}
        {feedbacks.length > 0 && (
          <CommentSheet
            title="댓글"
            subtitle={`${match.opponent} · ${shortDate(match.date)}`}
            className="mt-3 w-full text-left"
            matchId={match.id}
            feedbacks={feedbacks}
            userName={userName}
            isAdmin={isAdmin}
            trigger={
              <>
                <span className="block text-[13px] font-bold text-gray-400 dark:text-white/35">
                  {feedbacks.length > 2
                    ? `댓글 ${feedbacks.length}개 모두 보기`
                    : "댓글 작성하기"}
                </span>
                <span className="mt-1 block">
                  {previewFeedbacks.map((feedback, index) => (
                    <span
                      key={`${feedback.timestamp}-${index}`}
                      className={`flex items-start text-left ${
                        index > 0 ? "mt-2" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <b className="truncate text-[12.5px] font-black text-gray-900 dark:text-white">
                            {feedback.name}
                          </b>
                          <span className="shrink-0 text-[10px] font-bold text-gray-300 dark:text-white/25">
                            {feedbackTimestamp(feedback.timestamp)}
                          </span>
                        </span>
                        <span className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-[13px] leading-[1.55] text-gray-700 [overflow-wrap:anywhere] dark:text-white/70">
                          {feedback.message}
                        </span>
                      </span>
                    </span>
                  ))}
                </span>
              </>
            }
          />
        )}
      </div>

      {editing && (
        <MatchEditor
          mode="edit"
          match={
            {
              id: match.id,
              date: match.date,
              time: match.time,
              location: match.location,
              opponent: match.opponent,
              type: match.type || "일반 매칭",
              result: match.result,
              ourScore: String(match.ourScore ?? ""),
              theirScore: String(match.theirScore ?? ""),
              goals: match.goals || "",
              assists: match.assists || "",
              attendees: match.attendees || "",
            } satisfies EditableMatch
          }
          roster={roster}
          onClose={() => setEditing(false)}
        />
      )}

      {/* 라이트박스는 body 로 포털한다.
          조상에 transform/filter 가 걸려 있으면 fixed 가 화면이 아니라 그 조상 기준이 돼서
          "페이지 전체 높이의 가운데"에 뜬다. ModalPortal 주석 참고. */}
      {lightboxOpen && (
        <ModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="경기 사진 크게 보기"
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
            onClick={closeLightbox}
          >
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="닫기"
              className="absolute right-3 z-20 flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[12px] font-black text-white/80 active:bg-white/10"
              style={{ top: "max(0.5rem, env(safe-area-inset-top))" }}
            >
              닫기
            </button>

            <div
              ref={lightboxTrack}
              onClick={(event) => event.stopPropagation()}
              onScroll={(event) => {
                const track = event.currentTarget;
                if (!track.clientWidth) return;
                setLightboxSlide(Math.round(track.scrollLeft / track.clientWidth));
              }}
              className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {photos.map((photo, index) => (
                <div key={`${photo}-lightbox`} className="h-full w-full shrink-0 snap-center px-3 py-14">
                  <PinchZoomImage
                    src={photo}
                    alt={`${match.opponent} 경기 사진 ${index + 1}`}
                    allowHorizontalSwipe
                    loading={index === lightboxSlide ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>
            {photos.length > 1 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-1.5">
                {photos.map((photo, index) => (
                  <span
                    key={`${photo}-dot`}
                    className={`h-1.5 rounded-full transition-all ${
                      index === lightboxSlide ? "w-4 bg-white" : "w-1.5 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </ModalPortal>
      )}
      <AppToast message={shareError} tone="error" />
    </article>
  );
}
