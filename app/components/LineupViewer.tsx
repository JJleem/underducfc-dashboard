"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, Maximize2, Pencil, Share2 } from "lucide-react";
import { toBlob } from "html-to-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { FormationField, type SeasonStat } from "./FormationField";
import { TitleBadges } from "./TitleBadges";
import SubstitutionEvents from "./SubstitutionEvents";
import type { EarnedTitle } from "../lib/titles";
import type { LineupData, MatchData } from "./DashboardClient";

const QUARTER_ORDER = ["예상", "1Q", "2Q", "3Q", "4Q", "5Q", "6Q"];

function BenchFaceOn({ name, no }: { name: string; no?: string }) {
  const candidates = [
    `/players/${encodeURIComponent(name)}.png`,
    `/players/${encodeURIComponent(name)}.webp`,
    `/players/${encodeURIComponent(name)}.jpg`,
    no ? `/players/${no}.png` : "",
    no ? `/players/${no}.webp` : "",
    no ? `/players/${no}.jpg` : "",
  ].filter(Boolean);
  const [imageIndex, setImageIndex] = useState(0);

  if (imageIndex >= candidates.length) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF8FA3]/20 text-[10px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">
        {no || "G"}
      </span>
    );
  }

  return (
    <span className="h-12 w-10 shrink-0 overflow-hidden">
      <img
        src={candidates[imageIndex]}
        alt=""
        className="h-full w-full object-contain object-bottom"
        onError={() => setImageIndex((current) => current + 1)}
      />
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
}: {
  match: MatchData;
  lineups: LineupData[];
  rosterMap: Record<string, string>;
  captainRoles?: Record<string, string>;
  playerStats?: Record<string, SeasonStat>;
  playerTitles?: Record<string, EarnedTitle[]>;
  editHref?: string;
}) {
  const sortedQuarters = QUARTER_ORDER.filter((quarter) =>
    lineups.some((lineup) => lineup.quarter === quarter)
  );
  const [activeQuarter, setActiveQuarter] = useState(sortedQuarters[0] || "");
  const [sharing, setSharing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const lineup = lineups.find((item) => item.quarter === activeQuarter) ?? lineups[0];

  const share = async () => {
    if (!lineup || !captureRef.current) return;
    setSharing(true);
    try {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

      const captureNode = captureRef.current;
      const captureWidth = captureNode.scrollWidth;
      const captureHeight = captureNode.scrollHeight;
      const blob = await toBlob(captureNode, {
        cacheBust: true,
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
        alert(`공유 실패: ${error.message}`);
      }
    } finally {
      setSharing(false);
    }
  };

  if (!lineup) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50/70 px-3.5 py-3 text-left transition-colors hover:border-[#FF8FA3]/40 hover:bg-[#FF8FA3]/5 dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-[#FFB6C1]/25"
        >
          <div>
            <p className="text-[11px] font-black text-gray-800 dark:text-gray-100">
              {lineup.quarter} 라인업 · {lineup.formation}
            </p>
            <p className="mt-0.5 text-[9px] font-semibold text-gray-400">
              선발 {lineup.players.length}명 · 대기 {lineup.subs.length}명
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">
            라인업 보기
            <Maximize2 className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="left-1/2 top-0 h-[100dvh] w-full max-w-md translate-x-[-50%] translate-y-0 gap-0 overflow-y-auto rounded-none border-0 bg-gray-50 p-0 text-gray-900 duration-300 dark:bg-[#070b18] dark:text-white [&>button]:right-4 [&>button]:top-4 [&>button]:z-50 [&>button]:rounded-full [&>button]:bg-black/5 [&>button]:p-2 [&>button]:text-gray-700 dark:[&>button]:bg-white/10 dark:[&>button]:text-white">
        <DialogTitle className="sr-only">경기 라인업</DialogTitle>
        <DialogDescription className="sr-only">
          쿼터별 포메이션, 선발 선수, 대기 선수와 교체 기록
        </DialogDescription>

        <div
          ref={captureRef}
          className="min-h-full bg-gray-50 text-gray-900 dark:bg-[#070b18] dark:text-white"
        >
        <div className="border-b border-gray-200 bg-gray-50/90 px-4 pb-3 pt-4 dark:border-white/10 dark:bg-[#070b18]/90">
          <p className="pr-12 text-[9px] font-black tracking-[0.18em] text-[#FF8FA3] dark:text-[#FFB6C1]">
            MATCH LINEUP
          </p>
          <div className="mt-1 flex items-end justify-between gap-3 pr-10">
            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-black">언더덕 vs {match.opponent}</h2>
              <p className="mt-0.5 text-[10px] font-semibold text-gray-500 dark:text-white/40">
                {match.date} · {activeQuarter} · {lineup.formation}
              </p>
            </div>
            <div data-share-hide="true" className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={share}
                disabled={sharing}
                className="flex h-8 items-center gap-1 rounded-xl bg-black/5 px-2.5 text-[9px] font-black text-gray-600 dark:bg-white/10 dark:text-white/80"
              >
                {sharing ? <Download className="h-3 w-3 animate-bounce" /> : <Share2 className="h-3 w-3" />}
                공유
              </button>
              {editHref && (
                <Link
                  href={editHref}
                  className="flex h-8 items-center gap-1 rounded-xl bg-[#FF8FA3] px-2.5 text-[9px] font-black text-white"
                >
                  <Pencil className="h-3 w-3" /> 편집
                </Link>
              )}
            </div>
          </div>

          {sortedQuarters.length > 1 && (
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
              {sortedQuarters.map((quarter) => (
                <button
                  key={quarter}
                  type="button"
                  onClick={() => setActiveQuarter(quarter)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-black transition-colors ${
                    activeQuarter === quarter
                      ? "bg-[#FF8FA3] text-white dark:bg-[#FFB6C1] dark:text-black"
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
          <FormationField
            lineup={lineup}
            rosterMap={rosterMap}
            captainRoles={captainRoles}
            matchInfo={{ goals: match.goals, assists: match.assists, mom: match.mom }}
            playerStats={playerStats}
            playerTitles={playerTitles}
            mode="faceon"
          />

          {lineup.subs.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="mb-2 text-[9px] font-black tracking-[0.16em] text-gray-400 dark:text-white/35">
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
                      <span className="block truncate text-[10px] font-black text-gray-700 dark:text-white/80">
                        {name}
                      </span>
                      <span className="block text-[8px] font-bold text-gray-400 dark:text-white/35">
                        No. {rosterMap[name] || "-"}
                      </span>
                    </span>
                    {playerTitles[name]?.length ? (
                      <span className="absolute right-1.5 top-1.5">
                        <TitleBadges titles={playerTitles[name]} size={12} max={3} gap={1} />
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {lineup.substitutions.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="mb-2 text-[9px] font-black tracking-[0.16em] text-gray-400 dark:text-white/35">
                교체 기록
              </p>
              <SubstitutionEvents events={lineup.substitutions} />
            </section>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
