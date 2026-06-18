"use client";
import React, { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Users,
  MapPin,
  CalendarDays,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  MessageCircle,
  SendHorizonal,
  Trash2,
  LogIn,
  Loader2,
  Check,
  Droplets,
} from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { weatherEmoji } from "../lib/weather";

interface MatchInfo {
  id: number;
  date: string;
  time: string;
  location: string;
  opponent: string;
  result: string;
  type: string;
  attendees: string;
}

interface AttendanceVote {
  matchId: number;
  kakaoId: string;
  nickname: string;
  response: string;
  timestamp: string;
}

interface VoteComment {
  matchId: number;
  kakaoId: string;
  nickname: string;
  message: string;
  timestamp: string;
}

interface UserInfo {
  kakaoId: string;
  nickname: string;
}

interface WeatherInfo {
  temp: number;
  description: string;
  icon: string;
  pop: number;
  available: boolean;
}

interface VoteClientProps {
  upcomingMatches: MatchInfo[];
  pastMatches: MatchInfo[];
  attendanceVotes: AttendanceVote[];
  voteComments: VoteComment[];
  users: UserInfo[];
  weatherMap: Record<number, WeatherInfo>;
  currentUser?: { kakaoId: string; name: string; image: string } | null;
  isAdmin: boolean;
}

// 도넛 차트 컴포넌트
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const size = 80;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {data.filter(d => d.value > 0).map((d, i) => {
          const pct = d.value / total;
          const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;
          const dashOffset = -offset;
          offset += circumference * pct;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[14px] font-black text-gray-700 dark:text-gray-200">{total}</span>
      </div>
    </div>
  );
}

function formatTime(ts: string) {
  if (!ts) return "";
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${h}:${m}`;
}

function getDDay(dateStr: string): number | null {
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getDayLabel(dateStr: string): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : days[d.getDay()];
}

export default function VoteClient({
  upcomingMatches,
  pastMatches,
  attendanceVotes: initialVotes,
  voteComments: initialComments,
  users,
  weatherMap,
  currentUser,
  isAdmin,
}: VoteClientProps) {
  const [votes, setVotes] = useState<AttendanceVote[]>(initialVotes);
  const [comments, setComments] = useState<VoteComment[]>(initialComments);
  const [submitting, setSubmitting] = useState(false);
  const [commentInput, setCommentInput] = useState<Record<number, string>>({});
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedPast, setExpandedPast] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(
    new Set(upcomingMatches.map((m) => m.id))
  );

  const submitVote = async (matchId: number, response: string) => {
    if (!currentUser || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, response }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "투표 실패");
      setVotes((prev) => {
        const filtered = prev.filter(
          (v) => !(v.matchId === matchId && v.kakaoId === currentUser.kakaoId)
        );
        filtered.push({
          matchId,
          kakaoId: currentUser.kakaoId,
          nickname: currentUser.name,
          response,
          timestamp: new Date().toISOString(),
        });
        return filtered;
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "투표 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async (matchId: number) => {
    const msg = commentInput[matchId]?.trim();
    if (!msg || !currentUser || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch("/api/vote-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, message: msg }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "댓글 실패");
      setComments((prev) => [
        ...prev,
        {
          matchId,
          kakaoId: currentUser.kakaoId,
          nickname: currentUser.name,
          message: msg,
          timestamp: new Date().toISOString(),
        },
      ]);
      setCommentInput((prev) => ({ ...prev, [matchId]: "" }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "댓글 실패");
    } finally {
      setSubmittingComment(false);
    }
  };

  const deleteComment = async (matchId: number, targetKakaoId: string, timestamp: string) => {
    try {
      const res = await fetch("/api/vote-comment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, targetKakaoId, timestamp }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "삭제 실패");
      setComments((prev) =>
        prev.filter(
          (c) => !(c.matchId === matchId && c.kakaoId === targetKakaoId && c.timestamp === timestamp)
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const finalizeVote = async (matchId: number) => {
    if (!confirm("투표를 마감하시겠습니까? 참석자가 경기 데이터에 반영됩니다.")) return;
    try {
      const res = await fetch("/api/attendance/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "마감 실패");
      alert("투표가 마감되었습니다.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "마감 실패");
    }
  };

  const renderMatchVoteCard = (match: MatchInfo, isUpcoming: boolean) => {
    const matchVotes = votes.filter((v) => v.matchId === match.id);
    const matchComments = comments.filter((c) => c.matchId === match.id);
    const weather = weatherMap[match.id];

    const attending = matchVotes.filter((v) => v.response === "참석");
    const absent = matchVotes.filter((v) => v.response === "불참");
    const maybe = matchVotes.filter((v) => v.response === "미정");
    const votedIds = new Set(matchVotes.map((v) => v.kakaoId));
    const notVoted = users.filter((u) => !votedIds.has(u.kakaoId));

    const myVote = currentUser
      ? matchVotes.find((v) => v.kakaoId === currentUser.kakaoId)?.response
      : undefined;

    const dDay = getDDay(match.date);
    const dayLabel = getDayLabel(match.date);
    const isCommentsOpen = expandedComments.has(match.id);

    const donutData = [
      { label: "참석", value: attending.length, color: "#FF8FA3" },
      { label: "미정", value: maybe.length, color: "#FBBF24" },
      { label: "불참", value: absent.length, color: "#9CA3AF" },
      { label: "미투표", value: notVoted.length, color: "#E5E7EB" },
    ];

    return (
      <Card
        key={match.id}
        className="rounded-2xl border-gray-200/70 dark:border-white/[0.06] shadow-sm overflow-hidden"
      >
        <CardContent className="p-0">
          {/* 경기 정보 헤더 */}
          <div className="p-4 bg-gradient-to-r from-[#FF8FA3]/5 to-transparent dark:from-[#FFB6C1]/5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="text-[10px] font-black border-none bg-[#FF8FA3]/10 dark:bg-[#FFB6C1]/15 text-[#FF8FA3] dark:text-[#FFB6C1]">
                    {match.type}
                  </Badge>
                  {isUpcoming && dDay !== null && (
                    <span className="text-[11px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">
                      {dDay === 0 ? "D-DAY" : dDay > 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`}
                    </span>
                  )}
                </div>
                <p className="text-[15px] font-black text-gray-900 dark:text-white">
                  vs {match.opponent}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-0.5">
                    <CalendarDays className="w-3 h-3" />
                    {match.date} ({dayLabel})
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {match.time}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {match.location}
                  </span>
                </div>
              </div>

              {/* 날씨 */}
              {weather?.available && (
                <div className="text-center shrink-0 ml-3">
                  <div className="text-[24px] leading-none">{weatherEmoji(weather.icon)}</div>
                  <p className="text-[12px] font-bold text-gray-700 dark:text-gray-200 mt-0.5">
                    {weather.temp}°
                  </p>
                  <p className="text-[9px] text-gray-400">{weather.description}</p>
                  <p className="text-[9px] text-blue-400 flex items-center justify-center gap-0.5">
                    <Droplets className="w-2.5 h-2.5" />
                    {weather.pop}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 투표 영역 */}
          <div className="p-4 pt-3">
            {/* 투표 버튼 */}
            {isUpcoming && (
              currentUser ? (
                <div className="flex gap-2 mb-4">
                  {(["참석", "미정", "불참"] as const).map((opt) => {
                    const isSelected = myVote === opt;
                    const styles: Record<string, string> = {
                      "참석": isSelected
                        ? "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black shadow-md"
                        : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15",
                      "미정": isSelected
                        ? "bg-amber-400 text-white shadow-md"
                        : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15",
                      "불참": isSelected
                        ? "bg-gray-500 text-white shadow-md"
                        : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15",
                    };
                    return (
                      <button
                        key={opt}
                        onClick={() => submitVote(match.id, opt)}
                        disabled={submitting}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all ${styles[opt]} ${submitting ? "opacity-50" : ""}`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  onClick={() => signIn("kakao")}
                  className="w-full py-2.5 rounded-xl bg-[#FEE500] text-[#191919] text-[13px] font-black flex items-center justify-center gap-1.5 mb-4"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  로그인하고 투표하기
                </button>
              )
            )}

            {/* 결과 요약: 도넛 + 수치 */}
            {(matchVotes.length > 0 || notVoted.length > 0) && (
              <div className="flex items-center gap-4 mb-4">
                <DonutChart data={donutData} />
                <div className="flex-1 space-y-1.5">
                  {[
                    { label: "참석", count: attending.length, color: "text-[#FF8FA3] dark:text-[#FFB6C1]", bg: "bg-[#FF8FA3]" },
                    { label: "미정", count: maybe.length, color: "text-amber-400", bg: "bg-amber-400" },
                    { label: "불참", count: absent.length, color: "text-gray-400", bg: "bg-gray-400" },
                    { label: "미투표", count: notVoted.length, color: "text-gray-300 dark:text-gray-600", bg: "bg-gray-200 dark:bg-gray-600" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.bg} shrink-0`} />
                      <span className={`text-[11px] font-bold ${item.color} w-10`}>{item.label}</span>
                      <div className="flex-1 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.bg} transition-all duration-500`}
                          style={{
                            width: users.length > 0 ? `${(item.count / users.length) * 100}%` : "0%",
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 w-5 text-right">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 명단 */}
            {matchVotes.length > 0 && (
              <div className="space-y-2 mb-3">
                {attending.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-[#FF8FA3] dark:text-[#FFB6C1] w-10 shrink-0 pt-0.5">참석</span>
                    <div className="flex flex-wrap gap-1">
                      {attending.map((v) => (
                        <span key={v.kakaoId} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF8FA3]/10 dark:bg-[#FFB6C1]/15 text-[#FF8FA3] dark:text-[#FFB6C1] font-bold">
                          {v.nickname}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {maybe.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-amber-400 w-10 shrink-0 pt-0.5">미정</span>
                    <div className="flex flex-wrap gap-1">
                      {maybe.map((v) => (
                        <span key={v.kakaoId} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-400/15 text-amber-500 dark:text-amber-400 font-bold">
                          {v.nickname}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {absent.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-gray-400 w-10 shrink-0 pt-0.5">불참</span>
                    <div className="flex flex-wrap gap-1">
                      {absent.map((v) => (
                        <span key={v.kakaoId} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 font-bold">
                          {v.nickname}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {notVoted.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 w-10 shrink-0 pt-0.5">미투표</span>
                    <div className="flex flex-wrap gap-1">
                      {notVoted.map((u) => (
                        <span key={u.kakaoId} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 dark:bg-white/5 text-gray-300 dark:text-gray-600 font-medium">
                          {u.nickname}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 관리자: 투표 마감 */}
            {isAdmin && isUpcoming && matchVotes.length > 0 && (
              <button
                onClick={() => finalizeVote(match.id)}
                className="w-full py-2 rounded-xl border border-[#FF8FA3]/30 dark:border-[#FFB6C1]/20 text-[11px] font-bold text-[#FF8FA3] dark:text-[#FFB6C1] hover:bg-[#FF8FA3]/5 transition-colors mb-3"
              >
                투표 마감 (참석 {attending.length}명 확정)
              </button>
            )}

            {/* 댓글 섹션 */}
            <div className="border-t border-gray-100 dark:border-white/5 pt-3">
              <button
                onClick={() =>
                  setExpandedComments((prev) => {
                    const next = new Set(prev);
                    next.has(match.id) ? next.delete(match.id) : next.add(match.id);
                    return next;
                  })
                }
                className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-full"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                댓글 {matchComments.length > 0 && <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{matchComments.length}</span>}
                <span className="ml-auto">
                  {isCommentsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {isCommentsOpen && (
                <div className="mt-2 space-y-2">
                  {matchComments.map((c, i) => (
                    <div key={`${c.kakaoId}-${c.timestamp}-${i}`} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">{c.nickname}</span>
                          <span className="text-[9px] text-gray-400">{formatTime(c.timestamp)}</span>
                          {(currentUser?.kakaoId === c.kakaoId || isAdmin) && (
                            <button
                              onClick={() => deleteComment(match.id, c.kakaoId, c.timestamp)}
                              className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-600 dark:text-gray-300 mt-0.5">{c.message}</p>
                      </div>
                    </div>
                  ))}

                  {/* 댓글 입력 */}
                  {currentUser ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={commentInput[match.id] || ""}
                        onChange={(e) => setCommentInput((prev) => ({ ...prev, [match.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitComment(match.id); }}
                        placeholder="늦참, 후반만 가능 등..."
                        className="flex-1 text-[12px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-[#FF8FA3] dark:focus:border-[#FFB6C1] transition-colors"
                      />
                      <button
                        onClick={() => submitComment(match.id)}
                        disabled={submittingComment || !commentInput[match.id]?.trim()}
                        className="p-2 rounded-lg bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black disabled:opacity-30 transition-opacity"
                      >
                        {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 text-center py-2">로그인 후 댓글을 남길 수 있습니다</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0B0D]">
      <div className="max-w-md mx-auto pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-[#0B0B0D]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#FF8FA3] dark:text-[#FFB6C1]" />
              <h1 className="text-[15px] font-black text-gray-900 dark:text-white">출석 투표</h1>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* 진행 중 투표 */}
          {upcomingMatches.length > 0 ? (
            <>
              <p className="text-[10px] font-bold text-gray-400 tracking-[0.14em]">진행 중</p>
              {upcomingMatches.map((m) => renderMatchVoteCard(m, true))}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-[13px] text-gray-400 dark:text-gray-500 font-bold">진행 중인 투표가 없습니다</p>
              <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">다음 경기 일정이 등록되면 투표가 열립니다</p>
            </div>
          )}

          {/* 지난 투표 */}
          {pastMatches.length > 0 && (
            <>
              <button
                onClick={() => setExpandedPast(!expandedPast)}
                className="flex items-center gap-1 text-[10px] font-bold text-gray-400 tracking-[0.14em] w-full mt-6"
              >
                지난 투표 ({pastMatches.length})
                {expandedPast ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {expandedPast && (
                <div className="space-y-4">
                  {pastMatches.map((m) => renderMatchVoteCard(m, false))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
