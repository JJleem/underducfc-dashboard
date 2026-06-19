"use client";
// 선수 아바타. public/players/ 에 파일이 있으면 그 사진, 없으면 기본 실루엣.
// 파일명: 선수명(예: 이재준.jpg) 또는 등번호(예: 7.jpg). jpg/png/webp 지원.

import { useState } from "react";
import { User } from "lucide-react";

export default function PlayerAvatar({
  name,
  no,
  accent,
  size = 104,
}: {
  name: string;
  no: string;
  accent: string;
  size?: number;
}) {
  const candidates = [
    `/players/${encodeURIComponent(name)}.jpg`,
    `/players/${encodeURIComponent(name)}.png`,
    `/players/${encodeURIComponent(name)}.webp`,
    ...(no && no !== "-"
      ? [`/players/${no}.jpg`, `/players/${no}.png`, `/players/${no}.webp`]
      : []),
  ];
  const [idx, setIdx] = useState(0);
  const failed = idx >= candidates.length;

  return (
    <div className="relative">
      <div
        className="rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(120% 120% at 30% 20%, ${accent}33, rgba(255,255,255,0.03))`,
          border: `3px solid ${accent}`,
          boxShadow: `0 0 30px ${accent}55, inset 0 2px 10px rgba(255,255,255,0.12)`,
        }}
      >
        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidates[idx]}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setIdx((i) => i + 1)}
          />
        ) : (
          <User style={{ width: size * 0.5, height: size * 0.5, color: accent }} strokeWidth={1.6} />
        )}
      </div>
      {no && no !== "-" && (
        <span
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full font-black text-white text-[13px]"
          style={{
            minWidth: 30,
            height: 30,
            padding: "0 6px",
            background: accent,
            border: "2.5px solid #0c1430",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          {no}
        </span>
      )}
    </div>
  );
}
