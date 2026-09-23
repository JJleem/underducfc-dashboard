// /record — 상대와 경기장을 기준으로 다시 보는 경기 아카이브.
// 집계 기준은 기존 홈 그대로다: 완료된 "일반 매칭"만, 자체전·풋살은 뺀다.

import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { getMatchesRows } from "../lib/matches-backend";
import PageHeader from "../components/home/PageHeader";
import { getOpponentLogo } from "../lib/opponent-logos";
import {
  isInSeason,
  resolveSeasonId,
  seasonAccent,
  seasonsWithMatches,
} from "../lib/seasons";
import SeasonEmpty from "../components/SeasonEmpty";
import SeasonSelector from "../components/SeasonSelector";
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

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const season = resolveSeasonId((await searchParams).season);
  const rawMatches = await getMatchesRows();
  const accent = seasonAccent(season);
  const seasonsPlayed = [...seasonsWithMatches(rawMatches)];

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
        // 시즌 스코프. 맞대결 히스토리를 시즌으로 자른다.
        isInSeason(match.date, season) &&
        match.result !== "예정" &&
        match.result !== "" &&
        match.result !== "자체전" &&
        match.opponent.trim() !== "자체전" &&
        match.type.replace(/\s/g, "") === "일반매칭",
    );

  const opponents = makeGroups(matches, "opponent");
  const venues = makeGroups(matches, "location");

  return (
    <main
      className="season-scope relative mx-auto min-h-dvh max-w-md bg-gray-50 text-gray-900 dark:bg-background dark:text-zinc-100"
      style={{ "--season-light": accent.light, "--season-dark": accent.dark } as CSSProperties}
    >
      <PageHeader
        label="RECORD"
        // 스탯에서 넘어왔을 때 보던 시즌을 그대로 들고 돌아간다
        back={`/stats?season=${season}`}
        right={<SeasonSelector current={season} withMatches={seasonsPlayed} />}
      />
      {matches.length === 0 ? (
        <SeasonEmpty
          seasonId={season}
          accent="var(--season)"
          basePath="/record"
          withMatches={seasonsPlayed}
        />
      ) : (
        <RecordArchive opponents={opponents} venues={venues} />
      )}
    </main>
  );
}
