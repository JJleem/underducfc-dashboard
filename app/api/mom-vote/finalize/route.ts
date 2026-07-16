import { NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { getMomVoteRows } from "../../../lib/backend";
import { getMatchesRows } from "../../../lib/matches-backend";
import { writeMatchMom } from "../../../lib/sheets-write";
import { requireAdmin } from "@/app/lib/admin";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    // matches 읽기 (날짜 + 현재 MOM 확인용)
    const rawMatches = await getMatchesRows();
    const matches = rawMatches.slice(1).map((row: string[], index: number) => ({
      id: index,
      date: row[0] || "",
      mom: row[10] || "",
    }));

    // mom_vote 읽기
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const finalized: { matchId: number; mom: string }[] = [];

    for (const match of matches) {
      // 이미 MOM 있으면 스킵
      if (match.mom?.trim()) continue;

      // 날짜 파싱 (다양한 포맷 대응)
      const d = new Date(match.date);
      if (isNaN(d.getTime())) continue;
      d.setHours(0, 0, 0, 0);

      // 경기일이 오늘보다 이전이어야 함
      if (d >= today) continue;

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

    revalidateAppData();
    return NextResponse.json({ ok: true, finalized });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[MOM finalize error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
