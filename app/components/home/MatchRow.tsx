"use client";
// 경기 한 줄 — 카드가 아니라 목록의 한 행.
//
// 카드(테두리 + 그림자 + 라운드)를 쓰면 아무리 안을 정리해도 "박스가 쌓인 화면"이 된다.
// 인스타 피드에도 커뮤니티 목록에도 박스는 없다. 헤어라인 하나로 나뉜 줄이 전부고,
// 내용이 화면 폭을 그대로 쓴다.
//
// 접힘 단위는 경기 하나다. 닫혀 있을 땐 세 줄(상대/스코어, 날짜·장소, 요약)로 끝나고
// 한 번 누르면 통째로 열린다. 섹션마다 따로 접으면 경기 하나에 여섯 번을 눌러야 했다.
//
// 읽기 전용이다. 사진 업로드·댓글 작성·관리자 편집은 실제 홈에 이미 있다.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Camera,
  ChevronDown,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  Users,
  Volleyball,
} from "lucide-react";
import LineupViewer from "../LineupViewer";
import type { SeasonStat } from "../FormationField";
import type { EarnedTitle } from "../../lib/titles";
import ModalPortal from "../ModalPortal";
import type { LineupData, MatchData } from "../../lib/match-types";
import { hasScore, isInternalMatch, matchLogo, resultTextTone } from "./match-result";
import { getDDay } from "../../lib/home-state";
import type { Storyline } from "../../lib/storylines";
import { useUnseen } from "./useUnseen";
import FeedbackThread, { type Feedback } from "./FeedbackThread";
import Storylines from "./Storylines";
import { shareStoryCard } from "../../lib/draw-story-card";
import PinchZoomImage from "../PinchZoomImage";
import { cldFit, cldThumb } from "../../lib/cloudinary";
import AppToast from "../AppToast";
import useAppOverlay from "../useAppOverlay";

// ── 디자인 스케일 ───────────────────────────────────────────
// 이 파일에서 크기를 즉흥으로 정하지 않기 위한 기준. 값이 필요하면 여기서 고른다.
//
//   아이콘  13 메타 · 15 조작(화살표·버튼) · 22 팀 로고 · 52 썸네일
//   획      2.2 기본 · 2.6 강조
//   글자    10 라벨(트래킹 넓게) · 11 보조 · 12 본문 · 15 제목 · 20 스코어
//   여백    섹션 사이 20 · 줄 사이 8 · 행 상하 18
//
// 처음엔 9~11px 에 전부 몰아넣었더니 정보가 많아서가 아니라 "붙어 있어서" 답답했다.
// 한 단계씩 올리고 줄간·섹션간을 벌린다. 줄 수는 그대로다.
const ICON = { meta: 13, action: 15, logo: 22, thumb: 52 } as const;
const STROKE = { base: 2.2, bold: 2.6 } as const;

// 라벨은 전부 같은 모양이어야 여섯 섹션이 한 규칙으로 읽힌다.
const LABEL = "text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-white/35";

const thumb = (url: string, size: number) => cldThumb(url, size);

function shortDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 닫힌 줄에 뜨는 요약 조각. 아이콘 + 값. */
function Meta({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <Icon width={ICON.meta} height={ICON.meta} strokeWidth={STROKE.base} className="shrink-0" />
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className={`mb-2.5 ${LABEL}`}>{children}</p>;
}

export default function MatchRow({
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
}) {
  const [open, setOpen] = useState(false);
  // 접힌 줄만 봐서는 새 댓글이 달렸는지 알 수 없다. 개수가 늘면 점을 찍는다.
  const [unseenFeedback, markFeedbackSeen] = useUnseen(
    `fb:${match.id}`,
    feedbacks.length ? String(feedbacks.length) : "",
  );
  const [openLineup, setOpenLineup] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const closeLightbox = useAppOverlay(lightbox !== null, () => setLightbox(null));

  useEffect(() => {
    if (!shareError) return;
    const timer = window.setTimeout(() => setShareError(null), 2200);
    return () => window.clearTimeout(timer);
  }, [shareError]);

  const logo = matchLogo(match);
  const photos = (match.photos || "").split(",").map((s) => s.trim()).filter((s) => s.startsWith("http"));
  const attendees = (match.attendees || "").split(",").map((s) => s.trim()).filter(Boolean);
  const goals = (match.goals || "").split(",").map((s) => s.trim()).filter(Boolean);
  const assists = (match.assists || "").split(",").map((s) => s.trim());
  // MOM 은 공동 수상이 "A / B" 또는 "A,B" 로 들어온다.
  const moms = (match.mom || "").split(/[/,]/).map((s) => s.trim()).filter(Boolean);
  // 아직 안 치른 경기. 스코어 자리에 D-day 가 들어가고 득점·MOM 은 없다.
  const upcoming = match.result === "예정";
  // 자체전은 승패도 스코어도 없다. 그냥 두면 "- : -" 가 뜬다.
  const scored = hasScore(match.ourScore, match.theirScore);
  const internal = isInternalMatch(match.result, match.opponent);
  const dDay = upcoming ? getDDay(match.date) : null;

  return (
    <article>
      {/* 닫힌 줄.
          누를 수 있다는 걸 세 가지로 알린다 — 오른쪽 끝 화살표, 누를 때 깔리는 배경,
          열려 있을 때 뒤집히는 화살표. -mx-4 px-4 로 배경이 화면 끝까지 닿아야
          "이 줄 전체가 버튼"으로 읽힌다. */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          markFeedbackSeen();
        }}
        aria-expanded={open}
        className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-3.5 px-4 py-[18px] text-left transition-colors active:bg-gray-50 dark:active:bg-white/[0.03]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                width={ICON.logo}
                height={ICON.logo}
                className="shrink-0 rounded-full bg-white object-cover ring-1 ring-black/[0.06] dark:ring-white/10"
              />
            )}
            <span className="truncate text-[15px] font-black tracking-[-0.02em] text-gray-900 dark:text-white">
              {match.opponent}
            </span>
            <span
              className={`shrink-0 text-[11px] font-black ${
                upcoming ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : resultTextTone(match.result)
              }`}
            >
              {upcoming && dDay !== null
                ? dDay === 0
                  ? "D-DAY"
                  : dDay < 0
                    ? `D+${Math.abs(dDay)}`
                    : `D-${dDay}`
                : match.result}
            </span>
          </div>

          <p className="mt-1.5 truncate text-[11px] font-bold text-gray-400 dark:text-white/35">
            {shortDate(match.date)} · {match.location}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-bold text-gray-400 dark:text-white/35">
            {upcoming && votes && votes.attending + votes.maybe + votes.absent > 0 && (
              <Meta icon={Users}>
                <span className="tabular-nums">참석 {votes.attending}</span>
                <span className="text-gray-300 dark:text-white/20">·</span>
                <span className="tabular-nums">미정 {votes.maybe}</span>
              </Meta>
            )}
            {goals.length > 0 && (
              <Meta icon={Volleyball}>
                <span className="truncate">{goals.slice(0, 2).join(" · ")}</span>
                {goals.length > 2 && <span className="tabular-nums">외 {goals.length - 2}</span>}
              </Meta>
            )}
            {moms.length > 0 && (
              <Meta icon={Star}>
                <span className="truncate">{moms[0]}</span>
                {moms.length > 1 && <span className="tabular-nums">외 {moms.length - 1}</span>}
              </Meta>
            )}
            {photos.length > 0 && (
              <Meta icon={Camera}>
                <span className="tabular-nums">{photos.length}</span>
              </Meta>
            )}
            {feedbacks.length > 0 && (
              <Meta icon={MessageSquare}>
                <span className="tabular-nums">{feedbacks.length}</span>
                {unseenFeedback && (
                  <span
                    aria-label="새 댓글"
                    className="h-1.5 w-1.5 rounded-full bg-[#FF8FA3] dark:bg-[#FFB6C1]"
                  />
                )}
              </Meta>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {upcoming ? (
            <span className="text-[13px] font-black text-gray-400 dark:text-white/35">
              {match.time && match.time !== "미정" ? match.time : "시간 미정"}
            </span>
          ) : scored ? (
            <span className="text-[20px] font-black leading-none tabular-nums text-gray-900 dark:text-white">
              <span className="text-gray-300 dark:text-white/30">{match.ourScore}</span>
              <span className="mx-0.5 text-gray-300 dark:text-white/20">:</span>
              {match.theirScore}
            </span>
            ) : (
            <span className="text-[12px] font-black text-gray-300 dark:text-white/25">
              {internal ? "기록 없음" : "-"}
            </span>
          )}
          {photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb(photos[0], ICON.thumb * 3)}
              alt=""
              loading="lazy"
              width={ICON.thumb}
              height={ICON.thumb}
              className="rounded-lg object-cover"
              style={{ width: ICON.thumb, height: ICON.thumb }}
            />
          )}
        </div>

        {/* 어포던스 — 이게 없으면 누를 수 있는 줄인지 알 방법이 없다 */}
        <ChevronDown
          width={ICON.action}
          height={ICON.action}
          strokeWidth={STROKE.bold}
          aria-hidden="true"
          className={`shrink-0 text-gray-300 transition-transform duration-200 dark:text-white/25 ${
            open ? "rotate-180 text-gray-500 dark:text-white/50" : ""
          }`}
        />
      </button>

      {/* 펼친 내용 — 경기 하나가 한 번에 열린다 */}
      {open && (
        <div className="flex flex-col gap-5 pb-6">
          {upcoming && (
            <p className="text-[12px] font-bold leading-[1.7] text-gray-400 dark:text-white/35">
              아직 치르지 않은 경기예요. 여기서 미리 이야기 나눠요.
            </p>
          )}

          {/* 주목 포인트. 히어로엔 팀 서사 한 줄만 세우고 나머지는 여기로 내렸다.
              경기당 4~26개(평균 12.5)가 나온다. 자르지 않고 접는다. */}
          {storylines.length > 0 && (
            <section>
              <SectionLabel>
                주목 포인트 <span className="tabular-nums">{storylines.length}</span>
              </SectionLabel>
              <Storylines items={storylines} />
            </section>
          )}

          {goals.length > 0 && (
            <section>
              <SectionLabel>득점</SectionLabel>
              <div className="flex flex-col gap-2">
                {goals.map((scorer, i) => (
                  <p key={`${scorer}-${i}`} className="text-[13px] font-black text-gray-900 dark:text-white">
                    {scorer}
                    {assists[i] && (
                      // 도움은 득점자에 딸린 부연이라 색을 주지 않는다.
                      <span className="ml-2 text-[11px] font-bold text-gray-400 dark:text-white/35">
                        assist by {assists[i]}
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </section>
          )}

          {moms.length > 0 && (
            <section>
              <SectionLabel>MOM</SectionLabel>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {moms.map((name) => (
                  <Link
                    key={name}
                    href={`/players/${encodeURIComponent(name)}`}
                    className="text-[13px] font-black text-amber-600 active:opacity-60 dark:text-amber-400"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {attendees.length > 0 && (
            <section>
              <SectionLabel>
                참석 <span className="tabular-nums">{attendees.length}</span>
              </SectionLabel>
              <p className="text-[12px] font-bold leading-[1.9] text-gray-500 dark:text-white/50">
                {attendees.map((name, i) => (
                  <span key={name}>
                    {i > 0 && <span className="text-gray-300 dark:text-white/20"> · </span>}
                    <Link href={`/players/${encodeURIComponent(name)}`} className="active:opacity-60">
                      {name}
                    </Link>
                  </span>
                ))}
              </p>
            </section>
          )}

          {photos.length > 0 && (
            // 풀블리드로 뺐더니 다른 섹션은 다 패딩이 있는데 사진만 화면에 붙어
            // "패딩이 빠진 것"처럼 보였다. 인스타의 풀블리드는 이미지가 게시물 자체일 때
            // 성립하는 거지, 패딩 있는 줄 안의 한 섹션에는 맞지 않는다.
            <section>
              <SectionLabel>
                사진 <span className="tabular-nums">{photos.length}</span>
              </SectionLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setLightbox(i)}
                    aria-label={`경기 사진 ${i + 1} 크게 보기`}
                    className="overflow-hidden rounded-xl active:opacity-80"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb(url, 300)}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 라인업만 따로 접는다. 포메이션 필드는 통째로 무거워서 항상 펼치면 부담이다.
              여기도 눌리는 곳이니 테두리 있는 버튼으로 만들어 라벨과 구분한다. */}
          {lineups.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setOpenLineup((v) => !v)}
                aria-expanded={openLineup}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-3 text-[12px] font-black text-gray-600 transition-colors active:bg-gray-50 dark:border-white/10 dark:text-white/60 dark:active:bg-white/[0.03]"
              >
                라인업
                <span className="font-bold text-gray-400 dark:text-white/35">
                  {lineups.length === 1
                    ? lineups[0].quarter
                    : `${lineups[0].quarter}–${lineups[lineups.length - 1].quarter}`}
                </span>
                <ChevronDown
                  width={ICON.action}
                  height={ICON.action}
                  strokeWidth={STROKE.bold}
                  aria-hidden="true"
                  className={`text-gray-300 transition-transform duration-200 dark:text-white/25 ${
                    openLineup ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openLineup && (
                <div className="mt-3">
                  <LineupViewer
                    match={match}
                    lineups={lineups}
                    rosterMap={rosterMap}
                    captainRoles={captainRoles}
                    playerStats={playerStats}
                    playerTitles={playerTitles}
                    editHref={isAdmin ? `/matches/${match.id}/edit` : undefined}
                  />
                </div>
              )}
            </section>
          )}

          {/* 댓글 — 피드와 같은 컴포넌트. 두 레이아웃에서 다르게 동작하면 안 된다. */}
          {(feedbacks.length > 0 || userName) && (
            <section>
              <SectionLabel>
                댓글 <span className="tabular-nums">{feedbacks.length}</span>
              </SectionLabel>
              <FeedbackThread
                matchId={match.id}
                initial={feedbacks}
                userName={userName}
                isAdmin={isAdmin}
                collapsedCount={0}
              />
            </section>
          )}

          {/* 인스타 결과 카드 — 기존 draw-story-card 를 그대로 부른다.
              1080×1920(스토리) / 1080×1350(피드)을 캔버스로 그려 공유 시트를 띄운다.
              끝난 경기에만 띄운다. 예정 경기는 스코어·MOM 이 비어 빈 판이 나온다. */}
          {!upcoming && (
          <button
            type="button"
            onClick={async () => {
              setSharing(true);
              try {
                await shareStoryCard(match);
              } catch (e) {
                if (e instanceof Error && e.name !== "AbortError") {
                  setShareError("공유하지 못했어요.");
                }
              } finally {
                setSharing(false);
              }
            }}
            disabled={sharing}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-3 text-[12px] font-black text-gray-700 transition-opacity disabled:opacity-40 dark:bg-white/[0.06] dark:text-white/80"
          >
            {sharing ? (
              <Loader2
                width={ICON.action}
                height={ICON.action}
                strokeWidth={STROKE.base}
                className="animate-spin"
              />
            ) : (
              <Sparkles width={ICON.action} height={ICON.action} strokeWidth={STROKE.base} />
            )}
            인스타에 결과 공유
          </button>
          )}
        </div>
      )}

      {/* 라이트박스는 body 로 포털한다.
          조상에 transform/filter 가 걸려 있으면 fixed 가 화면이 아니라 그 조상 기준이 돼서
          "페이지 전체 높이의 가운데"에 뜬다. ModalPortal 주석 참고. */}
      {lightbox !== null && (
        <ModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="경기 사진 크게 보기"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-4"
            onClick={closeLightbox}
          >
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="닫기"
              className="absolute right-3 z-10 flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[13px] font-black text-white/80 active:bg-white/10"
              style={{ top: "max(1rem, env(safe-area-inset-top))" }}
            >
              닫기
            </button>
            <div className="h-full w-full" onClick={(event) => event.stopPropagation()}>
              <PinchZoomImage
                src={cldFit(photos[lightbox])}
                alt=""
                className="p-4"
              />
            </div>
            {photos.length > 1 && (
              <span className="absolute bottom-6 text-[12px] font-black tabular-nums text-white/70">
                {lightbox + 1} / {photos.length}
              </span>
            )}
          </div>
        </ModalPortal>
      )}
      <AppToast message={shareError} tone="error" />
    </article>
  );
}
