"use client";
// 개인 전술의 움직임 방향을 마커 주변에 표시한다.
// 얼굴 이미지 위에서도 방향을 한눈에 읽을 수 있게 선과 화살촉을 함께 그린다.
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
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(-50%,-50%) translate(${x * radius}px, ${y * radius}px) rotate(${angle}deg)`,
              zIndex: 30,
              overflow: "visible",
              filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.95))",
            }}
          >
            <path
              d="M7 20 V6"
              fill="none"
              stroke="rgba(2,6,23,0.9)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M7 20 V6"
              fill="none"
              stroke={TONE_COLOR[tone]}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <path
              d="M2 7.5 L7 1.5 L12 7.5"
              fill="none"
              stroke="rgba(2,6,23,0.9)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 7.5 L7 1.5 L12 7.5"
              fill="none"
              stroke={TONE_COLOR[tone]}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </>
  );
}
