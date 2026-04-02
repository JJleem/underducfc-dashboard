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
  ChevronDown,
  ChevronUp,
  Users,
  Share2,
  Download,
  SendHorizonal,
} from "lucide-react";
import { MiniFormationField, FORMATION_POSITIONS } from "./FormationField";
import { shareFormation } from "../lib/draw-formation";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";

// --- 타입 정의 ---
export interface FeedbackData {
  matchId: number;
  timestamp: string;
  name: string;
  message: string;
}

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

export interface LineupData {
  matchId: number;
  quarter: string; // "예상" | "1Q" | "2Q" | "3Q" | "4Q"
  formation: string; // "4-3-3" | "4-4-2" | "3-5-2" | "4-2-3-1" 등
  players: string[]; // p1~p11
  subs: string[]; // sub1~sub5
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
  mom?: string; // K열 - MOM
  attendees?: string; // L열 - 참석자 (쉼표 구분)
}

interface DashboardClientProps {
  players: PlayerData[];
  matches: MatchData[];
  notice?: NoticeData;
  lineups: LineupData[];
  rosterMap: Record<string, string>;
}

export default function DashboardClient({
  players,
  matches,
  notice,
  lineups,
  rosterMap,
}: DashboardClientProps) {
  const { theme, setTheme } = useTheme();
  const [openLineups, setOpenLineups] = React.useState<Set<number>>(new Set());
  const [activeQuarters, setActiveQuarters] = React.useState<Record<number, string>>({});
  const [sharingMatch, setSharingMatch] = React.useState<number | null>(null);

  // 피드백 상태
  const [feedbackMap, setFeedbackMap] = React.useState<Record<number, FeedbackData[]>>({});
  const [openFeedbacks, setOpenFeedbacks] = React.useState<Set<number>>(new Set());
  const [feedbackForms, setFeedbackForms] = React.useState<Record<number, { name: string; message: string }>>({});
  const [submittingFeedback, setSubmittingFeedback] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((data: FeedbackData[]) => {
        const map: Record<number, FeedbackData[]> = {};
        data.forEach((fb) => {
          if (!map[fb.matchId]) map[fb.matchId] = [];
          map[fb.matchId].push(fb);
        });
        setFeedbackMap(map);
      })
      .catch(() => {});
  }, []);

  const toggleFeedback = (matchId: number) => {
    setOpenFeedbacks((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const submitFeedback = async (matchId: number) => {
    const form = feedbackForms[matchId];
    if (!form?.name?.trim() || !form?.message?.trim()) return;
    setSubmittingFeedback(matchId);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, name: form.name, message: form.message }),
      });
      if (res.ok) {
        const newFb: FeedbackData = {
          matchId,
          timestamp: new Date().toISOString(),
          name: form.name.trim(),
          message: form.message.trim(),
        };
        setFeedbackMap((prev) => ({
          ...prev,
          [matchId]: [...(prev[matchId] || []), newFb],
        }));
        setFeedbackForms((prev) => ({ ...prev, [matchId]: { name: form.name, message: "" } }));
      }
    } finally {
      setSubmittingFeedback(null);
    }
  };

  const formatFeedbackTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      return `${month}/${day} ${h}:${m}`;
    } catch {
      return "";
    }
  };

  const toggleLineup = (matchId: number) => {
    setOpenLineups((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const getMatchLineups = (matchId: number) =>
    lineups.filter((l) => l.matchId === matchId);

  const QUARTER_ORDER = ["예상", "1Q", "2Q", "3Q", "4Q"];
  // 💡 1. 완료된 경기만 필터링 (결과가 '예정'이 아닌 경우)
  const completedMatches = matches.filter(
    (m) => m.result !== "예정" && m.result !== "" && m.result !== "자체전",
  );
  const totalMatchesCount = completedMatches.length;

  // 💡 2. 승무패 및 득실점 계산
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let totalGoalsFor = 0;
  let totalGoalsAgainst = 0;

  completedMatches.forEach((m) => {
    const gf = Number(m.ourScore) || 0; // 우리 팀 득점
    const ga = Number(m.theirScore) || 0; // 상대 팀 득점 (실점)

    totalGoalsFor += gf;
    totalGoalsAgainst += ga;

    if (gf > ga) wins++;
    else if (gf === ga) draws++;
    else losses++;
  });

  // 💡 3. 평균 및 승률 계산
  const avgGoalsFor =
    totalMatchesCount > 0
      ? (totalGoalsFor / totalMatchesCount).toFixed(1)
      : "0.0";
  const avgGoalsAgainst =
    totalMatchesCount > 0
      ? (totalGoalsAgainst / totalMatchesCount).toFixed(1)
      : "0.0";
  const winRate =
    totalMatchesCount > 0 ? Math.round((wins / totalMatchesCount) * 100) : 0;
  const getResultBadgeStyle = (result: string) => {
    if (result === "승")
      return "bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black shadow-[0_0_10px_rgba(255,182,193,0.3)]";
    if (result === "패") return "bg-gray-400 dark:bg-gray-700 text-white";
    if (result === "무")
      return "bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white";
    return "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10";
  };
  // 💡 포지션별 뱃지 컬러 스타일 (대시보드용으로 살짝 심플하게)
  const getPosBadgeStyle = (pos?: string) => {
    const p = pos?.toUpperCase().trim() || "";
    if (p === "GK")
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/70 dark:text-yellow-200";
    if (p === "DF")
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200";
    if (p === "MF")
      return "bg-green-100 text-green-800 dark:bg-green-950/70 dark:text-green-200";
    if (p === "FW")
      return "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200";
    return "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400";
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
              란 말을 추구하며, <br /> 서로를 존중하는 축구 동호회입니다.
            </p>

            <div className="flex items-center gap-2 mt-2">
              <Link
                href="/roster"
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white/10 hover:bg-gray-800 dark:hover:bg-white/20 text-white dark:text-[#FFB6C1] rounded-full text-xs font-bold transition-all shadow-md"
              >
                <Menu className="w-4 h-4" />팀 로스터 보기
              </Link>

              {/* 💡 인스타그램 버튼 */}
              <Link
                href="https://www.instagram.com/underduck_fc/"
                target="_blank"
                rel="noopener noreferrer"
                // 💡 overflow-hidden 추가: 혹시 모를 이미지 삐져나옴 방지
                className="flex items-center justify-center w-[36px] h-[36px] bg-white dark:bg-[#1a1a1a] rounded-full hover:scale-110 transition-transform shadow-md border border-gray-100 dark:border-white/10 overflow-hidden"
                aria-label="Instagram"
              >
                <Image
                  src="/instagram-logo.webp"
                  alt="Instagram"
                  // 💡 컨테이너(36)보다 작게 설정하여 안정적인 여백 생성
                  width={22}
                  height={22}
                  className="object-contain" // 💡 비율 찌그러짐 방지
                />
              </Link>

              {/* 💡 구글 시트 버튼 */}
              <Link
                href="https://docs.google.com/spreadsheets/d/1e2w3S5zeiryWlXE3BfhkOoraXCZZays5BPiI5UsKhQs/edit?gid=0#gid=0"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-[36px] h-[36px] bg-white dark:bg-[#1a1a1a] rounded-full hover:scale-110 transition-transform shadow-md border border-gray-100 dark:border-white/10 overflow-hidden"
                aria-label="Google Sheets"
              >
                <Image
                  src="/sheets-logo.png"
                  alt="Google Sheets"
                  width={22}
                  height={22}
                  className="object-contain h-[22px]!"
                />
              </Link>
            </div>
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
                        {match.mom && (
                          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-300/50 dark:border-yellow-400/30 rounded-md px-2 py-0.5">
                            <span className="text-[10px]">⭐</span>
                            <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400">
                              {match.mom.trim()}
                            </span>
                          </div>
                        )}
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
                    {/* 라인업 아코디언 */}
                    {(() => {
                      const matchLineups = getMatchLineups(match.id);
                      const isOpen = openLineups.has(match.id);
                      const sortedQuarters = QUARTER_ORDER.filter((q) =>
                        matchLineups.some((l) => l.quarter === q)
                      );
                      const activeQ =
                        activeQuarters[match.id] || sortedQuarters[0] || "";
                      const activeLineup = matchLineups.find(
                        (l) => l.quarter === activeQ
                      );

                      return (
                        <div className="mt-4 border-t border-gray-100 dark:border-white/5 pt-3">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => matchLineups.length > 0 && toggleLineup(match.id)}
                              className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                              <Users className="w-3.5 h-3.5 text-[#FFB6C1]" />
                              {matchLineups.length > 0 ? "라인업 보기" : "라인업 미등록"}
                              {matchLineups.length > 0 && (
                                isOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                              )}
                            </button>
                            <Link
                              href={`/matches/${match.id}/edit`}
                              className="text-[10px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] hover:opacity-70 transition-opacity"
                            >
                              {matchLineups.length > 0 ? "편집" : "+ 추가"}
                            </Link>
                          </div>
                          {isOpen && matchLineups.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {/* 쿼터 탭 */}
                              {sortedQuarters.length > 1 && (
                                <div className="flex gap-1.5 flex-wrap">
                                  {sortedQuarters.map((q) => (
                                    <button
                                      key={q}
                                      onClick={() =>
                                        setActiveQuarters((prev) => ({
                                          ...prev,
                                          [match.id]: q,
                                        }))
                                      }
                                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all ${
                                        activeQ === q
                                          ? "bg-[#FFB6C1] dark:bg-[#FFB6C1] text-black"
                                          : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                                      }`}
                                    >
                                      {q}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {activeLineup && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">
                                        {activeLineup.formation}
                                      </span>
                                      <span className="text-[9px] text-gray-400">포메이션</span>
                                    </div>
                                    {FORMATION_POSITIONS[activeLineup.formation] && (
                                      <button
                                        onClick={async () => {
                                          setSharingMatch(match.id);
                                          try {
                                            await shareFormation(
                                              activeLineup,
                                              rosterMap,
                                              `언더덕_${match.opponent}_${activeQ}_라인업.png`,
                                              `언더덕 vs ${match.opponent} · ${activeQ} · ${match.date}`
                                            );
                                          } catch (e) {
                                            if (e instanceof Error && e.name !== "AbortError") {
                                              alert("공유 실패: " + e.message);
                                            }
                                          } finally {
                                            setSharingMatch(null);
                                          }
                                        }}
                                        disabled={sharingMatch === match.id}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/10 dark:bg-white/10 text-[10px] font-black text-gray-600 dark:text-gray-300 hover:bg-black/20 dark:hover:bg-white/20 transition-all"
                                      >
                                        {sharingMatch === match.id
                                          ? <Download className="w-3 h-3 animate-bounce" />
                                          : <Share2 className="w-3 h-3" />}
                                        공유
                                      </button>
                                    )}
                                  </div>
                                  {FORMATION_POSITIONS[activeLineup.formation] ? (
                                    <MiniFormationField lineup={activeLineup} rosterMap={rosterMap} />
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {activeLineup.players.map((p, i) => (
                                        <span key={i} className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-md text-gray-700 dark:text-gray-300">
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {activeLineup.subs.length > 0 && (
                                    <div className="pt-1 border-t border-gray-100 dark:border-white/5">
                                      <span className="text-[9px] text-gray-400 mr-1.5">교체</span>
                                      {activeLineup.subs.map((s, i) => (
                                        <span key={i} className="text-[10px] font-bold px-2 py-0.5 bg-gray-50 dark:bg-white/[0.03] rounded-md text-gray-500 mr-1">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <Link
                                href={`/matches/${match.id}`}
                                className="flex items-center justify-center w-full py-2 mt-1 rounded-xl bg-gray-100 dark:bg-white/5 text-[11px] font-black text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                              >
                                자세히 보기 →
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 피드백 섹션 */}
                    {(() => {
                      const feedbacks = feedbackMap[match.id] || [];
                      const isOpen = openFeedbacks.has(match.id);
                      const form = feedbackForms[match.id] || { name: "", message: "" };
                      const firstFb = feedbacks[feedbacks.length - 1];

                      const FeedbackAvatar = ({ name }: { name: string }) => {
                        const no = rosterMap[name.trim()];
                        return no ? (
                          <div className="w-7 h-7 rounded-full bg-[#FFB6C1]/20 border border-[#FFB6C1]/40 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">#{no}</span>
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 text-sm">
                            🦆
                          </div>
                        );
                      };

                      return (
                        <div className="mt-3 border-t border-gray-100 dark:border-white/5 pt-3">
                          <button
                            onClick={() => toggleFeedback(match.id)}
                            className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full"
                          >
                            <span className="text-sm">💬</span>
                            피드백
                            {feedbacks.length > 0 && (
                              <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{feedbacks.length}</span>
                            )}
                            <span className="ml-auto">
                              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </span>
                          </button>

                          {/* 접힌 상태: 첫 댓글 미리보기 */}
                          {!isOpen && firstFb && (
                            <div className="flex items-center gap-2 mt-2 px-1">
                              <FeedbackAvatar name={firstFb.name} />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 mr-1.5">{firstFb.name}</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{firstFb.message}</span>
                              </div>
                            </div>
                          )}

                          {/* 펼친 상태: 전체 피드백 + 입력 폼 */}
                          {isOpen && (
                            <div className="mt-2 space-y-3">
                              {feedbacks.length === 0 && (
                                <p className="text-[10px] text-gray-400 text-center py-2">아직 피드백이 없어요 🦆</p>
                              )}
                              {feedbacks.map((fb, i) => (
                                <div key={i} className="flex gap-2">
                                  <FeedbackAvatar name={fb.name} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[10px] font-black text-gray-800 dark:text-gray-200">{fb.name}</span>
                                      <span className="text-[9px] text-gray-400">{formatFeedbackTime(fb.timestamp)}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 break-words leading-relaxed">{fb.message}</p>
                                  </div>
                                </div>
                              ))}

                              {/* 입력 폼 */}
                              <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                                {/* 이름 입력 (컴팩트) */}
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="text-[10px] text-gray-400 shrink-0">닉네임</span>
                                  <input
                                    type="text"
                                    placeholder="이름 입력"
                                    value={form.name}
                                    maxLength={20}
                                    onChange={(e) => setFeedbackForms((prev) => ({ ...prev, [match.id]: { ...form, name: e.target.value } }))}
                                    className="w-28 text-[11px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-2.5 py-1.5 outline-none focus:border-[#FFB6C1]/60 dark:focus:border-[#FFB6C1]/60 placeholder:text-gray-400 text-gray-800 dark:text-gray-200"
                                  />
                                </div>
                                {/* 메시지 입력 + 전송 */}
                                <div className="flex items-center gap-2">
                                  <FeedbackAvatar name={form.name} />
                                  <div className="flex-1 flex items-center gap-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-3 py-2 focus-within:border-[#FFB6C1]/60 dark:focus-within:border-[#FFB6C1]/60 transition-colors">
                                    <input
                                      type="text"
                                      placeholder="댓글 달기 🦆"
                                      value={form.message}
                                      maxLength={200}
                                      onChange={(e) => setFeedbackForms((prev) => ({ ...prev, [match.id]: { ...form, message: e.target.value } }))}
                                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitFeedback(match.id); } }}
                                      className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-gray-400 text-gray-800 dark:text-gray-200 min-w-0"
                                    />
                                    <button
                                      onClick={() => submitFeedback(match.id)}
                                      disabled={submittingFeedback === match.id || !form.name?.trim() || !form.message?.trim()}
                                      className="shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1] disabled:opacity-30 hover:opacity-70 transition-opacity"
                                    >
                                      <SendHorizonal className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
          {/* 선수 랭킹 탭 */}
          <TabsContent value="stats" className="outline-none">
            {/* 💡 하나의 통합된 전광판 스타일 카드 (모바일 화면 깨짐 완벽 방지) */}
            <Card className="mb-6 bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              {/* 상단 섹션: 전적 및 승률 (배경색을 살짝 다르게 주어 분리감 형성) */}
              <div className="p-4 sm:p-5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 mb-1.5">
                    팀 통산 전적
                  </p>
                  {/* flex-wrap을 주어 만약 화면이 극단적으로 좁아져도 자연스럽게 떨어지도록 처리 */}
                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                    <span className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                      {totalMatchesCount}
                      <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 ml-0.5">
                        전
                      </span>
                    </span>
                    <span className="text-lg sm:text-xl font-black text-blue-500 ml-1">
                      {wins}
                      <span className="text-[10px] sm:text-[11px] font-medium text-blue-500/70 ml-0.5">
                        승
                      </span>
                    </span>
                    <span className="text-lg sm:text-xl font-black text-gray-500 ml-1">
                      {draws}
                      <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 ml-0.5">
                        무
                      </span>
                    </span>
                    <span className="text-lg sm:text-xl font-black text-[#FF8FA3] ml-1">
                      {losses}
                      <span className="text-[10px] sm:text-[11px] font-medium text-[#FF8FA3]/70 ml-0.5">
                        패
                      </span>
                    </span>
                  </div>
                </div>

                <div className="text-right pl-3">
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 mb-1.5">
                    승률
                  </p>
                  <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                    {winRate}%
                  </p>
                </div>
              </div>

              {/* 하단 섹션: 총 득/실 및 평균 득/실 (4분할) */}
              <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
                {/* 1. 총 득점 영역 */}
                <div className="p-3 sm:p-5 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 mb-1.5">
                    <span className="text-[12px] opacity-80">⚽</span>
                    <p className="text-[9px] sm:text-[11px] font-bold text-gray-500 whitespace-nowrap">
                      총 득점
                    </p>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-blue-500">
                    {totalGoalsFor}
                    <span className="text-[9px] sm:text-[11px] font-medium text-gray-400 ml-0.5 sm:ml-1">
                      골
                    </span>
                  </p>
                </div>

                {/* 2. 총 실점 영역 */}
                <div className="p-3 sm:p-5 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 mb-1.5">
                    <span className="text-[12px] opacity-80">🥅</span>
                    <p className="text-[9px] sm:text-[11px] font-bold text-gray-500 whitespace-nowrap">
                      총 실점
                    </p>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-[#FF8FA3]">
                    {totalGoalsAgainst}
                    <span className="text-[9px] sm:text-[11px] font-medium text-gray-400 ml-0.5 sm:ml-1">
                      골
                    </span>
                  </p>
                </div>

                {/* 3. 평균 득점 영역 */}
                <div className="p-3 sm:p-5 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 mb-1.5">
                    <span className="text-[12px] opacity-80">🎯</span>
                    <p className="text-[9px] sm:text-[11px] font-bold text-gray-500 whitespace-nowrap">
                      평균 득점
                    </p>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-blue-500">
                    {avgGoalsFor}
                    <span className="text-[9px] sm:text-[11px] font-medium text-gray-400 ml-0.5 sm:ml-1">
                      골
                    </span>
                  </p>
                </div>

                {/* 4. 평균 실점 영역 */}
                <div className="p-3 sm:p-5 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 mb-1.5">
                    <span className="text-[12px] opacity-80">🧤</span>
                    <p className="text-[9px] sm:text-[11px] font-bold text-gray-500 whitespace-nowrap">
                      평균 실점
                    </p>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-[#FF8FA3]">
                    {avgGoalsAgainst}
                    <span className="text-[9px] sm:text-[11px] font-medium text-gray-400 ml-0.5 sm:ml-1">
                      골
                    </span>
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-3xl overflow-hidden shadow-lg dark:shadow-2xl">
              {/* 💡 스크롤 제거, table-fixed로 너비 고정 */}
              <table className="w-full text-left table-fixed border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-tighter">
                    <th className="w-[22%] py-4 pl-4">선수</th>
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
                      {/* 이름/포지션 (수정된 부분) */}
                      <td className="py-4 pl-4 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <p className="font-black text-[13px] text-gray-800 dark:text-gray-200 truncate shrink-0">
                            {player.name}
                          </p>
                          {/* 💡 포지션 뱃지 추가 */}
                          <span
                            className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${getPosBadgeStyle(player.pos)}`}
                          >
                            {player.pos !== "-" ? player.pos : "SUB"}
                          </span>
                        </div>
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
                          Number(player.mom) +
                          Number(player.apps)}
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
