// app/lib/titles.ts
// 칭호(타이틀) 규칙 엔진.
//
// 구조:
//   1) buildContexts(): raw 시트(string[][])를 받아 선수별 PlayerContext로 집계
//   2) TITLES: 칭호 규칙 목록 (등급형 tiers / 달성형 flat)
//   3) evaluatePlayer(): 한 선수의 PlayerContext → 획득한 칭호 목록(현재 등급 포함)
//
// 임계값(숫자)은 전부 TITLES 안에 모여 있고, TITLES_SPEC.md 와 1:1로 대응됩니다.
// 숫자만 바꾸면 등급 컷이 바뀝니다 — 구조/로직은 건드릴 필요 없음.

// ───────────────────────── 타입 ─────────────────────────

export type PosGroup = "GK" | "DF" | "MF" | "FW";

/** 등급 인덱스: 0 루키 · 1 아마추어 · 2 준프로 · 3 프로 (해트트릭 등은 라벨이 다를 수 있음) */
export type TierIndex = 0 | 1 | 2 | 3;

export const TIER_NAMES = ["루키", "아마추어", "준프로", "프로"] as const;

export interface PlayerContext {
  name: string;
  apps: number;
  goals: number;
  assists: number;
  mom: number;
  points: number; // goals + assists

  posCounts: Record<PosGroup, number>;
  posLineupCounts: Record<PosGroup, number>; // 쿼터별 라인업 등장 횟수
  posSlotTotal: number; // GK+DF+MF+FW 출전 슬롯 합 (비율 계산용)
  posGroupsPlayed: number; // DF/MF/FW 중 실제로 뛴 그룹 수
  allFourPositions: boolean;
  fullbackGames: number; // 4백의 좌·우 풀백(p2/p5) 출전 경기 수
  centerbackGames: number; // 3·4·5백의 중앙 수비 출전 경기 수

  hatTricks: number; // 한 경기 3골+ 횟수
  multiGoalGames: number; // 한 경기 2골+ 경기 수
  multiAssistGames: number; // 한 경기 2도움+ 경기 수
  bestSingleGamePoints: number; // 한 경기 골+도움 최고치

  maxOpponentGoals: number; // 한 상대에게 넣은 최다 골

  goalsInRain: number;
  playedRain: boolean;
  playedHeat: boolean; // 30℃+
  playedCold: boolean; // 0℃-

  wins: number; // 출전 경기 중 승
  winRate: number; // 0~1
  bigWinGames: number; // 5골차+ 승리 출전

  playedGK: boolean;
  cleanSheetsAsGK: number; // GK로 무실점한 경기 수

  ironman: boolean; // 한 경기 전 쿼터 출전 경험
  maxAttendStreak: number; // 최대 연속 출석
  maxAbsenceGap: number; // 최대 연속 결장 (리턴 칭호용)
  returnedAfterLongAbsence: boolean; // 과거 출전 → 5경기+ 결장 → 실제 복귀

  isCaptain: boolean;
  captainGames: number;

  votesCast: number;
  commentsCount: number;
  activityPoints: number; // votes + comments*2
  firstVoteCount: number; // 한 경기 최초 투표 횟수
  firstCommentCount: number; // 한 경기 최초 댓글 횟수

  // 히든 칭호용
  isFirstBlood: boolean; // 시즌 첫 경기 득점자
  goalPerGame: number; // 골/출전 비율
  bestDuoAssists: number; // 같은 선수에게 어시스트한 최대 횟수
  posGroupsWithMin3: number; // 3경기+ 경험한 포지션 그룹 수
}

export type TitleCategory =
  | "포지션 커리어"
  | "통산 스탯"
  | "한 경기 폭발"
  | "포지션 특성"
  | "근성 · 출석"
  | "날씨 · 환경"
  | "맞대결 · 승부"
  | "대시보드 활동"
  | "언성히어로 · 반전"
  | "히든"
  | "리더"
  | "특별";

export type TitleState = "live" | "future";

export interface TitleDef {
  id: string;
  name: string;
  icon: string; // lucide kebab 이름 (title-icons.tsx 에서 매핑)
  category: TitleCategory;
  state: TitleState;
  flagship?: boolean; // 커스텀 SVG 대표 칭호 후보
  hidden?: boolean; // 히든 칭호 (도감에 숨김, 달성 시만 표시)
  desc?: string;
  // 등급형
  tiers?: number[]; // 오름차순 임계값
  tierLabels?: string[]; // 기본 TIER_NAMES 대신 쓸 라벨 (예: 해트트릭)
  unit?: string;
  value?: (c: PlayerContext) => number;
  gate?: (c: PlayerContext) => boolean; // 등급형 진입 조건 (예: 캡틴만)
  // 달성형
  flat?: boolean;
  check?: (c: PlayerContext) => boolean;
}

export interface EarnedTitle {
  id: string;
  name: string;
  icon: string;
  category: TitleCategory;
  flagship: boolean;
  tier: TierIndex | null; // null = 달성형(등급 없음)
  tierLabel: string | null;
  desc?: string; // 칭호 설명 (개인 페이지 카드용)
  hidden?: boolean; // 히든 칭호
  stats?: { label: string; value: string }[]; // 개인 페이지 상세 기록
  /** 특수 뱃지 스타일: leader=팀 1위 왕관, manager=감독 전용 */
  variant?: "leader" | "manager";
}

// ───────────────────────── 유틸 ─────────────────────────

/** CSV("이름1, 이름2, 이름1")에서 특정 이름 등장 횟수 */
function countInCsv(csv: string, name: string): number {
  if (!csv) return 0;
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s === name).length;
}

/** CSV를 이름 집합으로 (멀티 구분자 , / 모두 허용) */
function namesOf(csv: string): string[] {
  if (!csv) return [];
  return csv
    .split(/[,/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 포메이션 슬롯 인덱스 → 포지션 그룹 (FormationField getLayerIndex 와 동일 규칙) */
function slotToPos(index: number, formation: string): PosGroup {
  if (index === 0) return "GK";
  const layers = formation.split("-").map(Number).filter((n) => !isNaN(n));
  if (!layers.length) return "MF";
  const totalLayers = layers.length;
  let count = 1;
  let layer = totalLayers;
  for (let i = 0; i < layers.length; i++) {
    if (index < count + layers[i]) {
      layer = i + 1;
      break;
    }
    count += layers[i];
  }
  if (layer === 1) return "DF";
  if (layer === totalLayers) return "FW";
  return "MF";
}

interface WeatherParsed {
  temp: number;
  isRain: boolean;
  available: boolean;
}
function parseWeatherCell(cell: string): WeatherParsed {
  // "28°C,맑음,01d,10"
  if (!cell) return { temp: 0, isRain: false, available: false };
  const parts = cell.split(",");
  if (parts.length < 4) return { temp: 0, isRain: false, available: false };
  const temp = parseInt(parts[0]) || 0;
  const desc = parts[1] || "";
  const icon = parts[2] || "";
  const isRain =
    /비|소나기|뇌우/.test(desc) || /^(09|10|11)/.test(icon);
  return { temp, isRain, available: true };
}

// ───────────────────────── 집계기 ─────────────────────────

export interface RawSheets {
  rawStats: string[][];
  rawMatches: string[][];
  rawLineups: string[][];
  rawRoster: string[][];
  rawAttendanceVotes?: string[][];
  rawVoteComments?: string[][];
  rawFeedbacks?: string[][];
}

interface MatchInfo {
  id: number;
  date: string;
  opponent: string;
  result: string;
  type: string;
  goals: string;
  assists: string;
  attendees: string;
  weather: WeatherParsed;
  ourScore: number;
  theirScore: number;
  isReal: boolean; // 야유회 제외 실제 경기
}

export function buildContexts(sheets: RawSheets): Map<string, PlayerContext> {
  const { rawStats, rawMatches, rawLineups, rawRoster } = sheets;
  const rawVotes = sheets.rawAttendanceVotes ?? [];
  const rawComments = sheets.rawVoteComments ?? [];
  const rawFeedbacks = sheets.rawFeedbacks ?? [];

  // 주장 역할
  const captainRoles: Record<string, string> = {};
  rawRoster.slice(1).forEach((r) => {
    const name = r[1]?.trim();
    const role = r[5]?.trim().toUpperCase();
    if (name && (role === "C" || role === "VC")) captainRoles[name] = role;
  });

  // 경기 정보
  const matches: MatchInfo[] = rawMatches.slice(1).map((r, i) => ({
    id: i,
    date: r[0] || "",
    opponent: (r[3] || "").trim(),
    result: r[6] || "예정",
    type: r[7] || "일반 매칭",
    goals: r[8] || "",
    assists: r[9] || "",
    attendees: r[11] || "",
    weather: parseWeatherCell(r[13] || ""),
    ourScore: parseInt(r[4]) || 0,
    theirScore: parseInt(r[5]) || 0,
    isReal: (r[7] || "일반 매칭") !== "야유회",
  }));
  const matchById = new Map(matches.map((m) => [m.id, m]));

  // 라인업: matchId별 (선수→포지션그룹) + 쿼터 수
  // 한 경기 내 같은 선수가 여러 쿼터에 나오면 posCounts는 "경기당 1회"로 집계 (출전수 = apps 기준 느낌)
  const lineupRows = rawLineups.slice(1).filter((r) => r[0] !== undefined && r[0] !== "");
  // matchId -> Map<name, Set<PosGroup>>
  const matchPlayerPos = new Map<number, Map<string, Set<PosGroup>>>();
  // matchId -> Set<quarterKey> (전체 쿼터)
  const matchQuarters = new Map<number, Set<string>>();
  // matchId -> Map<name, Set<quarterKey>> (선수가 뛴 쿼터)
  const matchPlayerQuarters = new Map<number, Map<string, Set<string>>>();

  lineupRows.forEach((r) => {
    const matchId = Number(r[0]);
    if (isNaN(matchId)) return;
    const quarter = r[1] || "";
    const formation = r[2] || "";
    if (!matchQuarters.has(matchId)) matchQuarters.set(matchId, new Set());
    matchQuarters.get(matchId)!.add(quarter);

    if (!matchPlayerPos.has(matchId)) matchPlayerPos.set(matchId, new Map());
    if (!matchPlayerQuarters.has(matchId)) matchPlayerQuarters.set(matchId, new Map());
    const posMap = matchPlayerPos.get(matchId)!;
    const qMap = matchPlayerQuarters.get(matchId)!;

    // p1..p11 = columns D..N = index 3..13 (슬롯 순서 보존)
    for (let slot = 0; slot < 11; slot++) {
      const name = (r[3 + slot] || "").trim();
      if (!name || name === "미정") continue;
      const pos = slotToPos(slot, formation);
      if (!posMap.has(name)) posMap.set(name, new Set());
      posMap.get(name)!.add(pos);
      if (!qMap.has(name)) qMap.set(name, new Set());
      qMap.get(name)!.add(quarter);
    }
  });

  // 투표/댓글: 닉네임 기준 집계 (roster 이름과 매칭 시도)
  const votesByNick = new Map<string, number>();
  const commentsByNick = new Map<string, number>();
  const firstVoteByNick = new Map<string, number>();
  const firstCommentByNick = new Map<string, number>();

  const tallyFirst = (
    rows: string[][],
    countMap: Map<string, number>,
    firstMap: Map<string, number>
  ) => {
    // matchId -> {nick, ts}[]
    const byMatch = new Map<number, { nick: string; ts: number }[]>();
    rows.slice(1).forEach((r) => {
      if (!r[0]) return;
      const matchId = Number(r[0]);
      const nick = (r[2] || "").trim();
      if (!nick) return;
      countMap.set(nick, (countMap.get(nick) ?? 0) + 1);
      const ts = new Date(r[4] || "").getTime() || 0;
      if (!byMatch.has(matchId)) byMatch.set(matchId, []);
      byMatch.get(matchId)!.push({ nick, ts });
    });
    byMatch.forEach((list) => {
      const withTs = list.filter((x) => x.ts > 0);
      if (!withTs.length) return;
      const earliest = withTs.reduce((a, b) => (b.ts < a.ts ? b : a));
      firstMap.set(earliest.nick, (firstMap.get(earliest.nick) ?? 0) + 1);
    });
  };
  tallyFirst(rawVotes, votesByNick, firstVoteByNick);
  tallyFirst(rawComments, commentsByNick, firstCommentByNick);

  // 피드백(매치카드 댓글)도 수다왕/오프너/활동왕에 합산
  // 피드백 구조: [matchId, timestamp, name, message] — 닉네임이 r[2], 타임스탬프가 r[1]
  {
    const fbByMatch = new Map<number, { nick: string; ts: number }[]>();
    rawFeedbacks.slice(1).forEach((r) => {
      if (!r[0]) return;
      const matchId = Number(r[0]);
      const nick = (r[2] || "").trim();
      if (!nick) return;
      commentsByNick.set(nick, (commentsByNick.get(nick) ?? 0) + 1);
      const ts = new Date(r[1] || "").getTime() || 0;
      if (!fbByMatch.has(matchId)) fbByMatch.set(matchId, []);
      fbByMatch.get(matchId)!.push({ nick, ts });
    });
    fbByMatch.forEach((list) => {
      const withTs = list.filter((x) => x.ts > 0);
      if (!withTs.length) return;
      const earliest = withTs.reduce((a, b) => (b.ts < a.ts ? b : a));
      firstCommentByNick.set(earliest.nick, (firstCommentByNick.get(earliest.nick) ?? 0) + 1);
    });
  }

  // ── 선수별 컨텍스트 빌드 (stats 시트의 선수 = 정식 명단)
  const contexts = new Map<string, PlayerContext>();

  rawStats.slice(1).forEach((row) => {
    const name = (row[1] || "").trim();
    if (!name) return;

    const apps = Number(row[3]) || 0;
    const goals = Number(row[4]) || 0;
    const assists = Number(row[5]) || 0;
    const mom = Number(row[6]) || 0;

    // 포지션 집계 (경기별로 그 선수가 뛴 포지션 그룹을 합산)
    const posCounts: Record<PosGroup, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
    const posLineupCounts: Record<PosGroup, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
    matchPlayerPos.forEach((posMap) => {
      const set = posMap.get(name);
      if (set) set.forEach((p) => (posCounts[p] += 1));
    });
    lineupRows.forEach((r) => {
      const formation = r[2] || "";
      for (let slot = 0; slot < 11; slot++) {
        if ((r[3 + slot] || "").trim() === name) {
          posLineupCounts[slotToPos(slot, formation)] += 1;
        }
      }
    });
    const posSlotTotal = posCounts.GK + posCounts.DF + posCounts.MF + posCounts.FW;
    const outfieldGroups = (["DF", "MF", "FW"] as PosGroup[]).filter((g) => posCounts[g] > 0);
    const allFourPositions =
      posCounts.GK > 0 && posCounts.DF > 0 && posCounts.MF > 0 && posCounts.FW > 0;
    const fullbackMatchIds = new Set<number>();
    lineupRows.forEach((r) => {
      const matchId = Number(r[0]);
      const firstLayer = Number((r[2] || "").split("-")[0]);
      if (isNaN(matchId) || firstLayer !== 4) return;
      if ((r[4] || "").trim() === name || (r[7] || "").trim() === name) {
        fullbackMatchIds.add(matchId);
      }
    });
    const fullbackGames = fullbackMatchIds.size;
    const centerbackMatchIds = new Set<number>();
    lineupRows.forEach((r) => {
      const matchId = Number(r[0]);
      const firstLayer = Number((r[2] || "").split("-")[0]);
      if (isNaN(matchId)) return;
      const centerbackSlots =
        firstLayer === 3 ? [1, 2, 3]
        : firstLayer === 4 ? [2, 3]
        : firstLayer === 5 ? [2, 3, 4]
        : [];
      if (centerbackSlots.some((slot) => (r[3 + slot] || "").trim() === name)) {
        centerbackMatchIds.add(matchId);
      }
    });
    const centerbackGames = centerbackMatchIds.size;

    // 매치 순회 집계
    let hatTricks = 0;
    let multiGoalGames = 0;
    let multiAssistGames = 0;
    let bestSingleGamePoints = 0;
    let goalsInRain = 0;
    let playedRain = false;
    let playedHeat = false;
    let playedCold = false;
    let wins = 0;
    let playedReal = 0;
    let bigWinGames = 0;
    let cleanSheetsAsGK = 0;
    let ironman = false;
    const goalsByOpp = new Map<string, number>();

    const participatedDates: { date: string; played: boolean }[] = [];
    const completedParticipation: { date: string; played: boolean }[] = [];

    matches.forEach((m) => {
      const g = countInCsv(m.goals, name);
      const a = countInCsv(m.assists, name);
      if (g >= 3) hatTricks += 1;
      if (g >= 2) multiGoalGames += 1;
      if (a >= 2) multiAssistGames += 1;
      if (g + a > bestSingleGamePoints) bestSingleGamePoints = g + a;
      if (g > 0 && m.opponent) {
        goalsByOpp.set(m.opponent, (goalsByOpp.get(m.opponent) ?? 0) + g);
      }

      // 참가 여부: 출석 명단 또는 라인업 등장
      const inAttendees = namesOf(m.attendees).includes(name);
      const inLineup = matchPlayerPos.get(m.id)?.has(name) ?? false;
      const played = inAttendees || inLineup;

      if (m.isReal) participatedDates.push({ date: m.date, played });
      if (m.isReal && m.result !== "예정") {
        completedParticipation.push({ date: m.date, played });
      }

      if (played && m.isReal) {
        playedReal += 1;
        if (m.result === "승") wins += 1;
        if (m.result === "승" && m.ourScore - m.theirScore >= 5) bigWinGames += 1;
        if (m.weather.available) {
          if (m.weather.isRain) playedRain = true;
          if (m.weather.temp >= 30) playedHeat = true;
          if (m.weather.temp <= 0) playedCold = true;
        }
        if (g > 0 && m.weather.available && m.weather.isRain) goalsInRain += g;
      }

      // GK 무실점
      const pos = matchPlayerPos.get(m.id)?.get(name);
      if (pos?.has("GK") && m.theirScore === 0 && m.result !== "예정") {
        cleanSheetsAsGK += 1;
      }

      // 아이언맨: 그 경기 전 쿼터 출전
      const totalQ = matchQuarters.get(m.id)?.size ?? 0;
      const myQ = matchPlayerQuarters.get(m.id)?.get(name)?.size ?? 0;
      if (totalQ >= 2 && myQ === totalQ) ironman = true;
    });

    const maxOpponentGoals = goalsByOpp.size
      ? Math.max(...Array.from(goalsByOpp.values()))
      : 0;

    // 연속 출석 / 결장 (날짜 오름차순)
    participatedDates.sort(
      (x, y) => new Date(x.date).getTime() - new Date(y.date).getTime()
    );
    let maxAttendStreak = 0;
    let curStreak = 0;
    let maxAbsenceGap = 0;
    let curGap = 0;
    participatedDates.forEach((d) => {
      if (d.played) {
        curStreak += 1;
        maxAttendStreak = Math.max(maxAttendStreak, curStreak);
        curGap = 0;
      } else {
        curGap += 1;
        maxAbsenceGap = Math.max(maxAbsenceGap, curGap);
        curStreak = 0;
      }
    });

    // 첫 출전 전 공백과 마지막 출전 후 공백은 '복귀'가 아니다.
    completedParticipation.sort(
      (x, y) => new Date(x.date).getTime() - new Date(y.date).getTime()
    );
    let hasPlayedBefore = false;
    let absenceAfterPlaying = 0;
    let returnedAfterLongAbsence = false;
    completedParticipation.forEach((d) => {
      if (d.played) {
        if (hasPlayedBefore && absenceAfterPlaying >= 5) {
          returnedAfterLongAbsence = true;
        }
        hasPlayedBefore = true;
        absenceAfterPlaying = 0;
      } else if (hasPlayedBefore) {
        absenceAfterPlaying += 1;
      }
    });

    const isCaptain = captainRoles[name] === "C";
    const captainGames = isCaptain ? playedReal : 0;

    const votesCast = votesByNick.get(name) ?? 0;
    const commentsCount = commentsByNick.get(name) ?? 0;
    const firstVoteCount = firstVoteByNick.get(name) ?? 0;
    const firstCommentCount = firstCommentByNick.get(name) ?? 0;

    // 히든: 퍼스트 블러드 — 개인의 첫 경기(데뷔전)에서 득점했는가
    const firstPlayedMatch = matches.find((m) => {
      if (!m.isReal || m.result === "예정") return false;
      const inAttendees = namesOf(m.attendees).includes(name);
      const inLineup = matchPlayerPos.get(m.id)?.has(name) ?? false;
      return inAttendees || inLineup;
    });
    const isFirstBlood = firstPlayedMatch ? countInCsv(firstPlayedMatch.goals, name) > 0 : false;

    // 히든: 레이저 — 경기당 1골 이상 (골 > 출전, 최소 5경기)
    const goalPerGame = apps > 0 ? goals / apps : 0;

    // 히든: 찰떡궁합 — 같은 골잡이에게 어시스트한 최대 횟수
    const duoAssistMap = new Map<string, number>();
    matches.forEach((m) => {
      const goalList = (m.goals || "").split(",").map((s) => s.trim());
      const assistList = (m.assists || "").split(",").map((s) => s.trim());
      goalList.forEach((scorer, i) => {
        const assister = assistList[i]?.trim();
        if (assister === name && scorer) {
          duoAssistMap.set(scorer, (duoAssistMap.get(scorer) ?? 0) + 1);
        }
      });
    });
    const bestDuoAssists = duoAssistMap.size ? Math.max(...Array.from(duoAssistMap.values())) : 0;

    // 히든: 변신의 귀재 — 3개+ 포지션 각 3경기 이상
    const posGroupsWithMin3 = (["GK", "DF", "MF", "FW"] as PosGroup[]).filter((g) => posCounts[g] >= 3).length;

    contexts.set(name, {
      name,
      apps,
      goals,
      assists,
      mom,
      points: goals + assists,
      posCounts,
      posLineupCounts,
      posSlotTotal,
      posGroupsPlayed: outfieldGroups.length,
      allFourPositions,
      fullbackGames,
      centerbackGames,
      hatTricks,
      multiGoalGames,
      multiAssistGames,
      bestSingleGamePoints,
      maxOpponentGoals,
      goalsInRain,
      playedRain,
      playedHeat,
      playedCold,
      wins,
      winRate: playedReal ? wins / playedReal : 0,
      bigWinGames,
      playedGK: posCounts.GK > 0,
      cleanSheetsAsGK,
      ironman,
      maxAttendStreak,
      maxAbsenceGap,
      returnedAfterLongAbsence,
      isCaptain,
      captainGames,
      votesCast,
      commentsCount,
      activityPoints: votesCast + commentsCount * 2,
      firstVoteCount,
      firstCommentCount,
      isFirstBlood,
      goalPerGame,
      bestDuoAssists,
      posGroupsWithMin3,
    });
  });

  void matchById; // (향후 확장용)
  return contexts;
}

// ───────────────────────── 규칙 목록 ─────────────────────────
// ⚠️ 숫자(tiers/임계값)는 제안값입니다. TITLES_SPEC.md 에서 조정하세요.

const ratio = (part: number, total: number) => (total > 0 ? part / total : 0);

export const TITLES: TitleDef[] = [
  // ── 포지션 커리어 (출전수 등급)
  { id: "career_gk", name: "골키퍼", icon: "hand", category: "포지션 커리어", state: "live", flagship: true, desc: "GK 출전 누적", tiers: [10, 20, 30, 40], unit: "경기", value: (c) => c.posCounts.GK },
  { id: "career_df", name: "수비수", icon: "shield-check", category: "포지션 커리어", state: "live", desc: "DF 출전 누적", tiers: [10, 20, 30, 40], unit: "경기", value: (c) => c.posCounts.DF },
  { id: "career_mf", name: "미드필더", icon: "footprints", category: "포지션 커리어", state: "live", desc: "MF 출전 누적", tiers: [10, 20, 30, 40], unit: "경기", value: (c) => c.posCounts.MF },
  { id: "career_fw", name: "공격수", icon: "goal", category: "포지션 커리어", state: "live", desc: "FW 출전 누적", tiers: [10, 20, 30, 40], unit: "경기", value: (c) => c.posCounts.FW },

  // ── 통산 스탯
  { id: "scorer", name: "골게터", icon: "volleyball", category: "통산 스탯", state: "live", flagship: true, desc: "통산 득점", tiers: [5, 15, 30, 50], unit: "골", value: (c) => c.goals },
  { id: "playmaker", name: "플레이메이커", icon: "spline", category: "통산 스탯", state: "live", desc: "통산 도움", tiers: [5, 15, 30, 50], unit: "어시", value: (c) => c.assists },
  { id: "mvp", name: "미스터 MVP", icon: "crown", category: "통산 스탯", state: "live", flagship: true, desc: "MOM 선정", tiers: [3, 7, 15, 30], unit: "회", value: (c) => c.mom },
  { id: "ironman_apps", name: "철인", icon: "calendar-check", category: "통산 스탯", state: "live", desc: "통산 출전", tiers: [10, 25, 50, 100], unit: "경기", value: (c) => c.apps },
  { id: "points", name: "공격포인트", icon: "trending-up", category: "통산 스탯", state: "live", desc: "골+도움", tiers: [10, 30, 60, 100], unit: "P", value: (c) => c.points },

  // ── 한 경기 폭발
  { id: "hattrick", name: "해트트릭 영웅", icon: "party-popper", category: "한 경기 폭발", state: "live", flagship: true, desc: "한 경기 3골+ 횟수", tiers: [1, 3, 5], tierLabels: ["첫 해트트릭", "3회", "5회"], unit: "회", value: (c) => c.hatTricks },
  { id: "multigoal", name: "멀티골 사냥꾼", icon: "crosshair", category: "한 경기 폭발", state: "live", desc: "2골+ 경기 수", tiers: [3, 7, 15], unit: "경기", value: (c) => c.multiGoalGames },
  { id: "multiassist", name: "멀티어시", icon: "git-fork", category: "한 경기 폭발", state: "live", desc: "2도움+ 경기 수", tiers: [3, 7, 15], unit: "경기", value: (c) => c.multiAssistGames },
  { id: "onemanshow", name: "원맨쇼", icon: "star", category: "한 경기 폭발", state: "live", flat: true, desc: "한 경기 골+도움 4 이상", check: (c) => c.bestSingleGamePoints >= 4 },

  // ── 포지션 특성
  { id: "multiplayer", name: "멀티플레이어", icon: "shuffle", category: "포지션 특성", state: "live", flagship: true, flat: true, desc: "2개 포지션+ & 10경기+", check: (c) => c.posGroupsPlayed >= 2 && c.apps >= 10 },
  { id: "utility", name: "만능 유틸리티", icon: "boxes", category: "포지션 특성", state: "live", flagship: true, flat: true, desc: "전 포지션 경험", check: (c) => c.allFourPositions },
  { id: "concrete", name: "콘크리트", icon: "brick-wall", category: "포지션 특성", state: "live", flat: true, desc: "DF 15경기+ & 출전 비율 80%+", check: (c) => c.posCounts.DF >= 15 && ratio(c.posCounts.DF, c.posSlotTotal) >= 0.8 },
  { id: "fox", name: "폭스 인 더 박스", icon: "target", category: "포지션 특성", state: "live", flat: true, desc: "FW 10경기+ & 득점 5+", check: (c) => c.posCounts.FW >= 10 && c.goals >= 5 },
  { id: "box2box", name: "박스 투 박스", icon: "footprints", category: "포지션 특성", state: "live", flat: true, desc: "MF 15경기+ & 3골·3도움+", check: (c) => c.posCounts.MF >= 15 && c.goals >= 3 && c.assists >= 3 },
  { id: "lastman", name: "라스트맨", icon: "hand", category: "포지션 특성", state: "live", flat: true, desc: "GK 1경기+", check: (c) => c.playedGK },
  { id: "sweeperkeeper", name: "스위퍼 키퍼", icon: "hand-metal", category: "포지션 특성", state: "live", flat: true, desc: "GK 경험 & 도움 보유", check: (c) => c.playedGK && c.assists >= 1 },
  { id: "attacking_fullback", name: "공격적인 윙백", icon: "trending-up", category: "포지션 특성", state: "live", flat: true, desc: "좌·우 풀백 10경기+ & 공격P 10+", check: (c) => c.fullbackGames >= 10 && c.points >= 10 },
  { id: "attacking_centerback", name: "공격적인 센터백", icon: "shield-check", category: "포지션 특성", state: "live", flat: true, desc: "센터백 10경기+ & 공격P 8+", check: (c) => c.centerbackGames >= 10 && c.points >= 8 },

  // ── 근성 · 출석
  { id: "streak", name: "연속출석", icon: "flame", category: "근성 · 출석", state: "live", flagship: true, desc: "최대 연속 참석", tiers: [3, 5, 10], unit: "연속", value: (c) => c.maxAttendStreak },
  { id: "ironman_q", name: "아이언맨", icon: "battery-full", category: "근성 · 출석", state: "live", flat: true, desc: "한 경기 전 쿼터 출전", check: (c) => c.ironman },
  { id: "captain", name: "캡틴", icon: "badge-check", category: "근성 · 출석", state: "live", desc: "주장으로 출전", tiers: [5, 15, 30], unit: "경기", gate: (c) => c.isCaptain, value: (c) => c.captainGames },
  { id: "rookie", name: "새내기", icon: "sprout", category: "근성 · 출석", state: "live", flat: true, desc: "통산 출전 3경기 미만", check: (c) => c.apps > 0 && c.apps < 3 },
  { id: "return", name: "리턴 오브 더 킹", icon: "rotate-ccw", category: "근성 · 출석", state: "future", flat: true, desc: "기존 출전자가 5경기 이상 결장 후 복귀", check: (c) => c.returnedAfterLongAbsence },

  // ── 날씨 · 환경
  { id: "rain_scorer", name: "수중전 골잡이", icon: "cloud-rain", category: "날씨 · 환경", state: "future", flagship: true, flat: true, desc: "비 오는 날 득점", check: (c) => c.goalsInRain >= 1 },
  { id: "rain_warrior", name: "빗속의 전사", icon: "umbrella", category: "날씨 · 환경", state: "future", flat: true, desc: "비 오는 날 출전", check: (c) => c.playedRain },
  { id: "heat", name: "폭염 전사", icon: "sun", category: "날씨 · 환경", state: "future", flat: true, desc: "30℃+ 경기 출전", check: (c) => c.playedHeat },
  { id: "cold", name: "한파 전사", icon: "snowflake", category: "날씨 · 환경", state: "future", flat: true, desc: "0℃- 경기 출전", check: (c) => c.playedCold },
  { id: "allweather", name: "악천후 마스터", icon: "cloud-lightning", category: "날씨 · 환경", state: "future", flat: true, desc: "비·폭염·한파 모두 경험", check: (c) => c.playedRain && c.playedHeat && c.playedCold },

  // ── 맞대결 · 승부
  { id: "nemesis", name: "천적 킬러", icon: "swords", category: "맞대결 · 승부", state: "live", flagship: true, flat: true, desc: "한 상대 3골+", check: (c) => c.maxOpponentGoals >= 3 },
  { id: "cleansheet", name: "무실점 수문장", icon: "lock", category: "맞대결 · 승부", state: "live", desc: "GK 무실점 경기", tiers: [1, 3, 5, 10], unit: "경기", gate: (c) => c.playedGK, value: (c) => c.cleanSheetsAsGK },
  { id: "bigwin", name: "대승의 주역", icon: "rocket", category: "맞대결 · 승부", state: "live", flat: true, desc: "5골차+ 승리 출전", check: (c) => c.bigWinGames >= 1 },
  { id: "winfairy", name: "승리요정", icon: "sparkles", category: "맞대결 · 승부", state: "live", desc: "출전 경기 승수", tiers: [5, 15, 30], unit: "승", value: (c) => c.wins },
  { id: "invincible", name: "천하무적", icon: "trophy", category: "맞대결 · 승부", state: "live", flat: true, desc: "10경기+ & 승률 70%+", check: (c) => c.apps >= 10 && c.winRate >= 0.7 },

  // ── 대시보드 활동
  { id: "voter", name: "투표러", icon: "vote", category: "대시보드 활동", state: "live", desc: "출석 투표 참여", tiers: [5, 15, 30], unit: "회", value: (c) => c.votesCast },
  { id: "chatter", name: "수다왕", icon: "message-circle", category: "대시보드 활동", state: "live", flagship: true, desc: "댓글 작성", tiers: [5, 15, 30], unit: "개", value: (c) => c.commentsCount },
  { id: "earlybird", name: "얼리버드", icon: "alarm-clock", category: "대시보드 활동", state: "live", flat: true, desc: "최초 투표 3회+", check: (c) => c.firstVoteCount >= 3 },
  { id: "activeking", name: "활동왕", icon: "activity", category: "대시보드 활동", state: "live", desc: "투표+댓글 종합", tiers: [20, 50, 100], unit: "P", value: (c) => c.activityPoints },
  { id: "opener", name: "오프너", icon: "message-square-plus", category: "대시보드 활동", state: "live", flat: true, desc: "첫 댓글 3회+", check: (c) => c.firstCommentCount >= 3 },

  // ── 언성히어로 · 반전
  { id: "unsung", name: "언성 히어로", icon: "heart-handshake", category: "언성히어로 · 반전", state: "live", flagship: true, flat: true, desc: "출전 15+ 인데 공격P 0", check: (c) => c.apps >= 15 && c.points === 0 },
  { id: "devotion", name: "헌신왕", icon: "handshake", category: "언성히어로 · 반전", state: "live", flat: true, desc: "도움>골 & 도움 5+", check: (c) => c.assists > c.goals && c.assists >= 5 },
  { id: "onehit", name: "한방 있는 남자", icon: "zap", category: "언성히어로 · 반전", state: "live", flat: true, desc: "5경기 미만인데 득점", check: (c) => c.apps > 0 && c.apps < 5 && c.goals >= 1 },
  { id: "loyalty", name: "꾸준함의 미학", icon: "infinity", category: "언성히어로 · 반전", state: "live", flat: true, desc: "공격P 0 & 출전 30+", check: (c) => c.points === 0 && c.apps >= 30 },

  // ── 히든 칭호
  { id: "firstblood", name: "퍼스트 블러드", icon: "sword", category: "히든", state: "live", hidden: true, flat: true, desc: "데뷔전 득점자", check: (c) => c.isFirstBlood },
  { id: "laser", name: "레이저", icon: "crosshair", category: "히든", state: "live", hidden: true, flat: true, desc: "경기당 1골 이상 (최소 5경기)", check: (c) => c.apps >= 5 && c.goalPerGame >= 1 },
  { id: "duo", name: "찰떡궁합", icon: "heart-handshake", category: "히든", state: "live", hidden: true, flat: true, desc: "같은 선수에게 3회+ 어시스트", check: (c) => c.bestDuoAssists >= 3 },
  { id: "overlap_machine", name: "오버래핑 머신", icon: "rocket", category: "히든", state: "live", hidden: true, flat: true, desc: "풀백 20경기+ & 도움 7+", check: (c) => c.fullbackGames >= 20 && c.assists >= 7 },
  { id: "setpiece_nightmare", name: "세트피스의 악몽", icon: "crosshair", category: "히든", state: "live", hidden: true, flat: true, desc: "센터백 20경기+ & 득점 5+", check: (c) => c.centerbackGames >= 20 && c.goals >= 5 },
  { id: "false_nine", name: "가짜 9번", icon: "shuffle", category: "히든", state: "live", hidden: true, flat: true, desc: "FW·MF 각 20경기+ & 도움 5+", check: (c) => c.posCounts.FW >= 20 && c.posCounts.MF >= 20 && c.assists >= 5 },
  { id: "libero", name: "리베로", icon: "spline", category: "히든", state: "live", hidden: true, flat: true, desc: "센터백·MF 각 15경기+ & 공격P 8+", check: (c) => c.centerbackGames >= 15 && c.posCounts.MF >= 15 && c.points >= 8 },
  { id: "shapeshifter", name: "포지션 파괴자", icon: "boxes", category: "히든", state: "live", hidden: true, flat: true, desc: "GK·DF·MF·FW 각 3경기+", check: (c) => c.posGroupsWithMin3 >= 4 },
  { id: "underduck_cafu", name: "언더덕의 카푸", icon: "zap", category: "히든", state: "live", hidden: true, flat: true, desc: "풀백 20경기+ & 공격P 15+", check: (c) => c.fullbackGames >= 20 && c.points >= 15 },
  { id: "scoring_wall", name: "벽이 골도 넣네", icon: "brick-wall", category: "히든", state: "live", hidden: true, flat: true, desc: "센터백 15경기+ & 공격P 10+", check: (c) => c.centerbackGames >= 15 && c.points >= 10 },
  { id: "football_master", name: "축구 도사", icon: "sparkles", category: "히든", state: "live", hidden: true, flat: true, desc: "3개 포지션 각 10경기+ & 공격P 20+", check: (c) => Object.values(c.posCounts).filter((count) => count >= 10).length >= 3 && c.points >= 20 },
];

// ───────────────────────── 평가 ─────────────────────────

/** 등급형: 현재 값에 해당하는 최고 등급 인덱스 (미달이면 null) */
function tierForValue(value: number, tiers: number[]): TierIndex | null {
  let earned: TierIndex | null = null;
  for (let i = 0; i < tiers.length; i++) {
    if (value >= tiers[i]) earned = i as TierIndex;
  }
  return earned;
}

function achievementStats(id: string, c: PlayerContext): { label: string; value: string }[] {
  const positionStats = [
    { label: "GK", value: `${c.posCounts.GK}경기` },
    { label: "DF", value: `${c.posCounts.DF}경기` },
    { label: "MF", value: `${c.posCounts.MF}경기` },
    { label: "FW", value: `${c.posCounts.FW}경기` },
  ];
  switch (id) {
    case "multiplayer": return positionStats.slice(1);
    case "utility":
    case "shapeshifter": return positionStats;
    case "concrete": return [{ label: "DF 출전", value: `${c.posCounts.DF}경기` }, { label: "DF 비율", value: `${Math.round(ratio(c.posCounts.DF, c.posSlotTotal) * 100)}%` }];
    case "fox": return [{ label: "FW 출전", value: `${c.posCounts.FW}경기` }, { label: "득점", value: `${c.goals}골` }];
    case "box2box": return [{ label: "MF 출전", value: `${c.posCounts.MF}경기` }, { label: "공격 기록", value: `${c.goals}골 · ${c.assists}도움` }];
    case "lastman": return [{ label: "GK 출전", value: `${c.posCounts.GK}경기` }];
    case "sweeperkeeper": return [{ label: "GK 출전", value: `${c.posCounts.GK}경기` }, { label: "도움", value: `${c.assists}개` }];
    case "attacking_fullback":
    case "overlap_machine":
    case "underduck_cafu": return [{ label: "풀백 출전", value: `${c.fullbackGames}경기` }, { label: "공격 기록", value: `${c.goals}골 · ${c.assists}도움` }];
    case "attacking_centerback":
    case "libero":
    case "scoring_wall": return [{ label: "센터백 출전", value: `${c.centerbackGames}경기` }, { label: "공격포인트", value: `${c.points}P` }];
    case "setpiece_nightmare": return [{ label: "센터백 출전", value: `${c.centerbackGames}경기` }, { label: "득점", value: `${c.goals}골` }];
    case "false_nine": return [{ label: "FW · MF", value: `${c.posCounts.FW} · ${c.posCounts.MF}경기` }, { label: "도움", value: `${c.assists}개` }];
    case "football_master": return [...positionStats, { label: "공격포인트", value: `${c.points}P` }];
    case "unsung":
    case "loyalty": return [{ label: "출전", value: `${c.apps}경기` }, { label: "공격포인트", value: `${c.points}P` }];
    case "devotion": return [{ label: "득점", value: `${c.goals}골` }, { label: "도움", value: `${c.assists}개` }];
    case "onehit": return [{ label: "출전", value: `${c.apps}경기` }, { label: "득점", value: `${c.goals}골` }];
    case "invincible": return [{ label: "출전", value: `${c.apps}경기` }, { label: "승률", value: `${Math.round(c.winRate * 100)}%` }];
    case "firstblood": return [{ label: "데뷔전", value: "득점 성공" }];
    case "laser": return [{ label: "출전", value: `${c.apps}경기` }, { label: "경기당 득점", value: c.goalPerGame.toFixed(2) }];
    case "duo": return [{ label: "최다 호흡", value: `${c.bestDuoAssists}도움` }];
    default: return [{ label: "출전", value: `${c.apps}경기` }, { label: "공격 기록", value: `${c.goals}골 · ${c.assists}도움` }];
  }
}

export function evaluatePlayer(c: PlayerContext, defs: TitleDef[] = TITLES): EarnedTitle[] {
  const out: EarnedTitle[] = [];
  for (const d of defs) {
    if (d.flat) {
      if (d.check?.(c)) {
        out.push({ id: d.id, name: d.name, icon: d.icon, category: d.category, flagship: !!d.flagship, tier: null, tierLabel: null, desc: d.desc, hidden: !!d.hidden, stats: achievementStats(d.id, c) });
      }
      continue;
    }
    if (d.tiers && d.value) {
      if (d.gate && !d.gate(c)) continue;
      const tier = tierForValue(d.value(c), d.tiers);
      if (tier !== null) {
        const labels = d.tierLabels ?? TIER_NAMES;
        const value = d.value(c);
        out.push({ id: d.id, name: d.name, icon: d.icon, category: d.category, flagship: !!d.flagship, tier, tierLabel: labels[tier] ?? `Lv${tier + 1}`, desc: d.desc, hidden: !!d.hidden, stats: [{ label: "현재 기록", value: `${value}${d.unit ?? ""}` }] });
      }
    }
  }
  return out;
}

// ───────────────────────── 리더(최다 1위) 칭호 ─────────────────────────
// 임계값이 아니라 "팀 내 1위"에게만 주는 왕관형. 동률이면 공동 수여.

export interface LeaderDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  value: (c: PlayerContext) => number;
  min: number; // 이 값 미만이면 아무에게도 안 줌 (예: 0골 1위는 무의미)
}

export const LEADER_TITLES: LeaderDef[] = [
  { id: "lead_apps", name: "최다 출전", icon: "medal", desc: "팀 내 최다 출전", value: (c) => c.apps, min: 1 },
  { id: "lead_goals", name: "득점왕", icon: "crown", desc: "팀 내 최다 득점", value: (c) => c.goals, min: 1 },
  { id: "lead_assists", name: "도움왕", icon: "award", desc: "팀 내 최다 도움", value: (c) => c.assists, min: 1 },
  { id: "lead_points", name: "공격포인트왕", icon: "trophy", desc: "팀 내 최다 공격포인트", value: (c) => c.points, min: 1 },
  { id: "lead_cleansheet", name: "클린시트왕", icon: "shield-check", desc: "팀 내 최다 클린시트", value: (c) => c.cleanSheetsAsGK, min: 1 },
];

/** 전체 선수를 비교해 각 부문 1위(동률 공동)에게 리더 칭호 수여 → 선수명별 목록 */
export function evaluateLeaders(contexts: Map<string, PlayerContext>): Map<string, EarnedTitle[]> {
  const result = new Map<string, EarnedTitle[]>();
  const list = Array.from(contexts.values());
  for (const def of LEADER_TITLES) {
    let max = 0;
    for (const c of list) max = Math.max(max, def.value(c));
    if (max < def.min) continue;
    for (const c of list) {
      if (def.value(c) !== max) continue;
      const arr = result.get(c.name) ?? [];
      arr.push({ id: def.id, name: def.name, icon: def.icon, category: "리더", flagship: true, tier: null, tierLabel: null, desc: def.desc, variant: "leader", stats: [{ label: "팀 내 1위 기록", value: String(def.value(c)) }] });
      result.set(c.name, arr);
    }
  }
  return result;
}

// ───────────────────────── 감독(특별) 칭호 ─────────────────────────

export const MANAGER_NAME = "금상덕";

export function managerTitle(): EarnedTitle {
  return { id: "manager", name: "감독", icon: "clipboard-list", category: "특별", flagship: true, tier: null, tierLabel: null, desc: "팀을 이끄는 감독", variant: "manager" };
}

// ───────────────────────── 케미 · 관계 + 베스트 경기 ─────────────────────────
// 선수 개인 페이지용. 골/도움 CSV는 같은 index끼리 짝(득점자[i] ↔ 어시스트[i]).

export interface RelationTop {
  names: string[]; // 동률이면 여러 명 (가나다순)
  count: number;
}

export interface BestGame {
  matchId: number;
  opponent: string;
  date: string;
  goals: number;
  assists: number;
  points: number; // 골+도움
  isMom: boolean;
}

export interface PlayerRelations {
  mostPlayedWith: RelationTop | null; // 라인업 동시 출전 최다 동료
  assistRecipients: RelationTop | null; // 내 도움을 가장 많이 받은 득점자
  assistGivers: RelationTop | null; // 나를 가장 많이 살린 도우미
  bestDuo: RelationTop | null; // 양방향 합작 골 최다 파트너 (내 도움 + 받은 도움)
  bestGame: BestGame | null;
}

function topOfMap(m: Map<string, number>): RelationTop | null {
  if (!m.size) return null;
  const max = Math.max(...Array.from(m.values()));
  if (max <= 0) return null;
  const names = Array.from(m.entries())
    .filter(([, v]) => v === max)
    .map(([k]) => k)
    .sort((a, b) => a.localeCompare(b, "ko"));
  return { names, count: max };
}

export function buildPlayerRelations(
  name: string,
  rawMatches: string[][],
  rawLineups: string[][]
): PlayerRelations {
  const matches = rawMatches.slice(1).map((r, i) => ({
    id: i,
    date: r[0] || "",
    opponent: (r[3] || "").trim(),
    result: r[6] || "예정",
    goals: r[8] || "",
    assists: r[9] || "",
    mom: (r[10] || "").trim(),
    isReal: (r[7] || "일반 매칭") !== "야유회",
  }));

  // 같이 뛴 동료: 경기별 라인업에 동시 등장한 횟수(경기 단위)
  const matchTeammates = new Map<number, Set<string>>();
  rawLineups.slice(1).forEach((r) => {
    const matchId = Number(r[0]);
    if (isNaN(matchId)) return;
    if (!matchTeammates.has(matchId)) matchTeammates.set(matchId, new Set());
    const set = matchTeammates.get(matchId)!;
    for (let slot = 0; slot < 11; slot++) {
      const n = (r[3 + slot] || "").trim();
      if (n && n !== "미정") set.add(n);
    }
  });
  const coPlay = new Map<string, number>();
  matchTeammates.forEach((set) => {
    if (!set.has(name)) return;
    set.forEach((n) => {
      if (n !== name) coPlay.set(n, (coPlay.get(n) ?? 0) + 1);
    });
  });

  // 어시 관계: 득점자[i] ↔ 어시스트[i]
  const recipients = new Map<string, number>(); // 내가 어시 → 그 득점자
  const givers = new Map<string, number>(); // 내가 득점 ← 그 어시스트
  matches.forEach((m) => {
    const goalList = m.goals.split(",").map((s) => s.trim());
    const assistList = m.assists.split(",").map((s) => s.trim());
    goalList.forEach((scorer, i) => {
      if (!scorer) return;
      const assister = assistList[i]?.trim() || "";
      if (assister === name && scorer !== name) {
        recipients.set(scorer, (recipients.get(scorer) ?? 0) + 1);
      }
      if (scorer === name && assister && assister !== name) {
        givers.set(assister, (givers.get(assister) ?? 0) + 1);
      }
    });
  });

  // 베스트 경기: 공격포인트 최다 (동점이면 MOM 경기 > 골 많은 경기 우선)
  let bestGame: BestGame | null = null;
  matches.forEach((m) => {
    if (!m.isReal || m.result === "예정") return;
    const goals = countInCsv(m.goals, name);
    const assists = countInCsv(m.assists, name);
    const points = goals + assists;
    if (points <= 0) return;
    const isMom = m.mom === name;
    const better =
      !bestGame ||
      points > bestGame.points ||
      (points === bestGame.points && isMom && !bestGame.isMom) ||
      (points === bestGame.points && isMom === bestGame.isMom && goals > bestGame.goals);
    if (better) {
      bestGame = {
        matchId: m.id,
        opponent: m.opponent || "상대 미정",
        date: m.date,
        goals,
        assists,
        points,
        isMom,
      };
    }
  });

  // 최고의 듀오: 양방향 합작(내가 어시 + 나를 어시)이 가장 많은 파트너
  const duo = new Map<string, number>();
  recipients.forEach((v, k) => duo.set(k, (duo.get(k) ?? 0) + v));
  givers.forEach((v, k) => duo.set(k, (duo.get(k) ?? 0) + v));

  return {
    mostPlayedWith: topOfMap(coPlay),
    assistRecipients: topOfMap(recipients),
    assistGivers: topOfMap(givers),
    bestDuo: topOfMap(duo),
    bestGame,
  };
}

// ───────────────────────── 정렬(상위 N) ─────────────────────────

// 딥블루(엘리트) 달성형 — TitleBadges 뱃지 색상과 동일 기준. 희귀도 정렬에도 사용.
const ELITE_ACHIEVEMENT_IDS = new Set([
  "multiplayer",
  "utility",
  "concrete",
  "fox",
  "box2box",
  "lastman",
  "sweeperkeeper",
  "attacking_fullback",
  "attacking_centerback",
  "invincible",
  "unsung",
  "devotion",
  "onehit",
  "loyalty",
]);

export const isEliteAchievement = (id: string) =>
  ELITE_ACHIEVEMENT_IDS.has(id.replace(/-(?:flat|[0-3])$/, ""));

/**
 * 뱃지 희귀도(높을수록 특별). 대표 미지정 시 자동 선택·정렬 기준.
 * 색상 서열과 일치: 감독 > 리더(골드왕관) > 레전드 tier3 > 히든 > 골드 tier2
 *                   > 엘리트(블루) > 실버 tier1 > 일반 달성형 > 브론즈 tier0
 */
function prestige(t: EarnedTitle): number {
  if (t.variant === "manager") return 90;
  if (t.variant === "leader") return 80;
  if (t.tier === 3) return 70; // 레전드
  if (t.hidden) return 60; // 히든
  if (t.tier === 2) return 50; // 골드
  if (isEliteAchievement(t.id)) return 40; // 엘리트 달성형
  if (t.tier === 1) return 30; // 실버
  if (t.tier === null) return 20; // 일반 달성형
  return 10; // tier 0 브론즈
}

/** 라인업/로스터용: 희귀도(특별 색상) 높은 순, 동률이면 대표(flagship) 우선으로 상위 N개 */
export function topTitles(earned: EarnedTitle[], n = 3): EarnedTitle[] {
  return [...earned]
    .sort(
      (a, b) =>
        prestige(b) - prestige(a) ||
        (b.flagship ? 1 : 0) - (a.flagship ? 1 : 0)
    )
    .slice(0, n);
}

/**
 * 라인업 표시용 N개: 본인이 고른 대표(featuredIds)를 순서대로 먼저,
 * 빈 칸은 이미 고른 걸 제외하고 희귀도 상위 칭호로 자동 채움. 대표가 없으면 전부 자동.
 */
export function pickBadges(
  earned: EarnedTitle[],
  featuredIds: string[] | undefined,
  n = 3
): EarnedTitle[] {
  const byId = new Map(earned.map((t) => [t.id, t]));
  const picked = (featuredIds ?? [])
    .map((id) => byId.get(id))
    .filter((t): t is EarnedTitle => !!t)
    .slice(0, n);

  if (picked.length >= n) return picked;

  const pickedIds = new Set(picked.map((t) => t.id));
  const fill = topTitles(
    earned.filter((t) => !pickedIds.has(t.id)),
    n - picked.length
  );
  return [...picked, ...fill];
}
