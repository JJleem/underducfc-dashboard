"use client";
// "여기 새 게 있다"를 알리는 표시의 근거.
//
// 공지는 제목 한 줄로 접혀 있어서 안 읽고 지나치기 쉽고, 라인업은 경기 전날 올라오는데
// 접혀 있으면 올라온 줄도 모른다. 그래서 마지막으로 본 상태를 기기에 적어두고,
// 지금 값과 다르면 점을 찍는다.
//
// 서버는 localStorage 를 못 읽는다. 서버 스냅샷은 "이미 본 것"으로 두어 첫 렌더에서
// 점이 그려지지 않게 하고(하이드레이션 불일치 방지), 클라이언트에서 실제 값으로 바뀐다.

import { useCallback, useSyncExternalStore } from "react";

const PREFIX = "ud-seen:";

// 한 화면에 점이 여러 개(공지·라인업·경기별 댓글) 있고, 하나를 보면 그 항목만
// 다시 그려지면 된다. 컴포넌트끼리 상태를 공유할 필요는 없지만 갱신 신호는 필요해서
// 아주 작은 구독 목록만 둔다.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    // 사파리 프라이빗 모드 등에서 접근이 막힐 수 있다. 그땐 표시를 포기한다.
    return null;
  }
}

/**
 * @param key   대상 식별자. 예: "notice", `lineup:${matchId}`
 * @param stamp 지금 상태를 나타내는 값. 바뀌면 "새 것"으로 본다.
 *              (날짜·개수처럼 내용이 바뀔 때 같이 바뀌는 값을 넣는다)
 */
export function useUnseen(key: string, stamp: string): [boolean, () => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => read(key),
    // 서버에서는 stamp 를 그대로 돌려줘 "본 것"으로 취급한다.
    () => stamp,
  );

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(PREFIX + key, stamp);
    } catch {
      /* 위와 같음 */
    }
    listeners.forEach((notify) => notify());
  }, [key, stamp]);

  return [!!key && !!stamp && stored !== stamp, markSeen];
}
