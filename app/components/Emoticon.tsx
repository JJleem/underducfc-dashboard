"use client";

import { useState } from "react";
import { EMOTICONS, findEmoticon } from "../lib/emoticons";

let preloaded = false;

/**
 * 그림이 있는 이모티콘만 미리 받아 둔다. 피커를 여는 순간에 받으면 빈 칸이
 * 잠깐 보인다. `art` 가 없는 것들은 emoji 라 받을 게 없다.
 */
export function preloadEmoticons(): void {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  for (const e of EMOTICONS) {
    if (e.art) new window.Image().src = `/emoticons/${e.id}.png`;
  }
}

/**
 * 이모티콘 하나. `art` 가 켜진 것만 그림을 쓰고 나머지는 emoji 를 바로 그린다.
 *
 * next/image 를 쓰지 않는 이유: 파일이 사라졌을 때 onError 로 조용히 대체하는 게
 * <img> 쪽이 훨씬 단순하다. 한 변 64px 안쪽이라 최적화 이득도 없다.
 */
export default function Emoticon({ id, size = 60 }: { id: string | null; size?: number }) {
  // 파일을 지웠는데 art 를 안 끈 경우의 안전망. 정상이면 쓰일 일이 없다.
  const [broken, setBroken] = useState(false);
  const meta = findEmoticon(id);
  if (!meta) return null;

  if (!meta.art || broken) {
    return (
      <span role="img" aria-label={meta.label} style={{ fontSize: size * 0.78, lineHeight: 1 }}>
        {meta.emoji}
      </span>
    );
  }
  return (
    <img
      src={`/emoticons/${meta.id}.png`}
      alt={meta.label}
      width={size}
      height={size}
      decoding="async"
      onError={() => setBroken(true)}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}
