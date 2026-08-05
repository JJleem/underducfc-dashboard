// 경기 결과 표시 규칙. 피드·목록·최근 폼이 같은 판단을 써야 해서 한 군데로 모았다.
//
// 자체전(내전·풋살·3파전)은 승패가 없는 경기다. 실제 데이터에도 스코어가 비어 있다.
// 이걸 승/무/패 축에 태우면 "- : - 패배"처럼 있지도 않은 패배가 생긴다.
// 기존 홈도 자체전은 보라색으로 따로 빼고 승률·상대전적 집계에서 제외한다.

/** 승패를 매기지 않는 경기인가. */
export function isInternalMatch(result: string, opponent?: string): boolean {
  return result === "자체전" || (opponent || "").trim() === "자체전";
}

/**
 * 가볍게 치르는 경기인가 — 자체전·풋살·야유회.
 *
 * 이런 경기는 결과를 입력해도 "경기가 종료되었어요" 전체 알림을 보내지 않고
 * MOM 투표도 열지 않는다. 매주 자체전마다 전체 알림이 나가면 알림 피로만 쌓이고,
 * MOM 이 매주 나오면 상 자체의 무게가 없어진다.
 *
 * ⚠️ 자체전은 **양쪽에 다 들어올 수 있다**. 에디터의 "경기 유형" 선택지에도 있고
 *    (MatchEditor.TYPES), 기존 데이터에는 result="자체전" 로 3건 들어가 있다.
 *    그래서 둘 다 본다 — 한쪽만 보면 그쪽으로 안 넣은 경기가 그대로 샌다.
 *
 *    이게 중요한 이유: result 는 "경기가 끝났는가"를 겸하는 값이라, 미리
 *    자체전으로 잡아 두려고 result 에 넣으면 그 순간 출석 투표가 마감된다.
 *    유형은 type 에 잡고 result 는 경기가 실제로 끝날 때까지 "예정"으로 둬야 한다.
 *
 *    그리고 type 에는 "일반 매칭"과 "일반매칭"처럼 띄어쓰기가 섞여 있어서,
 *    공백을 지우고 비교해야 새지 않는다.
 */
export function isCasualMatch(result: string, type?: string): boolean {
  if (isInternalMatch(result)) return true;
  const t = (type || "").replace(/\s+/g, "");
  return t === "자체전" || t === "풋살" || t === "야유회";
}

/** 스코어가 실제로 기록됐는가. 자체전은 대부분 비어 있다. */
export function hasScore(our: string | number | undefined, their: string | number | undefined): boolean {
  const ok = (v: string | number | undefined) => {
    const s = String(v ?? "").trim();
    return s !== "" && s !== "-" && !Number.isNaN(Number(s));
  };
  return ok(our) && ok(their);
}

/** 사람이 읽는 결과 한 단어. */
export function resultWord(result: string): string {
  if (result === "승") return "승리";
  if (result === "무") return "무승부";
  if (result === "패") return "패배";
  if (result === "자체전") return "자체전";
  return result || "";
}

/** 결과 글자색. 승만 팀 색, 자체전은 보라(기존 홈과 같은 배색), 나머지는 무채색. */
export function resultTextTone(result: string): string {
  if (result === "승") return "text-[#FF8FA3] dark:text-[#FFB6C1]";
  if (result === "자체전") return "text-violet-500 dark:text-violet-400";
  return "text-gray-400 dark:text-white/35";
}

/** 최근 폼 뱃지 배경. */
export function resultBadgeTone(result: string): string {
  if (result === "승") return "bg-[#FF8FA3]";
  if (result === "무") return "bg-gray-400";
  if (result === "자체전") return "bg-violet-400";
  return "bg-gray-500 dark:bg-white/25";
}

/** 사진 없는 경기의 배경. 승=핑크, 자체전=보라, 나머지=차콜. */
export function resultPanelGradient(result: string): string {
  if (result === "승") return "linear-gradient(160deg,#FFD9E1 0%,#FF8FA3 100%)";
  if (result === "자체전") return "linear-gradient(160deg,#DDD3FA 0%,#8B7BD8 100%)";
  return "linear-gradient(160deg,#2A2A31 0%,#141416 100%)";
}
