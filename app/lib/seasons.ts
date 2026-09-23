// app/lib/seasons.ts
//
// 시즌 경계. 기록을 시즌 단위로 자르는 모든 화면이 여기 하나만 본다.
//
// 시즌은 DB 컬럼이 아니라 **경기 날짜에서 파생**된다. matches.date(YYYY-MM-DD)가
// 어느 구간에 들어가느냐로 정해지므로, 시즌이 바뀔 때 마이그레이션도 백필도 없다.
// 아래 SEASONS 배열에 한 줄 더 넣는 것이 전부다.
//
// ⚠️ 백엔드에도 같은 표가 있다(underduck-backend/seasons.py). 스탯 집계는 백엔드가
//    하므로 둘이 어긋나면 순위 페이지와 프로필이 다른 말을 한다. 고칠 땐 같이 고친다.

/**
 * 시즌 대표색. 같은 핑크 가족 안에서 시즌마다 다른 색을 준다.
 *
 * ⚠️ 이건 **팀 브랜드 컬러가 아니다.** 팀 핑크는 예전에 CSS 토큰 없이
 *    497군데 하드코딩돼 있었다. 지금은 --ud-primary 토큰으로 모았고, 이 값이 그 토큰의 출처다.
 *    갈아끼울 수가 없다. 그래서 시즌색은 **시즌 기록 화면에만** 쓴다 —
 *    /stats 히어로 글로우, 시즌 드롭다운, 시즌 칭호 뱃지, 프로필 시즌 섹션.
 *    탭바·버튼·홈 히어로 같은 브랜드 면은 팀 핑크 그대로다.
 *
 *    언젠가 globals.css 에 --ud-accent 토큰을 넣고 415곳을 치환하면, 그때 이 값을
 *    루트에 흘려보내는 것만으로 앱 전체를 시즌색으로 돌릴 수 있다.
 */
export interface SeasonAccent {
  /** 라이트 모드. 흰 배경 위 굵은 숫자·아이콘용(본문 텍스트 색으로는 쓰지 않는다). */
  light: string;
  /** 다크 모드. 어두운 배경에서 뜨도록 라이트보다 밝게. */
  dark: string;
}

export interface SeasonDef {
  id: string;
  label: string;
  /**
   * 시즌 시작일(YYYY-MM-DD, 그날 포함). 끝은 다음 시즌의 start 전날이고,
   * 마지막 시즌은 끝이 없다.
   *
   * null 은 "시작 경계 없음" — 이 시즌보다 오래된 경기도 전부 이 시즌으로 본다.
   * 첫 시즌에만 쓴다. 그래야 옛 경기가 어느 시즌에도 안 속해 사라지는 일이 없다.
   */
  start: string | null;
  accent: SeasonAccent;
  /**
   * 시즌 래핑(개인 돌아보기)을 **전체 공개**하는 날(YYYY-MM-DD, 그날 포함).
   *
   * 그 전까지는 운영진만 볼 수 있다 — 시즌이 아직 안 끝났는데 "올 시즌 당신은…" 을
   * 띄우면 김이 샌다. null 이면 영영 운영진 전용(만드는 중인 시즌).
   */
  wrappedFrom?: string | null;
}

/**
 * 시즌 목록. **start 오름차순으로만** 넣는다(seasonOf 가 뒤에서부터 훑는다).
 *
 * 새 시즌을 열 때: 시작일을 확정해 배열 끝에 한 줄 추가. 그 순간부터 그 날짜 이후
 * 경기는 새 시즌으로 집계되고, 이전 시즌 기록은 드롭다운에 그대로 남는다.
 *
 * accent 고르는 규칙 — 핑크 가족 안에서만 고르되 바로 앞 시즌과는 확실히 벌린다.
 * 색상각을 20°쯤 돌리거나 채도를 눈에 띄게 올리고/내린다. 나란히 놓았을 때
 * "같은 색 두 개"로 보이면 시즌 구분이 안 되므로 실패다.
 */
export const SEASONS: readonly SeasonDef[] = [
  // 지금까지 쌓인 경기 전부. start 가 null 이라 첫 경기 날짜가 언제든 여기 들어온다.
  // 색은 현재 팀 핑크 그대로 — 이번 시즌 화면은 지금과 똑같이 보여야 한다.
  {
    id: "2526",
    label: "25-26",
    start: null,
    accent: { light: "#FF8FA3", dark: "#FFB6C1" },
    // 25-26 마지막 경기가 2026-10-31 이라, 시즌이 완전히 닫히는 **다음 날**부터 연다.
    // 그 전에 열면 "올 시즌 당신은…" 을 띄워 놓고 경기가 한 번 더 남아 있게 된다.
    // (그 전까지도 운영진은 볼 수 있다 — app/wrapped/page.tsx 게이트)
    wrappedFrom: "2026-11-01",
  },
  // 확정 — 개막 2026-11-01 (25-26 마지막 경기는 2026-10-31).
  // 로즈 — 25-26 샐먼보다 붉고 채도가 높아 나란히 놓아도 갈린다.
  {
    id: "2627",
    label: "26-27",
    start: "2026-11-01",
    // 마젠타 쪽 핑크. 처음 잡은 #F2547D 는 빨강에 너무 가까웠다 —
    // 25-26 샐먼(349°)과 벌리되 빨강이 아니라 **마젠타**(331°) 로 간다.
    accent: { light: "#FF6FB5", dark: "#FFA3D4" },
    // 아직 시작도 안 한 시즌 — 끝날 때쯤 날짜를 넣는다.
    wrappedFrom: null,
  },
] as const;

/** 마지막(가장 최근) 시즌. */
export const LATEST_SEASON = SEASONS[SEASONS.length - 1];

/** id 로 시즌 정의 찾기. 모르는 id 면 undefined. */
export function seasonById(id: string | null | undefined): SeasonDef | undefined {
  if (!id) return undefined;
  return SEASONS.find((s) => s.id === id);
}

/** 시즌 라벨. 모르는 id 면 id 를 그대로 돌려준다(화면이 빈칸이 되지 않게). */
export function seasonLabel(id: string): string {
  return seasonById(id)?.label ?? id;
}

/** 시즌 대표색. 모르는 id 면 첫 시즌(팀 핑크)으로 떨어진다. */
export function seasonAccent(id: string): SeasonAccent {
  return (seasonById(id) ?? SEASONS[0]).accent;
}

/**
 * 느슨한 날짜 문자열 → "YYYY-MM-DD". 못 읽으면 "".
 * 백엔드는 "2025-08-10" 으로 주지만 옛 시트 유입분에 "2025-8-3" 같은 게 섞여 있다.
 */
export function normalizeDate(raw: string | null | undefined): string {
  const m = String(raw ?? "").trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/**
 * 경기 날짜가 속한 시즌 id. 날짜를 못 읽으면 null.
 *
 * 뒤(최신)에서부터 훑어 start 가 날짜 이하인 첫 시즌을 고른다. start 가 null 인
 * 시즌은 항상 참이므로 첫 시즌이 모든 옛 날짜를 받아낸다.
 */
export function seasonOf(date: string | null | undefined): string | null {
  const d = normalizeDate(date);
  if (!d) return null;
  for (let i = SEASONS.length - 1; i >= 0; i--) {
    const s = SEASONS[i];
    if (s.start === null || d >= s.start) return s.id;
  }
  return null;
}

/**
 * 한국 기준 오늘(YYYY-MM-DD).
 *
 * 경기 날짜는 시각이 아니라 한국의 달력 날짜다. Vercel(UTC)에서 로컬 날짜를 쓰면
 * 한국 시간 오전 9시까지 전날로 계산한다 — [[home-state]] 의 getDDay 와 같은 이유.
 */
export function todayInKst(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA 는 YYYY-MM-DD
}

/** 오늘이 속한 시즌 id. 경기가 한 경기도 없어도 날짜만으로 정해진다. */
export function currentSeasonId(now: Date = new Date()): string {
  return seasonOf(todayInKst(now)) ?? SEASONS[0].id;
}

/**
 * URL 쿼리(?season=)를 시즌 id 로 확정한다. 모르는 값이면 현재 시즌.
 *
 * 개막 직후 경기가 0건이어도 현재 시즌을 그대로 보여 준다(빈 상태 + 지난 시즌 안내).
 * "경기 있는 최신 시즌" 으로 몰래 넘기면 시즌이 바뀐 걸 아무도 눈치채지 못한다.
 */
export function resolveSeasonId(param: string | string[] | undefined, now: Date = new Date()): string {
  const raw = Array.isArray(param) ? param[0] : param;
  return seasonById(raw)?.id ?? currentSeasonId(now);
}

/** "전체"(시즌 구분 없이 다 보기)를 뜻하는 쿼리 값. */
export const ALL_SEASONS = "all";

/**
 * "전체"를 허용하는 시즌 해석. null 이면 전체다.
 *
 * 홈 피드처럼 **비면 안 되는 화면**이 쓴다. /stats 는 새 시즌이 0경기여도 그게
 * 정보이지만, 홈은 팀이 매일 들어오는 곳이라 개막일 아침에 텅 비면 안 된다.
 * 그래서 홈은 기본이 전체이고, 좁혀 보고 싶을 때만 시즌을 고른다.
 */
export function resolveSeasonFilter(param: string | string[] | undefined): string | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (!raw || raw === ALL_SEASONS) return null;
  return seasonById(raw)?.id ?? null;
}

/** 날짜가 그 시즌에 속하는가. */
export function isInSeason(date: string | null | undefined, seasonId: string): boolean {
  return seasonOf(date) === seasonId;
}

/**
 * 오늘 기준 그 시즌의 처지.
 *
 *   past    — 이미 끝난 시즌
 *   current — 지금 진행 중인 시즌
 *   future  — 아직 개막 안 한 시즌 (골라서 볼 수는 있다)
 *
 * "경기가 0건" 과 "아직 개막 전" 은 다른 말이다. 개막 전 시즌에 "기록 없음" 이라고
 * 쓰면 기록이 유실된 것처럼 읽힌다 — 그래서 화면 문구를 이 값으로 가른다.
 */
export function seasonStatus(seasonId: string, now: Date = new Date()): "past" | "current" | "future" {
  const today = todayInKst(now);
  const index = SEASONS.findIndex((s) => s.id === seasonId);
  if (index < 0) return "past";

  const start = SEASONS[index].start;
  if (start !== null && today < start) return "future";

  // 다음 시즌이 이미 시작했으면 이 시즌은 끝난 것이다.
  const next = SEASONS[index + 1];
  if (next?.start && today >= next.start) return "past";
  return "current";
}

/**
 * 시즌 래핑이 전원에게 열렸는가. 아니면 운영진만 볼 수 있다.
 * (운영진 여부는 호출부에서 currentIsAdmin() 으로 따로 본다)
 */
export function isWrappedPublic(seasonId: string, now: Date = new Date()): boolean {
  const from = seasonById(seasonId)?.wrappedFrom;
  if (!from) return false;
  return todayInKst(now) >= from;
}

/**
 * 래핑이 전원에게 열린 시즌 중 가장 최근 것. 없으면 null.
 *
 * /wrapped 와 프로필 진입 버튼의 기본값이다. 현재 시즌을 기본으로 두면 안 된다 —
 * 래핑은 시즌이 **끝난 뒤** 열리므로, 공개일(= 다음 시즌 개막일)부터 현재 시즌은
 * 이미 아직 안 열린 새 시즌이고 막 열린 래핑 대신 404 가 뜬다.
 */
export function latestPublicWrappedSeason(now: Date = new Date()): string | null {
  for (let i = SEASONS.length - 1; i >= 0; i--) {
    if (isWrappedPublic(SEASONS[i].id, now)) return SEASONS[i].id;
  }
  return null;
}

/**
 * 개막까지 남은 날수. 이미 시작했거나 시작일이 없으면 null.
 * 개막일 확정 전의 임시 날짜여도 "며칠 남았다" 자체는 맞는 말이라 그대로 보여 준다.
 */
export function daysUntilSeason(seasonId: string, now: Date = new Date()): number | null {
  const start = seasonById(seasonId)?.start;
  if (!start) return null;
  const today = todayInKst(now);
  if (today >= start) return null;
  const toUtc = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUtc(start) - toUtc(today)) / 86_400_000);
}

/** 개막 카운트다운을 띄우기 시작하는 날수. 한 달 반 — 그보다 이르면 "D-120" 이 오래 떠 있어 무뎌진다. */
export const OPENING_COUNTDOWN_DAYS = 45;

/**
 * 다음 시즌 개막 카운트다운(홈 헤더). 개막 45일 전 ~ 전날까지만 값이 있다.
 * 개막일 당일부터는 null — 그땐 이미 현재 시즌이라 헤더의 시즌 표기가 바뀐다.
 */
export function openingCountdown(
  now: Date = new Date(),
): { seasonId: string; label: string; days: number } | null {
  for (const s of SEASONS) {
    const days = daysUntilSeason(s.id, now);
    if (days !== null && days <= OPENING_COUNTDOWN_DAYS) return { seasonId: s.id, label: s.label, days };
  }
  return null;
}

/**
 * matches 행(헤더 포함, 배열 index = matchId)에서 해당 시즌 경기의 matchId 집합.
 *
 * ⚠️ 행 자체를 걸러내면 안 된다 — 소비처 대부분이 `rawMatches.slice(1).map((r, i) => …)`
 *    의 i 를 matchId 로 쓰고, lineup·mom_vote·attendance 가 그 id 를 참조한다.
 *    시즌은 "어떤 id 를 세느냐" 로만 적용한다.
 */
export function seasonMatchIds(rawMatches: string[][], seasonId: string): Set<number> {
  const ids = new Set<number>();
  rawMatches.slice(1).forEach((row, id) => {
    if (isInSeason(row?.[0], seasonId)) ids.add(id);
  });
  return ids;
}

/**
 * matches 행에서 시즌 밖 경기를 "없던 경기"로 가린다. **배열 길이와 index 는 보존**한다.
 *
 * 왜 지우지 않고 가리나: 어떤 소비처(buildPlayerStatsReport)는 배열 index 를 그대로
 * matchId 로 삼아 경기 상세 링크를 만든다. 행을 지우면 id 가 밀려서 "최근 경기" 를
 * 눌렀을 때 엉뚱한 경기가 열린다.
 *
 * 가린 행은 result 를 "예정" 으로 둔다. 소비처들이 하나같이 예정 경기를 집계에서
 * 빼기 때문에, 명단·득점이 비어 있는 것과 더해 이중으로 안 세어진다.
 */
export function maskMatchRowsToSeason(rawMatches: string[][], seasonId: string): string[][] {
  if (!rawMatches.length) return rawMatches;
  const width = rawMatches[0].length;
  return [
    rawMatches[0],
    ...rawMatches.slice(1).map((row) => {
      if (isInSeason(row?.[0], seasonId)) return row;
      const blank = Array<string>(Math.max(width, 7)).fill("");
      blank[6] = "예정"; // G열 result — 모든 집계가 예정 경기를 뺀다
      return blank;
    }),
  ];
}

/**
 * matchId 를 첫 칸에 들고 있는 행(lineup·attendance_vote·vote_comment·feedback·mom_vote)을
 * 시즌 경기 id 로 거른다. 헤더는 그대로 남긴다.
 */
export function rowsOfMatchIds(rows: string[][], ids: Set<number>): string[][] {
  if (!rows.length) return rows;
  return [rows[0], ...rows.slice(1).filter((r) => ids.has(Number(r?.[0])))];
}

/**
 * 시즌에 경기가 하나라도 있는지 — 드롭다운에서 빈 시즌을 숨길지 판단할 때 쓴다.
 * 현재 시즌은 비어 있어도 항상 보여야 하므로 호출부에서 따로 챙긴다.
 */
export function seasonsWithMatches(rawMatches: string[][]): Set<string> {
  const out = new Set<string>();
  rawMatches.slice(1).forEach((row) => {
    const id = seasonOf(row?.[0]);
    if (id) out.add(id);
  });
  return out;
}

// ───────────────────────── 시즌 등급 컷 ─────────────────────────

/**
 * 통산 등급 컷 → 시즌 등급 컷 자동 축소 비율.
 * 한 시즌 ≈ 24경기, 통산 ≈ 100경기 기준으로 잡았다.
 */
export const SEASON_TIER_FACTOR = 0.25;

/**
 * 통산 등급 컷을 시즌 분량으로 줄인다. ([[titles]] 의 SEASON_TITLES 가 쓴다)
 *
 * 그냥 반올림하면 [1,3,5,10,20] 이 [1,1,1,3,5] 로 뭉개져서, 등급 하나를 달성하는
 * 순간 세 등급이 한꺼번에 붙는다. 항상 1씩은 벌린다.
 */
export function scaleSeasonTiers(tiers: number[]): number[] {
  const out: number[] = [];
  for (const t of tiers) {
    const scaled = Math.max(1, Math.round(t * SEASON_TIER_FACTOR));
    out.push(out.length ? Math.max(scaled, out[out.length - 1] + 1) : scaled);
  }
  return out;
}
