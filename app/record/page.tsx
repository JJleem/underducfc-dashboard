// /record — 상대와 경기장을 기준으로 다시 보는 경기 아카이브.
// 집계 기준은 기존 홈 그대로다: 완료된 "일반 매칭"만, 자체전·풋살은 뺀다.

import type { Metadata } from "next";
import { getMatchesRows } from "../lib/matches-backend";
import PageHeader from "../components/home/PageHeader";
import { getOpponentLogo } from "../lib/opponent-logos";
import RecordArchive, { type RecordGroup, type RecordMatch } from "./RecordArchive";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "전적 | UNDERDUCK FC",
  description: "언더덕 FC 상대팀별 · 장소별 전적",
};

function makeGroups(matches: RecordMatch[], by: "opponent" | "location"): RecordGroup[] {
  const grouped = new Map<string, RecordMatch[]>();
  matches.forEach((match) => {
    const key = match[by].trim();
    if (!key || key === "미정") return;
    const current = grouped.get(key) || [];
    current.push(match);
    grouped.set(key, current);
  });

  return Array.from(grouped, ([key, groupMatches]) => {
    const sorted = [...groupMatches].sort((a, b) => b.date.localeCompare(a.date));
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    sorted.forEach((match) => {
      goalsFor += match.ourScore;
      goalsAgainst += match.theirScore;
      if (match.ourScore > match.theirScore) wins++;
      else if (match.ourScore === match.theirScore) draws++;
      else losses++;
    });
    return {
      key,
      played: sorted.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      latestDate: sorted[0]?.date || "",
      matches: sorted,
      logo: by === "opponent" ? getOpponentLogo(key) : null,
    };
  }).sort((a, b) => b.latestDate.localeCompare(a.latestDate) || a.key.localeCompare(b.key, "ko"));
}

export default async function RecordPage() {
  const rawMatches = await getMatchesRows();
  const matches: RecordMatch[] = rawMatches
    .slice(1)
    .map((r, index) => ({
      id: index,
      date: r[0] || "",
      location: r[2] || "",
      opponent: r[3] || "",
      ourScore: Number(r[4]) || 0,
      theirScore: Number(r[5]) || 0,
      result: r[6] || "예정",
      type: r[7] || "일반 매칭",
    }))
    .filter(
      (match) =>
        match.date &&
        match.result !== "예정" &&
        match.result !== "" &&
        match.result !== "자체전" &&
        match.opponent.trim() !== "자체전" &&
        match.type.replace(/\s/g, "") === "일반매칭",
    );

  const opponents = makeGroups(matches, "opponent");
  const venues = makeGroups(matches, "location");

  return (
    <main className="relative mx-auto min-h-dvh max-w-md bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-zinc-100">
      <PageHeader label="RECORD" back="/stats" />
      <RecordArchive opponents={opponents} venues={venues} />
    </main>
  );
}
