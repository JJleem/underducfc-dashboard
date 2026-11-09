"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Download, Maximize2, Pencil, Play, Share2 } from "lucide-react";
import { toBlob } from "html-to-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { FormationField, type SeasonStat } from "./FormationField";
import StartingElevenCard from "./StartingElevenCard";
import StartingElevenCard2627, { CARD_2627_BG } from "./StartingElevenCard2627";
import { seasonOf } from "../lib/seasons";
import AppToast from "./AppToast";
import { TitleBadges } from "./TitleBadges";
import SubstitutionEvents from "./SubstitutionEvents";
import type { EarnedTitle } from "../lib/titles";
import type { LineupData, MatchData } from "../lib/match-types";
import { playerFaceOnSrc } from "../lib/player-faceons";
import LineupReveal from "./fx/LineupReveal";
import { pageAccent } from "./fx/effects";
import { markSeen, wasSeen } from "./fx/seen";

const QUARTER_ORDER = ["예상", "1Q", "2Q", "3Q", "4Q", "5Q", "6Q"];
const DECODED_FACEONS = new Set<string>();
const FACEON_RETRY_AFTER = new Map<string, number>();
const FACEON_RETRY_MS = 60_000;
const SKELETON_PLAYERS = [
  [50, 89],
  [17, 70], [39, 74], [61, 74], [83, 70],
  [24, 49], [50, 54], [76, 49],
  [18, 25], [50, 20], [82, 25],
] as const;

function lineupFaceOnSources(lineups: LineupData[]) {
  return Array.from(new Set(
    lineups.flatMap((item) =>
      item.players.map(playerFaceOnSrc).filter((src): src is string => !!src),
    ),
  ));
}

function faceOnIsSettled(src: string) {
  return DECODED_FACEONS.has(src) || (FACEON_RETRY_AFTER.get(src) ?? 0) > Date.now();
}

async function inlineImgs(root: HTMLElement): Promise<{ imgs: HTMLImageElement[]; originals: string[] }> {
  const imgs = Array.from(root.querySelectorAll("img"));
  const originals = imgs.map((img) => img.getAttribute("src") || "");

  // 아직 안 온 이미지는 기다린다 — 단, 끝없이 매달리지 않게 4초에서 끊는다.
  await Promise.all(
    imgs.map((img) => {
      if (!img.src || img.src.startsWith("data:") || img.complete) return;
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        setTimeout(done, 4000);
      });
    }),
  );

  for (const img of imgs) {
    if (!img.src || img.src.startsWith("data:") || !img.naturalWidth) continue;
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0);
      img.src = c.toDataURL();
    } catch {
      try {
        const res = await fetch(img.src);
        const blob = await res.blob();
        img.src = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        // 인라인 변환 실패 시 원본 유지
      }
    }
  }
  // data URL 로 바꾼 직후엔 아직 디코딩 전일 수 있다. 다 풀린 뒤에 그려야 빠지는 얼굴이 없다.
  await Promise.all(imgs.map((img) => img.decode().catch(() => undefined)));
  return { imgs, originals };
}

/**
 * html-to-image 로 노드를 PNG 로. 아이폰 사파리(WebKit)는 SVG foreignObject 안의 이미지를
 * **첫 번째 그리기에서 일부 빼먹는다** — "누구 얼굴은 나오고 누구는 빠지는" 증상의 원인.
 * 한 번 그려서 버리고 다시 그린 결과를 쓰면 다 채워진다(라이브러리 이슈에 알려진 우회).
 */
async function captureBlob(node: HTMLElement, options: Parameters<typeof toBlob>[1]): Promise<Blob | null> {
  await toBlob(node, options).catch(() => null);
  return toBlob(node, options);
}

function restoreImgs(imgs: HTMLImageElement[], originals: string[]) {
  imgs.forEach((img, i) => {
    if (originals[i] && img.getAttribute("src") !== originals[i]) img.src = originals[i];
  });
}

function BenchFaceOn({ name, no }: { name: string; no?: string }) {
  const src = playerFaceOnSrc(name);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <span className="relative flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ud-primary)]/20 text-[10px] font-black text-[var(--ud-primary)] transition-opacity duration-150 dark:text-[var(--ud-primary)] ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
      >
        {no || "G"}
      </span>
      {src && !failed && (
        // Cloudinary·페이스온은 외부 URL 이라 next/image 로 못 태운다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="eager"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-contain object-bottom transition-opacity duration-150 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </span>
  );
}

export default function LineupViewer({
  match,
  lineups,
  rosterMap,
  captainRoles = {},
  playerStats,
  playerTitles = {},
  editHref,
  autoReveal = false,
}: {
  match: MatchData;
  lineups: LineupData[];
  rosterMap: Record<string, string>;
  captainRoles?: Record<string, string>;
  playerStats?: Record<string, SeasonStat>;
  playerTitles?: Record<string, EarnedTitle[]>;
  editHref?: string;
  /**
   * 라인업 공개 연출을 이 기기에서 처음 한 번 자동으로 띄운다. 홈의 다음 경기에서만 켠다.
   * 키가 경기 단위라 라인업을 고쳐 저장해도 다시 뜨지 않는다.
   */
  autoReveal?: boolean;
}) {
  const sortedQuarters = QUARTER_ORDER.filter((quarter) =>
    lineups.some((lineup) => lineup.quarter === quarter)
  );
  const [activeQuarter, setActiveQuarter] = useState(sortedQuarters[0] || "");
  const [open, setOpen] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lineup = lineups.find((item) => item.quarter === activeQuarter) ?? lineups[0];
  // 발표 포스터 판 — 경기 날짜가 속한 시즌으로 고른다.
  const is2627 = seasonOf(match.date) === "2627";

  // ── 라인업 공개 연출(1쿼터 선발만)
  const revealStore = `fx_lineup_${match.id}`;
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [revealOpen, setRevealOpen] = useState(false);
  const [autoDone, setAutoDone] = useState(false);
  const firstLineup = lineups.find((item) => item.quarter === sortedQuarters[0]) ?? lineups[0];
  const showReveal =
    !!firstLineup && (revealOpen || (autoReveal && isClient && !autoDone && !wasSeen(revealStore)));
  const xi = firstLineup ? firstLineup.players.map((n) => n.trim()) : [];
  // 완장: 주장이 뛰면 주장, 아니면 선발 부주장 중 첫 사람(FormationField 와 같은 규칙의 단순판).
  const captain = xi.find((n) => captainRoles[n] === "C") ?? xi.find((n) => captainRoles[n] === "VC");

  // 라인업을 연 순간 다른 쿼터의 페이스온까지 브라우저 캐시에서 디코딩한다.
  // 탭을 누른 뒤 네트워크·디코딩을 시작하면 짧게 사라져 보이므로 한 박자 앞당긴다.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const sources = lineupFaceOnSources(lineups);
    const missingSources = sources.filter((src) => !faceOnIsSettled(src));
    if (missingSources.length === 0) return;

    const images = missingSources.map((src) => {
      const img = new window.Image();
      img.src = src;
      return { img, src };
    });
    // 모든 쿼터의 사진이 준비된 다음 필드를 한 번에 공개한다. 일부 선수만 늦게
    // 나타나는 화면보다 짧고 명확한 준비 상태가 시각적으로 안정적이다.
    void Promise.all(
      images.map(async ({ img, src }) => {
        try {
          await (img.decode?.() ?? Promise.resolve());
          DECODED_FACEONS.add(src);
          FACEON_RETRY_AFTER.delete(src);
        } catch {
          // 깨진 한 장 때문에 전체 라인업을 계속 스켈레톤에 가두지 않는다.
          // 번호 폴백을 보여주되, 일시적 네트워크 오류일 수 있으므로 1분 뒤 재시도한다.
          FACEON_RETRY_AFTER.set(src, Date.now() + FACEON_RETRY_MS);
        }
      }),
    ).then(() => {
      if (!cancelled) setImagesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [lineups, open]);

  useEffect(() => {
    if (!toastError) return;
    const timer = window.setTimeout(() => setToastError(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toastError]);

  const share = async () => {
    if (!lineup || !captureRef.current) return;
    setSharing(true);
    try {
      await document.fonts.ready;

      const captureNode = captureRef.current;
      const { imgs, originals } = await inlineImgs(captureNode);

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

      const captureWidth = captureNode.scrollWidth;
      const captureHeight = captureNode.scrollHeight;
      let blob: Blob | null = null;
      try {
        blob = await captureBlob(captureNode, {
          pixelRatio: 2,
          width: captureWidth,
          height: captureHeight,
          canvasWidth: captureWidth * 2,
          canvasHeight: captureHeight * 2,
          style: {
            width: `${captureWidth}px`,
            height: `${captureHeight}px`,
            overflow: "visible",
          },
          backgroundColor: document.documentElement.classList.contains("dark")
            ? "#070b18"
            : "#f9fafb",
          filter: (node) =>
            !(node instanceof HTMLElement && node.dataset.shareHide === "true"),
        });
      } finally {
        restoreImgs(imgs, originals);
      }
      if (!blob) throw new Error("이미지 생성 실패");

      const fileName = `언더덕_${match.opponent}_${activeQuarter}_라인업.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
      } catch {
        // 클립보드 미지원 시 공유/다운로드만 진행
      }

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "언더덕 라인업" });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setToastError(`공유 실패: ${error.message}`);
      }
    } finally {
      setSharing(false);
    }
  };

  const saveLineupCard = async () => {
    if (!lineup || !cardRef.current) return;
    setSavingCard(true);
    try {
      const node = cardRef.current;
      await document.fonts.ready;

      const { imgs, originals } = await inlineImgs(node);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

      let blob: Blob | null = null;
      try {
        const bounds = node.getBoundingClientRect();
        const width = Math.round(bounds.width);
        const height = Math.round(bounds.height);
        blob = await captureBlob(node, {
          pixelRatio: 3,
          width,
          height,
          backgroundColor: is2627 ? CARD_2627_BG : "#07050A",
          style: {
            width: `${width}px`,
            height: `${height}px`,
          },
        });
      } finally {
        restoreImgs(imgs, originals);
      }
      if (!blob) throw new Error("이미지 생성 실패");

      const opponent = match.opponent.replace(/[\\/:*?"<>|]/g, "_");
      const fileName = `언더덕_${opponent}_${activeQuarter || "라인업"}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "언더덕 선발 라인업",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setToastError(`이미지 저장 실패: ${error.message}`);
      }
    } finally {
      setSavingCard(false);
    }
  };

  if (!lineup) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const sources = lineupFaceOnSources(lineups);
          setImagesReady(sources.every(faceOnIsSettled));
        }
        setOpen(next);
      }}
    >
      <div className="space-y-2">
        {/* 쿼터 선택 + 우측 이미지 저장 */}
        <div className="flex items-center gap-2">
          {sortedQuarters.length > 1 && (
            <div className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {sortedQuarters.map((quarter) => (
                <button
                  key={quarter}
                  type="button"
                  onClick={() => setActiveQuarter(quarter)}
                  className={`app-chip transition-colors ${
                    activeQuarter === quarter
                      ? "bg-[var(--ud-primary)] text-white dark:bg-[var(--ud-primary)] dark:text-black"
                      : "bg-black/5 text-gray-500 dark:bg-white/[0.06] dark:text-white/45"
                  }`}
                >
                  {quarter}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setRevealOpen(true)}
            className={`${sortedQuarters.length > 1 ? "" : "ml-auto "}flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-black/5 px-2 text-[12px] font-black text-gray-600 dark:bg-white/[0.06] dark:text-white/60`}
            aria-label="공개 영상"
          >
            <Play className="h-3 w-3 fill-current" />
            {/* 320px 에선 쿼터 탭 넷과 버튼 둘이 한 줄에 안 들어간다 — 아이콘만 남긴다. */}
            <span className="max-[359px]:hidden">공개 영상</span>
          </button>
          <button
            type="button"
            onClick={saveLineupCard}
            disabled={savingCard}
            aria-label={savingCard ? "만드는 중" : "이미지 저장"}
            className="flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-[var(--ud-primary)]/35 bg-[var(--ud-primary)]/10 px-2 text-[12px] font-black text-[var(--ud-primary-strong)] transition-opacity disabled:opacity-60 dark:text-[var(--ud-primary)]"
          >
            <Download className="h-4 w-4" strokeWidth={2.2} />
            <span className="max-[359px]:hidden">{savingCard ? "만드는 중" : "저장"}</span>
          </button>
        </div>

        {/* 인라인 발표 카드 프리뷰 (탭하면 다이얼로그 열림) */}
        <DialogTrigger asChild>
          <button
            type="button"
            className="block min-w-0 w-full overflow-hidden text-left transition-transform active:scale-[0.99]"
          >
            {/* 발표 포스터는 시즌별로 따로 둔다 — 25-26 경기는 25-26 판 그대로(손대지 않음), 26-27 부터 새 판.
                25-26 판은 앱 전체 굵기 하향(900→700) 전에 만든 디자인이라 .fx-scope 로 원래 굵기를 준다. */}
            {is2627 ? (
              <StartingElevenCard2627
                ref={cardRef}
                interactive={false}
                formation={lineup.formation}
                players={lineup.players}
                rosterMap={rosterMap}
                captainRoles={captainRoles}
                opponent={match.opponent}
                date={match.date}
                time={match.time}
                location={match.location}
                subs={lineup.subs}
              />
            ) : (
              <span className="fx-scope block">
                <StartingElevenCard
                  ref={cardRef}
                  interactive={false}
                  formation={lineup.formation}
                  players={lineup.players}
                  rosterMap={rosterMap}
                  captainRoles={captainRoles}
                  opponent={match.opponent}
                  date={match.date}
                  time={match.time}
                  location={match.location}
                  subs={lineup.subs}
                />
              </span>
            )}
          </button>
        </DialogTrigger>

        <DialogTrigger asChild>
          <button
            type="button"
            className="group flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50/70 px-3.5 py-3 text-left transition-colors hover:border-[var(--ud-primary)]/40 hover:bg-[var(--ud-primary)]/5 dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-[var(--ud-primary)]/25"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-black text-gray-800 dark:text-gray-100">
                {lineup.quarter} 라인업 · {lineup.formation}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-white/55">
                선발 {lineup.players.filter(Boolean).length}명 · 대기 {lineup.subs.length}명
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-black text-[var(--ud-primary)]">
              라인업 보기
              <Maximize2 className="h-4 w-4" strokeWidth={2.2} />
            </span>
          </button>
        </DialogTrigger>
      </div>

      {/* PWA standalone(viewportFit: cover)에서는 top-0이 상태바 아래까지 올라간다.
          내용과 닫기 버튼을 상태바 높이만큼 내려 배터리/시계 영역에 가려 탭이 막히는 걸 막는다. */}
      <DialogContent className="left-1/2 top-0 h-[100dvh] w-full max-w-md translate-x-[-50%] translate-y-0 gap-0 overflow-y-auto rounded-none border-0 bg-gray-50 p-0 pt-[env(safe-area-inset-top)] text-gray-900 duration-300 dark:bg-[#070b18] dark:text-white [&>button]:right-4 [&>button]:top-[calc(1rem+env(safe-area-inset-top))] [&>button]:z-50 [&>button]:rounded-full [&>button]:bg-black/5 [&>button]:p-2 [&>button]:text-gray-700 dark:[&>button]:bg-white/10 dark:[&>button]:text-white">
        <DialogTitle className="sr-only">경기 라인업</DialogTitle>
        <DialogDescription className="sr-only">
          쿼터별 포메이션, 선발 선수, 대기 선수와 교체 기록
        </DialogDescription>

        <div
          ref={captureRef}
          className="min-h-full bg-gray-50 text-gray-900 dark:bg-[#070b18] dark:text-white"
        >
        <div className="border-b border-gray-200 bg-gray-50/90 px-4 pb-3 pt-4 dark:border-white/10 dark:bg-[#070b18]/90">
          <p className="pr-12 text-[11px] font-black text-[var(--ud-primary)]">
            라인업
          </p>
          <div className="mt-1 flex items-end justify-between gap-3 pr-10">
            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-black">언더덕 vs {match.opponent}</h2>
              <p className="mt-0.5 truncate text-[12px] font-semibold text-gray-500 dark:text-white/55">
                {match.date} · {activeQuarter} · {lineup.formation}
              </p>
            </div>
            <div data-share-hide="true" className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={share}
                disabled={sharing}
                className="flex h-8 items-center gap-1 whitespace-nowrap rounded-xl bg-black/5 px-2.5 text-[12px] font-black text-gray-600 dark:bg-white/10 dark:text-white/80"
              >
                {sharing ? <Download className="h-4 w-4" strokeWidth={2.2} /> : <Share2 className="h-4 w-4" strokeWidth={2.2} />}
                공유
              </button>
              {editHref && (
                <Link
                  href={editHref}
                  className="flex h-8 items-center gap-1 whitespace-nowrap rounded-xl bg-[var(--ud-primary)] px-2.5 text-[12px] font-black text-white"
                >
                  <Pencil className="h-4 w-4" strokeWidth={2.2} /> 편집
                </Link>
              )}
            </div>
          </div>

          {sortedQuarters.length > 1 && (
            <div className="scrollbar-none mt-3 flex gap-1.5 overflow-x-auto">
              {sortedQuarters.map((quarter) => (
                <button
                  key={quarter}
                  type="button"
                  onClick={() => setActiveQuarter(quarter)}
                  className={`app-chip transition-colors ${
                    activeQuarter === quarter
                      ? "bg-[var(--ud-primary)] text-white dark:bg-[var(--ud-primary)] dark:text-black"
                      : "bg-black/5 text-gray-500 dark:bg-white/[0.06] dark:text-white/45"
                  }`}
                >
                  {quarter}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 px-3 pb-10 pt-3">
          {imagesReady ? (
            <FormationField
              lineup={lineup}
              rosterMap={rosterMap}
              captainRoles={captainRoles}
              matchInfo={{ goals: match.goals, assists: match.assists, mom: match.mom }}
              playerStats={playerStats}
              playerTitles={playerTitles}
              mode="faceon"
            />
          ) : (
            <div
              aria-label="라인업 불러오는 중"
              className="relative w-full overflow-hidden rounded-2xl bg-[#0f4a25] ring-1 ring-black/5 dark:ring-white/10"
              style={{ paddingBottom: "190%" }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,#15592e_0%,#15592e_12.5%,#0f4a25_12.5%,#0f4a25_25%)] bg-[length:100%_25%]">
                <div className="absolute inset-[3%] rounded-xl border border-white/20" />
                <div className="absolute left-[3%] right-[3%] top-1/2 border-t border-white/20" />
                <div className="absolute left-1/2 top-1/2 h-[13%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-white/20" />
                {SKELETON_PLAYERS.map(([left, top], index) => (
                  <div
                    key={`${left}-${top}`}
                    className="absolute flex w-[19%] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    <div
                      className="skeleton-shimmer h-14 w-12 rounded-t-[45%] rounded-b-xl bg-white/20"
                      style={{ animationDelay: `${index * 45}ms` }}
                    />
                    <div className="skeleton-shimmer mt-1.5 h-2.5 w-full rounded-full bg-white/20" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {lineup.subs.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="app-section-label mb-2 text-[12px]">
                대기 선수
              </p>
              <div className="grid grid-cols-2 gap-2">
                {lineup.subs.map((name) => (
                  <Link
                    key={name}
                    href={`/players/${encodeURIComponent(name)}`}
                    className="relative flex min-w-0 items-end gap-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 px-2 pb-2 pt-1 dark:border-white/10 dark:bg-white/[0.05]"
                  >
                    <BenchFaceOn name={name} no={rosterMap[name]} />
                    <span className="min-w-0 flex-1 pb-0.5">
                      <span className="block truncate text-[12px] font-black text-gray-700 dark:text-white/80">
                        {name}
                      </span>
                      <span className="block whitespace-nowrap text-[11px] font-bold text-gray-500 dark:text-white/50">
                        No. {rosterMap[name] || "-"}
                      </span>
                    </span>
                    {playerTitles[name]?.length ? (
                      <span className="absolute right-1.5 top-1.5">
                        <TitleBadges titles={playerTitles[name]} size={12} max={3} gap={2} />
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {lineup.substitutions.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="app-section-label mb-2 text-[12px]">
                교체 기록
              </p>
              <SubstitutionEvents events={lineup.substitutions} />
            </section>
          )}
        </div>
        </div>
      </DialogContent>
      <AppToast message={toastError} tone="error" />
      {showReveal && firstLineup && (
        <LineupReveal
          data={{
            opponent: match.opponent,
            date: match.date,
            formation: firstLineup.formation,
            players: firstLineup.players,
            positions: firstLineup.positions,
            captain,
          }}
          accent={pageAccent()}
          onClose={() => {
            markSeen(revealStore);
            setAutoDone(true);
            setRevealOpen(false);
          }}
        />
      )}
    </Dialog>
  );
}
