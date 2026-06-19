"use client";
// 개인 페이지 칭호 — 카드형. 일부만 보이고 아래 블러 + "전체 확인하기"로 펼침.

import { createElement, useState } from "react";
import { ChevronDown } from "lucide-react";
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
  if (t.tier === null) return { ring: "#5B6B86", tint: "rgba(148,163,184,0.10)", text: "#CBD5E1" };
  const m: Accent[] = [
    { ring: "#9C5F28", tint: "rgba(199,123,58,0.12)", text: "#EAB07A" },
    { ring: "#94A1B3", tint: "rgba(174,182,194,0.10)", text: "#DCE3ED" },
    { ring: "#CF9C12", tint: "rgba(243,197,59,0.12)", text: "#F5CE5A" },
    { ring: "#B57BF5", tint: "rgba(181,123,245,0.14)", text: "#FFC2CE" },
  ];
  return m[t.tier];
}

function TitleCard({ title }: { title: EarnedTitle }) {
  const a = accentOf(title);
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
          color: a.text,
          background: "rgba(8,12,26,0.6)",
          border: `2px solid ${a.ring}`,
        }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-black truncate" style={{ color: a.text }}>
            {title.name}
          </span>
          {title.tierLabel && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0"
              style={{ color: a.text, background: `${a.ring}33` }}
            >
              {title.tierLabel}
            </span>
          )}
        </div>
        {title.desc && (
          <p className="text-[10.5px] font-semibold text-white/45 mt-0.5 leading-snug truncate">
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
  if (!titles.length) {
    return <p className="text-[12px] text-gray-400 font-semibold py-2">아직 획득한 칭호가 없어요.</p>;
  }

  const sorted = topTitles(titles, titles.length); // 등급/리더/감독 우선 정렬
  const hasMore = sorted.length > PREVIEW;
  const shown = expanded ? sorted : sorted.slice(0, PREVIEW);

  return (
    <div
      className="rounded-3xl p-3 ring-1 ring-white/10"
      style={{ background: "linear-gradient(180deg,#0c1430,#0a0f24)" }}
    >
      <div className="relative">
        <div className="space-y-2">
          {shown.map((t) => (
            <TitleCard key={t.id} title={t} />
          ))}
        </div>

        {/* 접힌 상태: 아래 블러 + 전체 확인하기 */}
        {hasMore && !expanded && (
          <div className="absolute inset-x-0 bottom-0 h-24 flex items-end justify-center pointer-events-none">
            <div
              className="absolute inset-0 rounded-b-2xl"
              style={{
                background: "linear-gradient(180deg, rgba(10,15,36,0) 0%, rgba(10,15,36,0.85) 70%, #0a0f24 100%)",
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
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[12px] font-black text-white/80 bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] transition-all"
        >
          {expanded ? "접기" : `전체 확인하기 (${sorted.length})`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
