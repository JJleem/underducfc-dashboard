import { getLineupRows, getRosterRows, getStatsRows, getFeaturedRows } from "../../lib/backend";
import { getMatchesRows } from "../../lib/matches-backend";
import { LineupData, MatchData } from "../../lib/match-types";
import MatchDetailClient from "./MatchDetailClient";
import { notFound } from "next/navigation";
import { parseSubstitutions } from "../../lib/lineup";
import { pickBadges, type EarnedTitle } from "../../lib/titles";
import { getTeamTitleData } from "../../lib/titles-cache";
import { currentSeasonId, seasonOf } from "../../lib/seasons";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);

  // 경기를 먼저 받아 이 경기가 **어느 시즌 것인지** 정한다. 선수 탭에 뜨는 "시즌 기록"은
  // 지금 진행 중인 시즌이 아니라 그 경기가 치러진 시즌이어야 한다 — 지난 시즌 경기를
  // 열었는데 새 시즌 0골이 뜨면 그 경기의 맥락이 사라진다.
  // (getMatchesRows 는 45초 캐시라 이 한 단계가 대개 왕복을 더 만들지 않는다)
  const rawMatchesResult = await Promise.allSettled([getMatchesRows()]).then((r) => r[0]);
  const rawMatches = rawMatchesResult.status === "fulfilled" ? rawMatchesResult.value : [];
  // 배열 index = matchId, 0번째는 헤더
  const season = seasonOf(rawMatches[matchId + 1]?.[0]) ?? currentSeasonId();

  const [rawLineupsResult, rawRosterResult, rawStatsResult, rawFeaturedResult] = await Promise.allSettled([
    getLineupRows(),
    getRosterRows(),
    getStatsRows(season),
    getFeaturedRows(),
  ]);

  const rawLineups = rawLineupsResult.status === "fulfilled" ? rawLineupsResult.value : [];
  const rawRoster = rawRosterResult.status === "fulfilled" ? rawRosterResult.value : [];
  const rawStats = rawStatsResult.status === "fulfilled" ? rawStatsResult.value : [];
  const rawFeatured = rawFeaturedResult.status === "fulfilled" ? rawFeaturedResult.value : [];

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
      ],
      subs: [
        row[14] || "", row[15] || "", row[16] || "", row[17] || "", row[18] || "",
        row[19] || "", row[20] || "", row[21] || "", row[22] || "",
      ].filter(Boolean),
      substitutions: parseSubstitutions(row[23]),
      positions: row[24] || "",
      tactic: row[25] || "",
      instructions: row[26] || "",
    }))
    .filter((l: LineupData) => l.matchId === matchId);

  // 칭호 산출은 45초 캐시된 팀 전체 결과를 재사용한다(요청마다 다시 계산하지 않는다).
  const { allTitles } = await getTeamTitleData(season);
  const featuredMap: Record<string, string[]> = {};
  rawFeatured.forEach((row) => {
    const name = (row[0] || "").trim();
    if (!name) return;
    const ids = [row[1], row[2], row[3]].map((value) => (value || "").trim()).filter(Boolean);
    if (ids.length) featuredMap[name] = ids;
  });
  const playerTitles: Record<string, EarnedTitle[]> = {};
  Object.entries(allTitles).forEach(([name, all]) => {
    playerTitles[name] = pickBadges(all, featuredMap[name]);
  });

  return (
    <MatchDetailClient
      match={match}
      lineups={lineups}
      rosterMap={rosterMap}
      captainRoles={captainRoles}
      playerStats={playerStats}
      playerTitles={playerTitles}
    />
  );
}
