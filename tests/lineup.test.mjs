import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLineupMembers, parseSubstitutions } from "../app/lib/lineup.ts";

test("선발과 대기에서 같은 선수를 한 번만 유지한다", () => {
  const result = normalizeLineupMembers(
    [" 이건주 ", "김준수", "이건주", null, "미정", "미정"],
    ["이건주", " 김준수 ", "박상민", "박상민", ""],
  );

  assert.deepEqual(result.players, ["이건주", "김준수", "", "", "미정", "미정"]);
  assert.deepEqual(result.subs, ["박상민"]);
});

test("교체 기록은 공백과 잘못된 항목을 안전하게 정리한다", () => {
  const raw = JSON.stringify([
    { out: " 이건주 ", in: " 박상민 ", time: " 32분 " },
    { out: "", in: "" },
    null,
  ]);

  assert.deepEqual(parseSubstitutions(raw), [
    { out: "이건주", in: "박상민", time: "32분" },
  ]);
  assert.deepEqual(parseSubstitutions("깨진 JSON"), []);
});
