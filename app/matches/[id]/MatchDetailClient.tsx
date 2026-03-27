"use client";
import React from "react";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { ArrowLeft, MapPin, Target } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { MatchData, LineupData } from "../../components/DashboardClient";

// 포메이션별 선수 위치 (x, y: % 기준, 위가 공격방향)
const FORMATION_POSITIONS: Record<string, { x: number; y: number }[]> = {
  "4-3-3": [
    { x: 50, y: 88 },
    { x: 15, y: 70 }, { x: 37, y: 70 }, { x: 63, y: 70 }, { x: 85, y: 70 },
    { x: 25, y: 50 }, { x: 50, y: 48 }, { x: 75, y: 50 },
    { x: 20, y: 25 }, { x: 50, y: 20 }, { x: 80, y: 25 },
  ],
  "4-4-2": [
    { x: 50, y: 88 },
    { x: 15, y: 72 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 72 },
    { x: 15, y: 50 }, { x: 38, y: 50 }, { x: 62, y: 50 }, { x: 85, y: 50 },
    { x: 35, y: 25 }, { x: 65, y: 25 },
  ],
  "3-5-2": [
    { x: 50, y: 88 },
    { x: 25, y: 72 }, { x: 50, y: 72 }, { x: 75, y: 72 },
    { x: 10, y: 52 }, { x: 30, y: 52 }, { x: 50, y: 50 }, { x: 70, y: 52 }, { x: 90, y: 52 },
    { x: 35, y: 25 }, { x: 65, y: 25 },
  ],
  "4-2-3-1": [
    { x: 50, y: 88 },
    { x: 15, y: 72 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 72 },
    { x: 35, y: 58 }, { x: 65, y: 58 },
    { x: 15, y: 40 }, { x: 50, y: 38 }, { x: 85, y: 40 },
    { x: 50, y: 20 },
  ],
  "3-4-3": [
    { x: 50, y: 88 },
    { x: 25, y: 72 }, { x: 50, y: 72 }, { x: 75, y: 72 },
    { x: 15, y: 52 }, { x: 38, y: 52 }, { x: 62, y: 52 }, { x: 85, y: 52 },
    { x: 20, y: 25 }, { x: 50, y: 20 }, { x: 80, y: 25 },
  ],
  "5-3-2": [
    { x: 50, y: 88 },
    { x: 10, y: 72 }, { x: 28, y: 72 }, { x: 50, y: 72 }, { x: 72, y: 72 }, { x: 90, y: 72 },
    { x: 25, y: 50 }, { x: 50, y: 48 }, { x: 75, y: 50 },
    { x: 35, y: 25 }, { x: 65, y: 25 },
  ],
  "4-1-4-1": [
    { x: 50, y: 88 },
    { x: 15, y: 75 }, { x: 38, y: 75 }, { x: 62, y: 75 }, { x: 85, y: 75 },
    { x: 50, y: 62 },
    { x: 12, y: 45 }, { x: 35, y: 45 }, { x: 65, y: 45 }, { x: 88, y: 45 },
    { x: 50, y: 20 },
  ],
};

function SoccerField({ lineup }: { lineup: LineupData }) {
  const positions = FORMATION_POSITIONS[lineup.formation];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ paddingBottom: "140%" }}>
      {/* 잔디 배경 */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #2d6a2d 0%, #3a8a3a 25%, #2d6a2d 50%, #3a8a3a 75%, #2d6a2d 100%)",
        }}
      >
        {/* 필드 라인 */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 140"
          preserveAspectRatio="none"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.6"
        >
          {/* 외곽선 */}
          <rect x="5" y="5" width="90" height="130" />
          {/* 하프라인 */}
          <line x1="5" y1="70" x2="95" y2="70" />
          {/* 센터 서클 */}
          <circle cx="50" cy="70" r="12" />
          <circle cx="50" cy="70" r="0.8" fill="rgba(255,255,255,0.4)" stroke="none" />
          {/* 위 페널티 박스 */}
          <rect x="22" y="5" width="56" height="20" />
          <rect x="33" y="5" width="34" height="10" />
          <circle cx="50" cy="17" r="0.8" fill="rgba(255,255,255,0.4)" stroke="none" />
          {/* 아래 페널티 박스 */}
          <rect x="22" y="115" width="56" height="20" />
          <rect x="33" y="125" width="34" height="10" />
          <circle cx="50" cy="123" r="0.8" fill="rgba(255,255,255,0.4)" stroke="none" />
          {/* 골대 */}
          <rect x="40" y="2" width="20" height="3" strokeWidth="0.8" />
          <rect x="40" y="135" width="20" height="3" strokeWidth="0.8" />
        </svg>

        {/* 선수 배치 */}
        {lineup.players.map((player, i) => {
          const pos = positions?.[i];
          if (!pos || !player) return null;
          const isGK = i === 0;
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-black shadow-lg border-2 ${
                  isGK
                    ? "bg-yellow-400 border-yellow-200 text-yellow-900"
                    : "bg-[#FFB6C1] border-white text-gray-900"
                }`}
              >
                {i + 1}
              </div>
              <span
                className="mt-0.5 text-[7px] font-black text-white leading-tight text-center max-w-[36px] truncate"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
              >
                {player}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const QUARTER_ORDER = ["예상", "1Q", "2Q", "3Q", "4Q"];

interface MatchDetailClientProps {
  match: MatchData;
  lineups: LineupData[];
}

export default function MatchDetailClient({ match, lineups }: MatchDetailClientProps) {
  const { theme, setTheme } = useTheme();
  const sortedQuarters = QUARTER_ORDER.filter((q) =>
    lineups.some((l) => l.quarter === q)
  );
  const [activeQ, setActiveQ] = React.useState(sortedQuarters[0] || "");
  const activeLineup = lineups.find((l) => l.quarter === activeQ);

  const isInternal = match.opponent === "자체전";

  const getResultBadgeStyle = (result: string) => {
    if (result === "승") return "bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black";
    if (result === "패") return "bg-gray-400 dark:bg-gray-700 text-white";
    if (result === "무") return "bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white";
    return "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10";
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-[#F5F5DC] font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-300">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
        <Link href="/" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-black italic text-sm uppercase tracking-tight">UNDERDUCK</span>
        </Link>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10"
        >
          <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
          <Sun className="hidden dark:block w-4 h-4 text-[#FFB6C1]" />
        </button>
      </header>

      <main className="p-5 pb-10 space-y-5">
        {/* 경기 정보 카드 */}
        <Card className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-md">
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
                  <div className="text-2xl font-black italic text-gray-300">VS</div>
                ) : (
                  <div className="flex items-center gap-3 text-3xl font-black italic">
                    <span className={match.result === "승" ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : ""}>
                      {match.ourScore}
                    </span>
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
                  <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-full mb-2 flex items-center justify-center border border-gray-200 dark:border-white/10 text-[11px] font-black text-gray-400 italic shrink-0 shadow-inner">
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
          <div className="text-center py-10 text-[13px] text-gray-400 dark:text-gray-600 font-bold">
            등록된 라인업이 없습니다
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-[13px] font-black text-gray-800 dark:text-white px-1">
              라인업
            </h2>

            {/* 쿼터 탭 */}
            {sortedQuarters.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {sortedQuarters.map((q) => (
                  <button
                    key={q}
                    onClick={() => setActiveQ(q)}
                    className={`text-[11px] font-black px-4 py-1.5 rounded-xl transition-all ${
                      activeQ === q
                        ? "bg-[#FFB6C1] text-black shadow-sm"
                        : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {activeLineup && (
              <>
                {/* 포메이션 배지 */}
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[12px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">
                    {activeLineup.formation}
                  </span>
                  <span className="text-[11px] text-gray-400">포메이션</span>
                </div>

                {/* 축구장 시각화 */}
                {FORMATION_POSITIONS[activeLineup.formation] ? (
                  <SoccerField lineup={activeLineup} />
                ) : (
                  /* 포메이션 프리셋 없으면 리스트로 표시 */
                  <Card className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {activeLineup.players.map((p, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-bold px-2.5 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-700 dark:text-gray-300"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 교체 선수 */}
                {activeLineup.subs.length > 0 && (
                  <Card className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 rounded-2xl">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
                        교체 선수
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeLineup.subs.map((s, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-bold px-2.5 py-1 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg text-gray-500 dark:text-gray-500"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
