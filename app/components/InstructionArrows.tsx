"use client";
// 선수 위치에서 뻗는 점선 이동 경로. 전술판의 잔디 레이어에서만 보인다.
import { arrowsForSlot, type ArrowDir, type Role } from "../lib/positions";

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
      {arrows.map(({ dir }) => {
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
              opacity: 0.78,
              filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.18))",
            }}
          >
            <path
              d="M8 45 V10"
              fill="none"
              stroke="#071A10"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="2 4"
            />
            <path
              d="M3.5 11 L8 4 L12.5 11"
              fill="none"
              stroke="#071A10"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </>
  );
}
