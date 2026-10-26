import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRestPlan,
  getDDay,
  isHomeState,
  isRestWeek,
  isUndecided,
  resolveHomeState,
} from "../app/lib/home-state.ts";

test("D-Day는 서버 시간대와 관계없이 한국 날짜로 계산한다", () => {
  const koreanMorning = new Date("2026-08-21T00:30:00+09:00");
  assert.equal(getDDay("2026-08-21", koreanMorning), 0);
  assert.equal(getDDay("2026-08-22", koreanMorning), 1);
  assert.equal(getDDay("잘못된 날짜", koreanMorning), null);
});

test("미정 값과 홈 상태 입력을 엄격하게 판별한다", () => {
  assert.equal(isUndecided(" 미정 "), true);
  assert.equal(isUndecided(""), true);
  assert.equal(isUndecided("NSW FC"), false);
  assert.equal(isHomeState("dday"), true);
  assert.equal(isHomeState("broken"), false);
});

test("상대가 비어 있는 자체전과 풋살은 매칭 대기로 분류하지 않는다", () => {
  const base = {
    lastMatch: null,
    hasMyVote: false,
    loggedIn: false,
  };

  assert.equal(
    resolveHomeState({
      ...base,
      nextMatch: { date: "2099-08-29", opponent: "미정", type: "자체전", result: "예정" },
    }),
    "idle",
  );
  assert.equal(
    resolveHomeState({
      ...base,
      nextMatch: { date: "2099-08-29", opponent: "", type: "풋살", result: "예정" },
    }),
    "idle",
  );
  assert.equal(
    resolveHomeState({
      ...base,
      nextMatch: { date: "2099-08-29", opponent: "미정", type: "일반 매칭", result: "예정" },
    }),
    "matching",
  );
});

test("이어지는 휴식 주를 묶고 복귀 날짜를 정한다", () => {
  assert.equal(isRestWeek(" 휴 식 "), true);
  assert.equal(isRestWeek("일반 매칭"), false);

  // 복귀 경기가 아직 없으면 마지막 휴식 + 7일
  assert.deepEqual(
    buildRestPlan([
      { id: 36, date: "2026-10-31", type: "휴식" },
      { id: 37, date: "2026-11-07", type: "휴식" },
    ]),
    { dates: ["2026-10-31", "2026-11-07"], returnDate: "2026-11-14", returnMatchId: null },
  );
  // 복귀 경기가 잡혀 있으면 그 경기
  assert.deepEqual(
    buildRestPlan([
      { id: 37, date: "2026-11-07", type: "휴식" },
      { id: 38, date: "2026-11-14", type: "일반 매칭" },
      { id: 39, date: "2026-11-21", type: "휴식" },
    ]),
    { dates: ["2026-11-07"], returnDate: "2026-11-14", returnMatchId: 38 },
  );
  // 다음 일정이 경기면 휴식이 아니다
  assert.equal(
    buildRestPlan([
      { id: 38, date: "2026-11-14", type: "일반 매칭" },
      { id: 39, date: "2026-11-21", type: "휴식" },
    ]),
    null,
  );
  assert.equal(buildRestPlan([]), null);
});

test("휴식 주는 투표 재촉보다 먼저지만 경기 당일 MOM 재촉은 막지 않는다", () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const next = { date: "2099-08-29", opponent: "미정", type: "일반 매칭", result: "예정" };
  assert.equal(
    resolveHomeState({ nextMatch: next, lastMatch: null, hasMyVote: false, loggedIn: true, resting: true }),
    "rest",
  );
  assert.equal(
    resolveHomeState({
      nextMatch: null,
      lastMatch: { date: today, mom: "", photos: "" },
      hasMyVote: false,
      loggedIn: true,
      resting: true,
    }),
    "afterMatch",
  );
});
