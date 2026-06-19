import { getLineupRows, getRosterRows, getStatsRows, getAttendanceVoteRows, getVoteCommentRows } from "../../lib/backend";
import { getMatchesRows } from "../../lib/matches-backend";
import { LineupData, MatchData } from "../../components/DashboardClient";
import MatchDetailClient from "./MatchDetailClient";
import { notFound } from "next/navigation";
import { parseSubstitutions } from "../../lib/lineup";
import { auth } from "@/auth";
import { buildContexts, evaluatePlayer, evaluateLeaders, managerTitle, MANAGER_NAME, type EarnedTitle } from "../../lib/titles";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  const session = await auth();

  const [rawMatchesResult, rawLineupsResult, rawRosterResult, rawStatsResult, rawAttendanceResult, rawVoteCommentsResult] = await Promise.allSettled([
    getMatchesRows(),
    getLineupRows(),
    getRosterRows(),
    getStatsRows(),
    getAttendanceVoteRows(),
    getVoteCommentRows(),
  ]);

  const rawMatches = rawMatchesResult.status === "fulfilled" ? rawMatchesResult.value : [];
  const rawLineups = rawLineupsResult.status === "fulfilled" ? rawLineupsResult.value : [];
  const rawRoster = rawRosterResult.status === "fulfilled" ? rawRosterResult.value : [];
  const rawStats = rawStatsResult.status === "fulfilled" ? rawStatsResult.value : [];
  const rawAttendanceVotes = rawAttendanceResult.status === "fulfilled" ? rawAttendanceResult.value : [];
  const rawVoteComments = rawVoteCommentsResult.status === "fulfilled" ? rawVoteCommentsResult.value : [];

  // 이름 → 등번호 맵 (A=등번호, B=이름)
  const rosterMap: Record<string, string> = {};
  rawRoster.slice(1).forEach((row: string[]) => {
    const no = row[0]?.trim();
    const name = row[1]?.trim();
    if (name && no) rosterMap[name] = no;
  });

  // 이름 → 주장 역할 맵 (F=비고: C / VC)
  const captainRoles: Record<string, string> = {};
  rawRoster.slice(1).forEach((row: string[]) => {
    const name = row[1]?.trim();
    const role = row[5]?.trim().toUpperCase();
    if (name && (role === "C" || role === "VC")) captainRoles[name] = role;
  });

  // 이름 → 시즌 스탯 맵 (필드 선수 탭 시 표시)
  const playerStats: Record<string, { apps: number; goals: number; assists: number; mom: number; pos?: string }> = {};
  rawStats.slice(1).forEach((row: string[]) => {
    const name = row[1]?.trim();
    if (!name) return;
    playerStats[name] = {
      apps: Number(row[3]) || 0,
      goals: Number(row[4]) || 0,
      assists: Number(row[5]) || 0,
      mom: Number(row[6]) || 0,
      pos: row[2] || "-",
    };
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
    mom: row[10] || "",
    attendees: row[11] || "",
    photos: row[12] || "",
    weather: row[13] || "",
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
      substitutions: parseSubstitutions(row[19]),
    }))
    .filter((l: LineupData) => l.matchId === matchId);

  // 칭호 산출
  const contexts = buildContexts({
    rawStats,
    rawMatches,
    rawLineups,
    rawRoster,
    rawAttendanceVotes,
    rawVoteComments,
  });
  const leaders = evaluateLeaders(contexts);
  const playerTitles: Record<string, EarnedTitle[]> = {};
  contexts.forEach((ctx, name) => {
    const earned = evaluatePlayer(ctx);
    const lead = leaders.get(name) ?? [];
    const all = [...lead, ...earned];
    if (name === MANAGER_NAME) all.unshift(managerTitle());
    if (all.length) playerTitles[name] = all;
  });
  if (!playerTitles[MANAGER_NAME]) playerTitles[MANAGER_NAME] = [managerTitle()];

  return (
    <MatchDetailClient
      match={match}
      lineups={lineups}
      rosterMap={rosterMap}
      captainRoles={captainRoles}
      playerStats={playerStats}
      playerTitles={playerTitles}
      currentUserName={session?.user?.name}
    />
  );
}
