// 경기 날씨 — Open-Meteo(시간별, 키 없음).
//
// 한 함수가 경기 전에는 **예보**를, 경기가 끝난 뒤에는 **실제 값**을 낸다.
//   · 경기 전: 화면에 띄울 때마다 새로 받는다(matches-backend 가 읽을 때 덮어씌운다).
//     예전엔 처음 받은 예보를 한 번 저장하고 끝이라 며칠 전 예보가 그대로 떠 있었다.
//   · 경기 후: 매일 도는 크론이 실제 값으로 저장한다. 날씨 칭호는 이 값을 본다.
//
// 저장 형식("28°C,맑음,01d,10")과 아이콘 코드는 예전(OpenWeatherMap) 것을 그대로 쓴다 —
// titles.ts · wrapped.ts · 화면이 전부 이 형식을 읽는다.
//
// ⚠️ 날짜·시각을 Date 의 로컬 시간으로 다루지 않는다. 서버(Vercel)는 UTC 라서 setHours(8) 이
//    한국 시간 17시가 된다 — 실제로 오전 8시 경기에 오후 5시 예보를 저장하고 있었다.
//    API 에 timezone=Asia/Seoul 을 주고 "YYYY-MM-DDTHH:00" 문자열로만 맞춘다.

export interface WeatherInfo {
  temp: number; // 기온 (°C)
  description: string; // "맑음", "구름 많음" 등
  icon: string; // 아이콘 코드 (예: "01d")
  pop: number; // 강수확률 (0~100)
  available: boolean;
}

// 아이콘 코드 → 이모지
const iconToEmoji: Record<string, string> = {
  "01d": "☀️", "01n": "🌙",
  "02d": "⛅", "02n": "⛅",
  "03d": "☁️", "03n": "☁️",
  "04d": "☁️", "04n": "☁️",
  "09d": "🌧️", "09n": "🌧️",
  "10d": "🌦️", "10n": "🌧️",
  "11d": "⛈️", "11n": "⛈️",
  "13d": "🌨️", "13n": "🌨️",
  "50d": "🌫️", "50n": "🌫️",
};

export function weatherEmoji(icon: string): string {
  return iconToEmoji[icon] || "🌤️";
}

// 날씨를 시트 저장용 문자열로 직렬화 "28°C,맑음,01d,10"
export function serializeWeather(w: WeatherInfo): string {
  if (!w.available) return "";
  return `${w.temp}°C,${w.description},${w.icon},${w.pop}`;
}

// 시트에서 읽은 문자열을 파싱
export function parseWeather(str: string): WeatherInfo {
  if (!str) return { temp: 0, description: "", icon: "", pop: 0, available: false };
  const parts = str.split(",");
  if (parts.length < 4) return { temp: 0, description: "", icon: "", pop: 0, available: false };
  return {
    temp: parseInt(parts[0]) || 0,
    description: parts[1] || "",
    icon: parts[2] || "",
    pop: parseInt(parts[3]) || 0,
    available: true,
  };
}

const NONE: WeatherInfo = { temp: 0, description: "", icon: "", pop: 0, available: false };

/** 경기 한 판을 2시간으로 본다. */
const MATCH_HOURS = 2;
/** 경기 시간 동안 이만큼(mm) 이상 내렸으면 "비 오는 날 경기". 날씨 칭호의 기준이다. */
export const RAIN_MM = 0.5;
/** 시간이 "미정" 일 때 가정하는 시작 시각 — 이 팀 경기는 대부분 오전 8시다. */
const DEFAULT_HOUR = 8;
const FORECAST_DAYS = 14;

// 구장 좌표. 이름에 들어 있는 낱말로 찾고(위에서부터), 없으면 팀이 주로 뛰는 서남권 한가운데.
// 동네 단위의 근사값이다 — 예보 격자가 그보다 촘촘하지 않다.
const HOME = { lat: 37.5, lon: 126.87 };
const VENUES: [string, number, number][] = [
  ["항공대", 37.6, 126.865],
  ["개화", 37.586, 126.8],
  ["강서", 37.557, 126.85],
  ["양천", 37.517, 126.866],
  ["목동", 37.528, 126.875],
  ["고척", 37.498, 126.867],
  ["안양새물", 37.42, 126.9],
  ["안양천", 37.48, 126.88],
  ["노온", 37.44, 126.85],
  ["광명", 37.478, 126.865],
  ["옥길", 37.467, 126.82],
  ["대림", 37.493, 126.897],
  ["장훈", 37.506, 126.905],
  ["영등포", 37.525, 126.896],
  ["보라매", 37.493, 126.917],
  ["숭실", 37.496, 126.957],
  ["서울대", 37.459, 126.952],
  ["낙성대", 37.477, 126.963],
  ["관악", 37.478, 126.951],
  ["월드컵경기장", 37.568, 126.897],
  ["잠실", 37.515, 127.073],
  ["탄천", 37.411, 127.123],
];

function getCoords(location: string): { lat: number; lon: number } {
  const hit = VENUES.find(([key]) => (location || "").includes(key));
  return hit ? { lat: hit[1], lon: hit[2] } : HOME;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-14" + "8:00" → { day: "2026-11-14", hour: 8 }. 날짜가 이상하면 null. */
export function matchStart(date: string, time: string): { day: string; hour: number } | null {
  const d = (date || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!d) return null;
  const t = (time || "").match(/(\d{1,2}):(\d{2})/);
  const hour = t ? Math.min(23, Number(t[1])) : DEFAULT_HOUR;
  return { day: `${d[1]}-${pad(Number(d[2]))}-${pad(Number(d[3]))}`, hour };
}

/** WMO 날씨 코드 → 한글 설명 + 아이콘 번호(예전 OpenWeatherMap 번호 체계). */
function describe(code: number): { description: string; icon: string } {
  if (code === 0) return { description: "맑음", icon: "01" };
  if (code === 1) return { description: "대체로 맑음", icon: "02" };
  if (code === 2) return { description: "구름 조금", icon: "03" };
  if (code === 3) return { description: "흐림", icon: "04" };
  if (code <= 48) return { description: "안개", icon: "50" };
  if (code <= 57) return { description: "이슬비", icon: "09" };
  if (code <= 67) return { description: "비", icon: "10" };
  if (code <= 77) return { description: "눈", icon: "13" };
  if (code <= 82) return { description: "소나기", icon: "09" };
  if (code <= 86) return { description: "눈", icon: "13" };
  return { description: "뇌우", icon: "11" };
}

export interface HourlyWeather {
  time: string[];
  temperature_2m: (number | null)[];
  precipitation: (number | null)[];
  weather_code: (number | null)[];
  precipitation_probability?: (number | null)[];
}

/**
 * 시간별 값에서 경기 시간대(시작~2시간)의 날씨를 고른다.
 *
 * ended=true(끝난 경기)면 비 여부를 **실제 강수량**으로 정한다 — 코드가 "이슬비" 라도 RAIN_MM 미만이면
 * 흐림으로, 코드가 흐림이라도 RAIN_MM 이상 내렸으면 비로 적는다. 칭호가 설명·아이콘을 보기 때문이다.
 */
export function pickMatchWeather(h: HourlyWeather, day: string, hour: number, ended: boolean): WeatherInfo {
  const i = h.time.indexOf(`${day}T${pad(hour)}:00`);
  if (i < 0) return NONE;
  const during = Array.from({ length: MATCH_HOURS + 1 }, (_, k) => i + k).filter((k) => k < h.time.length);
  const temps = during.map((k) => h.temperature_2m[k]).filter((v): v is number => typeof v === "number");
  if (temps.length === 0) return NONE;
  // 강수량·강수확률은 "직전 1시간" 값이라 시작 다음 칸부터 본다.
  const after = during.slice(1);
  const rainMm = after.reduce((sum, k) => sum + (h.precipitation[k] ?? 0), 0);
  const pop = Math.max(0, ...after.map((k) => h.precipitation_probability?.[k] ?? 0));
  const code = Math.max(...during.map((k) => h.weather_code[k] ?? 0));

  let { description, icon } = describe(code);
  if (ended) {
    const rainy = rainMm >= RAIN_MM;
    const wet = icon === "09" || icon === "10" || icon === "11";
    if (rainy && !wet && icon !== "13") ({ description, icon } = { description: "비", icon: "10" });
    if (!rainy && wet) ({ description, icon } = { description: "흐림", icon: "04" });
  }
  return {
    temp: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length),
    description,
    icon: icon + (hour >= 6 && hour < 18 ? "d" : "n"),
    pop: ended ? (rainMm >= RAIN_MM ? 100 : 0) : Math.round(pop),
    available: true,
  };
}

/**
 * 경기 시간대의 날씨. 경기가 끝났으면 실제 값, 아니면 예보(2주 앞까지).
 * 실패하면 available=false — 부르는 쪽은 저장돼 있던 값을 그대로 쓴다.
 */
export async function getMatchWeather(
  matchDate: string,
  matchTime: string,
  location: string,
): Promise<WeatherInfo> {
  const start = matchStart(matchDate, matchTime);
  if (!start) return NONE;
  const startMs = Date.parse(`${start.day}T${pad(start.hour)}:00:00+09:00`);
  const days = (startMs - Date.now()) / 86_400_000;
  if (days > FORECAST_DAYS) return NONE;
  const ended = Date.now() > startMs + MATCH_HOURS * 3_600_000;

  // 밤 경기는 다음 날 새벽 칸까지 필요하다.
  const nextDay = new Date(Date.parse(`${start.day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const { lat, lon } = getCoords(location);
  // 예보 API 는 석 달 전까지만 거슬러 준다. 그보다 오래된 날은 기록 보관소에서 받는다.
  const archive = days < -80;
  const url =
    `https://${archive ? "archive-api" : "api"}.open-meteo.com/v1/${archive ? "archive" : "forecast"}` +
    `?latitude=${lat}&longitude=${lon}&timezone=Asia%2FSeoul&start_date=${start.day}&end_date=${nextDay}` +
    `&hourly=temperature_2m,precipitation,weather_code${archive ? "" : ",precipitation_probability"}`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) {
      console.error(`[weather] API 응답 오류: ${res.status} ${res.statusText}`);
      return NONE;
    }
    const data = await res.json();
    if (!data.hourly?.time) return NONE;
    return pickMatchWeather(data.hourly, start.day, start.hour, ended);
  } catch (e) {
    console.error("[weather] 예외:", e);
    return NONE;
  }
}
