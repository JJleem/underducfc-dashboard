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
  positionX,
  positionY,
}: {
  instructions: string[];
  role: Role;
  /** 마커 중심에서 화살표까지 거리(px) */
  radius?: number;
  size?: number;
  /** 필드 경계 근처 화살표 길이 자동 축소용 좌표(0~100) */
  positionX?: number;
  positionY?: number;
}) {
  const arrows = arrowsForSlot(instructions, role);
  if (arrows.length === 0) return null;

  return (
    <>
      {arrows.map(({ dir, tone }) => {
        const angle = DIR[dir];
        const gradientId = `instruction-arrow-${tone}-${dir}`;
        const glowId = `${gradientId}-glow`;
        const isVertical = dir === "up" || dir === "down";
        const isDiagonal = dir === "upLeft" || dir === "upRight";
        const baseLength = radius * (
          dir === "down" ? 1.75 : isVertical ? 1.45 : isDiagonal ? 1.43 : 1
        );
        const horizontalRoom =
          dir === "left" || dir === "upLeft"
            ? positionX === undefined ? 1 : positionX / 23
            : dir === "right" || dir === "upRight"
              ? positionX === undefined ? 1 : (100 - positionX) / 23
              : 1;
        const verticalRoom =
          dir === "up" || dir === "upLeft" || dir === "upRight"
            ? positionY === undefined ? 1 : positionY / 18
            : dir === "down"
              ? positionY === undefined ? 1 : (100 - positionY) / 18
              : 1;
        const edgeScale = Math.max(0.4, Math.min(1, horizontalRoom, verticalRoom));
        const arrowLength = baseLength * edgeScale;
        return (
          <svg
            key={dir}
            width={size}
            height={arrowLength}
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
              filter: `drop-shadow(0 0 3px ${TONE_COLOR[tone]}77)`,
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="8" y1="45" x2="8" y2="4">
                <stop offset="0%" stopColor={TONE_COLOR[tone]} stopOpacity="0" />
                <stop offset="42%" stopColor={TONE_COLOR[tone]} stopOpacity="0.38" />
                <stop offset="76%" stopColor={TONE_COLOR[tone]} stopOpacity="0.82">
                  <animate
                    attributeName="stop-opacity"
                    values="0.5;1;0.5"
                    dur="2.2s"
                    begin="1.5s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" stopColor={TONE_COLOR[tone]} stopOpacity="1" />
              </linearGradient>
              <filter id={glowId} x="-100%" y="-20%" width="300%" height="140%">
                <feGaussianBlur stdDeviation="2.2" />
              </filter>
            </defs>
            <path
              d="M5.75 46 V12 H2 L8 3 L14 12 H10.25 V46 Z"
              fill={TONE_COLOR[tone]}
              opacity="0.22"
              filter={`url(#${glowId})`}
            />
            <path
              d="M5.75 46 V12 H2 L8 3 L14 12 H10.25 V46 Z"
              fill={`url(#${gradientId})`}
            >
              <animate
                attributeName="opacity"
                values="0.62;1;0.72"
                dur="2.2s"
                begin="1.5s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        );
      })}
    </>
  );
}
