"use client";
import React from "react";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { ArrowLeft, MapPin, Target, Pencil } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { MatchData, LineupData } from "../../components/DashboardClient";
import AppBottomNav from "../../components/AppBottomNav";
import LineupViewer from "../../components/LineupViewer";

interface MatchDetailClientProps {
  match: MatchData;
  lineups: LineupData[];
  rosterMap: Record<string, string>;
  captainRoles?: Record<string, string>;
  playerStats?: Record<string, { apps: number; goals: number; assists: number; mom: number; pos?: string }>;
  currentUserName?: string | null;
}

export default function MatchDetailClient({ match, lineups, rosterMap, captainRoles, playerStats, currentUserName }: MatchDetailClientProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isInternal = match.opponent === "자체전";

  const getResultBadgeStyle = (result: string) => {
    if (result === "승") return "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black";
    if (result === "패") return "bg-gray-400 dark:bg-gray-700 text-white";
    if (result === "무") return "bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white";
    return "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10";
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-zinc-100 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-300">
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-xl border-b border-gray-200/70 dark:border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-extrabold text-sm uppercase tracking-tight">UNDERDUCK</span>
        </Link>
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10"
        >
          <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
          <Sun className="hidden dark:block w-4 h-4 text-[#FFB6C1]" />
        </button>
      </header>

      <main className="p-5 pb-28 space-y-5">
        {/* 경기 정보 카드 */}
        <Card className="bg-white dark:bg-[#161618] border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md w-fit">
                  {match.date} • {match.time}
                </span>
                <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1 font-medium">
                    <MapPin className="w-3 h-3 text-[#FFB6C1]" />
                    {match.location}
                  </div>
                  {match.type && (
                    <Badge className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 border-none font-bold text-[9px] px-1.5 h-4 flex items-center gap-1">
                      <Target className="w-2.5 h-2.5 text-[#FFB6C1]" />
                      {match.type}
                    </Badge>
                  )}
                </div>
              </div>
              {match.result && (
                <Badge className={`border-none font-black text-[11px] px-3 ${getResultBadgeStyle(match.result)}`}>
                  {match.result}
                </Badge>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="flex flex-col items-center flex-1">
                <div className="relative w-14 h-14 bg-white dark:bg-black rounded-full mb-2 flex items-center justify-center border-[2px] border-[#FFB6C1]/50 shadow-sm overflow-hidden">
                  <Image src="/underducklogo.png" alt="언더덕" fill className="object-cover" />
                </div>
                <span className="font-bold text-sm">{isInternal ? "언더덕 A" : "언더덕"}</span>
              </div>
              <div className="flex flex-col items-center flex-1 px-2">
                {match.result === "예정" || !match.ourScore || match.ourScore === "-" ? (
                  <div className="text-2xl font-extrabold tracking-tight text-gray-300 dark:text-gray-600">VS</div>
                ) : (
                  <div className="flex items-center gap-3 text-[32px] font-extrabold tracking-tight tabular-nums">
                    <span className={match.result === "승" ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : ""}>{match.ourScore}</span>
                    <span className="text-gray-300 text-xl">:</span>
                    <span className="text-gray-400">{match.theirScore}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center flex-1">
                {isInternal ? (
                  <div className="relative w-14 h-14 bg-white dark:bg-black rounded-full mb-2 flex items-center justify-center border-[2px] border-[#FFB6C1]/50 shadow-sm overflow-hidden">
                    <Image src="/underducklogo.png" alt="언더덕 B" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-full mb-2 flex items-center justify-center border border-gray-200 dark:border-white/10 text-[11px] font-bold text-gray-400 shrink-0">
                    상대팀
                  </div>
                )}
                <span className="font-bold text-sm text-center truncate max-w-[80px]">
                  {isInternal ? "언더덕 B" : match.opponent}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 라인업 섹션 */}
        {lineups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-[13px] text-gray-400 dark:text-gray-600 font-bold">등록된 라인업이 없습니다</p>
            <Link
              href={`/matches/${match.id}/edit`}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#FFB6C1] text-black text-[12px] font-black hover:bg-[#FF8FA3] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> 라인업 추가하기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 mb-1">
              <h2 className="text-[13px] font-black text-gray-800 dark:text-white">라인업</h2>
              <Link
                href={`/matches/${match.id}/edit`}
                className="flex items-center gap-1 text-[11px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] hover:opacity-70 transition-opacity"
              >
                <Pencil className="w-3 h-3" /> 편집
              </Link>
            </div>
            <LineupViewer
              match={match}
              lineups={lineups}
              rosterMap={rosterMap}
              captainRoles={captainRoles}
              playerStats={playerStats}
              editHref={`/matches/${match.id}/edit`}
            />
          </div>
        )}
      </main>
      <AppBottomNav active="matches" currentUserName={currentUserName} />
    </div>
  );
}
