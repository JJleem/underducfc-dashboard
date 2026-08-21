import test from "node:test";
import assert from "node:assert/strict";
import { getDDay, isHomeState, isUndecided } from "../app/lib/home-state.ts";

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
