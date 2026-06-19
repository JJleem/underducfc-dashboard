// app/components/TitleBadges.tsx
// 칭호 아이콘 뱃지 (아이콘 전용). 라인업·로스터·대시보드 인라인용.
// 개인 페이지의 카드형과 달리, 여기선 최고등급 상위 N개만 압축 표시.

import { createElement, type CSSProperties } from "react";
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

// 달성형(등급 없음) — 차콜·네이비에 아주 옅은 자개 포인트
const FLAT_VIS: TierVis = { grad: ["#94A3B8", "#6F687D"], glow: null, icon: "#D7DEE8" };

// 리더(팀 1위) — 빛나는 골드 왕관
const LEADER_VIS: TierVis = { grad: ["#FFE7A0", "#E0A100"], glow: "rgba(255,200,60,0.65)", icon: "#FFD45A" };

// 히든 칭호 — 시안/틸 계열 신비로운 느낌
const HIDDEN_VIS: TierVis = { grad: ["#67E8F9", "#0E7490"], glow: "rgba(103,232,249,0.55)", icon: "#67E8F9" };

function visOf(t: EarnedTitle): TierVis {
  if (t.variant === "leader") return LEADER_VIS;
  if (t.hidden) return HIDDEN_VIS;
  return t.tier === null ? FLAT_VIS : TIER_VIS[t.tier];
}

export function TitleBadge({ title, size = 26 }: { title: EarnedTitle; size?: number }) {
  const label = title.tierLabel ? `${title.name} · ${title.tierLabel}` : title.name;
  const icon = createElement(titleIcon(title.icon), {
    size: Math.round(size * 0.54),
    strokeWidth: 2.4,
  });

  // 감독 전용: 회전하는 메탈 골드 콘릭 링 + 로열 다크 코어 (아예 다른 스타일)
  if (title.variant === "manager") {
    const mSize = Math.round(size * 1.12);
    return (
      <span
        title="감독"
        aria-label="감독"
        style={{
          width: mSize,
          height: mSize,
          borderRadius: "30%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2.5px solid transparent",
          background:
            "radial-gradient(120% 120% at 30% 20%, #241a3d 0%, #0a0a16 100%) padding-box, " +
            "conic-gradient(from 210deg, #FFE9A8, #B8860B, #FFD45A, #8a6508, #FFE9A8) border-box",
          boxShadow: "0 0 12px rgba(255,196,70,0.55), inset 0 0 6px rgba(255,220,140,0.25), 0 2px 6px rgba(0,0,0,0.5)",
          color: "#FFD978",
          flex: "0 0 auto",
        }}
      >
        {icon}
      </span>
    );
  }

  const vis = visOf(title);
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
  direction = "row",
}: {
  titles: EarnedTitle[];
  size?: number;
  max?: number;
  gap?: number;
  direction?: "row" | "column";
}) {
  // titles는 이미 표시 순서로 정해진 목록(대표 칭호 우선). 재정렬 없이 자른다.
  const list = titles.slice(0, max);
  if (!list.length) return null;
  return (
    <span style={{ display: "inline-flex", flexDirection: direction, gap, alignItems: "center" }}>
      {list.map((t) => (
        <TitleBadge key={t.id} title={t} size={size} />
      ))}
    </span>
  );
}

// ── 칩형 (개인 프로필용): 아이콘 + 칭호명 + 등급. 전체 표시.
const chipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid transparent",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

function TitleChip({ title }: { title: EarnedTitle }) {
  const icon = createElement(titleIcon(title.icon), { size: 13, strokeWidth: 2.4 });
  const label = title.tierLabel ? `${title.name} ${title.tierLabel}` : title.name;

  if (title.variant === "manager") {
    return (
      <span
        title={title.name}
        style={{
          ...chipBase,
          color: "#FFD978",
          background:
            "radial-gradient(120% 120% at 30% 20%, #241a3d, #0a0a16) padding-box, " +
            "conic-gradient(from 210deg, #FFE9A8, #B8860B, #FFD45A, #8a6508, #FFE9A8) border-box",
          boxShadow: "0 0 8px rgba(255,196,70,0.4)",
        }}
      >
        {icon}
        {label}
      </span>
    );
  }

  const vis = visOf(title);
  return (
    <span
      title={label}
      style={{
        ...chipBase,
        color: vis.icon,
        background: `linear-gradient(#11182e,#11182e) padding-box, linear-gradient(135deg, ${vis.grad[0]}, ${vis.grad[1]}) border-box`,
        boxShadow: vis.glow ? `0 0 7px ${vis.glow}` : undefined,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

export function TitleChips({ titles }: { titles: EarnedTitle[] }) {
  if (!titles.length) return null;
  const sorted = topTitles(titles, titles.length);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {sorted.map((t) => (
        <TitleChip key={t.id} title={t} />
      ))}
    </div>
  );
}
