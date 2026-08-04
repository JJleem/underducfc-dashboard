// /stats — 시즌 요약 + 선수 기록 + 최고의 듀오.
//
// 홈의 탭 안에 있던 걸 페이지로 뺐다. 탭이 홈 안에 있으면 주소가 안 생겨서
// 공유도 뒤로가기도 안 되고, 하단 탭바의 "스탯"과 상단 탭이 이중으로 겹쳤다.

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Swords } from "lucide-react";
import { getMatchesRows } from "../lib/matches-backend";
import { getRosterRows, getStatsRows } from "../lib/backend";
import { bestDuos, seasonSummary, type StatMatch } from "../lib/team-stats";
import PageHeader from "../components/home/PageHeader";
import PlayerFace from "../components/PlayerFace";
import StatsTable, { type PlayerStat } from "./StatsTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "스탯 | UNDERDUCK FC",
  description: "언더덕 FC 시즌 기록과 선수별 기록",
};

export default async function StatsPage() {
  const [rawMatches, rawStats, rawRoster] = await Promise.all([
    getMatchesRows(),
    getStatsRows().catch((): string[][] => []),
    getRosterRows().catch((): string[][] => []),
  ]);

  const matches: StatMatch[] = rawMatches.slice(1).map((r) => ({
    result: r[6] || "예정",
    type: r[7] || "일반 매칭",
    opponent: r[3] || "",
    location: r[2] || "",
    ourScore: r[4] || "-",
    theirScore: r[5] || "-",
    goals: r[8] || "",
    assists: r[9] || "",
  }));

  const summary = seasonSummary(matches);
  const duos = bestDuos(matches);

  // 로스터에 있는 선수만 (기존 홈과 같은 기준)
  const roster = new Map<string, { no: string; pos: string; status: string }>();
  rawRoster.slice(1).forEach((r) => {
    const name = (r[1] || "").trim();
    if (name) {
      roster.set(name, {
        no: r[0] || "-",
        pos: r[2] || "-",
        status: r[3] || "활동",
      });
    }
  });

  const players: PlayerStat[] = rawStats
    .slice(1)
    .filter((r) => roster.has((r[1] || "").trim()))
    .map((r) => {
      const name = (r[1] || "").trim();
      return {
        name,
        no: roster.get(name)?.no || "-",
        pos: r[2] || roster.get(name)?.pos || "-",
        status: roster.get(name)?.status || "활동",
        apps: Number(r[3]) || 0,
        goals: Number(r[4]) || 0,
        assists: Number(r[5]) || 0,
        mom: Number(r[6]) || 0,
      };
    });

  const total = Math.max(summary.played, 1);

  return (
    <main className="relative mx-auto min-h-dvh max-w-md bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-zinc-100">
      <PageHeader label="STATS" />

      {/* 시즌 요약 — 카드로 감싸지 않는다. 프로필 히어로와 같은 문법. */}
      <section className="relative overflow-hidden px-4 pt-5">
        <div
          className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#FF8FA3]"
          style={{ opacity: 0.15, filter: "blur(46px)" }}
        />
        <div className="relative">
          <p className="text-[9px] font-black tracking-[0.2em] text-gray-400 dark:text-white/35">
            SEASON
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-[21px] font-black leading-none tracking-[-0.035em] text-gray-900 dark:text-white">
              <span className="tabular-nums">{summary.played}</span>경기{" "}
              <span className="tabular-nums text-[#FF8FA3] dark:text-[#FFB6C1]">{summary.wins}</span>
              <span className="text-gray-400 dark:text-white/35">승 </span>
              <span className="tabular-nums">{summary.draws}</span>
              <span className="text-gray-400 dark:text-white/35">무 </span>
              <span className="tabular-nums">{summary.losses}</span>
              <span className="text-gray-400 dark:text-white/35">패</span>
            </p>
            <p className="shrink-0 text-[34px] font-black leading-[0.85] tracking-[-0.05em] tabular-nums text-[#FF8FA3] dark:text-[#FFB6C1]">
              {summary.winRate}%
            </p>
          </div>

          <div className="mt-3.5 flex h-[7px] overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            {summary.wins > 0 && (
              <div className="bg-[#FF8FA3]" style={{ width: `${(summary.wins / total) * 100}%` }} />
            )}
            {summary.draws > 0 && (
              <div className="bg-amber-400" style={{ width: `${(summary.draws / total) * 100}%` }} />
            )}
            {summary.losses > 0 && (
              <div
                className="bg-gray-400 dark:bg-white/25"
                style={{ width: `${(summary.losses / total) * 100}%` }}
              />
            )}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-1">
            {[
              { label: "득점", value: summary.goalsFor },
              { label: "실점", value: summary.goalsAgainst },
              { label: "경기당 득점", value: summary.avgFor },
              { label: "경기당 실점", value: summary.avgAgainst },
            ].map((s) => (
              <div key={s.label} className="min-w-0">
                <p className="text-[17px] font-black leading-none tabular-nums text-gray-900 dark:text-white">
                  {s.value}
                </p>
                <p className="mt-1 truncate text-[9.5px] font-bold text-gray-400 dark:text-white/35">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 전적 페이지로 */}
      <Link
        href="/record"
        className="mx-4 mt-5 flex items-center gap-3 border-y border-gray-200 py-3.5 active:opacity-60 dark:border-white/[0.08]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF8FA3]/10 text-[#FF8FA3] dark:bg-[#FFB6C1]/10 dark:text-[#FFB6C1]">
          <Swords width={16} height={16} strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-black text-gray-900 dark:text-white">
            상대팀 · 경기장 전적
          </span>
          <span className="mt-0.5 block text-[10px] font-bold text-gray-400 dark:text-white/30">
            맞대결과 장소별 경기 모아보기
          </span>
        </span>
        <ChevronRight width={15} height={15} strokeWidth={2.4} className="text-gray-300 dark:text-white/25" />
      </Link>

      {duos.length > 0 && (
        <section className="px-4 pt-5">
          <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
            최고의 듀오
          </p>
          <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {duos.map((d, i) => (
              <div key={`${d.a}-${d.b}`} className="flex items-center gap-3 py-2.5">
                <span
                  className={`w-5 shrink-0 text-center text-[13px] font-black tabular-nums ${
                    i === 0 ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-white/25"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex shrink-0 items-center -space-x-2">
                  <PlayerFace name={d.a} size={28} />
                  <PlayerFace name={d.b} size={28} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-black text-gray-900 dark:text-white">
                  <Link href={`/players/${encodeURIComponent(d.a)}`}>{d.a}</Link>
                  <span className="text-gray-300 dark:text-white/20"> · </span>
                  <Link href={`/players/${encodeURIComponent(d.b)}`}>{d.b}</Link>
                </span>
                <span className="shrink-0 text-[13px] font-black tabular-nums text-gray-900 dark:text-white">
                  {d.count}
                  <span className="ml-0.5 text-[10px] font-bold text-gray-400">골</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <StatsTable players={players} />
    </main>
  );
}
