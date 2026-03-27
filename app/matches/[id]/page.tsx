import { getSheetData } from "../../lib/google-sheets";
import { LineupData, MatchData } from "../../components/DashboardClient";
import MatchDetailClient from "./MatchDetailClient";
import { notFound } from "next/navigation";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);

  const [rawMatchesResult, rawLineupsResult] = await Promise.allSettled([
    getSheetData("matches!A1:J50"),
    getSheetData("lineup!A1:S100"),
  ]);

  const rawMatches = rawMatchesResult.status === "fulfilled" ? rawMatchesResult.value : [];
  const rawLineups = rawLineupsResult.status === "fulfilled" ? rawLineupsResult.value : [];

  const matches: MatchData[] = rawMatches.slice(1).map((row: string[], index: number) => ({
    id: index,
    date: row[0] || "",
    time: row[1] || "미정",
    location: row[2] || "미정",
    opponent: row[3] || "미정",
    ourScore: row[4] || "-",
    theirScore: row[5] || "-",
    result: row[6] || "예정",
    type: row[7] || "일반 매칭",
    goals: row[8] || "",
    assists: row[9] || "",
  }));

  const match = matches.find((m) => m.id === matchId);
  if (!match) notFound();

  const lineups: LineupData[] = rawLineups.slice(1)
    .map((row: string[]) => ({
      matchId: Number(row[0]) || 0,
      quarter: row[1] || "",
      formation: row[2] || "",
      players: [
        row[3] || "", row[4] || "", row[5] || "", row[6] || "",
        row[7] || "", row[8] || "", row[9] || "", row[10] || "",
        row[11] || "", row[12] || "", row[13] || "",
      ].filter(Boolean),
      subs: [
        row[14] || "", row[15] || "", row[16] || "", row[17] || "", row[18] || "",
      ].filter(Boolean),
    }))
    .filter((l: LineupData) => l.matchId === matchId);

  return <MatchDetailClient match={match} lineups={lineups} />;
}
