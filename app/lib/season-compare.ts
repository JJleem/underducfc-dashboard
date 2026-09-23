// app/lib/season-compare.ts
//
// 프로필 "숫자" 탭의 시즌 비교(25-26 vs 26-27 …). 의존성 없는 순수 계산이다 —
// node ESM 테스트에서 바로 불러오려고 seasons.ts 도 값으로 import 하지 않는다([[wrapped]] 와 같은 이유).
//
// 누적 합계에는 화살표를 달지 않는다. 시즌 중반엔 새 시즌 누적이 늘 적어서 전부 "하락" 이 된다.
// 증감은 **경기당 수치**와 출석률로만 말하고, 그마저도 새 시즌 표본이 쌓인 뒤에만 말한다.

/** 한 시즌의 선수 기록. attended/total 은 출석(팀이 치른 경기 중 내가 나온 수 / 팀 경기 수). */
export interface SeasonLine {
  id: string;
  label: string;
  apps: number;
  goals: number;
  assists: number;
  mom: number;
  attended: number;
  total: number;
}

export type Trend = "up" | "down" | "same" | null;

export interface CompareRow {
  key: string;
  label: string;
  /** 시즌 순서대로 표시할 문자열. */
  values: string[];
  /** 가장 최근 시즌이 바로 앞 시즌보다 어떤가. 누적 칸·표본 부족이면 null. */
  trend: Trend;
}

export interface SeasonCompare {
  seasons: { id: string; label: string }[];
  rows: CompareRow[];
}

/** 새 시즌 출전이 이보다 적으면 화살표를 달지 않는다 — 두세 경기로 "하락" 을 말하면 억울하다. */
export const TREND_MIN_APPS = 5;
/** 표 폭 — 한 줄에 시즌 셋까지. */
const MAX_SEASONS = 3;

const per = (n: number, apps: number) => (apps > 0 ? n / apps : 0);
const rate = (l: SeasonLine) => (l.total > 0 ? l.attended / l.total : null);

function trendOf(prev: number | null, cur: number | null, enough: boolean): Trend {
  if (!enough || prev === null || cur === null) return null;
  // 표시 자릿수(소수 둘째)에서 같으면 같은 걸로 본다 — 0.501 vs 0.499 에 화살표를 달지 않는다.
  const a = Math.round(prev * 100);
  const b = Math.round(cur * 100);
  return b > a ? "up" : b < a ? "down" : "same";
}

/** 출전 기록이 있는 시즌이 둘 이상일 때만 비교를 낸다. 아니면 null. */
export function buildSeasonCompare(lines: SeasonLine[]): SeasonCompare | null {
  const played = lines.filter((l) => l.apps > 0).slice(-MAX_SEASONS);
  if (played.length < 2) return null;

  const prev = played[played.length - 2];
  const cur = played[played.length - 1];
  const enough = cur.apps >= TREND_MIN_APPS;

  const total = (key: string, label: string, pick: (l: SeasonLine) => number): CompareRow => ({
    key,
    label,
    values: played.map((l) => String(pick(l))),
    trend: null,
  });
  const ratio = (key: string, label: string, pick: (l: SeasonLine) => number): CompareRow => ({
    key,
    label,
    values: played.map((l) => per(pick(l), l.apps).toFixed(2)),
    trend: trendOf(per(pick(prev), prev.apps), per(pick(cur), cur.apps), enough),
  });

  return {
    seasons: played.map((l) => ({ id: l.id, label: l.label })),
    rows: [
      total("apps", "출전", (l) => l.apps),
      total("goals", "골", (l) => l.goals),
      total("assists", "도움", (l) => l.assists),
      total("mom", "MOM", (l) => l.mom),
      ratio("goalsPer", "경기당 골", (l) => l.goals),
      ratio("assistsPer", "경기당 도움", (l) => l.assists),
      ratio("pointsPer", "경기당 공격P", (l) => l.goals + l.assists),
      {
        key: "attendRate",
        label: "출석률",
        values: played.map((l) => {
          const r = rate(l);
          return r === null ? "—" : `${Math.round(r * 100)}%`;
        }),
        trend: trendOf(rate(prev), rate(cur), enough),
      },
    ],
  };
}
