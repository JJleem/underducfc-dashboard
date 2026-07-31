// app/components/TitleBadges.tsx
// 칭호 아이콘 뱃지 (아이콘 전용). 라인업·로스터·대시보드 인라인용.
// 개인 페이지의 카드형과 달리, 여기선 최고등급 상위 N개만 압축 표시.

import { createElement, type CSSProperties } from "react";
import { EarnedTitle, TierIndex, topTitles, isEliteAchievement } from "../lib/titles";
import { titleIcon } from "../lib/title-icons";

// ── 주조 코인 뱃지 ──
// 테두리와 면에 같은 금속색을 쓰고 그라디언트 방향만 반대로 준다.
// (테두리는 위쪽이 밝고, 면은 아래쪽이 밝게 → 테두리가 솟아 보인다)
// 안쪽 면은 진한 에나멜(칠보)로 채우고 그 위에 밝은 금속색 아이콘을 올린다.
// 어두운 면이 컬러 아이콘을 받쳐줘야 화려해 보인다 — 면까지 금속으로 채우면
// 명도가 전부 중간에 몰려 칙칙해진다(한 번 그렇게 만들었다가 되돌렸다).

interface Metal {
  /** [최하이라이트, 하이라이트, 기본, 그림자, 최암부] */
  ramp: [string, string, string, string, string];
  /** 희귀 등급만 아주 옅은 링라이트 */
  aura: boolean;
}

// 0 루키(브론즈) → 3 프로(핑크·퍼플)
const TIER_METAL: Record<TierIndex, Metal> = {
  0: { ramp: ["#FBE6CB", "#EBB782", "#C07C3C", "#7C4A1C", "#452508"], aura: false },
  1: { ramp: ["#FFFFFF", "#E3EBF4", "#AEBCCD", "#616F81", "#333C49"], aura: false },
  2: { ramp: ["#FFF8DA", "#F7DE93", "#DCAA2C", "#8E6109", "#553904"], aura: false },
  3: { ramp: ["#FFE6EE", "#FFB3CC", "#C983EE", "#6B2FA6", "#3A1760"], aura: true },
};

// 달성형(등급 없음) — 백랍
const FLAT_METAL: Metal = { ramp: ["#EEF2F8", "#C6CFDC", "#8A96A8", "#4A5462", "#282F3A"], aura: false };
// 난도가 높은 달성형 — 청강
const ELITE_METAL: Metal = { ramp: ["#E4F1FF", "#A9CBF7", "#5B8DEF", "#26417F", "#132449"], aura: false };
// 리더(팀 1위) — 골드
const LEADER_METAL: Metal = { ramp: ["#FFFCE8", "#FFE49B", "#F0B818", "#8C5C00", "#513400"], aura: true };
// 히든 — 시안/틸
const HIDDEN_METAL: Metal = { ramp: ["#E6FCFF", "#9CEEFC", "#38C6E2", "#0B6076", "#053544"], aura: true };
// 감독 — 로열 골드 (모양으로 구분하므로 금속은 리더보다 더 깊게)
const MANAGER_METAL: Metal = { ramp: ["#FFF6CE", "#FFDF8F", "#E8B21C", "#7A4A00", "#3C2200"], aura: true };

function metalOf(t: EarnedTitle): Metal {
  if (t.variant === "leader") return LEADER_METAL;
  if (t.hidden) return HIDDEN_METAL;
  if (isEliteAchievement(t.id)) return ELITE_METAL;
  return t.tier === null ? FLAT_METAL : TIER_METAL[t.tier];
}

// 에나멜(면) 색. 라이트모드에서도 어둡게 유지한다 — 밝게 바꾸면 그 위의
// 밝은 컬러 아이콘이 묻혀버려서 아이콘 색까지 테마별로 갈라야 한다.
const ENAMEL_MID = "#111A2E";
const ENAMEL_DEEP = "#070B16";

const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/** 코인 한 장. shape="circle" 일반 / "shield" 감독 */
function Coin({
  title,
  size,
  metal,
  shape = "circle",
}: {
  title: EarnedTitle;
  size: number;
  metal: Metal;
  shape?: "circle" | "shield";
}) {
  const [xhi, hi, base, shadow, dark] = metal.ramp;
  // 14px 미만에선 스페큘러·이너베벨을 끈다. 작을 때 디테일은 노이즈가 된다.
  const detail = size >= 14;
  // 같은 이유로 작을수록 아이콘을 키우고 선을 굵힌다.
  const iconBox = detail ? 44 : 50;
  const strokeWidth = detail ? 2.2 : 2.9;
  // 그라디언트 id는 '보이는 모습'으로 만든다. 같은 값이면 겹쳐도 결과가 같아 안전하고,
  // 등급이 다르면(=금속이 다르면) id도 달라져 색이 섞이지 않는다.
  // (서버 컴포넌트에서도 렌더되므로 useId는 쓸 수 없다)
  const uid = `tb-${base.slice(1)}-${shape}-${size}`;

  const icon = createElement(titleIcon(title.icon), {
    x: 50 - iconBox / 2,
    y: 50 - iconBox / 2,
    width: iconBox,
    height: iconBox,
    stroke: hi, // 밝은 금속 톤 — 진한 에나멜 위에서 형광처럼 뜬다
    strokeWidth,
    fill: "none",
  });

  const outer =
    shape === "shield"
      ? "M50 3 L93 17 V50 C93 74 73 90 50 97 C27 90 7 74 7 50 V17 Z"
      : "M50 1 A49 49 0 1 1 49.9 1 Z";
  // 칠보는 테두리 금속을 넉넉히 남겨야 메달처럼 보인다
  const faceR = detail ? 36 : 37;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        display: "block",
        flex: "0 0 auto",
        filter:
          `drop-shadow(0 ${Math.max(1, size * 0.05)}px ${Math.max(1, size * 0.09)}px rgba(0,0,0,0.55))` +
          (metal.aura ? ` drop-shadow(0 0 ${size * 0.22}px ${rgba(base, 0.5)})` : ""),
      }}
    >
      <defs>
        {/* 테두리: 위가 밝다 */}
        <linearGradient id={`${uid}-r`} x1="0.22" y1="0" x2="0.78" y2="1">
          <stop offset="0" stopColor={xhi} />
          <stop offset="0.28" stopColor={hi} />
          <stop offset="0.62" stopColor={base} />
          <stop offset="1" stopColor={shadow} />
        </linearGradient>
        {/* 면: 진한 에나멜에 등급 색이 옅게 감돈다 */}
        <radialGradient id={`${uid}-f`} cx="0.34" cy="0.24" r="0.95">
          <stop offset="0" stopColor={rgba(base, 0.42)} />
          <stop offset="0.55" stopColor={ENAMEL_MID} />
          <stop offset="1" stopColor={ENAMEL_DEEP} />
        </radialGradient>
        <clipPath id={`${uid}-k`}>
          <path d={outer} />
        </clipPath>
      </defs>

      <path d={outer} fill={`url(#${uid}-r)`} />
      {shape === "shield" ? (
        <path
          d={outer}
          fill={`url(#${uid}-f)`}
          transform="translate(50 50) scale(0.74) translate(-50 -50)"
        />
      ) : (
        <circle cx="50" cy="50" r={faceR} fill={`url(#${uid}-f)`} />
      )}

      {detail && shape === "circle" && (
        <>
          <circle cx="50" cy="50" r={faceR + 0.8} fill="none" stroke={dark} strokeWidth="1.1" opacity="0.55" />
          <circle cx="50" cy="50" r={faceR - 0.6} fill="none" stroke={xhi} strokeWidth="0.9" opacity="0.3" />
        </>
      )}
      {detail && (
        <g clipPath={`url(#${uid}-k)`}>
          <path d="M-8 -8 L58 -8 L4 58 L-8 34 Z" fill="#fff" opacity="0.14" />
        </g>
      )}

      {/* 에나멜: 금속 위에 잉크빛 단색으로 박아 넣는다 */}
      {icon}
    </svg>
  );
}

export function TitleBadge({ title, size = 26 }: { title: EarnedTitle; size?: number }) {
  const label = title.tierLabel ? `${title.name} · ${title.tierLabel}` : title.name;

  // 감독은 방패꼴로 실루엣부터 다르게 간다 (금속 언어는 나머지와 동일)
  if (title.variant === "manager") {
    return (
      <span title="감독" aria-label="감독" style={{ display: "inline-flex", flex: "0 0 auto" }}>
        <Coin title={title} size={Math.round(size * 1.12)} metal={MANAGER_METAL} shape="shield" />
      </span>
    );
  }

  return (
    <span title={label} aria-label={label} style={{ display: "inline-flex", flex: "0 0 auto" }}>
      <Coin title={title} size={size} metal={metalOf(title)} />
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
  direction?: "row" | "column" | "stack";
}) {
  // titles는 이미 표시 순서로 정해진 목록(대표 칭호 우선). 재정렬 없이 자른다.
  const list = titles.slice(0, max);
  if (!list.length) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: direction === "column" ? "column" : "row",
        gap: direction === "stack" ? 0 : gap,
        alignItems: "center",
      }}
    >
      {list.map((t, index) => (
        <span
          key={t.id}
          style={{
            display: "inline-flex",
            marginLeft: direction === "stack" && index > 0 ? -Math.round(size * 0.42) : 0,
            position: "relative",
            zIndex: list.length - index,
          }}
        >
          <TitleBadge title={t} size={size} />
        </span>
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

  // 칩도 같은 금속을 쓴다 — 테두리는 위가 밝은 금속, 글자·아이콘은 하이라이트 톤.
  const [, hi, base, shadow] = metalOf(title).ramp;
  return (
    <span
      title={label}
      style={{
        ...chipBase,
        color: hi,
        background: `linear-gradient(#11182e,#11182e) padding-box, linear-gradient(135deg, ${base}, ${shadow}) border-box`,
        boxShadow: metalOf(title).aura ? `0 0 7px ${rgba(base, 0.4)}` : undefined,
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
