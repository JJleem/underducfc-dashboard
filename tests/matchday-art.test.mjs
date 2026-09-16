import test from "node:test";
import assert from "node:assert/strict";
import { MATCHDAY_ART, matchdayArt, matchResultArt, matchCasualArt } from "../app/lib/matchday-art.ts";

// 예정 경기 그림은 전역 순열을 경기들이 이어서 소비한다(d8c5f68).
// 되돌아가기 쉬운 성질이라 세 가지를 못으로 박아 둔다.

const SLOTS_PER_MATCH = 8; // D-7 ~ D-0

/** 한 경기가 카운트다운 동안 쓰는 그림 8장. */
function artsOfMatch(matchId) {
  const out = [];
  for (let d = SLOTS_PER_MATCH - 1; d >= 0; d--) out.push(matchdayArt(matchId, d).src);
  return out;
}

test("한 경기의 카운트다운 여드레 안에서는 같은 그림이 두 번 나오지 않는다", () => {
  // 순열을 경기 단위로 끊지 않으면 바퀴 경계에 걸친 경기에서 D-5 와 D-2 가 겹쳤다
  // (2000경기에 31번). 경계는 76장/8칸 주기로만 오므로 넉넉히 훑어야 잡힌다.
  const offenders = [];
  for (let matchId = 0; matchId < 2000; matchId++) {
    const arts = artsOfMatch(matchId);
    if (new Set(arts).size !== SLOTS_PER_MATCH) offenders.push(matchId);
  }
  assert.deepEqual(offenders, []);
});

test("경기가 이어지면 그림을 전부 소비한다 — 경기마다 새로 섞으면 이 테스트가 깨진다", () => {
  // 경기마다 순열을 새로 섞으면 여러 경기를 지나도 못 본 그림이 남는다.
  // 전역 순열이면 작품 수만큼의 경기 안에는 모두 한 번씩 나온다.
  const seen = new Set();
  // 경기 경계에서 다음 순열로 넘어가므로 단순히 작품 수/8로 자르지 않는다.
  const matchesToCoverAll = MATCHDAY_ART.length;
  for (let matchId = 0; matchId < matchesToCoverAll; matchId++) {
    for (const src of artsOfMatch(matchId)) seen.add(src);
  }
  assert.equal(seen.size, MATCHDAY_ART.length);
});

test("같은 경기·같은 날이면 항상 같은 그림이다 — 서버와 클라이언트가 갈리면 hydration 이 깨진다", () => {
  for (const [matchId, dDay] of [[0, 7], [3, 0], [12, 21], [7, -2]]) {
    assert.equal(matchdayArt(matchId, dDay).src, matchdayArt(matchId, dDay).src);
  }
  // 끝난 경기 그림은 날짜를 섞지 않는다 — 한 번 정해지면 고정이어야 한다.
  assert.equal(matchResultArt(3).src, matchResultArt(3).src);
  assert.equal(matchCasualArt(3).src, matchCasualArt(3).src);
});
