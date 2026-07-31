"use client";
// 개인 페이지 칭호 — 카드형. 일부만 보이고 아래 블러 + "전체 확인하기"로 펼침.
// 라이트/다크 테마 대응: 어두운 배경에선 밝은 accent 텍스트(a.text), 라이트에선 진한 accent(a.ring).

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTheme } from "next-themes";
import { EarnedTitle, pickBadges } from "../lib/titles";
import { TitleBadge, titleSurface } from "./TitleBadges";
import ModalPortal from "./ModalPortal";

// 인스타 스토리 하이라이트처럼 가로로 넘긴다. 대표 칭호가 맨 앞, 나머지는 희귀도순.
// 보유 수는 최대 17개 · 평균 7개라 한 줄 스크롤로 전부 담긴다.
// 색은 뱃지와 같은 금속에서 파생시킨다(titleSurface) — 예전엔 여기서 별도 팔레트를
// 들고 있어서 라인업 뱃지와 개인 페이지의 색 체계가 서로 달랐다.

function Highlight({
  title,
  isLight,
  width,
  onClick,
}: {
  title: EarnedTitle;
  isLight: boolean;
  width: number;
  onClick: () => void;
}) {
  const s = titleSurface(title, isLight);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width }}
      className="flex shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-[0.94]"
    >
      {/* inline-flex 가 없으면 span 높이가 줄 높이로 잡혀 원이 타원으로 찌그러진다 */}
      <span
        className="inline-flex rounded-full p-[3px]"
        style={{
          border: `1.5px solid ${s.border}`,
          boxShadow: s.glow ? `0 0 8px ${s.glow}` : undefined,
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
  leading,
}: {
  titles: EarnedTitle[];
  featuredIds?: string[];
  /** 줄 맨 앞에 붙는 항목(본인 프로필의 ＋ 대표 고르기). 칭호와 같은 폭으로 맞춰 그린다. */
  leading?: React.ReactNode;
}) {
  const [selected, setSelected] = useState<EarnedTitle | null>(null);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // 항목 폭을 고정하면(예전 64px) 화면 폭에 따라 마지막 항목이 가장자리에 딱 떨어져
  // "더 있다"가 안 읽힌다. 그래서 폭을 화면에 맞춰 계산한다 —
  // 정수 개가 아니라 k + 0.5 개가 들어가게 잡아 다음 항목이 항상 반쯤 걸치게 한다.
  // (링 지름이 59px 이라 62px 아래로는 못 줄인다)
  const scrollRef = useRef<HTMLDivElement>(null);
  const [moreRight, setMoreRight] = useState(false);
  const [itemW, setItemW] = useState(64);
  // ＋ 항목도 줄에서 자리를 차지하므로 넘침 판정에 함께 넣어야 폭이 맞게 잡힌다.
  const count = titles.length + (leading ? 1 : 0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const GAP = 12;
    const PAD_LEFT = 16;

    const measure = () => {
      const avail = el.clientWidth - PAD_LEFT;
      let w = 64;
      for (let k = 6; k >= 3; k--) {
        const cand = (avail - GAP * k) / (k + 0.5);
        if (cand >= 62 && cand <= 84) {
          w = cand;
          break;
        }
      }
      // 항목이 적어 어차피 다 보이면 굳이 늘리지 않는다
      const overflows = count * (w + GAP) - GAP > avail;
      setItemW(overflows ? Math.round(w) : 64);
      setMoreRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
    };

    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [count]);

  // 반쯤 걸친 항목이 주된 신호라 페이드는 거들기만 한다 — 너무 세면 걸친 코인이 안 보인다
  const fade = moreRight
    ? "linear-gradient(90deg, #000 0, #000 calc(100% - 28px), rgba(0,0,0,0.4) 100%)"
    : undefined;

  if (!titles.length) {
    return <p className="text-[12px] text-gray-400 font-semibold py-2">아직 획득한 칭호가 없어요.</p>;
  }

  // 대표 칭호를 고른 순서대로 앞에, 나머지는 희귀도순 — 라인업 뱃지와 같은 규칙.
  const ordered = pickBadges(titles, featuredIds, titles.length);
  const selectedSurface = selected ? titleSurface(selected, isLight) : null;

  return (
    <>
      {/* 좌우로 화면 끝까지 흘려보내야 '더 있다'는 게 읽힌다.
          overflow-x 를 걸면 overflow-y 도 visible → auto 로 바뀌어 코인 글로우가
          위아래로 잘린다. 세로 패딩으로 번지는 만큼(약 12px) 자리를 비워둔다. */}
      <div
        ref={scrollRef}
        className="-mx-4 overflow-x-auto py-3 pl-4 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitMaskImage: fade, maskImage: fade }}
      >
        <div className="flex w-max gap-3">
          {leading && (
            <div className="shrink-0" style={{ width: itemW }}>
              {leading}
            </div>
          )}
          {ordered.map((t) => (
            <Highlight
              key={t.id}
              title={t}
              isLight={isLight}
              width={itemW}
              onClick={() => setSelected(t)}
            />
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
