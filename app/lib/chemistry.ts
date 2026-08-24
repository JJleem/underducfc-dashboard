export interface ChemistryRecord {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  recent: Array<"승" | "무" | "패">;
}

export interface ChemistryPartner {
  name: string;
  sharedQuarters: number;
  sharedMatches: number;
  affinity: number;
  supplied: number;
  received: number;
  combinedGoals: number;
  record: ChemistryRecord;
  label: string;
  strength: "발견" | "좋은 호흡" | "강한 연결" | "찰떡궁합";
  rankScore: number;
}

export interface PlayerChemistry {
  partners: ChemistryPartner[];
  featured: ChemistryPartner | null;
  totalQuarters: number;
}

export interface TeamChemistryPair {
  names: [string, string];
  sharedQuarters: number;
  sharedMatches: number;
  affinity: number;
  combinedGoals: number;
  record: ChemistryRecord;
}

export interface TeamChemistryTrio {
  names: [string, string, string];
  sharedQuarters: number;
  sharedMatches: number;
  combinedGoals: number;
  record: ChemistryRecord;
}

export interface TeamChemistry {
  players: string[];
  pairs: TeamChemistryPair[];
  trios: TeamChemistryTrio[];
}

const clean = (value: unknown) => String(value ?? "").trim();

function relationshipLabel(p: Omit<ChemistryPartner, "label" | "strength" | "rankScore">): string {
  if (p.combinedGoals >= 3 && p.supplied > 0 && p.received > 0) return "쌍방향 듀오";
  if (p.combinedGoals >= 3) return "공격의 연결고리";
  if (p.record.played >= 4 && p.record.winRate >= 70) return "승리 조합";
  if (p.affinity >= 65 && p.sharedQuarters >= 8) return "가장 가까운 동료";
  if (p.sharedQuarters >= 8) return "익숙한 파트너";
  return "새로운 조합";
}

function strengthOf(sharedQuarters: number, combinedGoals: number): ChemistryPartner["strength"] {
  if (sharedQuarters >= 16 || combinedGoals >= 4) return "찰떡궁합";
  if (sharedQuarters >= 10 || combinedGoals >= 2) return "강한 연결";
  if (sharedQuarters >= 5 || combinedGoals >= 1) return "좋은 호흡";
  return "발견";
}

/**
 * 선수 프로필용 케미 분석.
 * 같은 경기에 이름만 있으면 함께 뛴 것으로 보던 예전 방식과 달리,
 * 동일한 라인업 행(=동일 쿼터)의 선발 11명에 함께 있을 때만 동반 출전으로 센다.
 */
export function buildPlayerChemistry(
  playerName: string,
  rawMatches: string[][],
  rawLineups: string[][],
): PlayerChemistry {
  const target = clean(playerName);
  const quarterPlayers = new Map<string, Set<string>>();
  const quarterMatch = new Map<string, number>();
  const playerQuarters = new Map<string, Set<string>>();

  rawLineups.slice(1).forEach((row, rowIndex) => {
    const matchId = Number(row[0]);
    if (!Number.isFinite(matchId)) return;
    const quarter = clean(row[1]) || `row-${rowIndex}`;
    const key = `${matchId}:${quarter}`;
    const names = new Set(
      row.slice(3, 14).map(clean).filter((name) => name && name !== "미정"),
    );
    if (!names.size) return;
    quarterPlayers.set(key, names);
    quarterMatch.set(key, matchId);
    names.forEach((name) => {
      if (!playerQuarters.has(name)) playerQuarters.set(name, new Set());
      playerQuarters.get(name)!.add(key);
    });
  });

  const mine = playerQuarters.get(target) ?? new Set<string>();
  const sharedQuarterKeys = new Map<string, Set<string>>();
  mine.forEach((key) => {
    quarterPlayers.get(key)?.forEach((name) => {
      if (name === target) return;
      if (!sharedQuarterKeys.has(name)) sharedQuarterKeys.set(name, new Set());
      sharedQuarterKeys.get(name)!.add(key);
    });
  });

  const supplied = new Map<string, number>();
  const received = new Map<string, number>();
  rawMatches.slice(1).forEach((row) => {
    const scorers = clean(row[8]).split(",").map(clean);
    const assisters = clean(row[9]).split(",").map(clean);
    scorers.forEach((scorer, index) => {
      const assister = assisters[index] || "";
      if (!scorer || !assister || scorer === assister) return;
      if (assister === target) supplied.set(scorer, (supplied.get(scorer) ?? 0) + 1);
      if (scorer === target) received.set(assister, (received.get(assister) ?? 0) + 1);
    });
  });

  const partners = Array.from(sharedQuarterKeys.entries()).map(([name, keys]) => {
    const sharedMatches = new Set(Array.from(keys).map((key) => quarterMatch.get(key)!));
    const results = Array.from(sharedMatches)
      .sort((a, b) => a - b)
      .map((id) => clean(rawMatches[id + 1]?.[6]))
      .filter((result): result is "승" | "무" | "패" => result === "승" || result === "무" || result === "패");
    const wins = results.filter((r) => r === "승").length;
    const draws = results.filter((r) => r === "무").length;
    const losses = results.filter((r) => r === "패").length;
    const theirQuarters = playerQuarters.get(name)?.size ?? 0;
    const affinity = mine.size && theirQuarters
      ? Math.round((keys.size / Math.sqrt(mine.size * theirQuarters)) * 100)
      : 0;
    const given = supplied.get(name) ?? 0;
    const got = received.get(name) ?? 0;
    const base = {
      name,
      sharedQuarters: keys.size,
      sharedMatches: sharedMatches.size,
      affinity,
      supplied: given,
      received: got,
      combinedGoals: given + got,
      record: {
        played: results.length,
        wins,
        draws,
        losses,
        winRate: results.length ? Math.round((wins / results.length) * 100) : 0,
        recent: results.slice(-5).reverse(),
      },
    };
    // 직접 합작을 충분히 보상하되, 한 번의 합작만으로 오랜 동반 출전을 압도하지 않게 한다.
    const rankScore = keys.size * 3 + (given + got) * 10 + affinity * 0.18 + wins * 1.5;
    return {
      ...base,
      label: relationshipLabel(base),
      strength: strengthOf(keys.size, given + got),
      rankScore,
    };
  });

  partners.sort((a, b) =>
    b.rankScore - a.rankScore ||
    b.sharedQuarters - a.sharedQuarters ||
    a.name.localeCompare(b.name, "ko"),
  );
  return { partners, featured: partners[0] ?? null, totalQuarters: mine.size };
}

const pairKey = (a: string, b: string) => [a, b].sort((x, y) => x.localeCompare(y, "ko")).join("|");

function recordFor(matchIds: Set<number>, rawMatches: string[][]): ChemistryRecord {
  const results = Array.from(matchIds)
    .sort((a, b) => a - b)
    .map((id) => clean(rawMatches[id + 1]?.[6]))
    .filter((result): result is "승" | "무" | "패" => result === "승" || result === "무" || result === "패");
  const wins = results.filter((r) => r === "승").length;
  const draws = results.filter((r) => r === "무").length;
  const losses = results.filter((r) => r === "패").length;
  return {
    played: results.length,
    wins,
    draws,
    losses,
    winRate: results.length ? Math.round((wins / results.length) * 100) : 0,
    recent: results.slice(-5).reverse(),
  };
}

/** 팀 맵과 3인 조합용 집계. 실제 같은 쿼터의 선발 조합만 사용한다. */
export function buildTeamChemistry(rawMatches: string[][], rawLineups: string[][]): TeamChemistry {
  const playerQuarterCount = new Map<string, number>();
  const pairQuarters = new Map<string, number>();
  const pairMatches = new Map<string, Set<number>>();
  const trioQuarters = new Map<string, number>();
  const trioMatches = new Map<string, Set<number>>();
  const linkGoals = new Map<string, number>();

  rawMatches.slice(1).forEach((row) => {
    const scorers = clean(row[8]).split(",").map(clean);
    const assisters = clean(row[9]).split(",").map(clean);
    scorers.forEach((scorer, index) => {
      const assister = assisters[index] || "";
      if (!scorer || !assister || scorer === assister || scorer === "자책골" || assister === "자책골") return;
      const key = pairKey(scorer, assister);
      linkGoals.set(key, (linkGoals.get(key) ?? 0) + 1);
    });
  });

  rawLineups.slice(1).forEach((row) => {
    const matchId = Number(row[0]);
    if (!Number.isFinite(matchId)) return;
    const names = Array.from(new Set(
      row.slice(3, 14).map(clean).filter((name) => name && name !== "미정"),
    )).sort((a, b) => a.localeCompare(b, "ko"));
    names.forEach((name) => playerQuarterCount.set(name, (playerQuarterCount.get(name) ?? 0) + 1));
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = pairKey(names[i], names[j]);
        pairQuarters.set(key, (pairQuarters.get(key) ?? 0) + 1);
        if (!pairMatches.has(key)) pairMatches.set(key, new Set());
        pairMatches.get(key)!.add(matchId);
        for (let k = j + 1; k < names.length; k++) {
          const trioKey = `${names[i]}|${names[j]}|${names[k]}`;
          trioQuarters.set(trioKey, (trioQuarters.get(trioKey) ?? 0) + 1);
          if (!trioMatches.has(trioKey)) trioMatches.set(trioKey, new Set());
          trioMatches.get(trioKey)!.add(matchId);
        }
      }
    }
  });

  const players = Array.from(playerQuarterCount.keys()).sort((a, b) => a.localeCompare(b, "ko"));
  const pairs: TeamChemistryPair[] = Array.from(pairQuarters.entries()).map(([key, sharedQuarters]) => {
    const names = key.split("|") as [string, string];
    const matches = pairMatches.get(key) ?? new Set<number>();
    const affinity = Math.round(
      (sharedQuarters / Math.sqrt((playerQuarterCount.get(names[0]) ?? 1) * (playerQuarterCount.get(names[1]) ?? 1))) * 100,
    );
    return {
      names,
      sharedQuarters,
      sharedMatches: matches.size,
      affinity,
      combinedGoals: linkGoals.get(key) ?? 0,
      record: recordFor(matches, rawMatches),
    };
  });
  pairs.sort((a, b) => b.sharedQuarters - a.sharedQuarters || b.combinedGoals - a.combinedGoals);

  const trios: TeamChemistryTrio[] = Array.from(trioQuarters.entries()).map(([key, sharedQuarters]) => {
    const names = key.split("|") as [string, string, string];
    const matches = trioMatches.get(key) ?? new Set<number>();
    const combinedGoals =
      (linkGoals.get(pairKey(names[0], names[1])) ?? 0) +
      (linkGoals.get(pairKey(names[0], names[2])) ?? 0) +
      (linkGoals.get(pairKey(names[1], names[2])) ?? 0);
    return { names, sharedQuarters, sharedMatches: matches.size, combinedGoals, record: recordFor(matches, rawMatches) };
  });
  // 우연히 한두 번 겹친 조합은 랭킹에서 제외하고, 동반 시간이 긴 순으로 제한한다.
  trios.sort((a, b) =>
    b.sharedQuarters - a.sharedQuarters || b.combinedGoals - a.combinedGoals || b.record.winRate - a.record.winRate,
  );

  return { players, pairs, trios: trios.filter((trio) => trio.sharedQuarters >= 2).slice(0, 12) };
}
