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
        const gradientId = `instruction-arrow-${tone}-${dir}`;
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
              opacity: 0.48,
              filter: `drop-shadow(0 0 2px ${TONE_COLOR[tone]}55)`,
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="8" y1="45" x2="8" y2="4">
                <stop offset="0%" stopColor={TONE_COLOR[tone]} stopOpacity="0" />
                <stop offset="52%" stopColor={TONE_COLOR[tone]} stopOpacity="0.48" />
                <stop offset="100%" stopColor={TONE_COLOR[tone]} stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <path
              d="M5.75 46 V12 H2 L8 3 L14 12 H10.25 V46 Z"
              fill={`url(#${gradientId})`}
            >
              <animate
                attributeName="opacity"
                values="0.72;1;0.72"
                dur="2.8s"
                begin="1.8s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        );
      })}
    </>
  );
}
