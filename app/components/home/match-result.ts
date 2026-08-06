// 경기 결과 표시 규칙. 피드·목록·최근 폼이 같은 판단을 써야 해서 한 군데로 모았다.
//
// 로고 고르기도 여기 있다. "상대가 누구인가"와 "승패를 매기는가"는 같은 질문이라
// (자체전이면 상대도 없고 승패도 없다) 판단이 갈리면 로고만 남 팀 걸로 뜬다.
//
// 자체전(내전·풋살·3파전)은 승패가 없는 경기다. 실제 데이터에도 스코어가 비어 있다.
// 이걸 승/무/패 축에 태우면 "- : - 패배"처럼 있지도 않은 패배가 생긴다.
// 기존 홈도 자체전은 보라색으로 따로 빼고 승률·상대전적 집계에서 제외한다.

import { getOpponentLogo } from "../../lib/opponent-logos";

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
export function isCasualMatch(result: string, type?: string, opponent?: string): boolean {
  // opponent 까지 본다. 세 자리 중 하나만 빠져도 그 경기가 일반 매칭으로 새어
  // "언더덕 A : 언더덕 B" 같은 없는 대진이 다시 생긴다.
  if (isInternalMatch(result, opponent)) return true;
  const t = (type || "").replace(/\s+/g, "");
  return t === "자체전" || t === "풋살" || t === "야유회";
}

/** 우리 팀 로고. 자체전엔 상대가 없어서 상대 로고 자리에 이걸 넣는다. */
export const UNDERDUCK_LOGO = "/icons/icon-192.png";

/**
 * 상대 로고 자리에 넣을 그림.
 *
 * 자체전·풋살은 상대가 없다. 그냥 두면 opponent("자체전"·"3파전")에 매핑된 로고가
 * 없어서 "자"·"3" 같은 첫 글자 동그라미가 뜬다 — 상대팀인 척하는 자리만 남는다.
 */
export function matchLogo(match: {
  opponent: string;
  result: string;
  type?: string;
}): string | null {
  if (isCasualMatch(match.result, match.type, match.opponent)) return UNDERDUCK_LOGO;
  return getOpponentLogo(match.opponent);
}

/**
 * 자체전류 경기의 이름. 카드 제목과 큰 글씨에 쓴다.
 *
 * type 을 먼저 본다 — 지난 자체전 3건이 전부 result="자체전" · type="풋살" 이라
 * result 만 보면 풋살까지 싸잡아 "자체전"이 된다. 실제로 한 종목을 적어준다.
 */
export function casualKind(_result: string, type?: string): { ko: string; en: string } {
  const t = (type || "").replace(/\s+/g, "");
  if (t === "풋살") return { ko: "풋살", en: "FUTSAL" };
  if (t === "야유회") return { ko: "야유회", en: "TEAM DAY" };
  // result 를 그대로 내보내면 안 된다. 자체전은 경기가 끝나기 전까지 result 가
  // "예정"이라, 그걸 받아 쓰면 카드에 "예정"이 대문짝만하게 찍힌다.
  return { ko: "자체전", en: "TRAINING DAY" };
}

/**
 * MOM 필드에서 수상자 이름을 모두 꺼낸다.
 *
 * 저장 형식이 두 겹이다. `/` 는 공격 MOM / 수비 MOM 을 나누고, `,` 는 같은 부문의
 * 공동 수상을 나눈다. 실제 데이터에 "금상덕,김준수 / 안원진" 처럼 둘 다 섞여 있다.
 *
 * ⚠️ 쉼표로만 자르면 `/` 로 묶인 사람을 통째로 놓친다 — 실제로 김준수가 4경기
 *    MOM 인데 프로필 그리드에 1개만 왕관이 떴다. 그래서 두 구분자를 함께 푼다.
 */
export function momNames(mom: string | undefined): string[] {
  return (mom || "")
    .split("/")
    .flatMap((part) => part.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 이 사람이 그 경기의 MOM 인가. */
export function isMomOf(mom: string | undefined, name: string): boolean {
  return momNames(mom).includes(name.trim());
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
