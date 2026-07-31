"use client";
// 개인 페이지 칭호 — 카드형. 일부만 보이고 아래 블러 + "전체 확인하기"로 펼침.
// 라이트/다크 테마 대응: 어두운 배경에선 밝은 accent 텍스트(a.text), 라이트에선 진한 accent(a.ring).

import { useState } from "react";
import { X } from "lucide-react";
import { useTheme } from "next-themes";
import { EarnedTitle, pickBadges } from "../lib/titles";
import { TitleBadge, titleSurface } from "./TitleBadges";
import ModalPortal from "./ModalPortal";

// 인스타 스토리 하이라이트처럼 가로로 넘긴다. 대표 칭호가 맨 앞, 나머지는 희귀도순.
// 보유 수는 최대 17개 · 평균 7개라 한 줄 스크롤로 전부 담긴다.
// 색은 뱃지와 같은 금속에서 파생시킨다(titleSurface) — 예전엔 여기서 별도 팔레트를
// 들고 있어서 라인업 뱃지와 개인 페이지의 색 체계가 서로 달랐다.

function Highlight({ title, isLight, onClick }: { title: EarnedTitle; isLight: boolean; onClick: () => void }) {
  const s = titleSurface(title, isLight);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[64px] shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-[0.94]"
    >
      <span
        className="rounded-full p-[3px]"
        style={{
          border: `1.5px solid ${s.border}`,
          boxShadow: s.glow ? `0 0 10px ${s.glow}` : undefined,
        }}
      >
        <TitleBadge title={title} size={50} />
      </span>
      <span
        className="line-clamp-2 text-center text-[9.5px] font-black leading-[1.25] tracking-[-0.02em]"
        style={{ color: s.fg }}
      >
        {title.name}
      </span>
    </button>
  );
}

export default function PlayerTitleCards({
  titles,
  featuredIds,
}: {
  titles: EarnedTitle[];
  featuredIds?: string[];
}) {
  const [selected, setSelected] = useState<EarnedTitle | null>(null);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  if (!titles.length) {
    return <p className="text-[12px] text-gray-400 font-semibold py-2">아직 획득한 칭호가 없어요.</p>;
  }

  // 대표 칭호를 고른 순서대로 앞에, 나머지는 희귀도순 — 라인업 뱃지와 같은 규칙.
  const ordered = pickBadges(titles, featuredIds, titles.length);
  const selectedSurface = selected ? titleSurface(selected, isLight) : null;

  return (
    <>
      {/* 좌우로 화면 끝까지 흘려보내야 '더 있다'는 게 읽힌다 */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-3">
          {ordered.map((t) => (
            <Highlight key={t.id} title={t} isLight={isLight} onClick={() => setSelected(t)} />
          ))}
        </div>
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
