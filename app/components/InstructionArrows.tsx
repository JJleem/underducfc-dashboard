"use client";
// 선수 위치에서 뻗는 점선 이동 경로. 전술판의 잔디 레이어에서만 보인다.
import { arrowsForSlot, type ArrowDir, type Role } from "../lib/positions";

const TONE_COLOR = {
  attack: "#FF8FA3",
  defense: "#7DB8FF",
} as const;

const DIR: Record<ArrowDir, number> = {
  up: 0,
  down: 180,
  left: -90,
  right: 90,
  upLeft: -45,
  upRight: 45,
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
        const angle = DIR[dir];
        return (
          <svg
            key={dir}
            width={size}
            height={radius}
            viewBox="0 0 16 48"
            aria-hidden
            className="pointer-events-none absolute z-0"
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(-50%,-100%) rotate(${angle}deg)`,
              transformOrigin: "50% 100%",
              overflow: "visible",
              opacity: 0.72,
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))",
            }}
          >
            <defs>
              <linearGradient id={`arrow-${tone}-${dir}`} x1="8" y1="46" x2="8" y2="2">
                <stop offset="0%" stopColor={TONE_COLOR[tone]} stopOpacity="0.3" />
                <stop offset="58%" stopColor={TONE_COLOR[tone]} stopOpacity="0.78" />
                <stop offset="100%" stopColor={TONE_COLOR[tone]} stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              d="M8 44 V9"
              fill="none"
              stroke={`url(#arrow-${tone}-${dir})`}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="3 4"
            />
            <path
              d="M3.5 10 L8 3 L12.5 10"
              fill="none"
              stroke={TONE_COLOR[tone]}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </>
  );
}
