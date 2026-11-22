import { test } from "node:test";
import assert from "node:assert/strict";
import { playerFaceOnSrc, playerKits } from "../app/lib/player-faceons.ts";

const enc = (n) => encodeURIComponent(n);

test("사진 없는 선수는 null", () => {
  assert.equal(playerFaceOnSrc("없는사람"), null);
  assert.deepEqual(playerKits("없는사람"), []);
});

test("하계만 있으면 하계 — 동계로 고정해도 없는 사진은 안 쓴다", () => {
  assert.deepEqual(playerKits("강현준"), ["summer"]);
  assert.equal(playerFaceOnSrc("강현준"), `/players/${enc("강현준")}.webp`);
  assert.equal(playerFaceOnSrc(" 강현준 ", "winter"), `/players/${enc("강현준")}.webp`);
});

test("둘 다 있으면 동계, 하계로 고정하면 하계(지난 시즌 래핑)", () => {
  assert.deepEqual(playerKits("금상덕"), ["summer", "winter"]);
  assert.equal(playerFaceOnSrc("금상덕"), `/players/winter/${enc("금상덕")}.webp`);
  assert.equal(playerFaceOnSrc("금상덕", "summer"), `/players/${enc("금상덕")}.webp`);
});
