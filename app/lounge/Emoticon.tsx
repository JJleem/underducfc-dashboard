"use client";

import { useState } from "react";
import { findEmoticon } from "./emoticons";

/**
 * 한 번 없다고 확인된 id. 그림을 아직 안 그린 상태가 기본이라, 이걸 기억하지 않으면
 * 댓글 하나마다·피커를 열 때마다 같은 파일을 다시 404 로 받아 온다(깜빡임도 그만큼 는다).
 * 모듈 스코프라 한 페이지 세션 동안 유지된다.
 */
const missing = new Set<string>();

/**
 * 이모티콘 하나. `public/emoticons/<id>.png` 를 먼저 시도하고, 없으면 emoji 로 떨어진다.
 *
 * next/image 를 쓰지 않는 이유: 파일이 아직 없을 때 onError 로 조용히 대체해야 하는데
 * 그 폴백이 <img> 쪽이 훨씬 단순하다. 어차피 한 변 64px 안쪽이라 최적화 이득도 없다.
 */
export default function Emoticon({ id, size = 60 }: { id: string | null; size?: number }) {
  const meta = findEmoticon(id);
  const [failed, setFailed] = useState(() => !!meta && missing.has(meta.id));
  if (!meta) return null;

  if (failed) {
    return (
      <span
        role="img"
        aria-label={meta.label}
        style={{ fontSize: size * 0.78, lineHeight: 1 }}
      >
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
      onError={() => {
        missing.add(meta.id);
        setFailed(true);
      }}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}
