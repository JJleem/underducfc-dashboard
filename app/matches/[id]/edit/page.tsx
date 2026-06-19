import { getLineupRows, getRosterRows } from "../../../lib/backend";
import { getMatchesRows } from "../../../lib/matches-backend";
import { LineupData, MatchData } from "../../../components/DashboardClient";
import LineupEditor from "./LineupEditor";
import { notFound, redirect } from "next/navigation";
import { currentKakaoId, isAdmin } from "../../../lib/admin";
import { parseSubstitutions } from "../../../lib/lineup";

export default async function LineupEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 라인업 편집은 관리자 전용
  if (!isAdmin(await currentKakaoId())) redirect("/");

  const { id } = await params;
  const matchId = Number(id);

  const [rawMatchesResult, rawLineupsResult, rawRosterResult] = await Promise.allSettled([
    getMatchesRows(),
    getLineupRows(),
    getRosterRows(),
  ]);

  const rawMatches = rawMatchesResult.status === "fulfilled" ? rawMatchesResult.value : [];
  const rawLineups = rawLineupsResult.status === "fulfilled" ? rawLineupsResult.value : [];
  const rawRoster = rawRosterResult.status === "fulfilled" ? rawRosterResult.value : [];

  const rosterMap: Record<string, string> = {};
  rawRoster.slice(1).forEach((row: string[]) => {
    const no = row[0]?.trim();
    const name = row[1]?.trim();
    if (name && no) rosterMap[name] = no;
  });

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
    attendees: row[11] || "",
  }));

  const match = matches.find((m) => m.id === matchId);
  if (!match) notFound();

  const lineups: LineupData[] = rawLineups
    .slice(1)
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
      substitutions: parseSubstitutions(row[19]),
    }))
    .filter((l: LineupData) => l.matchId === matchId);

  const attendees = (match.attendees || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return <LineupEditor match={match} lineups={lineups} attendees={attendees} rosterMap={rosterMap} />;
}
