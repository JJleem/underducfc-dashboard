"use client";
// 개인 전술의 움직임 방향을 마커 주변에 작은 화살표로 표시한다.
// 배치를 읽는 걸 방해하면 안 되므로 작고 반투명하게 — 눈에 띄되 주인공은 아니다.
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
  size = 9,
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
            height={size}
            viewBox="0 0 10 10"
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(-50%,-50%) translate(${x * radius}px, ${y * radius}px) rotate(${angle}deg)`,
              opacity: 0.9,
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.75))",
            }}
          >
            <path d="M5 0.8 L8.6 8.4 L5 6.4 L1.4 8.4 Z" fill={TONE_COLOR[tone]} />
          </svg>
        );
      })}
    </>
  );
}
