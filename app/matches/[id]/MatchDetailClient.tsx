"use client";
import React, { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { ArrowLeft, MapPin, Target, Pencil, Star, Users, Camera } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { MatchData, LineupData } from "../../components/DashboardClient";
import AppBottomNav from "../../components/AppBottomNav";
import LineupViewer from "../../components/LineupViewer";
import OpponentLogo from "../../components/OpponentLogo";
import { parseWeather, weatherEmoji } from "../../lib/weather";
import type { EarnedTitle } from "../../lib/titles";

interface MatchDetailClientProps {
  match: MatchData;
  lineups: LineupData[];
  rosterMap: Record<string, string>;
  captainRoles?: Record<string, string>;
  playerStats?: Record<string, { apps: number; goals: number; assists: number; mom: number; pos?: string }>;
  playerTitles?: Record<string, EarnedTitle[]>;
  currentUserName?: string | null;
}

export default function MatchDetailClient({ match, lineups, rosterMap, captainRoles, playerStats, playerTitles = {}, currentUserName }: MatchDetailClientProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isInternal = match.opponent === "자체전";
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);
  const weather = parseWeather(match.weather || "");
  const photos = match.photos ? match.photos.split(",").filter(Boolean) : [];

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
                {/* 날씨 */}
                {weather.available && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-medium px-1">
                    {weatherEmoji(weather.icon)} {weather.temp}°C {weather.description} <span className="text-blue-400">💧{weather.pop}%</span>
                  </span>
                )}
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
                  <OpponentLogo name={match.opponent} className="mb-2" />
                )}
                <span className="font-bold text-sm text-center truncate max-w-[80px]">
                  {isInternal ? "언더덕 B" : match.opponent}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 경기 세부 정보 */}
        {(match.goals || match.mom || match.attendees || photos.length > 0) && (
          <Card className="bg-white dark:bg-[#161618] border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-md">
            <CardContent className="p-4 space-y-4">
              {/* 득점 & 어시스트 */}
              {match.goals && (
                <div>
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 tracking-wider mb-1.5">득점 기록</p>
                  <div className="space-y-1.5">
                    {match.goals.split(",").map((scorer, i) => {
                      const assistant = match.assists?.split(",")[i]?.trim();
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-gray-800 dark:text-gray-200">⚽ {scorer.trim()}</span>
                          {assistant && (
                            <span className="text-[10px] text-[#FF8FA3] dark:text-[#FFB6C1]">assist by {assistant}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MOM */}
              {match.mom && (
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-[11px] font-black text-gray-700 dark:text-gray-200">MOM: {match.mom}</span>
                </div>
              )}

              {/* 참석자 */}
              {match.attendees && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Users className="w-3.5 h-3.5 text-[#FFB6C1]" />
                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-400">
                      참석 ({match.attendees.split(",").filter(Boolean).length}명)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {match.attendees.split(",").filter(Boolean).map((name) => (
                      <Link
                        key={name.trim()}
                        href={`/players/${encodeURIComponent(name.trim())}`}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-[#FFB6C1]/20 transition-colors"
                      >
                        {name.trim()}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 사진 */}
              {photos.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#FFB6C1]" />
                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-400">사진 ({photos.length})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {photos.map((url, i) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={i}
                        src={url.replace("/upload/", "/upload/c_fill,w_300,h_300,q_auto,f_auto/")}
                        alt={`경기 사진 ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightbox({ urls: photos, index: i })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
              playerTitles={playerTitles}
              editHref={`/matches/${match.id}/edit`}
            />
          </div>
        )}
      </main>
      <AppBottomNav active="matches" currentUserName={currentUserName} />

      {/* 라이트박스 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors text-2xl font-bold"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          {lightbox.index > 0 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white text-2xl"
              onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: lightbox.index - 1 }); }}
            >
              ‹
            </button>
          )}
          {lightbox.index < lightbox.urls.length - 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white text-2xl"
              onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: lightbox.index + 1 }); }}
            >
              ›
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.urls[lightbox.index].replace("/upload/", "/upload/q_auto,f_auto/")}
            alt="경기 사진"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
