// 끝난 경기의 날씨를 실제 값으로 확정해 저장한다.
//
// 경기 전에는 예보를 화면에 띄울 때마다 새로 받는다(matches-backend 의 withLiveWeather).
// 그건 저장되지 않으므로, 경기가 끝나면 그 시간대에 실제로 어땠는지를 여기서 적어 둔다.
// 날씨 칭호(titles.ts)와 래핑이 보는 값이 이것이다. 값이 같으면 쓰지 않는다(멱등).

import { getMatches, patchMatch } from "./matches-backend";
import { getMatchWeather, matchStart, serializeWeather } from "./weather";

const DAY_MS = 86_400_000;

/** 최근 days 일 안에 끝난 경기를 확정한다. 바뀐 경기만 돌려준다. */
export async function finalizeRecentWeather(days = 7): Promise<{ matchId: number; weather: string }[]> {
  const now = Date.now();
  const changed: { matchId: number; weather: string }[] = [];
  for (const m of await getMatches()) {
    const start = matchStart(m.date ?? "", m.time ?? "");
    if (!start) continue;
    const startMs = Date.parse(`${start.day}T${String(start.hour).padStart(2, "0")}:00:00+09:00`);
    // 끝나고 한 시간은 지나야 그 시간대 값이 잡힌다.
    if (startMs + 3 * 3_600_000 > now || startMs < now - days * DAY_MS) continue;
    const weather = await getMatchWeather(m.date ?? "", m.time ?? "", m.location ?? "");
    if (!weather.available) continue;
    const value = serializeWeather(weather);
    if (value === (m.weather ?? "")) continue;
    await patchMatch(m.match_id, { weather: value });
    changed.push({ matchId: m.match_id, weather: value });
  }
  return changed;
}
