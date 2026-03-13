"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Trophy,
  CalendarDays,
  Menu,
  Sun,
  Moon,
  MapPin,
  Target,
  BellRing,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";

// --- 타입 정의 ---
export interface NoticeData {
  id: number;
  date: string;
  title: string;
  content: string;
  important: boolean;
}

export interface PlayerData {
  name: string;
  no: string | number;
  pos: string;
  apps: string | number;
  goals: string | number;
  assists: string | number;
  mom: string | number;
}

export interface MatchData {
  id: number;
  date: string;
  time: string;
  location: string;
  opponent: string;
  ourScore: string | number;
  theirScore: string | number;
  result: string;
  type?: string;
  goals?: string;
  assists?: string;
}

interface DashboardClientProps {
  players: PlayerData[];
  matches: MatchData[];
  notice?: NoticeData;
}

export default function DashboardClient({
  players,
  matches,
  notice,
}: DashboardClientProps) {
  const { theme, setTheme } = useTheme();

  const getResultBadgeStyle = (result: string) => {
    if (result === "승")
      return "bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black shadow-[0_0_10px_rgba(255,182,193,0.3)]";
    if (result === "패") return "bg-gray-400 dark:bg-gray-700 text-white";
    if (result === "무")
      return "bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white";
    return "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10";
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-[#F5F5DC] font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-300">
      {/* 📱 앱 헤더 */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
        <span className="font-black italic text-lg tracking-tighter text-gray-900 dark:text-white uppercase">
          UNDERDUCK
        </span>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 transition-all"
        >
          <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
          <Sun className="hidden dark:block w-4 h-4 text-[#FFB6C1]" />
        </button>
      </header>

      <main className="p-5 pb-10">
        {/* 🦆 히어로 섹션 (복구 완료!) */}
        <div className="relative py-6 flex flex-col items-center border-b border-gray-100 dark:border-white/5 mb-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#FFB6C1]/30 dark:bg-[#FFB6C1]/10 blur-[80px] rounded-full -z-10" />
          <div className="relative w-20 h-20 rounded-full bg-white dark:bg-black border-[3px] border-[#FFB6C1] shadow-[0_0_20px_rgba(255,182,193,0.4)] flex items-center justify-center overflow-hidden mb-4">
            <Image
              src="/underducklogo.png"
              alt="Underduck Logo"
              fill
              priority
              className="object-cover"
            />
          </div>
          <h1 className="text-4xl w-full text-center font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8FA3] to-gray-800 dark:from-[#FFB6C1] dark:to-[#F5F5DC] tracking-tighter italic">
            UNDERDUCK FC
          </h1>
          <div className="flex flex-col gap-2 mt-3 max-w-[400px] items-center text-center">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#FFB6C1]/20 dark:bg-white/5 text-[#FF8FA3] dark:text-[#FFB6C1] border-none text-[10px]">
                EST 2025
              </Badge>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-widest uppercase italic">
                Not &apos;Because of&apos;, but &apos;Thanks to&apos;
              </span>
            </div>
            <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium mt-1 px-4">
              <span className="text-[#FF8FA3] dark:text-[#FFB6C1] font-bold">
                언더덕 FC
              </span>
              는 &apos;때문에&apos;란 말보다
              <span className="text-gray-900 dark:text-white font-bold mx-1 underline underline-offset-4 decoration-[#FFB6C1]">
                &quot;덕분에&quot;
              </span>
              란 말을 추구하며, 서로를 존중하는 축구 동호회입니다.
            </p>
            <Link
              href="/roster"
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white/10 hover:bg-gray-800 dark:hover:bg-white/20 text-white dark:text-[#FFB6C1] rounded-full text-xs font-bold transition-all shadow-md mt-2"
            >
              <Menu className="w-4 h-4" />팀 로스터 보기
            </Link>
          </div>
        </div>

        {/* 탭 섹션 */}
        <Tabs defaultValue="matches" className="w-full h-full">
          {/* 💡 탭은 다시 2개로 조정 */}
          <TabsList className="grid w-full h-full grid-cols-2 bg-gray-200/60 dark:bg-white/5 p-1 mb-6 rounded-2xl border border-gray-200 dark:border-white/5">
            <TabsTrigger
              value="matches"
              className="
      /* 💡 비활성 상태일 때 글자색 명시 (라이트: gray-500, 다크: gray-400) */
      text-gray-500 dark:text-gray-400 
      data-[state=active]:bg-white dark:data-[state=active]:bg-[#FFB6C1] 
      data-[state=active]:text-[#FF8FA3] dark:data-[state=active]:text-black 
      rounded-xl py-2.5 font-black text-sm transition-all
    "
            >
              <CalendarDays className="w-4 h-4 mr-1.5" /> 경기 일정
            </TabsTrigger>

            <TabsTrigger
              value="stats"
              className="
      /* 💡 비활성 상태일 때 글자색 명시 */
      text-gray-500 dark:text-gray-400 
      data-[state=active]:bg-white dark:data-[state=active]:bg-[#FFB6C1] 
      data-[state=active]:text-[#FF8FA3] dark:data-[state=active]:text-black 
      rounded-xl py-2.5 font-black text-sm transition-all
    "
            >
              <Trophy className="w-4 h-4 mr-1.5" /> 선수 랭킹
            </TabsTrigger>
          </TabsList>

          {/* 💡 경기 일정 탭 내용 */}
          <TabsContent value="matches" className="space-y-6 outline-none">
            {/* 💡 [공지사항 섹션] 고대비 + 왼쪽 포인트 라인 디자인 */}
            {notice && (
              <div className="px-1 mb-8">
                <Card className="relative overflow-hidden border-none shadow-xl bg-white dark:bg-[#1a1a1a]">
                  {/* 💡 왼쪽 강조 라인: 공지사항임을 한눈에 알게 함 */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#FF8FA3] dark:bg-[#FFB6C1]" />

                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#FF8FA3]/10 dark:bg-[#FFB6C1]/20 rounded-lg">
                          <BellRing className="w-4 h-4 text-[#FF8FA3] dark:text-[#FFB6C1]" />
                        </div>
                        <span className="text-[12px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] tracking-tight">
                          팀 공지사항
                        </span>
                      </div>
                      <Badge className="bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border-none font-bold text-[10px] px-2 py-0">
                        {notice.date}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[15px] font-black text-gray-900 dark:text-white leading-tight">
                        {notice.title}
                      </h3>

                      <div className="relative">
                        {/* 💡 배경에 아주 연한 핑크색을 깔아 본문 가독성 확보 */}
                        <p className="text-[12px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap bg-[#FF8FA3]/5 dark:bg-white/5 p-4 rounded-2xl border border-[#FF8FA3]/10 dark:border-white/5">
                          {notice.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 💡 섹션 구분선 (영문 제거 및 한국어 변경) */}
                <div className="mt-8 mb-4 border-b border-gray-200 dark:border-white/10 relative">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-4 bg-gray-50 dark:bg-[#0a0a0a] flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      다가오는 경기 일정
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 경기 일정 리스트 */}
            {[...matches].reverse().map((match) => {
              const isInternal = match.opponent === "자체전";
              return (
                <Card
                  key={match.id}
                  className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-3xl overflow-hidden shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
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
                      <div className="flex flex-col items-end gap-1.5">
                        {match.result && (
                          <Badge
                            className={`border-none font-black text-[11px] px-3 ${getResultBadgeStyle(match.result)}`}
                          >
                            {match.result}
                          </Badge>
                        )}
                        {isInternal && (
                          <Badge className="bg-[#FFB6C1]/20 text-[#FF8FA3] dark:text-[#FFB6C1] border border-[#FFB6C1]/30 font-black text-[9px] px-2">
                            자체전
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center relative">
                      <div className="flex flex-col items-center flex-1">
                        <div className="relative w-14 h-14 bg-white dark:bg-black rounded-full mb-2 flex items-center justify-center border-[2px] border-[#FFB6C1]/50 shadow-sm overflow-hidden">
                          <Image
                            src="/underducklogo.png"
                            alt="UDK A"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="font-bold text-sm">
                          {isInternal ? "언더덕 A" : "언더덕"}
                        </span>
                      </div>
                      <div className="flex flex-col items-center flex-1 px-2">
                        {match.result === "예정" ||
                        match.ourScore === "-" ||
                        !match.ourScore ? (
                          <div className="text-2xl font-black italic text-gray-300">
                            VS
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 w-full">
                            <div className="flex items-center gap-3 text-3xl font-black italic">
                              <span
                                className={
                                  match.result === "승"
                                    ? "text-[#FF8FA3] dark:text-[#FFB6C1]"
                                    : ""
                                }
                              >
                                {match.ourScore}
                              </span>
                              <span className="text-gray-300 text-xl">:</span>
                              <span className="text-gray-400">
                                {match.theirScore}
                              </span>
                            </div>
                            {match.goals && (
                              <div className="flex flex-col items-center gap-1.5 mt-1 w-full max-w-[130px]">
                                {match.goals.split(",").map((scorer, i) => {
                                  const assistant = match.assists
                                    ?.split(",")
                                    [i]?.trim();
                                  return (
                                    <div
                                      key={i}
                                      className="flex flex-col items-center w-full border-b border-gray-100 dark:border-white/5 pb-1 last:border-0"
                                    >
                                      <div className="text-[10px] font-bold">
                                        ⚽ {scorer.trim()}
                                      </div>
                                      {assistant && (
                                        <div className="text-[9px] text-[#FF8FA3] dark:text-[#FFB6C1] italic">
                                          assist by {assistant}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center flex-1 min-w-0">
                        {isInternal ? (
                          // 💡 1. 자체전일 때: 언더덕 B팀 로고 표시
                          <div className="relative w-14 h-14 bg-white dark:bg-black rounded-full mb-2 flex items-center justify-center border-[2px] border-[#FFB6C1]/50 dark:border-[#FFB6C1] shadow-sm overflow-hidden">
                            <Image
                              src="/underducklogo.png"
                              alt="언더덕 B"
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          // 💡 2. 외부 경기일 때: 상대팀 로고 대신 플레이스홀더 표시
                          <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-full mb-2 flex items-center justify-center border border-gray-200 dark:border-white/10 text-[11px] font-black text-gray-400 italic shrink-0 shadow-inner">
                            상대팀
                          </div>
                        )}

                        {/* 팀명 표시 */}
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate w-full text-center px-1">
                          {isInternal ? "언더덕 B" : match.opponent}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
          {/* 선수 랭킹 탭 */}
          <TabsContent value="stats" className="outline-none">
            <Card className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-3xl overflow-hidden shadow-lg dark:shadow-2xl">
              {/* 💡 스크롤 제거, table-fixed로 너비 고정 */}
              <table className="w-full text-left table-fixed border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-tighter">
                    <th className="w-[12%] py-4 pl-4">선수</th>
                    <th className="w-[12%] py-4 text-center">출전</th>
                    <th className="w-[12%] py-4 text-center">골</th>
                    <th className="w-[12%] py-4 text-center">도움</th>
                    <th className="w-[12%] py-4 text-center">MOM</th>
                    <th className="w-[12%] py-4 text-center text-[#FF8FA3] bg-[#FF8FA3]/5">
                      포인트
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {players.map((player, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* 이름/포지션 */}
                      <td className="py-4 pl-4 overflow-hidden">
                        <p className="font-black text-[13px] text-gray-800 dark:text-gray-200 truncate">
                          {player.name}
                        </p>
                      </td>
                      {/* 출전 */}
                      <td className="py-4 text-center text-[11px] font-bold text-gray-400">
                        {player.apps}
                      </td>
                      {/* 골 */}
                      <td className="py-4 text-center font-black text-[#FF8FA3] dark:text-[#FFB6C1] text-[14px]">
                        {player.goals}
                      </td>
                      {/* 도움 */}
                      <td className="py-4 text-center font-black text-gray-900 dark:text-white text-[14px]">
                        {player.assists}
                      </td>
                      {/* MOM */}
                      <td className="py-4 text-center font-black text-gray-900 dark:text-white text-[13px]">
                        {Number(player.mom) > 0 ? (
                          <span className="flex items-center justify-center">
                            {player.mom}
                            <span className="text-[8px] ml-0.5 text-yellow-500">
                              ⭐
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-200 dark:text-gray-800">
                            -
                          </span>
                        )}
                      </td>
                      {/* 총 포인트 */}
                      <td className="py-4 text-center font-black text-[#FF8FA3] bg-[#FF8FA3]/5 text-[15px]">
                        {Number(player.goals) +
                          Number(player.assists) +
                          Number(player.mom)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
