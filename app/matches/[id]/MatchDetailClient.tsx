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

// 포메이션별 선수 위치 (x, y: % 기준 / 위=공격방향, 아래=GK)
const FORMATION_POSITIONS: Record<string, { x: number; y: number }[]> = {
  "4-3-3": [
    { x: 50, y: 88 },
    { x: 12, y: 70 }, { x: 36, y: 70 }, { x: 64, y: 70 }, { x: 88, y: 70 },
    { x: 22, y: 48 }, { x: 50, y: 46 }, { x: 78, y: 48 },
    { x: 16, y: 22 }, { x: 50, y: 18 }, { x: 84, y: 22 },
  ],
  "4-4-2": [
    { x: 50, y: 88 },
    { x: 12, y: 70 }, { x: 36, y: 70 }, { x: 64, y: 70 }, { x: 88, y: 70 },
    { x: 12, y: 48 }, { x: 36, y: 48 }, { x: 64, y: 48 }, { x: 88, y: 48 },
    { x: 34, y: 22 }, { x: 66, y: 22 },
  ],
  "3-5-2": [
    { x: 50, y: 88 },
    { x: 22, y: 70 }, { x: 50, y: 70 }, { x: 78, y: 70 },
    { x: 8, y: 50 }, { x: 28, y: 50 }, { x: 50, y: 48 }, { x: 72, y: 50 }, { x: 92, y: 50 },
    { x: 34, y: 22 }, { x: 66, y: 22 },
  ],
  "4-2-3-1": [
    { x: 50, y: 88 },
    { x: 12, y: 72 }, { x: 36, y: 72 }, { x: 64, y: 72 }, { x: 88, y: 72 },
    { x: 32, y: 56 }, { x: 68, y: 56 },
    { x: 14, y: 38 }, { x: 50, y: 36 }, { x: 86, y: 38 },
    { x: 50, y: 18 },
  ],
  "3-4-3": [
    { x: 50, y: 88 },
    { x: 22, y: 70 }, { x: 50, y: 70 }, { x: 78, y: 70 },
    { x: 12, y: 50 }, { x: 36, y: 50 }, { x: 64, y: 50 }, { x: 88, y: 50 },
    { x: 16, y: 22 }, { x: 50, y: 18 }, { x: 84, y: 22 },
  ],
  "5-3-2": [
    { x: 50, y: 88 },
    { x: 8, y: 70 }, { x: 26, y: 70 }, { x: 50, y: 70 }, { x: 74, y: 70 }, { x: 92, y: 70 },
    { x: 22, y: 48 }, { x: 50, y: 46 }, { x: 78, y: 48 },
    { x: 34, y: 22 }, { x: 66, y: 22 },
  ],
  "4-1-4-1": [
    { x: 50, y: 88 },
    { x: 12, y: 74 }, { x: 36, y: 74 }, { x: 64, y: 74 }, { x: 88, y: 74 },
    { x: 50, y: 60 },
    { x: 10, y: 44 }, { x: 34, y: 44 }, { x: 66, y: 44 }, { x: 90, y: 44 },
    { x: 50, y: 18 },
  ],
};

// 포메이션 문자열 파싱해서 각 선수의 포지션 레이어 인덱스 반환
function getLayerIndex(playerIndex: number, formation: string): number {
  if (playerIndex === 0) return 0; // GK
  const layers = formation.split("-").map(Number);
  let count = 1;
  for (let i = 0; i < layers.length; i++) {
    if (playerIndex < count + layers[i]) return i + 1;
    count += layers[i];
  }
  return layers.length;
}

// 레이어별 색상 (GK/DF/MF/FW)
function getPlayerStyle(layerIndex: number, totalLayers: number) {
  if (layerIndex === 0) // GK
    return { bg: "#F59E0B", border: "#FDE68A", text: "#78350F", label: "GK" };
  if (layerIndex === 1) // DF
    return { bg: "#3B82F6", border: "#93C5FD", text: "#FFFFFF", label: "DF" };
  if (layerIndex === totalLayers) // FW (마지막 줄)
    return { bg: "#FF8FA3", border: "#FFB6C1", text: "#FFFFFF", label: "FW" };
  return { bg: "#10B981", border: "#6EE7B7", text: "#FFFFFF", label: "MF" }; // MF
}

function SoccerField({ lineup, rosterMap }: { lineup: LineupData; rosterMap: Record<string, string> }) {
  const positions = FORMATION_POSITIONS[lineup.formation];
  const totalLayers = lineup.formation.split("-").length;

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-xl">
      {/* 필드 컨테이너 */}
      <div
        className="relative w-full"
        style={{
          paddingBottom: "145%",
          background: "linear-gradient(180deg, #1a5c1a 0%, #236b23 12.5%, #1a5c1a 25%, #236b23 37.5%, #1a5c1a 50%, #236b23 62.5%, #1a5c1a 75%, #236b23 87.5%, #1a5c1a 100%)",
        }}
      >
        {/* 필드 라인 SVG */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 145"
          preserveAspectRatio="none"
          fill="none"
        >
          {/* 외곽선 */}
          <rect x="4" y="4" width="92" height="137" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
          {/* 하프라인 */}
          <line x1="4" y1="72.5" x2="96" y2="72.5" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
          {/* 센터서클 */}
          <circle cx="50" cy="72.5" r="13" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
          <circle cx="50" cy="72.5" r="1" fill="rgba(255,255,255,0.6)" />
          {/* 위쪽 페널티 박스 */}
          <rect x="22" y="4" width="56" height="22" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          <rect x="34" y="4" width="32" height="10" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          {/* 위쪽 페널티 스팟 */}
          <circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.5)" />
          {/* 아래쪽 페널티 박스 */}
          <rect x="22" y="119" width="56" height="22" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          <rect x="34" y="131" width="32" height="10" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          {/* 아래쪽 페널티 스팟 */}
          <circle cx="50" cy="127" r="0.8" fill="rgba(255,255,255,0.5)" />
          {/* 위쪽 골대 */}
          <rect x="40" y="1.5" width="20" height="2.5" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
          {/* 아래쪽 골대 */}
          <rect x="40" y="141" width="20" height="2.5" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
          {/* 코너 아크 */}
          <path d="M4,8 A4,4 0 0,0 8,4" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <path d="M92,8 A4,4 0 0,1 96,4" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <path d="M4,137 A4,4 0 0,1 8,141" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <path d="M92,137 A4,4 0 0,0 96,141" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        </svg>

        {/* 선수 노드 */}
        {lineup.players.map((player, i) => {
          const pos = positions?.[i];
          if (!pos || !player) return null;
          const layerIdx = getLayerIndex(i, lineup.formation);
          const style = getPlayerStyle(layerIdx, totalLayers);
          const shortName = player.length > 4 ? player.slice(0, 4) : player;
          const jerseyNo = rosterMap[player.trim()];
          const displayLabel = jerseyNo ?? "G";
          const isGuest = !jerseyNo;

          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                zIndex: 10,
              }}
            >
              {/* 선수 원 */}
              <div
                className="flex items-center justify-center rounded-full font-black shadow-lg"
                style={{
                  width: 34,
                  height: 34,
                  fontSize: isGuest ? 8 : displayLabel.length > 2 ? 9 : 12,
                  backgroundColor: isGuest ? "#6B7280" : style.bg,
                  border: `2.5px solid ${isGuest ? "#9CA3AF" : style.border}`,
                  color: isGuest ? "#FFFFFF" : style.text,
                  boxShadow: `0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.2)`,
                }}
              >
                {isGuest ? "G" : displayLabel}
              </div>
              {/* 이름 배경 + 텍스트 */}
              <div
                className="mt-0.5 px-1 rounded text-[8.5px] font-black text-white text-center leading-tight max-w-[44px] truncate"
                style={{
                  background: "rgba(0,0,0,0.65)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.9)",
                }}
              >
                {shortName}
              </div>
            </div>
          );
        })}

        {/* 공격 방향 화살표 */}
        <div
          className="absolute right-2 flex flex-col items-center gap-0.5"
          style={{ top: "42%", transform: "translateY(-50%)" }}
        >
          <div className="w-px h-8 bg-white/20" />
          <svg width="8" height="6" viewBox="0 0 8 6" fill="rgba(255,255,255,0.25)">
            <path d="M4 0 L8 6 L0 6 Z" />
          </svg>
          <span className="text-[6px] text-white/25 font-bold uppercase tracking-widest" style={{ writingMode: "vertical-rl" }}>
            attack
          </span>
        </div>
      </div>

      {/* 포메이션 하단 레전드 */}
      <div className="flex items-center justify-center gap-3 py-2.5 bg-[#0f3d0f]">
        {[
          { label: "GK", color: "#F59E0B" },
          { label: "DF", color: "#3B82F6" },
          { label: "MF", color: "#10B981" },
          { label: "FW", color: "#FF8FA3" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[9px] font-bold text-white/60">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const QUARTER_ORDER = ["예상", "1Q", "2Q", "3Q", "4Q"];

interface MatchDetailClientProps {
  match: MatchData;
  lineups: LineupData[];
  rosterMap: Record<string, string>;
}

export default function MatchDetailClient({ match, lineups, rosterMap }: MatchDetailClientProps) {
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
                  <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-full mb-2 flex items-center justify-center border border-gray-200 dark:border-white/10 text-[11px] font-black text-gray-400 italic shrink-0">
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
            {/* 쿼터 탭 + 포메이션 */}
            <div className="flex items-center justify-between px-1">
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
              {activeLineup && (
                <span className="text-[13px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">
                  {activeLineup.formation}
                </span>
              )}
            </div>

            {activeLineup && (
              <>
                {/* 축구장 시각화 */}
                {FORMATION_POSITIONS[activeLineup.formation] ? (
                  <SoccerField lineup={activeLineup} rosterMap={rosterMap} />
                ) : (
                  <Card className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {activeLineup.players.map((p, i) => (
                          <span key={i} className="text-[11px] font-bold px-2.5 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-700 dark:text-gray-300">
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
                      <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">교체 선수</p>
                      <div className="flex flex-wrap gap-2">
                        {activeLineup.subs.map((s, i) => (
                          <span key={i} className="text-[11px] font-bold px-2.5 py-1 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg text-gray-500 dark:text-gray-500">
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
