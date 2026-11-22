import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kitPrefsFromRoster,
  playerFaceOnSrc,
  playerKits,
  setPlayerKitPrefs,
} from "../app/lib/player-faceons.ts";

const enc = (n) => encodeURIComponent(n);

test("사진 없는 선수는 null", () => {
  assert.equal(playerFaceOnSrc("없는사람"), null);
  assert.deepEqual(playerKits("없는사람"), []);
});

test("하계만 있으면 하계 — 동계를 골라도 없는 사진은 안 쓴다", () => {
  assert.deepEqual(playerKits("강현준"), ["summer"]);
  setPlayerKitPrefs({ 강현준: "winter" });
  assert.equal(playerFaceOnSrc("강현준"), `/players/${enc("강현준")}.webp`);
  assert.equal(playerFaceOnSrc(" 강현준 ", "winter"), `/players/${enc("강현준")}.webp`);
  setPlayerKitPrefs({});
});

test("둘 다 있으면 기본은 동계, 고른 값·고정 값이 우선", () => {
  assert.deepEqual(playerKits("금상덕"), ["summer", "winter"]);
  assert.equal(playerFaceOnSrc("금상덕"), `/players/winter/${enc("금상덕")}.webp`);
  setPlayerKitPrefs({ 금상덕: "summer" });
  assert.equal(playerFaceOnSrc("금상덕"), `/players/${enc("금상덕")}.webp`);
  setPlayerKitPrefs({});
  assert.equal(playerFaceOnSrc("금상덕", "summer"), `/players/${enc("금상덕")}.webp`);
});

test("roster 행에서 고른 유니폼 맵을 만든다(빈 값·모르는 값은 버린다)", () => {
  const rows = [
    ["no", "name", "pos", "status", "", "memo", "id", "pref_pos", "kit"],
    ["9", "금상덕", "FW", "활동", "", "", "6", "ST", "winter"],
    ["10", "김준수", "MF", "활동", "", "", "7", "", ""],
    ["11", "원석희", "FW", "활동", "", "", "8", "", "autumn"],
    ["12", "최동권", "DF", "활동", "", "", "9", ""],
  ];
  assert.deepEqual(kitPrefsFromRoster(rows), { 금상덕: "winter" });
});
