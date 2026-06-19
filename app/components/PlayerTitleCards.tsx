"use client";
// 개인 페이지 칭호 — 카드형. 일부만 보이고 아래 블러 + "전체 확인하기"로 펼침.
// 라이트/다크 테마 대응: 어두운 배경에선 밝은 accent 텍스트(a.text), 라이트에선 진한 accent(a.ring).

import { createElement, useState } from "react";
import { ChevronDown, X } from "lucide-react";
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

const ELITE_ACHIEVEMENT_IDS = new Set([
  "multiplayer",
  "utility",
  "concrete",
  "fox",
  "box2box",
  "lastman",
  "sweeperkeeper",
  "attacking_fullback",
  "attacking_centerback",
  "invincible",
  "unsung",
  "devotion",
  "onehit",
  "loyalty",
]);

const isEliteAchievement = (id: string) =>
  ELITE_ACHIEVEMENT_IDS.has(id.replace(/-(?:flat|[0-3])$/, ""));

function accentOf(t: EarnedTitle): Accent {
  if (t.variant === "manager") return { ring: "#D4A017", text: "#FFD978", lightBg: "linear-gradient(135deg,#fff9e8 0%,#f5e7bd 100%)", darkBg: "linear-gradient(135deg,#241a3d 0%,#17101f 55%,#34240b 100%)", glow: "rgba(255,196,70,0.22)" };
  if (t.variant === "leader") return { ring: "#E0A100", text: "#FFD45A", lightBg: "linear-gradient(135deg,#fffbed 0%,#f8e8ad 100%)", darkBg: "linear-gradient(135deg,#241d0a 0%,#16140d 58%,#302407 100%)", glow: "rgba(255,200,60,0.18)" };
  if (t.hidden) return { ring: "#22D3EE", text: "#A5F3FC", lightBg: "linear-gradient(125deg,#ecfeff 0%,#e0f2fe 42%,#f3e8ff 100%)", darkBg: "linear-gradient(125deg,#061b2c 0%,#09263b 42%,#21113b 100%)", glow: "rgba(34,211,238,0.24)" };
  if (isEliteAchievement(t.id)) return { ring: "#4F7FDB", text: "#BFDBFE", lightBg: "linear-gradient(135deg,#edf4ff 0%,#e4e9f8 58%,#eee9f8 100%)", darkBg: "linear-gradient(135deg,#102544 0%,#141c35 58%,#241b38 100%)", glow: "rgba(79,127,219,0.13)" };
  if (t.tier === null) return { ring: "#718096", text: "#D7DEE8", lightBg: "linear-gradient(135deg,#f1f3f6 0%,#e7ebf0 72%,#e9e5ef 100%)", darkBg: "linear-gradient(135deg,#17202d 0%,#111827 72%,#1b1924 100%)" };
  const m: Accent[] = [
    { ring: "#B87333", text: "#F1B678", lightBg: "linear-gradient(135deg,#fff7ed 0%,#f2ddc7 100%)", darkBg: "linear-gradient(135deg,#2b1b12 0%,#171311 100%)" },
    { ring: "#8291A6", text: "#DCE6F3", lightBg: "linear-gradient(135deg,#f8fafc 0%,#dfe7f0 100%)", darkBg: "linear-gradient(135deg,#202938 0%,#121722 100%)" },
    { ring: "#D4A017", text: "#FFE37C", lightBg: "linear-gradient(135deg,#fffbea 0%,#f6e5a7 100%)", darkBg: "linear-gradient(135deg,#292109 0%,#17150d 100%)", glow: "rgba(245,206,90,0.14)" },
    { ring: "#A855F7", text: "#E9D5FF", lightBg: "linear-gradient(135deg,#faf5ff 0%,#eadcff 50%,#ffe4eb 100%)", darkBg: "linear-gradient(135deg,#26123e 0%,#171127 52%,#321524 100%)", glow: "rgba(168,85,247,0.2)" },
  ];
  return m[t.tier];
}

function TitleCard({ title, isLight, onClick }: { title: EarnedTitle; isLight: boolean; onClick: () => void }) {
  const a = accentOf(title);
  // 라이트 모드: 밝은 accent(a.text)는 흰 배경에서 안 보여 진한 a.ring 사용
  const fg = isLight ? a.ring : a.text;
  const icon = createElement(titleIcon(title.icon), { size: 17, strokeWidth: 2.5 });
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[88px] min-w-0 flex-col items-center overflow-hidden rounded-[15px] p-2 text-center transition-transform active:scale-[0.97]"
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
      <div className="relative flex w-full items-start justify-center">
        <span
          className="flex shrink-0 items-center justify-center rounded-[11px]"
          style={{
            width: 34,
            height: 34,
            color: fg,
            background: isLight ? "rgba(255,255,255,0.68)" : "rgba(3,7,18,0.48)",
            border: `1px solid ${a.ring}99`,
            boxShadow: title.hidden ? `0 0 12px ${a.glow}` : `inset 0 1px rgba(255,255,255,0.16)`,
          }}
        >
          {icon}
        </span>
        {(title.hidden || title.tierLabel) && (
          <span
            className="absolute right-0 top-0 max-w-[54px] truncate rounded-full px-1 py-0.5 text-[6px] font-black"
            style={{ color: fg, background: `${a.ring}22`, border: `1px solid ${a.ring}33` }}
          >
            {title.hidden ? "HIDDEN" : title.tierLabel}
          </span>
        )}
      </div>
      <span className="relative mt-2 line-clamp-2 text-[10px] font-black leading-[1.2] tracking-[-0.02em]" style={{ color: fg }}>
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
  const selectedAccent = selected ? accentOf(selected) : null;
  const selectedFg = selectedAccent
    ? (isLight ? selectedAccent.ring : selectedAccent.text)
    : undefined;

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

      {selected && selectedAccent && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-4 pb-5 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} 상세 정보`}
            className="relative w-full max-w-sm overflow-hidden rounded-[26px] p-5 shadow-2xl"
            style={{
              background: isLight ? selectedAccent.lightBg : selectedAccent.darkBg,
              border: `1px solid ${selectedAccent.ring}77`,
              boxShadow: selectedAccent.glow ? `0 18px 60px ${selectedAccent.glow}` : undefined,
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
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ color: selectedFg, background: "rgba(255,255,255,0.1)", border: `1px solid ${selectedAccent.ring}88` }}
              >
                {createElement(titleIcon(selected.icon), { size: 23, strokeWidth: 2.4 })}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[15px] font-black" style={{ color: selectedFg }}>{selected.name}</p>
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
                    <p className="mt-0.5 text-[13px] font-black tabular-nums" style={{ color: selectedFg }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
