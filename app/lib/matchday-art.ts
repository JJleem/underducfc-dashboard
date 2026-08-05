// 예정 경기 카드의 배경 그림 고르기.
//
// AI로 뽑는 건 "배경"뿐이다. D-day 숫자는 화면에서 얹는다 — 확산 모델은 글자를
// 뭉개고, 예정 경기는 전부 피드에 올라오므로(NewHome) D 값에 상한이 없다.
// D-21 카드도 생긴다. 배경에 숫자를 구우면 그 순간 대응할 수 없는 값이 생긴다.
// (언더덕 크레스트는 반대로 그림 안에 있다 — 레퍼런스 이미지로 넣어 뽑았다.
//  scripts/gen-matchday-art.mts 참고.)
//
// 고르는 방식은 "고정된 랜덤"이다. 매 렌더마다 뽑으면 새로고침할 때마다 그림이
// 바뀌어 산만하고, 서버와 클라이언트가 달라져 hydration 이 깨진다.
// hash(matchId, dDay) 로 뽑으면 경기마다 다른 그림이 나오면서도 같은 날 안에서는
// 고정된다. 하루가 지나면 바뀌므로 카운트다운이 실제로 진행되는 느낌이 난다.

export interface MatchdayArt {
  src: string;
  /** 배경이 밝은 그림. 흰 글씨가 묻히므로 카드가 어두운 글씨로 뒤집는다. */
  light?: boolean;
  /**
   * 이미 그림 자체가 어두운 것. 막을 얇게 깐다.
   * 깃발처럼 배경이 단순한 그림은 두껍게 깔아야 글씨가 사는데, 팀 사진처럼
   * 원래 어두운 그림에 같은 막을 씌우면 애써 만든 그림이 그냥 탁해진다.
   */
  soft?: boolean;
}

/**
 * public/matchday/ 에 실제로 들어 있는 배경들.
 * 여기 적힌 것만 쓰인다 — 파일 없는 이름을 넣으면 카드마다 404 가 나간다.
 */
const ART: MatchdayArt[] = [
  // 언더덕 크레스트 8장
  { src: "/matchday/flag-1.webp" },
  { src: "/matchday/flag-2.webp" },
  { src: "/matchday/flag-3.webp" },
  { src: "/matchday/flag-4.webp" },
  { src: "/matchday/flag-5.webp" },
  { src: "/matchday/flag-6.webp", light: true },
  { src: "/matchday/flag-7.webp" },
  { src: "/matchday/flag-8.webp" },
  // 흑백 + 핑크 한 색 5장
  { src: "/matchday/mono-1.webp", soft: true },
  { src: "/matchday/mono-4.webp", soft: true },
  { src: "/matchday/mono-5.webp", soft: true },
  { src: "/matchday/mono-6.webp", soft: true },
  { src: "/matchday/mono-8.webp", soft: true },
  // 골키퍼 3장
  { src: "/matchday/gk-2.webp", soft: true },
  { src: "/matchday/gk-5.webp", soft: true },
  { src: "/matchday/gk-6.webp", soft: true },
  // 듀오 2장
  { src: "/matchday/duo-1.webp", soft: true },
  { src: "/matchday/duo-2.webp", soft: true },
  // 팀 사진 변환 18장
  { src: "/matchday/team-1.webp", soft: true },
  { src: "/matchday/team-3.webp", soft: true },
  { src: "/matchday/team-4.webp", soft: true },
  { src: "/matchday/team-7.webp", soft: true },
  { src: "/matchday/team-10.webp", soft: true },
  { src: "/matchday/team-13.webp", soft: true },
  { src: "/matchday/team-14.webp", soft: true },
  { src: "/matchday/team-16.webp", soft: true },
  { src: "/matchday/team-18.webp", soft: true },
  { src: "/matchday/team-20.webp", soft: true },
  { src: "/matchday/team-22.webp", soft: true },
  { src: "/matchday/team-24.webp", soft: true },
  { src: "/matchday/team-25.webp", soft: true },
  { src: "/matchday/team-29.webp", soft: true },
  { src: "/matchday/team-30.webp", soft: true },
  { src: "/matchday/team-32.webp", soft: true },
  { src: "/matchday/team-33.webp", soft: true },
  { src: "/matchday/team-34.webp", soft: true },
  // 위트 12장
  { src: "/matchday/fun-2.webp", soft: true },
  { src: "/matchday/fun-3.webp", soft: true },
  { src: "/matchday/fun-7.webp", soft: true },
  { src: "/matchday/fun-8.webp", soft: true },
  { src: "/matchday/fun-9.webp", soft: true },
  { src: "/matchday/fun-10.webp", soft: true },
  { src: "/matchday/fun-11.webp", soft: true },
  { src: "/matchday/fun-12.webp", soft: true },
  { src: "/matchday/fun-15.webp", soft: true },
  { src: "/matchday/fun-16.webp", soft: true },
  { src: "/matchday/fun-17.webp", soft: true },
  { src: "/matchday/fun-18.webp", soft: true },
];

/**
 * 그림 위에 까는 막. 카드와 확인용 페이지가 같은 값을 쓰도록 여기 모아 둔다
 * (양쪽에 복붙해 두면 한쪽만 고쳐져 두 화면이 조용히 달라진다).
 *
 * 어두운 그림: 전체를 한 겹 가라앉히고 + 글자 뒤(위·아래)를 한 번 더 누른다.
 * 밝은 그림(수채화): 반대로 흰 막을 깔아 어두운 글씨를 받친다.
 */
export const ART_VEIL = "rgba(7,13,32,.30)";
export const ART_SCRIM_DARK =
  "linear-gradient(180deg,rgba(7,13,32,.62) 0%,rgba(7,13,32,.18) 46%,rgba(7,13,32,.50) 100%)";
/** 이미 어두운 그림용. 글자 뒤만 살짝 누르고 가운데는 거의 건드리지 않는다. */
export const ART_SCRIM_SOFT =
  "linear-gradient(180deg,rgba(7,13,32,.42) 0%,rgba(7,13,32,0) 40%,rgba(7,13,32,.28) 100%)";
export const ART_SCRIM_LIGHT =
  "linear-gradient(180deg,rgba(255,255,255,.72) 0%,rgba(255,255,255,.34) 46%,rgba(255,255,255,0) 72%)";

/** 작은 정수 해시(FNV-1a 변형). 인접한 입력이 인접한 결과로 몰리지 않게 섞는다. */
function hash(a: number, b: number): number {
  let h = 2166136261 ^ a;
  h = Math.imul(h ^ b, 16777619);
  h ^= h >>> 13;
  return Math.abs(Math.imul(h, 16777619));
}

/** 이 경기·이 날짜에 쓸 배경. 그림이 하나도 없으면 null(카드는 기존 그라디언트). */
export function matchdayArt(matchId: number, dDay: number): MatchdayArt | null {
  if (ART.length === 0) return null;
  return ART[hash(matchId, dDay) % ART.length];
}
