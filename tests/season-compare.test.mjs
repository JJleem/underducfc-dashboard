import test from "node:test";
import assert from "node:assert/strict";
import { TREND_MIN_APPS, buildSeasonCompare } from "../app/lib/season-compare.ts";

const line = (id, o) => ({ id, label: `${id.slice(0, 2)}-${id.slice(2)}`, apps: 0, goals: 0, assists: 0, mom: 0, attended: 0, total: 0, ...o });
const row = (cmp, key) => cmp.rows.find((r) => r.key === key);

test("두 시즌 이상 뛰어야 비교가 생긴다", () => {
  assert.equal(buildSeasonCompare([line("2526", { apps: 20 })]), null);
  // 새 시즌에 한 경기도 안 뛰었으면 비교할 게 없다.
  assert.equal(buildSeasonCompare([line("2526", { apps: 20 }), line("2627", { apps: 0 })]), null);
});

test("누적 합계는 화살표를 달지 않는다 — 시즌 중반엔 누적이 늘 적다", () => {
  const cmp = buildSeasonCompare([
    line("2526", { apps: 20, goals: 10 }),
    line("2627", { apps: 8, goals: 3 }),
  ]);
  assert.deepEqual(row(cmp, "goals").values, ["10", "3"]);
  assert.equal(row(cmp, "goals").trend, null);
});

test("경기당 수치는 올랐는지 내렸는지 화살표를 단다", () => {
  const cmp = buildSeasonCompare([
    line("2526", { apps: 20, goals: 10, assists: 2 }), // 0.5골 · 0.1도움
    line("2627", { apps: 8, goals: 6, assists: 0 }), //   0.75골 · 0도움
  ]);
  assert.deepEqual(row(cmp, "goalsPer").values, ["0.50", "0.75"]);
  assert.equal(row(cmp, "goalsPer").trend, "up");
  assert.equal(row(cmp, "assistsPer").trend, "down");
});

test(`새 시즌 출전이 ${TREND_MIN_APPS}경기 미만이면 화살표를 달지 않는다 — 11월에 '하락' 이 뜨면 안 된다`, () => {
  const cmp = buildSeasonCompare([
    line("2526", { apps: 20, goals: 10 }),
    line("2627", { apps: TREND_MIN_APPS - 1, goals: 0 }),
  ]);
  assert.equal(row(cmp, "goalsPer").trend, null);
});

test("출석률은 팀 경기 수 대비이고, 팀 경기가 없으면 — 로 둔다", () => {
  const cmp = buildSeasonCompare([
    line("2526", { apps: 20, attended: 20, total: 25 }),
    line("2627", { apps: 6, attended: 6, total: 6 }),
  ]);
  assert.deepEqual(row(cmp, "attendRate").values, ["80%", "100%"]);
  assert.equal(row(cmp, "attendRate").trend, "up");

  const empty = buildSeasonCompare([
    line("2526", { apps: 20, attended: 20, total: 0 }),
    line("2627", { apps: 6, attended: 6, total: 6 }),
  ]);
  assert.equal(row(empty, "attendRate").values[0], "—");
  assert.equal(row(empty, "attendRate").trend, null);
});

test("같은 값이면 same, 기록 없는 시즌은 빼고 최근 세 시즌까지만 싣는다", () => {
  const cmp = buildSeasonCompare([
    line("2425", { apps: 10, goals: 5 }),
    line("2526", { apps: 10, goals: 5 }),
    line("2627", { apps: 0 }),
    line("2728", { apps: 10, goals: 5 }),
    line("2829", { apps: 10, goals: 5 }),
  ]);
  assert.deepEqual(cmp.seasons.map((s) => s.id), ["2526", "2728", "2829"]);
  assert.equal(row(cmp, "goalsPer").trend, "same");
});
