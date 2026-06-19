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
  text: string;
  lightBg: string;
  darkBg: string;
  glow?: string;
}

function accentOf(t: EarnedTitle): Accent {
  if (t.variant === "manager") return { ring: "#D4A017", text: "#FFD978", lightBg: "linear-gradient(135deg,#fff9e8 0%,#f5e7bd 100%)", darkBg: "linear-gradient(135deg,#241a3d 0%,#17101f 55%,#34240b 100%)", glow: "rgba(255,196,70,0.22)" };
  if (t.variant === "leader") return { ring: "#E0A100", text: "#FFD45A", lightBg: "linear-gradient(135deg,#fffbed 0%,#f8e8ad 100%)", darkBg: "linear-gradient(135deg,#241d0a 0%,#16140d 58%,#302407 100%)", glow: "rgba(255,200,60,0.18)" };
  if (t.hidden) return { ring: "#22D3EE", text: "#A5F3FC", lightBg: "linear-gradient(125deg,#ecfeff 0%,#e0f2fe 42%,#f3e8ff 100%)", darkBg: "linear-gradient(125deg,#061b2c 0%,#09263b 42%,#21113b 100%)", glow: "rgba(34,211,238,0.24)" };
  if (t.tier === null) return { ring: "#C084FC", text: "#F5D0FE", lightBg: "linear-gradient(125deg,#fff1f7 0%,#f3e8ff 48%,#e0f2fe 100%)", darkBg: "linear-gradient(125deg,#31152b 0%,#24163b 48%,#102b42 100%)", glow: "rgba(192,132,252,0.16)" };
  const m: Accent[] = [
    { ring: "#B87333", text: "#F1B678", lightBg: "linear-gradient(135deg,#fff7ed 0%,#f2ddc7 100%)", darkBg: "linear-gradient(135deg,#2b1b12 0%,#171311 100%)" },
    { ring: "#8291A6", text: "#DCE6F3", lightBg: "linear-gradient(135deg,#f8fafc 0%,#dfe7f0 100%)", darkBg: "linear-gradient(135deg,#202938 0%,#121722 100%)" },
    { ring: "#D4A017", text: "#FFE37C", lightBg: "linear-gradient(135deg,#fffbea 0%,#f6e5a7 100%)", darkBg: "linear-gradient(135deg,#292109 0%,#17150d 100%)", glow: "rgba(245,206,90,0.14)" },
    { ring: "#A855F7", text: "#E9D5FF", lightBg: "linear-gradient(135deg,#faf5ff 0%,#eadcff 50%,#ffe4eb 100%)", darkBg: "linear-gradient(135deg,#26123e 0%,#171127 52%,#321524 100%)", glow: "rgba(168,85,247,0.2)" },
  ];
  return m[t.tier];
}

function TitleCard({ title, isLight }: { title: EarnedTitle; isLight: boolean }) {
  const a = accentOf(title);
  // 라이트 모드: 밝은 accent(a.text)는 흰 배경에서 안 보여 진한 a.ring 사용
  const fg = isLight ? a.ring : a.text;
  const icon = createElement(titleIcon(title.icon), { size: 15, strokeWidth: 2.5 });
  return (
    <div
      className="relative flex items-center gap-2.5 overflow-hidden rounded-[15px] px-2.5 py-2"
      style={{
        background: isLight ? a.lightBg : a.darkBg,
        border: `1px solid ${a.ring}55`,
        boxShadow: a.glow ? `0 5px 18px ${a.glow}, inset 0 1px rgba(255,255,255,0.12)` : "inset 0 1px rgba(255,255,255,0.1)",
      }}
    >
      {title.hidden && (
        <>
          <span className="absolute -right-5 -top-8 h-16 w-24 rotate-12 rounded-full bg-cyan-300/20 blur-xl" />
          <span className="absolute -bottom-8 right-8 h-14 w-20 rounded-full bg-fuchsia-400/15 blur-xl" />
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />
        </>
      )}
      <span
        className="relative flex shrink-0 items-center justify-center rounded-[11px]"
        style={{
          width: 32,
          height: 32,
          color: fg,
          background: isLight ? "rgba(255,255,255,0.68)" : "rgba(3,7,18,0.48)",
          border: `1px solid ${a.ring}99`,
          boxShadow: title.hidden ? `0 0 12px ${a.glow}` : `inset 0 1px rgba(255,255,255,0.16)`,
        }}
      >
        {icon}
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[11.5px] font-black tracking-[-0.01em]" style={{ color: fg }}>
            {title.name}
          </span>
          {title.hidden && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-black tracking-[0.12em]"
              style={{ color: isLight ? "#0E7490" : "#A5F3FC", background: "rgba(34,211,238,0.12)", border: "1px solid rgba(103,232,249,0.35)" }}
            >
              HIDDEN
            </span>
          )}
          {title.tierLabel && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[7.5px] font-black"
              style={{ color: fg, background: `${a.ring}22`, border: `1px solid ${a.ring}33` }}
            >
              {title.tierLabel}
            </span>
          )}
        </div>
        {title.desc && (
          <p className="mt-0.5 truncate text-[9px] font-semibold leading-snug text-gray-500/80 dark:text-white/45">
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
    <div className="rounded-[22px] p-2.5 ring-1 ring-black/5 dark:ring-white/10 bg-gradient-to-b from-gray-100/80 to-gray-50 dark:from-[#0d1425] dark:to-[#090e1b]">
      <div className="relative">
        <div className="space-y-1.5">
          {shown.map((t) => (
            <TitleCard key={t.id} title={t} isLight={isLight} />
          ))}
        </div>

        {/* 접힌 상태: 아래 블러 + 전체 확인하기 */}
        {hasMore && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-20 items-end justify-center">
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
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-black/[0.04] py-2 text-[10.5px] font-black text-gray-700 transition-all hover:bg-black/[0.07] active:scale-[0.98] dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.1]"
        >
          {expanded ? "접기" : `전체 확인하기 (${sorted.length})`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
