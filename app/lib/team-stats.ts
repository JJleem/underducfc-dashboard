// 팀 집계. 홈 탭 안에 흩어져 있던 계산을 스탯·전적 페이지가 같이 쓰도록 모았다.
//
// 집계에서 빼는 기준은 기존 홈과 같다.
//   · 완료 경기 = result 가 "예정"/""/"자체전" 이 아닌 것 (자체전은 승패가 없다)
//   · 상대팀별·장소별 전적 = 거기서 다시 "일반 매칭"만, 상대가 "자체전"이면 제외
//     (풋살·자체전을 섞으면 상대 전적이 아니라 그냥 경기 목록이 된다)

export interface StatMatch {
  result: string;
  type?: string;
  opponent?: string;
  location?: string;
  ourScore: string | number;
  theirScore: string | number;
  goals?: string;
  assists?: string;
}

export interface SeasonSummary {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgFor: string;
  avgAgainst: string;
  winRate: number;
}

export function completedMatches<T extends StatMatch>(matches: T[]): T[] {
  return matches.filter((m) => m.result !== "예정" && m.result !== "" && m.result !== "자체전");
}

export function seasonSummary(matches: StatMatch[]): SeasonSummary {
  const done = completedMatches(matches);
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  done.forEach((m) => {
    const gf = Number(m.ourScore) || 0;
    const ga = Number(m.theirScore) || 0;
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) wins++;
    else if (gf === ga) draws++;
    else losses++;
  });

  const played = done.length;
  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    avgFor: played > 0 ? (goalsFor / played).toFixed(1) : "0.0",
    avgAgainst: played > 0 ? (goalsAgainst / played).toFixed(1) : "0.0",
    winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
  };
}

export interface AggRow {
  key: string;
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  winRate: number;
}

function buildAgg(matches: StatMatch[], keyOf: (m: StatMatch) => string): AggRow[] {
  const map: Record<string, Omit<AggRow, "key" | "winRate">> = {};
  completedMatches(matches).forEach((m) => {
    if ((m.opponent || "").trim() === "자체전") return;
    if ((m.type || "").replace(/\s/g, "") !== "일반매칭") return;
    const key = keyOf(m).trim();
    if (!key || key === "미정") return;
    const gf = Number(m.ourScore) || 0;
    const ga = Number(m.theirScore) || 0;
    const s = (map[key] ||= { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    s.played++;
    s.gf += gf;
    s.ga += ga;
    if (gf > ga) s.w++;
    else if (gf === ga) s.d++;
    else s.l++;
  });
  return Object.entries(map).map(([key, s]) => ({
    key,
    ...s,
    winRate: Math.round((s.w / s.played) * 100),
  }));
}

export function opponentRecords(matches: StatMatch[]): AggRow[] {
  return buildAgg(matches, (m) => m.opponent || "").sort(
    (a, b) => b.played - a.played || b.winRate - a.winRate,
  );
}

export function venueRecords(matches: StatMatch[]): AggRow[] {
  return buildAgg(matches, (m) => m.location || "").sort(
    (a, b) => b.winRate - a.winRate || b.played - a.played,
  );
}

export interface Duo {
  a: string;
  b: string;
  count: number;
}

/** 득점자 + 어시스트 조합. 순서는 무관하게 합산하고, 2회 이상만 듀오로 본다. */
export function bestDuos(matches: StatMatch[], min = 2, limit = 5): Duo[] {
  const map: Record<string, Duo> = {};
  completedMatches(matches).forEach((m) => {
    const scorers = (m.goals || "").split(",").map((s) => s.trim());
    const assisters = (m.assists || "").split(",").map((s) => s.trim());
    scorers.forEach((scorer, i) => {
      const assister = assisters[i] || "";
      if (!scorer || !assister || scorer === assister) return;
      if (scorer === "자책골" || assister === "자책골") return;
      const [a, b] = [scorer, assister].sort((x, y) => x.localeCompare(y, "ko"));
      const e = (map[`${a}|${b}`] ||= { a, b, count: 0 });
      e.count++;
    });
  });
  return Object.values(map)
    .sort((x, y) => y.count - x.count || x.a.localeCompare(y.a, "ko"))
    .filter((d) => d.count >= min)
    .slice(0, limit);
}
