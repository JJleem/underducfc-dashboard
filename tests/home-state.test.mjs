import test from "node:test";
import assert from "node:assert/strict";
import { getDDay, isHomeState, isUndecided, resolveHomeState } from "../app/lib/home-state.ts";

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
