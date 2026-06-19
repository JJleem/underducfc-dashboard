"use client";
// 선수 인물 사진(페이스온). public/players/ 에 파일이 있으면 그 사진, 없으면 기본 실루엣.
// 파일명: 선수명(예: 이재준.jpg) 또는 등번호(예: 7.jpg). jpg/png/webp 지원.
// 잘리지 않게 object-contain 으로 세로 전신을 보여준다(등번호는 이 컴포넌트 밖, 이름 옆에 표기).

import { useState } from "react";
import { User } from "lucide-react";
import { playerFaceOnSrc } from "../lib/player-faceons";

export default function PlayerAvatar({
  name,
  no,
  accent,
  width = 124,
}: {
  name: string;
  no: string;
  accent: string;
  width?: number;
}) {
  const src = playerFaceOnSrc(name);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const height = Math.round(width * 1.3);

  return (
    <div
      className="relative flex items-end justify-center overflow-hidden rounded-2xl shrink-0"
      style={{
        width,
        height,
        background: `radial-gradient(110% 80% at 50% 6%, ${accent}2e 0%, transparent 70%)`,
      }}
    >
      <User
        className={`mb-3 transition-opacity duration-150 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
        style={{ width: width * 0.52, height: width * 0.52, color: accent }}
        strokeWidth={1.4}
      />
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          loading="eager"
          fetchPriority="high"
          className={`absolute inset-0 h-full w-full object-contain object-bottom drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] transition-opacity duration-150 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
