// 경기·라인업의 공용 타입.
//
// 원래 DashboardClient.tsx(3,400줄) 안에 있었다. 그 화면은 NewHome 으로 교체돼
// 더 이상 렌더되지 않는데, 이 두 타입을 가져오려고 파일 전체가 남아 있었다.
// 타입만 떼어 내고 그 파일은 지웠다(필요하면 git 히스토리에 있다).
//
// 필드 주석의 "K열/L열…" 은 구글 시트 시절 컬럼이다. 지금 저장소는 백엔드지만
// matches-backend.ts 가 응답을 같은 열 순서로 환원해 주므로 여전히 맞는 설명이다.

import type { SubstitutionEvent } from "./lineup";

export interface LineupData {
  matchId: number;
  quarter: string; // "예상" | "1Q" | "2Q" | "3Q" | "4Q" | "5Q" | "6Q"
  formation: string; // "4-3-3" | "4-4-2" | "3-5-2" | "4-2-3-1" 등
  // p1~p11 — 슬롯 순서를 유지한 11칸 고정 배열. 빈 자리는 "".
  // 좌표·개인 전술이 슬롯 인덱스로 매칭되므로 절대 압축하면 안 된다.
  players: string[];
  subs: string[]; // 대기 선수 sub1~sub5
  substitutions: SubstitutionEvent[]; // 실제 교체 OUT → IN
  positions?: string; // 자유 배치 좌표 "x,y;…" (11개). 빈 값이면 포메이션 프리셋
  tactic?: string; // 팀 전술 id (app/lib/positions.ts TACTICS)
  instructions?: string; // 슬롯별 개인 전술 id "id;id;;…"
}

export interface MatchData {
  id: number;
  date: string;
  time: string;
  location: string;
  opponent: string;
  ourScore: string | number;
  theirScore: string | number;
  result: string;
  type?: string;
  goals?: string;
  assists?: string;
  mom?: string; // K열 - MOM
  attendees?: string; // L열 - 참석자 (쉼표 구분)
  photos?: string; // M열 - Drive 파일ID (쉼표 구분)
  weather?: string; // N열 - "28°C,맑음,01d,10"
  attendanceStatus?: "진행중" | "마감"; // O열 - 출석 투표 상태
}
