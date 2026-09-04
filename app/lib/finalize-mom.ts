// MOM 확정 — 투표 창이 닫힌 경기의 최다 득표자를 matches.mom 에 기록한다.
//
// 예전엔 이 호출이 홈(DashboardClient)의 effect 안에 있었다. 관리자가 홈에 들어올
// 때마다 돌았기 때문에 아무도 "확정"을 신경 쓸 필요가 없었는데, 2026-08-04 리디자인으로
// 홈이 NewHome 으로 바뀌면서 그 effect 가 같이 사라졌다. 8/15·8/22 두 경기의 MOM 이
// 표는 다 모인 채로 기록되지 않고 남았고, 선수 스탯·칭호에서 통째로 빠졌다.
//
// 그래서 트리거를 렌더가 아니라 크론에 둔다(app/api/cron/finalize-mom).
// 관리자 수동 실행(app/api/mom-vote/finalize)도 같은 함수를 쓴다.

import { getMomVoteRows } from "./backend";
import { getMatchesRows } from "./matches-backend";
import { writeMatchMom } from "./sheets-write";
import { getMomVoteDeadline } from "./mom-vote-window";

export interface FinalizedMom {
  matchId: number;
  mom: string;
}

/**
 * 아직 MOM 이 비어 있고 투표 창이 끝난 경기를 모두 확정한다.
 * 이미 기록이 있거나, 마감 전이거나, 표가 하나도 없는 경기는 건드리지 않는다.
 */
export async function finalizeMomVotes(): Promise<FinalizedMom[]> {
  const rawMatches = await getMatchesRows();
  const matches = rawMatches.slice(1).map((row: string[], index: number) => ({
    id: index,
    date: row[0] || "",
    time: row[1] || "",
    mom: row[10] || "",
  }));

  const rawVotes = await getMomVoteRows();
  const votesByMatch: Record<number, { votedFor: string; voteType: string }[]> = {};
  rawVotes.slice(1).forEach((row: string[]) => {
    if (!row[0]) return;
    const mid = Number(row[0]);
    if (!votesByMatch[mid]) votesByMatch[mid] = [];
    votesByMatch[mid].push({
      votedFor: row[2] || "",
      voteType: row[3] || "공격",
    });
  });

  const now = Date.now();
  const finalized: FinalizedMom[] = [];

  for (const match of matches) {
    // 이미 MOM 있으면 스킵
    if (match.mom?.trim()) continue;

    // 투표 창이 끝난 경기만 확정한다.
    const deadline = getMomVoteDeadline(match.date, match.time);
    if (!deadline || now < deadline.getTime()) continue;

    const votes = votesByMatch[match.id] || [];
    if (votes.length === 0) continue;

    const tally = (type: string) => {
      const t: Record<string, number> = {};
      votes
        .filter((v) => v.voteType === type && v.votedFor)
        .forEach((v) => { t[v.votedFor] = (t[v.votedFor] || 0) + 1; });
      const entries = Object.entries(t).sort((a, b) => b[1] - a[1]);
      if (entries.length === 0) return [];
      const maxVotes = entries[0][1];
      return entries.filter(([, cnt]) => cnt === maxVotes).map(([name]) => name);
    };

    const topAtk = tally("공격");
    const topDef = tally("수비");

    const atkSet = new Set(topAtk);
    const defOnly = topDef.filter((n) => !atkSet.has(n));

    let momStr = "";
    if (topAtk.length > 0 && defOnly.length > 0) momStr = `${topAtk.join(",")} / ${defOnly.join(",")}`;
    else if (topAtk.length > 0) momStr = topAtk.join(",");
    else if (topDef.length > 0) momStr = topDef.join(",");

    if (!momStr) continue;

    await writeMatchMom(match.id, momStr);
    finalized.push({ matchId: match.id, mom: momStr });
  }

  return finalized;
}
