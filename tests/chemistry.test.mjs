import test from "node:test";
import assert from "node:assert/strict";
import { buildPlayerChemistry, buildTeamChemistry } from "../app/lib/chemistry.ts";

const matches = [
  ["date", "time", "location", "opponent", "ours", "theirs", "result", "type", "goals", "assists"],
  ["2026-01-01", "", "", "A FC", "3", "1", "승", "일반 매칭", "민수,민수,철수", "철수,영희,민수"],
  ["2026-01-08", "", "", "B FC", "0", "1", "패", "일반 매칭", "", ""],
];

const row = (matchId, quarter, players) => [String(matchId), quarter, "4-3-3", ...players, ...Array(11 - players.length).fill("")];

test("같은 경기라도 다른 쿼터에만 나온 선수는 동반 출전으로 세지 않는다", () => {
  const lineups = [
    ["matchId", "quarter", "formation"],
    row(0, "1Q", ["민수", "철수"]),
    row(0, "2Q", ["민수", "영희"]),
    row(1, "1Q", ["민수", "철수"]),
  ];
  const report = buildPlayerChemistry("민수", matches, lineups);
  const 철수 = report.partners.find((p) => p.name === "철수");
  const 영희 = report.partners.find((p) => p.name === "영희");

  assert.equal(철수?.sharedQuarters, 2);
  assert.equal(철수?.sharedMatches, 2);
  assert.deepEqual(철수?.record.recent, ["패", "승"]);
  assert.equal(영희?.sharedQuarters, 1);
  assert.equal(영희?.sharedMatches, 1);
});

test("득점자와 도움의 같은 인덱스를 방향별 합작으로 집계한다", () => {
  const lineups = [["matchId", "quarter", "formation"], row(0, "1Q", ["민수", "철수", "영희"])];
  const report = buildPlayerChemistry("민수", matches, lineups);
  const 철수 = report.partners.find((p) => p.name === "철수");
  const 영희 = report.partners.find((p) => p.name === "영희");

  assert.equal(철수?.supplied, 1);
  assert.equal(철수?.received, 1);
  assert.equal(철수?.combinedGoals, 2);
  assert.equal(영희?.received, 1);
});

test("팀 맵의 2인·3인 조합도 동일 쿼터 기준으로 집계한다", () => {
  const lineups = [
    ["matchId", "quarter", "formation"],
    row(0, "1Q", ["민수", "철수", "영희"]),
    row(0, "2Q", ["민수", "철수", "영희"]),
    row(1, "1Q", ["민수", "철수", "준수"]),
  ];
  const report = buildTeamChemistry(matches, lineups);
  const pair = report.pairs.find((p) => p.names.includes("민수") && p.names.includes("철수"));
  const trio = report.trios.find((t) => t.names.includes("민수") && t.names.includes("영희"));

  assert.equal(pair?.sharedQuarters, 3);
  assert.equal(pair?.sharedMatches, 2);
  assert.equal(pair?.combinedGoals, 2);
  assert.equal(trio?.sharedQuarters, 2);
  assert.equal(trio?.sharedMatches, 1);
});
