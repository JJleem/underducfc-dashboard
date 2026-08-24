import { positionsFor, rolesFor, type Point, type Role } from "./positions";

export interface PlayerRoleStat {
  role: Role;
  quarters: number;
  percent: number;
  point: Point;
}

export interface PlayerFormMatch {
  matchId: number;
  opponent: string;
  result: string;
  goals: number;
  assists: number;
  isMom: boolean;
}

export interface PlayerStatsReport {
  totalQuarters: number;
  lineupMatches: number;
  avgQuarters: string;
  pointsPerGame: string;
  momRate: number;
  roles: PlayerRoleStat[];
  primaryRole: Role | null;
  primaryFormation: string | null;
  roleSummary: string;
  recent: PlayerFormMatch[];
  bestGame: PlayerFormMatch | null;
  maxGoals: number;
  maxPoints: number;
  maxPointStreak: number;
}

const clean = (value: unknown) => String(value ?? "").trim();
const countName = (csv: string, name: string) => csv.split(",").map(clean).filter((v) => v === name).length;
const isMom = (raw: string, name: string) => raw.split(/[\/,]/).map(clean).includes(name);

function describeRoles(roles: PlayerRoleStat[]): string {
  if (!roles.length) return "아직 역할 데이터가 충분하지 않아요.";
  const left = roles.filter((r) => /^(L|LW)/.test(r.role)).reduce((n, r) => n + r.quarters, 0);
  const right = roles.filter((r) => /^(R|RW)/.test(r.role)).reduce((n, r) => n + r.quarters, 0);
  const total = roles.reduce((n, r) => n + r.quarters, 0);
  const variety = roles.length;
  if (variety >= 5) return `${variety}개 역할을 오간 폭넓은 멀티 플레이어예요.`;
  if (left / total >= 0.6) return "왼쪽 측면을 중심으로 경기에 관여했어요.";
  if (right / total >= 0.6) return "오른쪽 측면을 중심으로 경기에 관여했어요.";
  if (roles[0].percent >= 65) return `${roles[0].role} 역할에서 가장 뚜렷한 정체성을 보였어요.`;
  return "중앙과 측면을 오가며 여러 역할을 소화했어요.";
}

export function buildPlayerStatsReport(
  name: string,
  rawMatches: string[][],
  rawLineups: string[][],
  totals: { apps: number; goals: number; assists: number; mom: number },
): PlayerStatsReport {
  const roleMap = new Map<Role, { quarters: number; x: number; y: number }>();
  const formations = new Map<string, number>();
  const matchIds = new Set<number>();
  const seenQuarters = new Set<string>();

  rawLineups.slice(1).forEach((row, rowIndex) => {
    const matchId = Number(row[0]);
    if (!Number.isFinite(matchId)) return;
    const quarterKey = `${matchId}:${clean(row[1]) || rowIndex}`;
    if (seenQuarters.has(quarterKey)) return;
    const slot = row.slice(3, 14).findIndex((value) => clean(value) === name);
    if (slot < 0) return;
    seenQuarters.add(quarterKey);
    matchIds.add(matchId);
    const formation = clean(row[2]) || "기타";
    formations.set(formation, (formations.get(formation) ?? 0) + 1);
    const role = rolesFor(formation, row[24])[slot];
    const point = positionsFor(formation, row[24])[slot];
    const stat = roleMap.get(role) ?? { quarters: 0, x: 0, y: 0 };
    stat.quarters += 1;
    stat.x += point.x;
    stat.y += point.y;
    roleMap.set(role, stat);
  });

  const totalQuarters = seenQuarters.size;
  const roles = Array.from(roleMap.entries())
    .map(([role, stat]) => ({
      role,
      quarters: stat.quarters,
      percent: totalQuarters ? Math.round((stat.quarters / totalQuarters) * 100) : 0,
      point: { x: stat.x / stat.quarters, y: stat.y / stat.quarters },
    }))
    .sort((a, b) => b.quarters - a.quarters || a.role.localeCompare(b.role));

  const allPlayed = rawMatches.slice(1).map((row, matchId) => ({
    matchId,
    opponent: clean(row[3]) || "상대 미정",
    result: clean(row[6]),
    type: clean(row[7]),
    goals: countName(clean(row[8]), name),
    assists: countName(clean(row[9]), name),
    isMom: isMom(clean(row[10]), name),
    attended: clean(row[11]).split(",").map(clean).includes(name),
  })).filter((m) => m.result !== "예정" && m.type !== "야유회" && m.attended);

  const form = allPlayed.map(({ matchId, opponent, result, goals, assists, isMom }) => ({
    matchId, opponent, result, goals, assists, isMom,
  }));
  let bestGame: PlayerFormMatch | null = null;
  let maxPointStreak = 0;
  let streak = 0;
  form.forEach((match) => {
    const points = match.goals + match.assists;
    streak = points > 0 ? streak + 1 : 0;
    maxPointStreak = Math.max(maxPointStreak, streak);
    if (points <= 0) return;
    if (!bestGame || points > bestGame.goals + bestGame.assists ||
      (points === bestGame.goals + bestGame.assists && match.isMom && !bestGame.isMom)) bestGame = match;
  });

  const primaryFormation = Array.from(formations.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  return {
    totalQuarters,
    lineupMatches: matchIds.size,
    avgQuarters: matchIds.size ? (totalQuarters / matchIds.size).toFixed(1) : "0.0",
    pointsPerGame: totals.apps ? ((totals.goals + totals.assists) / totals.apps).toFixed(2) : "0.00",
    momRate: totals.apps ? Math.round((totals.mom / totals.apps) * 100) : 0,
    roles,
    primaryRole: roles[0]?.role ?? null,
    primaryFormation,
    roleSummary: describeRoles(roles),
    recent: form.slice(-5).reverse(),
    bestGame,
    maxGoals: Math.max(0, ...form.map((m) => m.goals)),
    maxPoints: Math.max(0, ...form.map((m) => m.goals + m.assists)),
    maxPointStreak,
  };
}
