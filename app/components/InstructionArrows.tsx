"use client";
// 개인 전술의 움직임 방향을 마커 주변에 은은한 이동 궤적으로 표시한다.
import { arrowsForSlot, type ArrowDir, type Role } from "../lib/positions";

const TONE_COLOR = {
  attack: "#FF8FA3",
  defense: "#7DB8FF",
} as const;

// 마커 중심 기준 배치 (회전각, x·y 오프셋 비율)
const DIR: Record<ArrowDir, { angle: number; x: number; y: number }> = {
  up: { angle: 0, x: 0, y: -1 },
  down: { angle: 180, x: 0, y: 1 },
  left: { angle: -90, x: -1, y: 0 },
  right: { angle: 90, x: 1, y: 0 },
  upLeft: { angle: -45, x: -0.72, y: -0.72 },
  upRight: { angle: 45, x: 0.72, y: -0.72 },
};

export default function InstructionArrows({
  instructions,
  role,
  radius = 25,
  size = 12,
}: {
  instructions: string[];
  role: Role;
  /** 마커 중심에서 화살표까지 거리(px) */
  radius?: number;
  size?: number;
}) {
  const arrows = arrowsForSlot(instructions, role);
  if (arrows.length === 0) return null;

  return (
    <>
      {arrows.map(({ dir, tone }) => {
        const { angle, x, y } = DIR[dir];
        return (
          <svg
            key={dir}
            width={size}
            height={size * 1.55}
            viewBox="0 0 14 22"
            aria-hidden
            className="pointer-events-none absolute z-0"
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(-50%,-50%) translate(${x * radius}px, ${y * radius}px) rotate(${angle}deg)`,
              overflow: "visible",
              opacity: 0.68,
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))",
            }}
          >
            <defs>
              <linearGradient id={`arrow-${tone}-${dir}`} x1="7" y1="21" x2="7" y2="1">
                <stop offset="0%" stopColor={TONE_COLOR[tone]} stopOpacity="0.15" />
                <stop offset="58%" stopColor={TONE_COLOR[tone]} stopOpacity="0.72" />
                <stop offset="100%" stopColor={TONE_COLOR[tone]} stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              d="M5 21 V8 H1.5 L7 1 L12.5 8 H9 V21 Z"
              fill={`url(#arrow-${tone}-${dir})`}
            />
          </svg>
        );
      })}
    </>
  );
}
