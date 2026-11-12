// app/lib/matches-backend.ts
//
// matches 도메인 — underduck 백엔드 래퍼.
// ⚠️ 서버사이드 전용([[underduck.ts]]가 window 가드로 차단). route handler / server component에서만.
//
// 목적: 기존 시트 기반 코드(파싱·쓰기)를 최소 변경으로 백엔드에 연결한다.
// - 읽기: 백엔드 MatchOut[] → 기존 getSheetData("matches!...") 와 동일한 string[][] 레이아웃으로 환원.
// - 쓰기: sheets-write.ts의 matches 함수들이 이 래퍼를 호출하도록 전환.

import { udGet, udPost, udPatch, udDelete } from "./underduck";
import { UD_TAG, udReadOptsFor } from "./cache";
import { getMatchWeather, serializeWeather } from "./weather";

const matchReadOpts = udReadOptsFor(UD_TAG.matches);

/** 백엔드 응답 스키마. match_id = 기존 시트 0-based 인덱스(보존). */
export interface MatchOut {
  match_id: number;
  date: string | null;
  time: string | null;
  location: string | null;
  opponent: string | null;
  our_score: number | null;
  their_score: number | null;
  result: string | null;
  type: string | null;
  goals: string | null;
  assists: string | null;
  attendees: string | null;
  // CSV 문자열 또는 배열 어느 쪽이든 허용(검증 후 확정).
  photos: string[] | string | null;
  mom: string | null;
  weather: string | null;
  attendance_status: string | null;
  /** 피드 좋아요 수. 목록 조회에 동봉돼 온다(경기당 추가 왕복 없음). */
  like_count?: number;
}

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const photosToCsv = (p: MatchOut["photos"]): string =>
  Array.isArray(p) ? p.filter(Boolean).join(",") : str(p);

// 기존 시트 헤더(matches!A1:O1)와 동일한 컬럼 순서.
// P(likeCount)는 시트에 없던 열이다 — 백엔드로 옮긴 뒤 늘어난 필드는 뒤에 붙인다.
const HEADER = [
  "date", "time", "location", "opponent", "ourScore", "theirScore",
  "result", "type", "goals", "assists", "MOM", "attendees",
  "photos", "weather", "attendanceStatus", "likeCount",
];

/** MatchOut → 시트 A~O 한 행(위치 기반 파싱 호환). */
function toSheetRow(m: MatchOut): string[] {
  return [
    str(m.date),             // A date
    str(m.time),             // B time
    str(m.location),         // C location
    str(m.opponent),         // D opponent
    str(m.our_score),        // E ourScore
    str(m.their_score),      // F theirScore
    str(m.result),           // G result
    str(m.type),             // H type
    str(m.goals),            // I goals
    str(m.assists),          // J assists
    str(m.mom),              // K MOM
    str(m.attendees),        // L attendees
    photosToCsv(m.photos),   // M photos(CSV)
    str(m.weather),          // N weather
    str(m.attendance_status),// O attendanceStatus
    str(m.like_count ?? 0),  // P likeCount
  ];
}

/**
 * 기존 getMatchesData() / getSheetData("matches!...") 대체.
 * 각 행을 match_id(0-based) 위치에 배치해, 소비처의 "배열 인덱스 = matchId" 의미를
 * 그대로 보존한다(시트의 행 위치 = matchId+2 와 동일한 효과). 빈 자리는 빈 행으로 채운다.
 */
export async function getMatchesRows(): Promise<string[][]> {
  const matches = await udGet<MatchOut[]>("/api/underduck/matches", matchReadOpts);
  const maxId = matches.reduce((mx, m) => Math.max(mx, m.match_id), -1);
  const rows: string[][] = [];
  for (const m of matches) rows[m.match_id] = toSheetRow(m);
  for (let i = 0; i <= maxId; i++) {
    if (!rows[i]) rows[i] = Array(HEADER.length).fill("");
  }
  await withLiveWeather(rows);
  return [HEADER, ...rows];
}

/**
 * 다가오는 경기의 날씨 칸(N)을 지금 예보로 덮어쓴다(저장은 하지 않는다).
 *
 * 예전엔 처음 받은 예보를 한 번 저장하고 끝이라, 닷새 전 예보가 경기 날까지 그대로 떠 있었다.
 * 어제 경기까지 포함하는 건 크론(finalize-weather)이 실제 값으로 저장하기 전의 틈을 메우려는 것.
 * 조회는 30분 캐시 + 2.5초 제한이고, 실패하면 저장돼 있던 값이 그대로 나간다.
 */
async function withLiveWeather(rows: string[][]): Promise<void> {
  const kstDay = (offsetDays: number) =>
    new Date(Date.now() + 9 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
  const from = kstDay(-1);
  const to = kstDay(14);
  await Promise.all(
    rows.map(async (row) => {
      const date = row[0];
      if (!date || date < from || date > to) return;
      const weather = await getMatchWeather(date, row[1], row[2]);
      if (weather.available) row[13] = serializeWeather(weather);
    }),
  );
}

/** 전체 경기 목록(원본 스키마 그대로). */
export async function getMatches(): Promise<MatchOut[]> {
  return udGet<MatchOut[]>("/api/underduck/matches");
}

/** 단건 조회(없으면 백엔드 404 → underduckFetch가 throw). */
export async function getMatch(matchId: number): Promise<MatchOut> {
  return udGet<MatchOut>(`/api/underduck/matches/${matchId}`, matchReadOpts);
}

/** 신규 경기 생성. 백엔드가 result="예정"/attendance_status="진행중"/match_id=max+1 자동 부여. */
export async function createMatch(input: {
  date: string;
  time: string;
  location: string;
  opponent: string;
  type: string;
  weather?: string;
}): Promise<MatchOut> {
  return udPost<MatchOut>("/api/underduck/matches", input);
}

/** 부분 수정(보낸 필드만 갱신). 점수는 int, 나머지는 문자열. */
export type MatchPatch = Partial<{
  date: string;
  time: string;
  location: string;
  opponent: string;
  type: string;
  result: string;
  // 빈 점수(예정 경기 등)는 null로 보내 백엔드에서 비운다.
  our_score: number | null;
  their_score: number | null;
  goals: string;
  assists: string;
  mom: string;
  attendees: string;
  weather: string;
  attendance_status: string;
}>;

export async function patchMatch(matchId: number, fields: MatchPatch): Promise<MatchOut> {
  return udPatch<MatchOut>(`/api/underduck/matches/${matchId}`, fields);
}

/** 사진 추가(중복 무시, 최대 5, 초과 시 백엔드 400). */
export async function addMatchPhotos(matchId: number, urls: string[]): Promise<MatchOut> {
  return udPost<MatchOut>(`/api/underduck/matches/${matchId}/photos`, { urls });
}

/** 사진 제거. */
export async function removeMatchPhoto(matchId: number, url: string): Promise<MatchOut> {
  return udDelete<MatchOut>(`/api/underduck/matches/${matchId}/photos`, { url });
}

/** 피드 좋아요 토글. 인당 1번 — 백엔드가 누른 뒤 상태와 누적 수를 돌려준다. */
export async function toggleMatchLike(
  matchId: number,
  kakaoId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const r = await udPost<{ liked: boolean; like_count: number }>(
    `/api/underduck/matches/${matchId}/like`,
    { kakao_id: kakaoId },
  );
  return { liked: r.liked, likeCount: r.like_count };
}

/** 이 경기에 좋아요를 누른 사람 이름, 누른 순서대로. */
export async function getMatchLikers(matchId: number): Promise<string[]> {
  return udGet<string[]>(`/api/underduck/matches/${matchId}/likers`, {
    cache: "no-store",
  });
}

/** 특정 사용자가 좋아요한 match_id 집합. */
export async function getMyLikedMatchIds(kakaoId: string): Promise<Set<number>> {
  const ids = await udGet<number[]>(
    `/api/underduck/matches/my-likes?kakao_id=${encodeURIComponent(kakaoId)}`,
    { cache: "no-store" },
  );
  return new Set(ids);
}
