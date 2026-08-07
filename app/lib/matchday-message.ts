// 경기 당일 히어로에 뜨는 한 줄. 매번 같은 문구면 금방 안 읽히고,
// 매 렌더 무작위로 뽑으면 새로고침할 때마다 바뀌어 시선이 흔들린다.
// 그래서 "경기마다 하나로 고정된 무작위"를 쓴다 — 같은 경기면 항상 같은 문구가 나오고,
// 다음 경기엔 다른 문구가 나온다.

const LINES = [
  "다치지 마시고 재밌게 뛰어요!",
  "몸 충분히 풀고 시작해요!",
  "오늘도 덕분에, 화이팅!",
  "컨디션 잘 챙기고, 재밌게 뛰어요!",
  "부상 없이 끝까지 달려봐요!",
  "오늘 한 판, 다 같이 화이팅!",
  "스트레칭 먼저! 준비되셨죠?",
  "즐겁게 뛰고 건강하게 돌아와요!",
];

/** 비 오는 날엔 따로 할 말이 있다. */
const RAINY_LINES = [
  "미끄러우니 조심하세요! 화이팅!",
  "비 와도 화이팅! 대신 안 다치게요",
  "우비 챙기시고 몸 더 풀어요!",
];

/** 문자열 → 정수 해시. 짧고 안정적이면 충분하다(암호용 아님). */
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * @param seed 경기를 구분하는 값. 보통 `${matchId}-${date}`.
 * @param pop  강수확률(%). 40 이상이면 비 문구에서 고른다.
 */
export function matchdayMessage(seed: string, pop = 0): string {
  const pool = pop >= 40 ? RAINY_LINES : LINES;
  return pool[hash(seed) % pool.length];
}
