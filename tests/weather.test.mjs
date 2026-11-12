import test from "node:test";
import assert from "node:assert/strict";
import { matchStart, pickMatchWeather } from "../app/lib/weather.ts";

const hours = (day) => Array.from({ length: 24 }, (_, h) => `${day}T${String(h).padStart(2, "0")}:00`);
const day = "2026-11-14";
const base = (over = {}) => ({
  time: hours(day),
  temperature_2m: Array(24).fill(10),
  precipitation: Array(24).fill(0),
  weather_code: Array(24).fill(3),
  precipitation_probability: Array(24).fill(0),
  ...over,
});
const set = (arr, at) => arr.map((v, i) => (i in at ? at[i] : v));

test("matchStart: 시각을 한국 시간 그대로 읽고, 미정이면 오전 8시", () => {
  assert.deepEqual(matchStart("2026-11-14", "8:00"), { day, hour: 8 });
  assert.deepEqual(matchStart("2026-11-14", "미정"), { day, hour: 8 });
  assert.equal(matchStart("", "8:00"), null);
});

test("예보: 경기 시간대(8~10시)의 기온 평균·최대 강수확률", () => {
  const h = base();
  h.temperature_2m = set(h.temperature_2m, { 8: 11, 9: 12, 10: 13, 17: 30 });
  h.precipitation_probability = set(h.precipitation_probability, { 9: 40, 10: 70, 17: 100 });
  const w = pickMatchWeather(h, day, 8, false);
  assert.equal(w.temp, 12);
  assert.equal(w.pop, 70);
  assert.equal(w.icon, "04d");
});

test("끝난 경기: 비 여부는 실제 강수량으로 정한다", () => {
  const wet = base();
  wet.precipitation = set(wet.precipitation, { 9: 0.4, 10: 0.3 });
  const a = pickMatchWeather(wet, day, 8, true);
  assert.equal(a.description, "비");
  assert.equal(a.icon, "10d");
  assert.equal(a.pop, 100);

  // 코드는 이슬비인데 거의 안 내렸으면 비 경기가 아니다.
  const drizzle = base({ weather_code: Array(24).fill(51) });
  drizzle.precipitation = set(drizzle.precipitation, { 9: 0.1 });
  const b = pickMatchWeather(drizzle, day, 8, true);
  assert.equal(b.description, "흐림");
  assert.equal(b.pop, 0);
});

test("해당 시각이 없으면 available=false", () => {
  assert.equal(pickMatchWeather(base(), "2026-01-01", 8, false).available, false);
});
