// 화면에 찍는 날짜 표기 한 가지. 홈 히어로("11월 14일 토")와 같은 모양으로 맞춘다.
// 경기 상세·공지·라인업 편집이 "2026-11-14" 를 그대로 찍어서 화면마다 표기가 달랐다.

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "11월 14일 토". withYear 면 "2026년 11월 14일 토". 날짜로 못 읽는 값은 그대로 돌려준다. */
export function koreanDate(raw: string, withYear = false): string {
  const d = new Date(raw);
  if (!raw || isNaN(d.getTime())) return raw;
  const body = `${d.getMonth() + 1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}`;
  return withYear ? `${d.getFullYear()}년 ${body}` : body;
}
