// 지난 경기의 날씨를 실제 값으로 다시 채운다.
//
//   node --no-warnings --env-file=.env.local scripts/backfill-weather.mts          # 비교표만
//   node --no-warnings --env-file=.env.local scripts/backfill-weather.mts --write  # 백엔드에 저장
//
// 평소엔 매일 도는 크론(app/lib/finalize-weather.ts)이 최근 7일을 맡는다. 이건 그 전 경기용이다.

import { getMatchWeather, serializeWeather } from "../app/lib/weather.ts";

const base = process.env.UNDERDUCK_API_BASE;
const headers = { "X-Underduck-Secret": process.env.UNDERDUCK_API_SECRET ?? "", "Content-Type": "application/json" };
const write = process.argv.includes("--write");

type Match = { match_id: number; date: string | null; time: string | null; location: string | null; weather: string | null };
const matches: Match[] = await (await fetch(`${base}/api/underduck/matches`, { headers })).json();

for (const m of matches.sort((a, b) => a.match_id - b.match_id)) {
  if (!m.date || !/\d:\d\d/.test(m.time ?? "") || Date.parse(`${m.date}T23:59:59+09:00`) > Date.now()) continue;
  const w = await getMatchWeather(m.date, m.time ?? "", m.location ?? "");
  const next = w.available ? serializeWeather(w) : "";
  const mark = !next ? "조회 실패" : next === (m.weather ?? "") ? "같음" : write ? "저장" : "바뀜";
  console.log([m.match_id, m.date, m.time, m.location, m.weather || "-", next || "-", mark].join(" | "));
  if (write && next && next !== (m.weather ?? "")) {
    const res = await fetch(`${base}/api/underduck/matches/${m.match_id}`, { method: "PATCH", headers, body: JSON.stringify({ weather: next }) });
    if (!res.ok) console.error(`  저장 실패 ${res.status}`);
  }
}
