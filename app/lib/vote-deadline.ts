// 출석 투표 마감 시각 — **경기 전날 23:00 (한국시간)**.
//
// 크론으로 상태를 뒤집지 않고 경기 날짜에서 계산한다.
//   - Vercel 크론은 이미 두 개(경기 생성·투표 독촉)라 늘리기 어렵고,
//   - 크론이 한 번 밀리거나 실패하면 투표가 계속 열려 있게 된다.
// 날짜에서 계산하면 언제 물어봐도 답이 같다.
//
// 관리자가 미리 닫은 경우("마감")는 그대로 존중한다 — 자동 마감은 그 위에 얹힌다.

/** 한국시간 = UTC+9. 서버가 어느 시간대에서 돌든 결과가 같아야 한다. */
const KST_OFFSET = "+09:00";
const ONE_HOUR = 60 * 60 * 1000;

/**
 * 경기 날짜("YYYY-MM-DD") → 투표 마감 시각.
 * 경기 당일 00:00 KST 에서 한 시간을 빼면 전날 23:00 KST 다.
 * 날짜를 못 읽으면 null — 마감을 걸지 않는다(못 읽었다고 투표를 막으면 안 된다).
 */
export function voteDeadline(matchDate: string): Date | null {
  const midnight = Date.parse(`${matchDate}T00:00:00${KST_OFFSET}`);
  if (isNaN(midnight)) return null;
  return new Date(midnight - ONE_HOUR);
}

/** 지금 기준으로 투표가 닫혔나. 관리자가 이미 "마감"으로 둔 경우도 포함한다. */
export function isVoteClosed(
  matchDate: string,
  storedStatus?: string,
  now: Date = new Date(),
): boolean {
  if ((storedStatus || "").trim() === "마감") return true;
  const deadline = voteDeadline(matchDate);
  return deadline !== null && now.getTime() >= deadline.getTime();
}

/** 화면에 적을 마감 안내: "금 23:00 마감". 날짜를 못 읽으면 빈 문자열. */
export function voteDeadlineLabel(matchDate: string): string {
  const deadline = voteDeadline(matchDate);
  if (!deadline) return "";
  // 기기 시간대와 무관하게 한국시간 기준 요일·시각을 적는다.
  const kst = new Date(deadline.getTime() + 9 * ONE_HOUR);
  const day = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${day} ${hh}:${mm} 마감`;
}

/**
 * 경기 날짜가 지났나(한국시간 자정 기준). **경기 당일은 아직 안 지난 것으로 본다.**
 *
 * 투표가 닫혀도 경기 당일까지는 화면 위쪽에 남겨야 한다 — 그날 아침에 명단과
 * 시간·장소를 확인하는 게 이 화면의 주 용도다.
 * 날짜를 못 읽으면 false — 못 읽었다고 지난 경기로 내려보내지 않는다.
 */
export function isMatchDayOver(matchDate: string, now: Date = new Date()): boolean {
  const midnight = Date.parse(`${matchDate}T00:00:00${KST_OFFSET}`);
  if (isNaN(midnight)) return false;
  return now.getTime() >= midnight + 24 * ONE_HOUR;
}
