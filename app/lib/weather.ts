// OpenWeatherMap 5-day/3-hour forecast API
// 무료 플랜: 최대 5일 예보, 3시간 간격

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

// 서울 기본 좌표 (경기장 위치를 모를 때 폴백)
const DEFAULT_LAT = 37.5665;
const DEFAULT_LON = 126.978;

// 주요 경기장 좌표 매핑
const locationCoords: Record<string, { lat: number; lon: number }> = {
  "잠실": { lat: 37.5153, lon: 127.0729 },
  "월드컵경기장": { lat: 37.5683, lon: 126.8972 },
  "탄천": { lat: 37.4106, lon: 127.1234 },
  "목동": { lat: 37.5282, lon: 126.8748 },
  "고척": { lat: 37.4982, lon: 126.8672 },
};

function getCoords(location: string): { lat: number; lon: number } {
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (location.includes(key)) return coords;
  }
  return { lat: DEFAULT_LAT, lon: DEFAULT_LON };
}

export async function getMatchWeather(
  matchDate: string,
  matchTime: string,
  location: string
): Promise<WeatherInfo> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.warn("[weather] OPENWEATHER_API_KEY 환경변수 없음");
    return { temp: 0, description: "", icon: "", pop: 0, available: false };
  }

  // 경기 날짜가 5일 이내인지 확인
  const now = new Date();
  const target = new Date(matchDate);
  if (isNaN(target.getTime())) {
    return { temp: 0, description: "", icon: "", pop: 0, available: false };
  }
  // 시간 설정 (경기 시간 파싱)
  const timeMatch = matchTime?.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    target.setHours(Number(timeMatch[1]), Number(timeMatch[2]));
  } else {
    target.setHours(14, 0); // 기본 오후 2시
  }

  const diffMs = target.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0 || diffDays > 5) {
    return { temp: 0, description: "", icon: "", pop: 0, available: false };
  }

  try {
    const { lat, lon } = getCoords(location);
    // lang=kr → description이 한글로 옴
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=kr`;

    const res = await fetch(url, { next: { revalidate: 1800 } }); // 30분 캐시
    if (!res.ok) {
      console.error(`[weather] API 응답 오류: ${res.status} ${res.statusText}`);
      return { temp: 0, description: "", icon: "", pop: 0, available: false };
    }

    const data = await res.json();
    if (!data.list || data.list.length === 0) {
      return { temp: 0, description: "", icon: "", pop: 0, available: false };
    }

    const targetTime = target.getTime();

    // 경기 시간에 가장 가까운 예보 찾기
    let closest = data.list[0];
    let minDiff = Infinity;
    for (const item of data.list) {
      const itemTime = item.dt * 1000;
      const diff = Math.abs(itemTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = item;
      }
    }

    const desc = closest.weather?.[0]?.description || "";
    const icon = closest.weather?.[0]?.icon || "";

    return {
      temp: Math.round(closest.main?.temp ?? 0),
      description: desc, // lang=kr이므로 이미 한글
      icon,
      pop: Math.round((closest.pop ?? 0) * 100),
      available: true,
    };
  } catch (e) {
    console.error("[weather] 예외:", e);
    return { temp: 0, description: "", icon: "", pop: 0, available: false };
  }
}
