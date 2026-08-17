"use client";
// 경기 하나 = 게시물 하나. 인스타 피드 문법으로 끝까지 민 쪽.
//
// 목록(MatchRow)과 정반대 전제다. 목록은 "한 화면에 몇 경기가 보이나"가 기준이고,
// 여기는 "경기 하나가 얼마나 잘 보이나"가 기준이다. 그래서 접지 않는다 — 스크롤로 읽는다.
// 사진이 먼저 나오고, 글은 사진 아래에 붙는다. 인스타에서 캡션이 그런 것과 같다.
//
// 사진이 없는 경기도 리듬이 끊기면 안 되므로 같은 정사각형 자리에 스코어를 크게 세운다.
//
// 사진은 눌러도 아무 일도 안 일어난다. 크게 보려면 두 손가락으로 벌린다(FeedPinchPhoto).
//
// 액션은 실제로 저장되는 것만 둔다. 좋아요는 match_like 테이블에 인당 1번으로
// 남는다(백엔드 /matches/{id}/like). 동작하지 않을 장식 버튼은 여전히 두지 않는다.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Crown,
  ClipboardList,
  Heart,
  Loader2,
  MessageCircle,
  Pencil,
  Sparkles,
  Users,
} from "lucide-react";
import LineupViewer from "../LineupViewer";
import type { SeasonStat } from "../FormationField";
import type { EarnedTitle } from "../../lib/titles";
import type { LineupData, MatchData } from "../../lib/match-types";
import { cldSquare } from "../../lib/cloudinary";
import {
  casualKind,
  hasScore,
  isCasualMatch,
  matchLogo,
  resultTextTone,
  resultWord,
} from "./match-result";
import { getDDay } from "../../lib/home-state";
import {
  ART_RESULT_VEIL,
  ART_SCRIM_DARK,
  ART_SCRIM_SOFT,
  ART_SCRIM_LIGHT,
  ART_VEIL,
  matchCasualArt,
  matchdayArt,
  matchResultArt,
} from "../../lib/matchday-art";
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
import FeedPinchPhoto from "./FeedPinchPhoto";
import AppToast from "../AppToast";


// ── 디자인 스케일 (피드) ─────────────────────────────────────
// 목록보다 한 단계씩 크다. 여백으로 읽히는 화면이라 작은 글씨를 쓸 이유가 없다.
//   아이콘  17 액션 · 32 팀 로고
//   글자    11 보조 · 13 본문 · 15 강조 · 34 스코어
const ICON = { action: 17, logo: 32 } as const;

const full = (url: string) => cldSquare(url);

/** 자체전 카드에 얼굴로 띄우는 최대 인원. 넘치면 +N 으로 받는다. */
const CASUAL_FACES = 12;

function momFromVotes(votes: MomVoteData[]): string {
  if (votes.length === 0) return "";
  const tally = (type: string) => {
    const t: Record<string, number> = {};
    votes.filter((v) => v.voteType === type && v.votedFor).forEach((v) => {
      t[v.votedFor] = (t[v.votedFor] || 0) + 1;
    });
    const entries = Object.entries(t).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return [];
    const max = entries[0][1];
    return entries.filter(([, c]) => c === max).map(([n]) => n);
  };
  const atk = tally("공격");
  const def = tally("수비");
  const atkSet = new Set(atk);
  const defOnly = def.filter((n) => !atkSet.has(n));
  if (atk.length > 0 && defOnly.length > 0) return `${atk.join(",")} / ${defOnly.join(",")}`;
  if (atk.length > 0) return atk.join(",");
  if (def.length > 0) return def.join(",");
  return "";
}

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
  likeCount = 0,
  likedByMe = false,
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
  likeCount?: number;
  likedByMe?: boolean;
}) {
  // 캐러셀 현재 장수. 인디케이터가 없으면 사진이 더 있다는 걸 알 방법이 없다.
  const [slide, setSlide] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // 좋아요 — 서버가 준 값이 기준이고, 내가 누른 직후에만 그 위에 덮어쓴다.
  // 새 서버 값이 들어오면(새로고침·다른 사람이 누름) 덮개를 걷어 그쪽을 따른다.
  const [override, setOverride] = useState<{ liked: boolean; likes: number } | null>(null);
  const [serverLike, setServerLike] = useState({ likedByMe, likeCount });
  const likeBusy = useRef(false);

  if (serverLike.likedByMe !== likedByMe || serverLike.likeCount !== likeCount) {
    setServerLike({ likedByMe, likeCount });
    setOverride(null);
  }

  const liked = override?.liked ?? likedByMe;
  const likes = override?.likes ?? likeCount;

  // 누른 사람 목록은 드로어를 열 때만 부른다. 피드 첫 로드에 매 경기 이름까지
  // 실어 오면, 정작 대부분은 열어보지도 않는 목록 때문에 홈이 무거워진다.
  const [likers, setLikers] = useState<string[] | null>(null);
  const [likersFailed, setLikersFailed] = useState(false);

  const loadLikers = async () => {
    setLikers(null);
    setLikersFailed(false);
    try {
      const res = await fetch(`/api/matches/${match.id}/likers`);
      if (!res.ok) throw new Error();
      setLikers((await res.json()).likers ?? []);
    } catch {
      setLikersFailed(true);
    }
  };

  const toggleLike = async () => {
    if (likeBusy.current) return;
    likeBusy.current = true;
    const before = { liked, likes };
    setOverride({ liked: !before.liked, likes: before.likes + (before.liked ? -1 : 1) });
    navigator.vibrate?.(8);
    try {
      const res = await fetch(`/api/matches/${match.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOverride({ liked: data.liked, likes: data.likeCount });
    } catch {
      // 안 눌린 걸 눌린 것처럼 두면 다음에 눌러도 반대로 동작한다.
      setOverride(before);
      setToastError("좋아요를 반영하지 못했어요.");
    } finally {
      likeBusy.current = false;
    }
  };

  useEffect(() => {
    if (!toastError) return;
    const timer = window.setTimeout(() => setToastError(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastError]);

  const logo = matchLogo(match);
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
  const scored = hasScore(match.ourScore, match.theirScore);
  const upcoming = match.result === "예정";
  const dDay = upcoming ? getDDay(match.date) : null;
  // 날짜는 지났는데 아직 결과를 안 넣은 경기. 그냥 두면 "D--3" 이 뜬다.
  // 관리자가 결과를 채우기 전까지 이 상태로 남으므로 문구를 따로 준다.
  const awaitingResult = dDay !== null && dDay < 0;
  const art = dDay === null ? null : matchdayArt(match.id, dDay);
  // 자체전·풋살·야유회. 승패도 스코어도 없고 MOM 투표도 열지 않는다.
  const casual = isCasualMatch(match.result, match.type, match.opponent);
  const kind = casualKind(match.result, match.type);
  // 끝난 경기 카드의 배경. 날짜를 안 섞으므로 마이페이지 그리드와 항상 같은 그림이다.
  // 자체전은 깃발 대신 팀·펀 계열을 깐다(matchday-art.matchCasualArt).
  const resultArt = upcoming ? null : casual ? matchCasualArt(match.id) : matchResultArt(match.id);
  // 매주 치르는 경기라 매번 MOM 이 나오면 상 자체의 무게가 없어진다.
  const showMom = !upcoming && attendees.length > 0 && !casual;
  const showFollowUp = showMom || storylines.length > 0;

  // 사진이 있는 완료 경기는 결과 카드를 캐러셀 맨 끝에 한 장 더 붙인다.
  // 예정 경기는 붙이지 않는다 — 아직 스코어도 MOM도 없어서 빈 판이 나온다.
  const showResultSlide = photos.length > 0 && !upcoming;
  const slideCount = photos.length + (showResultSlide ? 1 : 0);

  // 자체전 카드. 스코어 카드를 그대로 쓰면 "언더덕 A : 언더덕 B" 라는 있지도 않은
  // 대진이 생기고("A/B" 명단은 어디에도 없다) 큰 글씨와 뱃지에 "자체전"이 두 번 찍힌다.
  //
  // 자체전이 실제로 남기는 기록은 "누가 나왔는가" 하나뿐이다. 그래서 스코어 자리에
  // 종목을, 득점자 자리에 참석자 얼굴을 넣는다. 구조는 결과 카드와 같게 두고
  // 내용만 바꾼다 — 캐러셀에서 나란히 넘어가는 카드라 뼈대가 달라지면 튄다.
  const casualCard = (
    <div
      className="relative aspect-square w-full overflow-hidden bg-[#0b0a1a] text-center text-white"
      style={{
        background:
          "radial-gradient(circle at 16% 4%,rgba(196,181,253,.18),transparent 36%),radial-gradient(circle at 84% 0%,rgba(255,182,193,.14),transparent 38%),linear-gradient(160deg,#0b0a1a 0%,#1d1740 52%,#0b0a1a 100%)",
      }}
    >
      {resultArt && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultArt.src}
            alt=""
            aria-hidden
            loading="lazy"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden className="absolute inset-0" style={{ background: ART_RESULT_VEIL }} />
        </>
      )}
      <div className="pointer-events-none absolute -left-[15%] top-[4%] h-[72%] w-[38%] -rotate-[22deg] bg-gradient-to-r from-white/[0.055] to-transparent blur-xl" />
      <div className="pointer-events-none absolute -right-[15%] top-[2%] h-[72%] w-[38%] rotate-[22deg] bg-gradient-to-l from-violet-300/[0.10] to-transparent blur-xl" />

      <div className="relative z-10 flex h-full flex-col px-6 py-[clamp(18px,5vw,28px)]">
        <div>
          <p className="text-[10px] font-black tracking-[0.28em] text-white/35">{kind.en}</p>
          <p className="mt-1.5 text-[12px] font-black tracking-[0.08em] text-[#FFB6C1]">
            UNDERDUCK FC
          </p>
        </div>

        <div className="my-auto w-full">
          <p className="text-[clamp(38px,12vw,52px)] font-black leading-none tracking-[-0.05em] text-violet-200">
            {kind.ko}
          </p>

          {attendees.length > 0 && (
            <>
              {/* 얼굴이 이 카드의 본문이다. 한 줄에 다 못 넣으니 접어서 쌓고,
                  넘치는 인원은 숫자로 받는다 — 얼굴을 더 줄이면 누군지 안 보인다. */}
              <div className="mx-auto mt-5 flex max-w-[280px] flex-wrap items-center justify-center gap-1.5">
                {attendees.slice(0, CASUAL_FACES).map((name, i) => (
                  <span key={`${name}-casual-${i}`} className="rounded-full ring-2 ring-violet-200/25">
                    <PlayerFace name={name} size={30} />
                  </span>
                ))}
                {attendees.length > CASUAL_FACES && (
                  <span className="flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-white/[0.09] px-1.5 text-[10px] font-black text-white/55">
                    +{attendees.length - CASUAL_FACES}
                  </span>
                )}
              </div>

              <p className="mt-3.5 text-[12px] font-black text-white/60">
                {attendees.length}명이 함께 뛰었어요
              </p>
            </>
          )}
        </div>

        <p className="min-h-9 text-[10px] font-bold text-white/25">
          {[shortDate(match.date), match.location !== "미정" ? match.location : ""]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );

  // 사진 없는 완료 경기의 카드. 사진이 있는 경기에서는 캐러셀의 마지막 장으로도
  // 쓰기 때문에 변수로 빼 둔다 — 두 곳에 복붙하면 한쪽만 고쳐져 조용히 달라진다.
  const scoreCard = (
        <div
          className="relative aspect-square w-full overflow-hidden bg-[#070d20] text-center text-white"
          style={{
            background:
              "radial-gradient(circle at 14% 5%,rgba(147,197,253,.16),transparent 34%),radial-gradient(circle at 86% 0%,rgba(255,182,193,.20),transparent 38%),linear-gradient(160deg,#070d20 0%,#111d3d 52%,#070d20 100%)",
          }}
        >
          {/* 배경 그림. 이 카드는 스코어·득점자·MOM까지 글자가 빽빽해서 예정 경기보다
              훨씬 두껍게 눌러야 한다. 분위기만 남기고 내용은 그대로 읽히게. */}
          {resultArt && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultArt.src}
                alt=""
                aria-hidden
                loading="lazy"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: ART_RESULT_VEIL }}
              />
            </>
          )}
          <div className="pointer-events-none absolute -left-[15%] top-[4%] h-[72%] w-[38%] -rotate-[22deg] bg-gradient-to-r from-white/[0.055] to-transparent blur-xl" />
          <div className="pointer-events-none absolute -right-[15%] top-[2%] h-[72%] w-[38%] rotate-[22deg] bg-gradient-to-l from-[#FFB6C1]/[0.08] to-transparent blur-xl" />
          {/* 배경 그림이 없을 때만 언더덕 마크를 워터마크로 얹는다.
              깃발 그림에는 크레스트가 이미 박혀 있어서 같이 띄우면 둘이 겹친다. */}
          {!resultArt && (
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
          )}

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
                <span className="truncate">언더덕</span>
                <span className="truncate">{match.opponent}</span>
              </div>

              {scored ? (
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center text-[clamp(52px,17vw,72px)] font-black leading-none tracking-[-0.055em] tabular-nums">
                  <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{match.ourScore}</span>
                  <span className="px-3 text-[0.58em] text-white/20">:</span>
                  <span className="text-white/85">{match.theirScore}</span>
                </div>
              ) : (
                <p className="mt-4 text-[32px] font-black leading-tight tracking-[-0.04em] text-white/85">
                  기록 없음
                </p>
              )}

              <span
                className={`${goals.length > 0 ? "mt-3" : "mt-5"} inline-flex min-w-16 justify-center rounded-full border px-4 py-1.5 text-[11px] font-black ${
                  won
                    ? "border-[#FF8FA3]/70 bg-[#FF8FA3] text-white shadow-[0_0_28px_rgba(255,143,163,.28)]"
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
  );

  const resultCard = casual ? casualCard : scoreCard;

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
          {/* 자체전은 상대가 없다. opponent 에도 "자체전"이 들어 있어서 그대로 쓰면
              헤더와 카드 큰 글씨가 "자체전 / 자체전"으로 겹친다. 인스타로 치면
              여기는 계정 줄이고, 우리끼리 하는 날의 계정은 우리다. */}
          <p className="truncate text-[14px] font-black tracking-[-0.01em] text-gray-900 dark:text-white">
            {casual ? "언더덕 FC" : `vs ${match.opponent}`}
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
              <FeedPinchPhoto
                key={url}
                src={full(url)}
                className="w-full shrink-0 snap-center"
                loading={firstInFeed && i === 0 ? "eager" : "lazy"}
                fetchPriority={firstInFeed && i === 0 ? "high" : undefined}
              />
            ))}
            {/* 결과 카드를 맨 끝 장으로. 사진을 다 넘기면 그 경기의 스코어·득점자·MOM이
                한 장으로 정리돼 나온다. 인스타에서 마지막에 결과 그래픽을 붙이는 문법. */}
            {showResultSlide && (
              <div className="w-full shrink-0 snap-center">{resultCard}</div>
            )}
          </div>

          {slideCount > 1 && (
            <>
              {/* 오른쪽 위 장수 — 인스타가 쓰는 방식 */}
              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-black tabular-nums text-white backdrop-blur-sm">
                {slide + 1}/{slideCount}
              </span>
              {/* 아래 점 — 몇 장인지 한눈에 */}
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {Array.from({ length: slideCount }, (_, i) => (
                  <span
                    key={i}
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
        //
        // 배경 그림(matchdayArt)은 얹는 층이다. 기존 그라디언트를 밑에 깔아 두므로
        // 그림이 아직 없거나 못 받아와도 이 카드는 원래 모습으로 떨어진다.
        // 숫자와 로고는 그림에 굽지 않고 여기서 그린다 — 이유는 lib/matchday-art.ts.
        <div
          className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(160deg,#FFD9E1 0%,#FF8FA3 100%)" }}
        >
          {art && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={art.src}
                alt=""
                aria-hidden
                loading={firstInFeed ? "eager" : "lazy"}
                fetchPriority={firstInFeed ? "high" : undefined}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* 전체를 한 겹 가라앉힌 뒤(ART_VEIL), 글자 뒤를 한 번 더 누른다. */}
              {!art.light && !art.soft && (
                <div aria-hidden className="absolute inset-0" style={{ background: ART_VEIL }} />
              )}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: art.light
                    ? ART_SCRIM_LIGHT
                    : art.soft
                      ? ART_SCRIM_SOFT
                      : ART_SCRIM_DARK }}
              />
            </>
          )}

          <div className="relative z-10 flex flex-col items-center">
            <p
              className={`text-[13px] font-black tracking-[0.24em] ${
                art?.light ? "text-[#0f1729]/60" : "text-white/70"
              }`}
            >
              {awaitingResult ? "MATCH DONE" : "NEXT MATCH"}
            </p>
            <p
              className={`mt-3 font-black leading-none tracking-[-0.05em] tabular-nums ${
                awaitingResult ? "text-[40px]" : "text-[64px]"
              } ${
                art?.light
                  ? "text-[#0f1729]"
                  : "text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]"
              }`}
            >
              {awaitingResult ? "경기 종료" : dDay === 0 ? "D-DAY" : `D-${dDay}`}
            </p>
            <p
              className={`mt-4 text-[13px] font-bold ${
                art?.light ? "text-[#0f1729]/70" : "text-white/80"
              }`}
            >
              {shortDate(match.date)}
              {match.time && match.time !== "미정" ? ` · ${match.time}` : ""}
            </p>
          </div>
        </div>
      ) : (
        resultCard
      )}

      {/* 액션 줄 — 아이콘은 먼저 읽히고, 짧은 이름으로 기능을 확인한다.
          라인업의 핑크 점은 등록된 라인업이 있다는 표시다. */}
      <div className="flex items-start gap-1 px-4 pt-3.5">
        {/* 하트는 누르는 자리, 숫자는 누가 눌렀는지 보는 자리. 역할이 달라 버튼을 나눈다
            (버튼 안에 버튼은 넣을 수 없기도 하다). */}
        <div className="flex w-11 flex-col items-center gap-1 text-gray-700 dark:text-white/70">
          <span className="flex h-[18px] items-center gap-1">
            <button
              type="button"
              onClick={toggleLike}
              aria-pressed={liked}
              aria-label={liked ? "좋아요 취소" : "좋아요"}
              className="press-icon active:opacity-60"
            >
              <Heart
                width={ICON.action}
                height={ICON.action}
                strokeWidth={2}
                className={
                  liked
                    ? "fill-[#FF8FA3] text-[#FF8FA3] dark:fill-[#FFB6C1] dark:text-[#FFB6C1]"
                    : ""
                }
              />
            </button>
            {likes > 0 && (
              <DetailSheet
                title={`좋아요 ${likes}명`}
                subtitle={`${match.opponent} · ${shortDate(match.date)}`}
                className="text-[11px] font-black tabular-nums active:opacity-60"
                onOpen={loadLikers}
                trigger={likes}
              >
                {likersFailed ? (
                  <p className="py-6 text-center text-[12px] font-bold text-gray-400 dark:text-white/30">
                    목록을 불러오지 못했어요.
                  </p>
                ) : likers === null ? (
                  // 이름 길이를 모르니 폭만 조금씩 다르게 둔다.
                  <div className="flex flex-wrap gap-2">
                    {[64, 78, 58].slice(0, Math.min(3, likes)).map((w) => (
                      <span
                        key={w}
                        style={{ width: w }}
                        className="skeleton-shimmer h-8 rounded-full bg-gray-100 dark:bg-white/[0.055]"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {likers.map((name, i) =>
                      name === "알 수 없음" ? (
                        <span
                          key={`unknown-${i}`}
                          className="rounded-full bg-gray-100 px-3 py-1.5 text-[12px] font-bold text-gray-400 dark:bg-white/[0.07] dark:text-white/30"
                        >
                          {name}
                        </span>
                      ) : (
                        <Link
                          key={`${name}-${i}`}
                          href={`/players/${encodeURIComponent(name)}`}
                          className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-1 pr-3 text-[12px] font-bold text-gray-700 active:opacity-60 dark:bg-white/[0.07] dark:text-white/70"
                        >
                          <PlayerFace name={name} size={22} />
                          {name}
                        </Link>
                      ),
                    )}
                  </div>
                )}
              </DetailSheet>
            )}
          </span>
          <span className="text-[9px] font-bold leading-none text-gray-400 dark:text-white/35">
            좋아요
          </span>
        </div>

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
              const shareMatch = match.mom?.trim()
                ? match
                : { ...match, mom: momFromVotes(momVotes) };
              await shareStoryCard(shareMatch);
            } catch (e) {
              if (e instanceof Error && e.name !== "AbortError") {
                setToastError("공유 이미지를 만들지 못했어요. 다시 시도해 주세요.");
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

      <AppToast message={toastError} tone="error" />
    </article>
  );
}
