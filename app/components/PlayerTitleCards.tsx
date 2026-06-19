"use client";
// 개인 페이지 칭호 — 카드형. 일부만 보이고 아래 블러 + "전체 확인하기"로 펼침.
// 라이트/다크 테마 대응: 어두운 배경에선 밝은 accent 텍스트(a.text), 라이트에선 진한 accent(a.ring).

import { createElement, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { EarnedTitle, topTitles } from "../lib/titles";
import { titleIcon } from "../lib/title-icons";

interface Accent {
  ring: string;
  tint: string;
  text: string;
}

function accentOf(t: EarnedTitle): Accent {
  if (t.variant === "manager") return { ring: "#D4A017", tint: "rgba(212,160,23,0.12)", text: "#FFD978" };
  if (t.variant === "leader") return { ring: "#E0A100", tint: "rgba(255,200,60,0.12)", text: "#FFD45A" };
  if (t.hidden) return { ring: "#0E7490", tint: "rgba(103,232,249,0.12)", text: "#67E8F9" };
  if (t.tier === null) return { ring: "#5B6B86", tint: "rgba(148,163,184,0.10)", text: "#CBD5E1" };
  const m: Accent[] = [
    { ring: "#B87333", tint: "rgba(184,115,51,0.14)", text: "#E8A96B" },   // 루키 — 브론즈
    { ring: "#7B8FA8", tint: "rgba(148,175,200,0.12)", text: "#B0C4DE" },   // 아마추어 — 실버
    { ring: "#D4A017", tint: "rgba(243,197,59,0.14)", text: "#F5CE5A" },    // 준프로 — 골드
    { ring: "#A855F7", tint: "rgba(168,85,247,0.16)", text: "#D8B4FE" },    // 프로 — 퍼플/레전드
  ];
  return m[t.tier];
}

function TitleCard({ title, isLight }: { title: EarnedTitle; isLight: boolean }) {
  const a = accentOf(title);
  // 라이트 모드: 밝은 accent(a.text)는 흰 배경에서 안 보여 진한 a.ring 사용
  const fg = isLight ? a.ring : a.text;
  const icon = createElement(titleIcon(title.icon), { size: 17, strokeWidth: 2.4 });
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
      style={{ background: a.tint, border: `1px solid ${a.ring}55` }}
    >
      <span
        className="flex items-center justify-center rounded-full shrink-0"
        style={{
          width: 38,
          height: 38,
          color: fg,
          background: isLight ? "rgba(255,255,255,0.85)" : "rgba(8,12,26,0.6)",
          border: `2px solid ${a.ring}`,
        }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-black truncate" style={{ color: fg }}>
            {title.name}
          </span>
          {title.hidden && (
            <span
              className="text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0"
              style={{ color: "#67E8F9", background: "rgba(6,182,212,0.2)", border: "1px solid rgba(103,232,249,0.3)" }}
            >
              히든
            </span>
          )}
          {title.tierLabel && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0"
              style={{ color: fg, background: `${a.ring}33` }}
            >
              {title.tierLabel}
            </span>
          )}
        </div>
        {title.desc && (
          <p className="text-[10.5px] font-semibold text-gray-500 dark:text-white/45 mt-0.5 leading-snug truncate">
            {title.desc}
          </p>
        )}
      </div>
    </div>
  );
}

const PREVIEW = 4; // 접힌 상태에서 보이는 개수

export default function PlayerTitleCards({ titles }: { titles: EarnedTitle[] }) {
  const [expanded, setExpanded] = useState(false);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  if (!titles.length) {
    return <p className="text-[12px] text-gray-400 font-semibold py-2">아직 획득한 칭호가 없어요.</p>;
  }

  const sorted = topTitles(titles, titles.length); // 등급/리더/감독 우선 정렬
  const hasMore = sorted.length > PREVIEW;
  const shown = expanded ? sorted : sorted.slice(0, PREVIEW);

  // 접힘 블러가 페이드되는 바닥색 (컨테이너 배경과 일치)
  const fadeColor = isLight ? "243,244,246" : "10,15,36";

  return (
    <div className="rounded-3xl p-3 ring-1 ring-black/5 dark:ring-white/10 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#0c1430] dark:to-[#0a0f24]">
      <div className="relative">
        <div className="space-y-2">
          {shown.map((t) => (
            <TitleCard key={t.id} title={t} isLight={isLight} />
          ))}
        </div>

        {/* 접힌 상태: 아래 블러 + 전체 확인하기 */}
        {hasMore && !expanded && (
          <div className="absolute inset-x-0 bottom-0 h-24 flex items-end justify-center pointer-events-none">
            <div
              className="absolute inset-0 rounded-b-2xl"
              style={{
                background: `linear-gradient(180deg, rgba(${fadeColor},0) 0%, rgba(${fadeColor},0.85) 70%, rgb(${fadeColor}) 100%)`,
                backdropFilter: "blur(1.5px)",
                WebkitBackdropFilter: "blur(1.5px)",
                maskImage: "linear-gradient(180deg, transparent 0%, black 65%)",
                WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 65%)",
              }}
            />
          </div>
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[12px] font-black text-gray-700 dark:text-white/80 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-[0.98] transition-all"
        >
          {expanded ? "접기" : `전체 확인하기 (${sorted.length})`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
