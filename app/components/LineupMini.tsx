"use client";
// 게시판 목록용 초소형 필드 썸네일. 유튜브 글의 영상 썸네일 자리를 대신한다.
// 좌표만 있으면 그려지므로 선수 이름·등번호는 쓰지 않는다.
import { positionsFor, roleColor, roleFromPoint } from "../lib/positions";

export default function LineupMini({
  formation,
  positions,
}: {
  formation: string;
  positions?: string;
}) {
  const points = positionsFor(formation, positions);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "linear-gradient(180deg,#1c6a36 0%,#185e2f 50%,#1c6a36 100%)" }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
        <rect x="4" y="3" width="92" height="94" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="11" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
      </svg>
      {points.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: 7,
            height: 7,
            transform: "translate(-50%,-50%)",
            background: roleColor(roleFromPoint(p)),
            boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        />
      ))}
    </div>
  );
}
