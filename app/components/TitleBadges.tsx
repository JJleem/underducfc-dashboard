// app/components/TitleBadges.tsx
// 칭호 아이콘 뱃지 (아이콘 전용). 라인업·로스터·대시보드 인라인용.
// 개인 페이지의 카드형과 달리, 여기선 최고등급 상위 N개만 압축 표시.

import { createElement } from "react";
import { EarnedTitle, TierIndex, topTitles } from "../lib/titles";
import { titleIcon } from "../lib/title-icons";

interface TierVis {
  grad: [string, string]; // 테두리 그라디언트
  glow: string | null; // 외곽 글로우
  icon: string; // 아이콘 색
}

// 메탈릭 + 글로우. 0 루키(브론즈) → 3 프로(레전드)
const TIER_VIS: Record<TierIndex, TierVis> = {
  0: { grad: ["#EFB987", "#9C5F28"], glow: null, icon: "#EAB07A" },
  1: { grad: ["#F4F7FB", "#94A1B3"], glow: "rgba(214,222,232,0.35)", icon: "#DCE3ED" },
  2: { grad: ["#FCE694", "#CF9C12"], glow: "rgba(245,206,90,0.55)", icon: "#F5CE5A" },
  3: { grad: ["#FF9FB0", "#B57BF5"], glow: "rgba(181,123,245,0.6)", icon: "#FFC2CE" },
};

// 달성형(등급 없음) — 쿨 플래티넘
const FLAT_VIS: TierVis = { grad: ["#CBD5E1", "#5B6B86"], glow: null, icon: "#CBD5E1" };

function visOf(t: EarnedTitle): TierVis {
  return t.tier === null ? FLAT_VIS : TIER_VIS[t.tier];
}

export function TitleBadge({ title, size = 26 }: { title: EarnedTitle; size?: number }) {
  const vis = visOf(title);
  const label = title.tierLabel ? `${title.name} · ${title.tierLabel}` : title.name;
  const icon = createElement(titleIcon(title.icon), {
    size: Math.round(size * 0.54),
    strokeWidth: 2.4,
  });
  return (
    <span
      title={label}
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid transparent",
        background: `linear-gradient(#0b1224,#0b1224) padding-box, linear-gradient(135deg, ${vis.grad[0]}, ${vis.grad[1]}) border-box`,
        boxShadow: vis.glow
          ? `0 0 9px ${vis.glow}, 0 1px 3px rgba(0,0,0,0.45)`
          : "0 1px 3px rgba(0,0,0,0.45)",
        color: vis.icon,
        flex: "0 0 auto",
      }}
    >
      {icon}
    </span>
  );
}

export function TitleBadges({
  titles,
  size = 26,
  max = 3,
  gap = 4,
}: {
  titles: EarnedTitle[];
  size?: number;
  max?: number;
  gap?: number;
}) {
  const list = topTitles(titles, max);
  if (!list.length) return null;
  return (
    <span style={{ display: "inline-flex", gap, alignItems: "center" }}>
      {list.map((t) => (
        <TitleBadge key={t.id} title={t} size={size} />
      ))}
    </span>
  );
}
