"use client";

import { useEffect, useSyncExternalStore } from "react";
import { EMOTICONS, findEmoticon } from "./emoticons";

// ── 그림이 있는지 없는지를 한 곳에서 기억한다 ────────────────────────────
//
// 안 그러면 피커를 **열 때** 그제서야 8장을 요청하고, 그림이 없는 것들은 404 가
// 돌아온 뒤에야 emoji 로 바뀐다. 그 왕복이 깜빡임으로 보인다.
// (게다가 댓글마다·열 때마다 같은 404 를 다시 받아 온다)
const missing = new Set<string>();
const listeners = new Set<() => void>();
let preloading = false;

function notify() {
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * 등록된 이모티콘을 미리 받아 둔다. 화면이 뜰 때 한 번 부르면, 피커를 여는
 * 순간에는 그림은 캐시에 있고 없는 건 이미 emoji 로 결정돼 있다.
 */
export function preloadEmoticons(): void {
  if (preloading || typeof window === "undefined") return;
  preloading = true;
  for (const e of EMOTICONS) {
    const img = new window.Image();
    img.onerror = () => {
      missing.add(e.id);
      notify();
    };
    img.src = `/emoticons/${e.id}.png`;
  }
}

/**
 * 이모티콘 하나. `public/emoticons/<id>.png` 가 있으면 그림, 없으면 emoji.
 *
 * next/image 를 쓰지 않는 이유: 파일이 아직 없을 때 onError 로 조용히 대체해야
 * 하는데 그 폴백이 <img> 쪽이 훨씬 단순하다. 한 변 64px 안쪽이라 최적화 이득도 없다.
 */
export default function Emoticon({ id, size = 60 }: { id: string | null; size?: number }) {
  useEffect(() => preloadEmoticons(), []);

  // 서버 스냅샷은 언제나 false — 서버는 파일 유무를 모른다. 첫 클라이언트 렌더가
  // 서버와 같아야 하이드레이션이 어긋나지 않는다.
  const failed = useSyncExternalStore(
    subscribe,
    () => !!id && missing.has(id),
    () => false,
  );

  const meta = findEmoticon(id);
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
      decoding="async"
      onError={() => {
        missing.add(meta.id);
        notify();
      }}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}
