import test from "node:test";
import assert from "node:assert/strict";
import { scorerLines, momSlots } from "../app/lib/result-card.ts";

test("득점자별로 묶고 그 골의 도움을 짝지어 모은다", () => {
  const lines = scorerLines(
    "OG,OG,강창훈,강창훈,강창훈,문승환,문승환,홍창의",
    ",,문승환,,김주성,강창훈,,",
  );
  assert.deepEqual(lines, [
    { name: "강창훈", muted: false, goals: 3, assists: ["문승환", "김주성"] },
    { name: "문승환", muted: false, goals: 2, assists: ["강창훈"] },
    { name: "홍창의", muted: false, goals: 1, assists: [] },
    { name: "상대 자책골", muted: true, goals: 2, assists: [] },
  ]);
});

test("빈 기록", () => {
  assert.deepEqual(scorerLines("", ""), []);
});

test("MOM 은 공격/수비 역할로, 공동 수상은 여러 칸", () => {
  assert.deepEqual(momSlots("이건주,김준수 / 김주성"), [
    { name: "이건주", role: "ATTACK" },
    { name: "김준수", role: "ATTACK" },
    { name: "김주성", role: "DEFENCE" },
  ]);
  assert.deepEqual(momSlots("강창훈"), [{ name: "강창훈", role: null }]);
  assert.deepEqual(momSlots(""), []);
});
