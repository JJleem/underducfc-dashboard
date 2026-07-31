"use client";
// 개인 페이지 칭호 — 카드형. 일부만 보이고 아래 블러 + "전체 확인하기"로 펼침.
// 라이트/다크 테마 대응: 어두운 배경에선 밝은 accent 텍스트(a.text), 라이트에선 진한 accent(a.ring).

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useTheme } from "next-themes";
import { EarnedTitle, topTitles } from "../lib/titles";
import { TitleBadge, titleSurface } from "./TitleBadges";
import ModalPortal from "./ModalPortal";

// 카드 색은 뱃지와 같은 금속에서 파생시킨다(titleSurface). 예전엔 여기서 별도 팔레트를
// 들고 있어서 라인업 뱃지와 개인 페이지 카드의 색 체계가 서로 달랐다.

function TitleCard({ title, isLight, onClick }: { title: EarnedTitle; isLight: boolean; onClick: () => void }) {
  const s = titleSurface(title, isLight);
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[96px] min-w-0 flex-col items-center justify-start overflow-hidden rounded-[15px] px-2 pb-2 pt-2.5 text-center transition-transform active:scale-[0.97]"
      style={{
        background: s.background,
        border: `1px solid ${s.border}`,
        boxShadow: s.glow
          ? `0 5px 18px ${s.glow}, inset 0 1px rgba(255,255,255,0.12)`
          : "inset 0 1px rgba(255,255,255,0.1)",
      }}
    >
      {title.hidden && (
        <>
          <span className="absolute -right-5 -top-8 h-16 w-24 rotate-12 rounded-full bg-cyan-300/20 blur-xl" />
          <span className="absolute -bottom-8 right-8 h-14 w-20 rounded-full bg-fuchsia-400/15 blur-xl" />
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />
        </>
      )}
      <div className="relative flex w-full items-start justify-center">
        <TitleBadge title={title} size={40} />
        {(title.hidden || title.tierLabel) && (
          <span
            className="absolute right-0 top-0 max-w-[54px] truncate rounded-full px-1 py-0.5 text-[6px] font-black"
            style={{ color: s.fg, background: s.border, border: `1px solid ${s.border}` }}
          >
            {title.hidden ? "HIDDEN" : title.tierLabel}
          </span>
        )}
      </div>
      <span
        className="relative mt-2 line-clamp-2 text-[10px] font-black leading-[1.2] tracking-[-0.02em]"
        style={{ color: s.fg }}
      >
        {title.name}
      </span>
    </button>
  );
}

const PREVIEW = 9; // 접힌 상태에서 보이는 개수

export default function PlayerTitleCards({ titles }: { titles: EarnedTitle[] }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<EarnedTitle | null>(null);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  if (!titles.length) {
    return <p className="text-[12px] text-gray-400 font-semibold py-2">아직 획득한 칭호가 없어요.</p>;
  }

  const sorted = topTitles(titles, titles.length); // 등급/리더/감독 우선 정렬
  const hasMore = sorted.length > PREVIEW;
  const shown = expanded ? sorted : sorted.slice(0, PREVIEW);
  const selectedSurface = selected ? titleSurface(selected, isLight) : null;

  return (
    <>
      <div className="rounded-[22px] bg-gradient-to-b from-gray-100/80 to-gray-50 p-2 ring-1 ring-black/5 dark:from-[#0d1425] dark:to-[#090e1b] dark:ring-white/10">
        <div className="grid grid-cols-3 gap-1.5">
          {shown.map((t) => (
            <TitleCard key={t.id} title={t} isLight={isLight} onClick={() => setSelected(t)} />
          ))}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-black/[0.04] py-2 text-[10.5px] font-black text-gray-700 transition-all hover:bg-black/[0.07] active:scale-[0.98] dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.1]"
          >
            {expanded ? "접기" : `전체 확인하기 (${sorted.length})`}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* body 로 포털해야 "지금 보고 있는 화면" 아래쪽에 뜬다 */}
      {selected && selectedSurface && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} 상세 정보`}
            className="relative w-full max-w-sm overflow-hidden rounded-[26px] p-5 shadow-2xl"
            style={{
              // 반투명 금속 틴트를 불투명 판 위에 얹는다 (마지막 레이어가 바탕색)
              background: `${selectedSurface.background}, ${isLight ? "#F7F9FC" : "#0C1220"}`,
              border: `1px solid ${selectedSurface.border}`,
              boxShadow: selectedSurface.glow ? `0 18px 60px ${selectedSurface.glow}` : undefined,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {selected.hidden && (
              <>
                <span className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
                <span className="absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-violet-500/20 blur-3xl" />
              </>
            )}
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setSelected(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-gray-600 dark:bg-white/10 dark:text-white/70"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex items-center gap-3">
              <TitleBadge title={selected} size={52} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[15px] font-black" style={{ color: selectedSurface.fg }}>{selected.name}</p>
                  {selected.hidden && <span className="rounded-full bg-cyan-300/15 px-1.5 py-0.5 text-[7px] font-black text-cyan-600 dark:text-cyan-200">HIDDEN</span>}
                </div>
                <p className="mt-0.5 text-[9px] font-bold text-gray-500 dark:text-white/45">
                  {selected.tierLabel ?? selected.category}
                </p>
              </div>
            </div>

            <p className="relative mt-4 text-[11px] font-semibold leading-relaxed text-gray-600 dark:text-white/65">
              {selected.desc || "조건을 달성해 획득한 칭호입니다."}
            </p>

            {!!selected.stats?.length && (
              <div className="relative mt-4 grid grid-cols-2 gap-2">
                {selected.stats.map((stat) => (
                  <div key={`${stat.label}-${stat.value}`} className="rounded-xl bg-white/45 px-3 py-2.5 dark:bg-black/20">
                    <p className="text-[8px] font-bold text-gray-500 dark:text-white/40">{stat.label}</p>
                    <p className="mt-0.5 text-[13px] font-black tabular-nums" style={{ color: selectedSurface.fg }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}
