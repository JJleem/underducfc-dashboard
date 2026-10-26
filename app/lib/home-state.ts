// 홈 히어로가 "지금 무엇을 보여줄지" 판정한다.
//
// 홈이 고정 레이아웃이면 다음 경기가 상대·장소 미정일 때 "vs 미정"이라고밖에 못 쓴다.
// (실제로 매칭이 늦게 잡히는 주에는 이 상태가 며칠씩 간다.) 그래서 화면을 하나 두고
// 빈칸을 채우는 대신, 팀의 상태를 먼저 정하고 상태마다 다른 것을 띄운다.
//
// 판정은 순수 함수로 빼둔다. 서버에서 한 번 계산해 넘기면 되고, 미리보기에서 강제로
// 다른 상태를 그려볼 때도 같은 타입을 재사용할 수 있다.

export type HomeState =
  /** 경기 전날 또는 경기 당일 */
  | "dday"
  /** 경기가 끝난 직후 — MOM 투표·사진이 아직 비어 있다 */
  | "afterMatch"
  /** 다음 경기가 잡혔는데 내가 아직 투표를 안 했다 */
  | "needVote"
  /** 날짜만 있고 상대가 아직 안 정해졌다 */
  | "matching"
  /** 위 어디에도 안 걸리는 평시 */
  | "idle"
  /** 다가오는 토요일이 휴식 주다(경기 유형 "휴식") */
  | "rest";

export const HOME_STATES: HomeState[] = [
  "dday",
  "afterMatch",
  "needVote",
  "matching",
  "idle",
  "rest",
];

/** 미리보기 상태 전환 칩에 쓰는 이름. */
export const HOME_STATE_LABEL: Record<HomeState, string> = {
  dday: "D-DAY",
  afterMatch: "경기 직후",
  needVote: "투표 필요",
  matching: "매칭 대기",
  idle: "평시",
  rest: "휴식",
};

export function isHomeState(value: string | undefined): value is HomeState {
  return !!value && (HOME_STATES as string[]).includes(value);
}

/**
 * D-Day. 오늘이면 0, 미래면 양수, 지난 날짜면 음수.
 * DashboardClient 의 것과 같은 계산이다(날짜만 비교, 시각 무시).
 */
export function getDDay(dateStr: string, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  // 경기 날짜는 시각이 아니라 한국의 달력 날짜다. `new Date()`와 로컬 자정을 쓰면
  // Vercel(UTC)은 한국 시간 오전 9시까지 전날로 계산해 D-1을 보여 준다.
  const targetParts = dateStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!targetParts) return null;

  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const part = (type: "year" | "month" | "day") =>
    Number(todayParts.find((item) => item.type === type)?.value);

  const targetDay = Date.UTC(Number(targetParts[1]), Number(targetParts[2]) - 1, Number(targetParts[3]));
  const todayDay = Date.UTC(part("year"), part("month") - 1, part("day"));
  return Math.round((targetDay - todayDay) / (1000 * 60 * 60 * 24));
}

/** 백엔드는 미정을 빈 문자열이 아니라 "미정" 문자열로 준다. 둘 다 미정으로 본다. */
export function isUndecided(value: string | undefined | null): boolean {
  const v = (value || "").trim();
  return v === "" || v === "미정";
}

/**
 * 휴식 주인가 — 경기 유형이 "휴식"인 행.
 *
 * 쉬는 토요일도 경기 행으로 둔다. 행이 있어야 토요일 크론(create-match)이 ±3일 안에
 * 경기가 있다고 보고 그 주 경기 생성·"투표 열렸어요" 알림을 건너뛴다.
 * result 는 계속 "예정"이라 출전·스탯·칭호 집계에는 원래 안 들어간다(백엔드 stats 도 같다).
 * 대신 "예정"을 다음 경기로 잡는 자리(홈·투표·투표 알림)에서는 직접 빼야 한다.
 */
export function isRestWeek(type?: string | null): boolean {
  return (type || "").replace(/\s+/g, "") === "휴식";
}

export interface RestPlan {
  /** 이어지는 휴식 날짜들(가까운 순) */
  dates: string[];
  /** 복귀 날짜. 잡힌 경기가 있으면 그 날, 없으면 마지막 휴식 + 7일 */
  returnDate: string;
  /** 복귀 경기가 이미 등록돼 있으면 그 id */
  returnMatchId: number | null;
}

/**
 * 다가오는 일정이 휴식으로 시작하면 이어지는 휴식을 묶는다. 아니면 null.
 * upcoming 은 "예정 · 야유회 아님 · 날짜 안 지남" 을 가까운 순으로 정렬한 목록이다.
 *
 * 묶는 이유: 2주 연속 쉬면 첫 주에 "이번 주는 쉬어요"만 보고 다음 주에 경기가 있는 줄 안다.
 */
export function buildRestPlan(
  upcoming: { id: number; date: string; type?: string }[],
): RestPlan | null {
  const firstMatch = upcoming.findIndex((m) => !isRestWeek(m.type));
  const rests = firstMatch === -1 ? upcoming : upcoming.slice(0, firstMatch);
  if (rests.length === 0) return null;
  const next = firstMatch === -1 ? null : upcoming[firstMatch];
  return {
    dates: rests.map((m) => m.date),
    returnDate: next ? next.date : addDays(rests[rests.length - 1].date, 7),
    returnMatchId: next ? next.id : null,
  };
}

/** "YYYY-MM-DD" + n일. 못 읽으면 그대로 돌려준다. */
function addDays(dateStr: string, n: number): string {
  const m = dateStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!m) return dateStr;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
  return d.toISOString().slice(0, 10);
}

export interface HomeStateInput {
  /** 다가오는 경기(예정). 없으면 null */
  nextMatch: { date: string; opponent: string; type?: string; result?: string } | null;
  /** 가장 최근에 끝난 경기. 없으면 null */
  lastMatch: { date: string; mom: string; photos: string } | null;
  /** 로그인한 사용자가 다음 경기에 투표했는지 */
  hasMyVote: boolean;
  /** 비로그인 상태에서는 투표를 재촉할 수 없다 */
  loggedIn: boolean;
  /** 다가오는 일정이 휴식으로 시작하는가(buildRestPlan 이 null 이 아님) */
  resting?: boolean;
}

/**
 * 급한 것부터 본다. 휴식 주 > 경기 임박(D-1~당일) > 새 출석 투표 > 매칭 대기 > 다음 경기 > 방금 끝난 경기.
 * 다음 경기 투표가 열린 뒤에는 로그인·투표 여부와 관계없이 다음 경기 흐름을 유지한다.
 * 그렇지 않으면 투표를 마친 직후 다시 직전 경기 종료 화면으로 돌아갈 수 있다.
 */
export function resolveHomeState(input: HomeStateInput): HomeState {
  const { nextMatch, lastMatch, hasMyVote, loggedIn, resting } = input;

  // 휴식 주는 다음 경기 자리를 대신한다. 복귀 경기가 미리 잡혀 있어도(토요일 밤 크론)
  // 이번 토요일은 쉰다. 다만 경기 당일 밤의 MOM·사진 재촉은 그대로 둔다 —
  // 휴식 행은 미리 만들어 두니, 안 그러면 휴식 직전 경기의 MOM 투표가 홈에서 사라진다.
  if (resting) return lastMatch && needsWrapUpToday(lastMatch) ? "afterMatch" : "rest";

  const nextDDay = nextMatch ? getDDay(nextMatch.date) : null;
  if (nextDDay !== null && nextDDay >= 0 && nextDDay <= 1) return "dday";

  if (nextMatch && loggedIn && !hasMyVote) return "needVote";
  // 자체전·풋살은 상대가 없는 것이 정상이다. 상대 칸이 비어 있더라도
  // 외부 상대를 구하는 경기로 분류하면 안 된다.
  const nextType = (nextMatch?.type || "").replace(/\s+/g, "");
  const hasNoExternalOpponent =
    nextMatch?.result === "자체전" ||
    nextType === "자체전" ||
    nextType === "풋살";
  if (nextMatch && !hasNoExternalOpponent && isUndecided(nextMatch.opponent)) return "matching";
  if (nextMatch) return "idle";

  if (lastMatch && needsWrapUpToday(lastMatch)) return "afterMatch";

  return "idle";
}

function needsWrapUpToday(lastMatch: { date: string; mom: string; photos: string }): boolean {
  // 경기 당일까지만. 토요일에 경기가 끝나면 그날 저녁에 다음 경기 카드가 생기므로,
  // 다음 날부터는 "다음 경기" 쪽이 홈의 주인공이 되는 게 맞다.
  const justPlayed = getDDay(lastMatch.date) === 0;
  // MOM 이나 사진 중 하나라도 비어 있을 때만 재촉한다.
  const needsWrapUp = !lastMatch.mom.trim() || !lastMatch.photos.trim();
  return justPlayed && needsWrapUp;
}
