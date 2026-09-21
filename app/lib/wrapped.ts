// app/lib/wrapped.ts
//
// 시즌 래핑 — 선수 한 명의 "이번 시즌 돌아보기" 데이터.
//
// 스포티파이 래핑처럼 한 장씩 넘겨 보는 화면([[app/wrapped]])이 쓴다. 여기서는
// **숫자만** 만들고 문구·연출은 화면이 맡는다 — 그래야 계산을 테스트할 수 있다.
//
// 새로 세는 건 거의 없다. 이미 있는 집계기를 시즌 범위로 불러 모으는 게 일의 대부분이다:
//   · [[player-stats]] buildPlayerStatsReport — 포지션·쿼터·베스트경기·승률·연속기록
//   · [[chemistry]] buildPlayerChemistry      — 가장 많이 함께 뛴 사람
//   · [[titles]] 시즌 칭호                     — 그 시즌에 딴 것
//   · 백엔드 시즌 stats                        — 출전·골·도움·MOM
// 여기서 새로 만드는 건 **팀 내 순위**뿐이다(래핑에만 필요하다).

import type { PlayerChemistry } from "./chemistry";
import type { PlayerFormMatch, PlayerStatsReport } from "./player-stats";
import type { PosGroup } from "./titles";
import type { Role } from "./positions";
import type { EarnedTitle } from "./titles";

/** 팀 내 순위 한 칸. */
export interface WrappedRank {
  value: number;
  /** 1위부터. 동점이면 같은 등수를 준다(공동 2위 다음은 4위가 아니라 3위로 두지 않는다). */
  rank: number;
  /** 비교 대상 인원 수. */
  total: number;
  /** 같은 값이 둘 이상인가 — "공동 1위" 표기용. */
  tied: boolean;
}

/** 베스트 11 한 자리의 좌표·역할. 호출부가 positionsFor/rolesFor 로 만들어 넘긴다. */
export interface XiSlotSpec {
  /** 세부 역할("LB" · "CAM" · "ST" …). 그 자리에서 뛴 쿼터로 사람을 고른다. */
  role: string;
  group: PosGroup;
}

/** 베스트 11 의 한 자리. */
export interface BestElevenSlot {
  /** 포메이션 슬롯 번호(0=GK). positionsFor(formation)[slot] 이 좌표다. */
  slot: number;
  role: string;
  group: PosGroup;
  name: string;
  quarters: number;
  /**
   * 그 **한 자리**를 이 사람이 얼마나 채웠나(0~1).
   *
   * 분모는 버킷 전체가 아니라 `버킷 총쿼터 ÷ 그 버킷의 슬롯 수` 다.
   * CB·CM 은 슬롯이 둘이라 버킷 전체로 나누면 주전도 구조적으로 반토막이 난다
   * (공도하 39Q 가 30% 로 찍혀 로테이션으로 분류됐다). 슬롯당으로 보면 60% 다.
   *
   * 이게 없으면 "LM 10Q 가 1등" 이 이상해 보인다. 이 팀은 19경기를 28명이 돌아가며
   * 뛰어서 자리별 점유율이 16~93% 로 크게 갈린다 — 얇은 자리는 얇은 대로 보여야 한다.
   */
  share: number;
  /** 붙박이로 볼 만한가(점유율 REGULAR_SHARE 이상). 화면에서 로테이션 자리와 가른다. */
  isRegular: boolean;
  /** 그 역할을 아무도 안 뛰어서 같은 라인(PosGroup)에서 대신 채웠는가. */
  fromGroup: boolean;
  /** 보는 사람 본인인가 — 피치에서 이 자리만 시즌색 링을 두른다. */
  isMe: boolean;
}

/** 벤치 한 자리 — XI 에 못 든 선수 중 차순위. */
export interface BenchSlot {
  name: string;
  /** 그 선수가 가장 오래 뛴 자리(버킷). */
  role: string;
  group: PosGroup;
  quarters: number;
  isMe: boolean;
}

/** 출전 쿼터 순위 한 줄. */
export interface QuarterRankRow {
  rank: number;
  name: string;
  quarters: number;
  /** 같은 기간 출전 경기 수. 쿼터만 보면 "39Q" 가 몇 경기인지 감이 안 온다. */
  matches: number;
  isMe: boolean;
}

/** 내가 그 시즌 어디서 뛰었나 — 세부 역할 단위 분포. */
export interface RoleShare {
  role: string;
  quarters: number;
  /** 내 총 출전 쿼터 중 비율(%). */
  percent: number;
  /**
   * 피치 위 평균 좌표(x·y, 0~100). 프로필의 POSITION IDENTITY 처럼 버블로 찍는다.
   * 막대 목록만 있으면 "어디서" 가 숫자로만 남는다 — 그림이 있어야 자리로 읽힌다.
   */
  x: number;
  y: number;
}

/** MOM 을 받은 경기 한 건. "언제 받았나" 가 있어야 기록이 이야기가 된다. */
export interface MomMatch {
  date: string;
  opponent: string;
}

/** 월별 출석. "몇 월에 가장 열심이었나" 서사를 만든다. */
export interface MonthlyRow {
  /** "2026-05" */
  month: string;
  teamMatches: number;
  attended: number;
}

/** 팀 전체 시즌 요약. 개인 래핑 중간에 한 장 끼워 호흡을 준다. */
export interface TeamSeasonSummary {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface WrappedPartner {
  name: string;
  sharedQuarters: number;
  sharedMatches: number;
  /** 이 사람에게 준 어시 + 이 사람에게 받은 어시. */
  linkedGoals: number;
}

export interface SeasonWrapped {
  name: string;
  seasonId: string;
  seasonLabel: string;

  /** 기록이 한 줄도 없으면 래핑을 띄우지 않는다(화면에서 안내로 대체). */
  hasRecord: boolean;

  // ── 기본 스탯
  apps: number;
  goals: number;
  assists: number;
  mom: number;
  points: number;

  // ── 팀 내 순위 (로스터 선수 중, 값이 0이면 null — "0골 공동 12위"는 알려줄 가치가 없다)
  appsRank: WrappedRank | null;
  goalsRank: WrappedRank | null;
  assistsRank: WrappedRank | null;
  pointsRank: WrappedRank | null;

  // ── 출석
  attendance: {
    count: number;
    total: number;
    /** 팀이 치른 경기 중 몇 %를 나왔나. 팀 경기가 0이면 null. */
    rate: number | null;
    maxStreak: number;
  };

  // ── 포지션
  totalQuarters: number;
  primaryRole: Role | null;
  /** 주 포지션에서 뛴 쿼터 수와 비중(%). */
  primaryRoleQuarters: number;
  primaryRolePercent: number;
  roleVariety: number;
  roleSummary: string;
  groupBalance: PlayerStatsReport["groupBalance"];

  // ── 경기
  record: PlayerStatsReport["record"];
  bestGame: PlayerFormMatch | null;
  maxPointStreak: number;
  topOpponent: PlayerStatsReport["topOpponent"];

  // ── 사람
  topPartner: WrappedPartner | null;

  // ── 칭호 (그 시즌에 딴 것)
  titles: EarnedTitle[];

  /**
   * 시즌 베스트 11 — 포지션별 출전 쿼터 1위부터 채운다(GK1·DF4·MF3·FW3).
   * 라인업이 부족하면 11칸이 다 안 찰 수 있다(빈 자리는 아예 없다).
   */
  bestEleven: BestElevenSlot[];
  /** 내가 베스트 11 에 들었는가. */
  inBestEleven: boolean;
  /** 벤치 — XI 에 못 든 차순위 5명. */
  bench: BenchSlot[];
  /**
   * 내가 못 들었을 때 보여 줄 내 포지션 순위. 들었으면 null.
   * (주 포지션 기준 — 그 자리에서 몇 번째로 많이 뛰었나)
   */
  myPositionRank: { group: PosGroup; rank: number; total: number; quarters: number } | null;
  /** 총 출전 쿼터 순위 상위 목록 + 내 줄. 두 번째 슬라이드가 쓴다. */
  quarterRanking: QuarterRankRow[];
  /** 총 출전 쿼터 기준 내 순위. 기록이 없으면 null. */
  myQuarterRank: { rank: number; total: number; quarters: number } | null;
  /** 내가 뛴 세부 역할 분포(쿼터 많은 순). FW/MF/DF/GK 4칸보다 훨씬 구체적이다. */
  myRoleShares: RoleShare[];
  /** 함께 뛴 사람 상위 5. */
  topPartners: WrappedPartner[];
  /** 월별 출석. */
  monthly: MonthlyRow[];
  /** 팀 전체 요약. */
  team: TeamSeasonSummary;
  /** 베스트 경기 사진·상대 로고. */
  bestGameArt: { photo?: string; logo?: string };
  /** 날씨 경험. */
  weather: { rain: number; heat: number; cold: number };
  /** MOM 을 받은 경기들(날짜순). 없으면 빈 배열. */
  momMatches: MomMatch[];
  /** 개인 한 경기 최고 기록 — MOM 이 없는 사람도 볼 게 있어야 한다. */
  personalBests: { maxGoals: number; maxPoints: number; maxPointStreak: number };
  /** 내 출전 경기 수(= apps)와 총 쿼터를 나란히 쓰기 위한 편의값. */
  matchesByPlayer: Record<string, number>;

  /** 베스트 11 을 그린 포메이션. 그 시즌 최다 사용. */
  formation: string;
  /**
   * 베스트 11 의 근거가 된 라인업 커버리지.
   *
   * 포지션 쿼터는 **라인업이 저장된 경기에서만** 나온다. 기록이 없는 경기는 통째로
   * 빠지므로, 몇 경기 기준인지 밝히지 않으면 "왜 쟤가 저기 있지" 가 된다.
   */
  lineupCoverage: { withLineup: number; total: number };
}

/** 래핑 조립에 필요한 것들. 전부 이미 있는 집계기의 결과다. */
export interface WrappedInput {
  name: string;
  seasonId: string;
  /** 시즌 라벨("25-26"). 값으로 받아 이 모듈이 seasons.ts 에 의존하지 않게 둔다 — 순수 계산. */
  seasonLabel: string;
  /** 그 시즌 stats 행(헤더 포함). backend.getStatsRows(seasonId) 결과. */
  rawSeasonStats: string[][];
  /** 로스터에 있는 이름만 순위 대상으로 본다 — 게스트·자책골이 순위에 끼지 않게. */
  rosterNames: ReadonlySet<string>;
  report: PlayerStatsReport;
  chemistry: PlayerChemistry;
  titles: EarnedTitle[];
  /** 그 시즌 팀이 치른 경기 수(야유회 제외) — 출석률 분모. */
  teamMatches: number;
  /** 그 선수가 출석한 경기 수. */
  attended: number;
  /** 그 시즌 최대 연속 출석. */
  maxStreak: number;
  /** 선수별 **세부 역할**(LB·CAM·ST…) 출전 쿼터. 호출부가 라인업에서 센다. */
  roleQuarters: Record<string, Record<string, number>>;
  /** 베스트 11 틀 — 그 시즌 최다 사용 포메이션의 11칸. rolesFor(formation) 에서 만든다. */
  xiShape: XiSlotSpec[];
  /** 그 틀의 포메이션 이름("4-2-3-1"). 피치 좌표와 화면 표기에 쓴다. */
  formation: string;
  /** 라인업이 저장된 경기 수 / 그 시즌 치른 경기 수. */
  lineupCoverage: { withLineup: number; total: number };
  /** 선수별 출전 경기 수 — 순위 줄에 쿼터와 함께 적는다. */
  matchesByPlayer: Record<string, number>;
  /** 월별 출석(팀 경기 수 · 내 출석). */
  monthly: MonthlyRow[];
  /** 팀 전체 요약. */
  team: TeamSeasonSummary;
  /** 베스트 경기 배경 사진(Cloudinary URL)과 상대팀 로고 경로. 없으면 생략. */
  bestGameArt: { photo?: string; logo?: string };
  /** 날씨 경험 — 비·폭염·한파 경기 수. */
  weather: { rain: number; heat: number; cold: number };
  /** MOM 을 받은 경기들(날짜 오름차순). */
  momMatches: MomMatch[];
}

interface StatLine {
  name: string;
  apps: number;
  goals: number;
  assists: number;
  mom: number;
}

/** stats 행 → 로스터 선수만 남긴 숫자 목록. */
function readStatLines(rows: string[][], rosterNames: ReadonlySet<string>): StatLine[] {
  return rows
    .slice(1)
    .map((r) => ({
      name: (r[1] || "").trim(),
      apps: Number(r[3]) || 0,
      goals: Number(r[4]) || 0,
      assists: Number(r[5]) || 0,
      mom: Number(r[6]) || 0,
    }))
    .filter((r) => r.name && rosterNames.has(r.name));
}

/**
 * 팀 내 순위. 값이 0이면 null — "0골 공동 12위"는 돌아볼 거리가 못 된다.
 *
 * 동점은 같은 등수다. 래핑에서 "공동 2위" 는 자랑이지만 "4위" 로 밀려 표시되면
 * 같은 기록의 두 사람이 서로 다른 등수를 보게 된다.
 */
export function rankOf(values: number[], mine: number): WrappedRank | null {
  if (mine <= 0 || values.length === 0) return null;
  const better = values.filter((v) => v > mine).length;
  const same = values.filter((v) => v === mine).length;
  return { value: mine, rank: better + 1, total: values.length, tied: same > 1 };
}

/**
 * 세부 역할 27종 → 집계 버킷 9종.
 *
 * 왜 묶나: 한 시즌 라인업이 72쿼터인데 역할이 27개라 같은 자리가 잘게 쪼개진다.
 * 자유 배치 좌표(72행 중 25행)가 조금씩 달라서 실제로 이렇게 흩어져 있었다.
 *   LCM 10Q · CM 3Q · RCM 12Q · CDM 2Q   → 사실상 같은 중앙 미드
 *   LS 2Q · RS 2Q · RF 3Q                → 사실상 같은 최전방
 * 쪼개진 채로 1등을 뽑으면 "13쿼터짜리 주전" 같은 얇은 결론이 나온다.
 *
 * 묶는 축은 **레인(좌/중앙/우) × 라인(수비/중앙미드/공미/최전방)** 이다.
 * 좌우는 합치지 않는다 — 왼쪽과 오른쪽은 실제로 다른 자리다.
 */
const ROLE_BUCKET: Record<string, string> = {
  GK: "GK",
  // 좌우 풀백 — 윙백은 같은 레인의 같은 역할로 본다
  LB: "LB", LWB: "LB",
  RB: "RB", RWB: "RB",
  // 중앙 수비 — 3백의 가운데(CB)도 같은 통에 넣고, 슬롯이 둘이면 1·2위가 각각 들어간다
  LCB: "CB", CB: "CB", RCB: "CB",
  // 중앙 미드 (수비형·중앙형 전부)
  LDM: "CM", CDM: "CM", RDM: "CM", LCM: "CM", CM: "CM", RCM: "CM",
  // 측면 미드 — 윙어도 같은 레인이라 합친다(이 팀은 LW 7Q · RW 5Q 로 따로 셀 양이 안 된다)
  LM: "LM", LW: "LM",
  RM: "RM", RW: "RM",
  // 공격형 미드
  LAM: "AM", CAM: "AM", RAM: "AM",
  // 최전방
  ST: "ST", CF: "ST", LS: "ST", RS: "ST", LF: "ST", RF: "ST",
};

/** 역할 → 집계 버킷. 모르는 역할은 그대로 쓴다. */
export function roleBucket(role: string): string {
  return ROLE_BUCKET[role] ?? role;
}

/** 선수별 역할 쿼터를 버킷 단위로 합친다. */
export function bucketize(
  roleQuarters: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [name, roles] of Object.entries(roleQuarters)) {
    const acc: Record<string, number> = {};
    for (const [role, q] of Object.entries(roles ?? {})) {
      const b = roleBucket(role);
      acc[b] = (acc[b] ?? 0) + q;
    }
    out[name] = acc;
  }
  return out;
}

/**
 * 시즌 베스트 11 — **그 팀이 실제로 쓰는 포메이션**의 자리마다, 그 자리에서 가장 오래
 * 뛴 사람을 앉힌다.
 *
 * 처음엔 4-3-3 에 GK1·DF4·MF3·FW3 으로 뽑았는데 말이 안 됐다. 이 팀은 4-2-3-1 을
 * 72쿼터 중 59회 쓰고 4-3-3 은 한 번 썼다. 윙어(LW 7Q · RW 5Q)가 사실상 없는데
 * FW 세 칸을 강제로 채우니, 8쿼터만 앞에 선 사람이 주전 공격수가 되고 수비수가
 * 최전방으로 밀려났다. 그래서 두 가지를 바꿨다:
 *   1. 틀을 팀의 최다 사용 포메이션에서 가져온다(shape 를 호출부가 넘긴다)
 *   2. 4개 그룹이 아니라 **세부 역할**(LB·CAM·ST…) 로 고른다
 *
 * 한 선수는 한 자리만 차지한다 — 두 칸을 먹으면 11명이 안 된다.
 * 그 역할을 아무도 안 뛴 칸은 같은 라인(PosGroup)에서 대신 채우고 fromGroup 으로 표시한다.
 */
/** 이 비율 이상이면 그 자리의 붙박이로 본다. 미만은 로테이션 자리. */
export const REGULAR_SHARE = 0.4;

export function pickBestEleven(
  roleQuarters: Record<string, Record<string, number>>,
  shape: XiSlotSpec[],
  me: string,
): BestElevenSlot[] {
  const buckets = bucketize(roleQuarters);
  const taken = new Set<string>();
  const out: BestElevenSlot[] = [];

  // 점유율 분모: 그 버킷에 팀이 쓴 쿼터를 **슬롯 수로 나눈** 값 = 한 자리분.
  const bucketTotal: Record<string, number> = {};
  for (const q of Object.values(buckets))
    for (const [b, v] of Object.entries(q)) bucketTotal[b] = (bucketTotal[b] ?? 0) + v;
  const slotCount: Record<string, number> = {};
  for (const sp of shape) {
    const b = roleBucket(sp.role);
    slotCount[b] = (slotCount[b] ?? 0) + 1;
  }
  const shareOf = (b: string, q: number) => {
    const perSlot = (bucketTotal[b] ?? 0) / (slotCount[b] || 1);
    return perSlot > 0 ? Math.min(1, q / perSlot) : 0;
  };

  // 버킷 → 라인(PosGroup). 같은 라인에서 대신 채울 때 쓴다.
  const groupOfBucket = new Map(shape.map((s) => [roleBucket(s.role), s.group]));
  const lineTotal = (q: Record<string, number>, group: PosGroup) =>
    Object.entries(q).reduce((n, [b, v]) => (groupOfBucket.get(b) === group ? n + v : n), 0);

  shape.forEach(({ role, group }, slot) => {
    const bucket = roleBucket(role);

    // 1순위: 그 자리(버킷)를 실제로 뛴 사람
    const best = Object.entries(buckets)
      .filter(([name, q]) => !taken.has(name) && (q?.[bucket] ?? 0) > 0)
      .sort((a, b) => (b[1][bucket] ?? 0) - (a[1][bucket] ?? 0) || a[0].localeCompare(b[0], "ko"))[0];

    if (best) {
      const q = best[1][bucket] ?? 0;
      const share = shareOf(bucket, q);
      taken.add(best[0]);
      out.push({
        slot, role, group, name: best[0], quarters: q, share,
        isRegular: share >= REGULAR_SHARE, fromGroup: false, isMe: best[0] === me,
      });
      return;
    }

    // 2순위: 그 자리를 아무도 안 뛰었다 → 같은 라인에서 가장 오래 뛴 사람
    const byLine = Object.entries(buckets)
      .filter(([name]) => !taken.has(name))
      .map((e) => [e[0], lineTotal(e[1], group)] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))[0];
    if (!byLine) return;
    taken.add(byLine[0]);
    out.push({
      slot, role, group, name: byLine[0], quarters: byLine[1],
      // 대체로 채운 자리는 그 자리 기록이 아예 없으므로 점유율을 주장하지 않는다.
      share: 0, isRegular: false, fromGroup: true, isMe: byLine[0] === me,
    });
  });

  return out;
}

/** 그 선수가 가장 오래 뛴 포지션. 기록이 없으면 null. */
function primaryGroupOf(q: Record<PosGroup, number> | undefined): PosGroup | null {
  if (!q) return null;
  const best = (["GK", "DF", "MF", "FW"] as PosGroup[])
    .filter((g) => (q[g] ?? 0) > 0)
    .sort((a, b) => (q[b] ?? 0) - (q[a] ?? 0))[0];
  return best ?? null;
}

/**
 * 벤치 — XI 에 못 든 선수 중 "그 다음" 을 뽑는다.
 *
 * XI 열한 명만 보여 주면 아깝게 밀린 사람이 아예 안 보인다. 스쿼드에 벤치가 있듯
 * 차순위도 같이 세운다. 각자 **가장 오래 뛴 자리**를 이름표로 달아 준다.
 */
export function pickBench(
  roleQuarters: Record<string, Record<string, number>>,
  shape: XiSlotSpec[],
  excluded: ReadonlySet<string>,
  me: string,
  limit = 5,
): BenchSlot[] {
  const buckets = bucketize(roleQuarters);
  const groupOfBucket = new Map(shape.map((s) => [roleBucket(s.role), s.group]));

  return Object.entries(buckets)
    .filter(([name]) => !excluded.has(name))
    .map(([name, q]) => {
      // 그 사람의 주 자리 = 가장 오래 뛴 버킷
      const best = Object.entries(q)
        .filter(([b]) => groupOfBucket.has(b))
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      if (!best) return null;
      return {
        name,
        role: best[0],
        group: groupOfBucket.get(best[0]) ?? ("MF" as PosGroup),
        quarters: best[1],
        isMe: name === me,
      };
    })
    .filter((b): b is BenchSlot => !!b && b.quarters > 0)
    .sort((a, b) => b.quarters - a.quarters || a.name.localeCompare(b.name, "ko"))
    .slice(0, limit);
}

export function buildSeasonWrapped({
  name,
  seasonId,
  seasonLabel,
  rawSeasonStats,
  rosterNames,
  report,
  chemistry,
  titles,
  teamMatches,
  attended,
  maxStreak,
  roleQuarters,
  xiShape,
  formation,
  lineupCoverage,
  matchesByPlayer,
  monthly,
  team,
  bestGameArt,
  weather,
  momMatches,
}: WrappedInput): SeasonWrapped {
  const lines = readStatLines(rawSeasonStats, rosterNames);
  const mine = lines.find((l) => l.name === name);

  const apps = mine?.apps ?? 0;
  const goals = mine?.goals ?? 0;
  const assists = mine?.assists ?? 0;
  const mom = mine?.mom ?? 0;
  const points = goals + assists;

  const primary = report.roles[0] ?? null;

  // 내가 어디서 뛰었나 — 세부 역할 그대로. 4칸(GK/DF/MF/FW)으로 뭉치면
  // "MF 60%" 처럼 뭉뚱그려져 정작 어느 자리였는지가 사라진다.
  // 좌표는 report.roles 가 이미 평균을 내어 들고 있다(프로필 MiniPitch 와 같은 값).
  const pointOf = new Map(report.roles.map((r) => [String(r.role), r.point]));
  const myRoles = roleQuarters[name] ?? {};
  const myRoleTotal = Object.values(myRoles).reduce((a, b) => a + b, 0);
  const myRoleShares: RoleShare[] = Object.entries(myRoles)
    .filter(([, q]) => q > 0)
    .map(([role, quarters]) => {
      const pt = pointOf.get(role);
      return {
        role,
        quarters,
        percent: myRoleTotal ? Math.round((quarters / myRoleTotal) * 100) : 0,
        x: pt?.x ?? 50,
        y: pt?.y ?? 50,
      };
    })
    .sort((a, b) => b.quarters - a.quarters || a.role.localeCompare(b.role));

  const topPartners: WrappedPartner[] = [...chemistry.partners]
    .sort((a, b) => b.sharedQuarters - a.sharedQuarters || a.name.localeCompare(b.name, "ko"))
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      sharedQuarters: p.sharedQuarters,
      sharedMatches: p.sharedMatches,
      linkedGoals: p.supplied + p.received,
    }));

  // 가장 오래 함께 뛴 사람. chemistry.partners 는 이미 호흡 점수순이지만,
  // 래핑에서 말하려는 건 "누구와 제일 많이 같이 뛰었나" 라 쿼터 수로 다시 고른다.
  const partner = [...chemistry.partners].sort(
    (a, b) => b.sharedQuarters - a.sharedQuarters || a.name.localeCompare(b.name, "ko"),
  )[0];

  return {
    name,
    seasonId,
    seasonLabel,
    // 한 경기도 안 나왔고 라인업에도 없으면 돌아볼 게 없다.
    hasRecord: apps > 0 || report.totalQuarters > 0,

    apps,
    goals,
    assists,
    mom,
    points,

    appsRank: rankOf(lines.map((l) => l.apps), apps),
    goalsRank: rankOf(lines.map((l) => l.goals), goals),
    assistsRank: rankOf(lines.map((l) => l.assists), assists),
    pointsRank: rankOf(lines.map((l) => l.goals + l.assists), points),

    attendance: {
      count: attended,
      total: teamMatches,
      rate: teamMatches > 0 ? Math.round((attended / teamMatches) * 100) : null,
      maxStreak,
    },

    totalQuarters: report.totalQuarters,
    primaryRole: primary?.role ?? null,
    primaryRoleQuarters: primary?.quarters ?? 0,
    primaryRolePercent: primary?.percent ?? 0,
    roleVariety: report.roleVariety,
    roleSummary: report.roleSummary,
    groupBalance: report.groupBalance,

    record: report.record,
    bestGame: report.bestGame,
    maxPointStreak: report.maxPointStreak,
    topOpponent: report.topOpponent,

    topPartner: partner
      ? {
          name: partner.name,
          sharedQuarters: partner.sharedQuarters,
          sharedMatches: partner.sharedMatches,
          linkedGoals: partner.supplied + partner.received,
        }
      : null,

    titles,

    formation,
    lineupCoverage,
    myRoleShares,
    topPartners,
    monthly,
    team,
    bestGameArt,
    weather,
    momMatches,
    personalBests: {
      maxGoals: report.maxGoals,
      maxPoints: report.maxPoints,
      maxPointStreak: report.maxPointStreak,
    },
    matchesByPlayer,
    ...buildElevenAndRanking(roleQuarters, xiShape, name, matchesByPlayer),
  };
}

/** 베스트 11 · 순위 파생. buildSeasonWrapped 가 펼쳐 넣는다. */
function buildElevenAndRanking(
  roleQuarters: Record<string, Record<string, number>>,
  shape: XiSlotSpec[],
  me: string,
  matchesByPlayer: Record<string, number>,
): Pick<
  SeasonWrapped,
  "bestEleven" | "inBestEleven" | "bench" | "myPositionRank" | "quarterRanking" | "myQuarterRank"
> {
  const bestEleven = pickBestEleven(roleQuarters, shape, me);
  const inBestEleven = bestEleven.some((s) => s.isMe);
  const bench = pickBench(roleQuarters, shape, new Set(bestEleven.map((s) => s.name)), me);

  const buckets = bucketize(roleQuarters);
  const groupOfBucket = new Map(shape.map((s) => [roleBucket(s.role), s.group]));
  const groupTotals = (q: Record<string, number> | undefined) => {
    const out: Record<PosGroup, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
    for (const [b, v] of Object.entries(q ?? {})) out[groupOfBucket.get(b) ?? "MF"] += v;
    return out;
  };

  // 내 라인 순위 — 베스트 11 에 못 들었을 때 "그 라인에서 몇 번째" 를 알려 준다.
  let myPositionRank: SeasonWrapped["myPositionRank"] = null;
  const mine = groupTotals(buckets[me]);
  const group = (["GK", "DF", "MF", "FW"] as PosGroup[])
    .filter((g) => mine[g] > 0)
    .sort((a, b) => mine[b] - mine[a])[0];
  if (!inBestEleven && group) {
    const board = Object.entries(buckets)
      .map(([n, q]) => ({ name: n, q: groupTotals(q)[group] }))
      .filter((r) => r.q > 0)
      .sort((a, b) => b.q - a.q || a.name.localeCompare(b.name, "ko"));
    const idx = board.findIndex((r) => r.name === me);
    if (idx >= 0) {
      myPositionRank = { group, rank: idx + 1, total: board.length, quarters: board[idx].q };
    }
  }

  // 총 출전 쿼터 순위. 상위 11명 + (내가 그 밖이면) 내 줄을 덧붙인다.
  const totals = Object.entries(roleQuarters)
    .map(([n, q]) => ({ name: n, quarters: Object.values(q ?? {}).reduce((a, b) => a + b, 0) }))
    .filter((r) => r.quarters > 0)
    .sort((a, b) => b.quarters - a.quarters || a.name.localeCompare(b.name, "ko"));

  const myIdx = totals.findIndex((r) => r.name === me);
  const row = (r: { name: string; quarters: number }, i: number): QuarterRankRow => ({
    rank: i + 1,
    name: r.name,
    quarters: r.quarters,
    matches: matchesByPlayer[r.name] ?? 0,
    isMe: r.name === me,
  });
  const quarterRanking = totals.slice(0, 11).map(row);
  if (myIdx >= 11) quarterRanking.push(row(totals[myIdx], myIdx));

  return {
    bestEleven,
    inBestEleven,
    bench,
    myPositionRank,
    quarterRanking,
    myQuarterRank: myIdx >= 0
      ? { rank: myIdx + 1, total: totals.length, quarters: totals[myIdx].quarters }
      : null,
  };
}
