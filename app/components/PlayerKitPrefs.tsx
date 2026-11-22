"use client";

// 선수별로 고른 사진 유니폼(하계/동계)을 player-faceons 에 넣는다.
// 레이아웃 맨 위에서 자식보다 먼저 렌더되므로, 아래 화면들의 playerFaceOnSrc(name) 가
// 이미 채워진 값을 본다. 저장 후 router.refresh() 로 레이아웃이 다시 그려지면 새 값이 들어간다.

import { setPlayerKitPrefs, type Kit } from "../lib/player-faceons";

export default function PlayerKitPrefs({ prefs }: { prefs: Record<string, Kit> }) {
  setPlayerKitPrefs(prefs);
  return null;
}
