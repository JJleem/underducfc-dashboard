"use client";

import { useState } from "react";
import { findEmoticon } from "./emoticons";

/**
 * 이모티콘 하나. `public/emoticons/<id>.png` 를 먼저 시도하고, 없으면 emoji 로 떨어진다.
 *
 * next/image 를 쓰지 않는 이유: 파일이 아직 없을 때 onError 로 조용히 대체해야 하는데
 * 그 폴백이 <img> 쪽이 훨씬 단순하다. 어차피 한 변 64px 안쪽이라 최적화 이득도 없다.
 */
export default function Emoticon({ id, size = 60 }: { id: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const meta = findEmoticon(id);
  if (!meta) return null;

  if (failed) {
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
      onError={() => setFailed(true)}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}
