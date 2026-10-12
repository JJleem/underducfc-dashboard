// 축하 화면을 "이 기기에서 이미 봤는가". localStorage 라서 폰을 바꾸면 한 번 더 뜬다 — 괜찮다.
//
// 저장이 막힌 브라우저(프라이빗 모드 등)에선 **봤다고 친다.** 기록을 못 남기는데 띄우면
// 화면을 열 때마다 매번 뜬다.

export function wasSeen(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return true;
  }
}

export function markSeen(key: string, value = "1"): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 저장이 막혀도 이번 화면은 닫힌다 */
  }
}

export function readSeen(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
