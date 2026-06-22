"use client";
// 작은 원형 얼굴 썸네일. 페이스온 전신샷을 머리 위주로 크롭(object-top).
// 사진 없으면 이름 첫 글자 폴백.

import { useState } from "react";
import { playerFaceOnSrc } from "../lib/player-faceons";

export default function PlayerFace({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const src = playerFaceOnSrc(name);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-300 font-black shrink-0 ring-1 ring-black/5 dark:ring-white/10"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
      >
        {name.trim().charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      loading="lazy"
      className="rounded-full object-cover object-top bg-gray-100 dark:bg-white/5 shrink-0 ring-1 ring-black/5 dark:ring-white/10"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
