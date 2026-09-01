"use client";
// 출석 투표.
//
// 홈과 같은 톤으로 맞췄다: 카드(테두리+그림자+라운드) 대신 헤어라인, 색은 데이터에만,
// 진행 중 투표는 프로필·홈 히어로처럼 배경 위에 직접 올린다.
//
//   진행 중  — 히어로. D-day 크게, 참석/미정/불참 큰 버튼 셋, 집계 막대, 명단 얼굴, 댓글
//   지난 투표 — 커뮤니티 목록(PastVoteRow). 한 줄 요약 + 눌러서 그 자리에서 펼침
//
// 서버 호출(투표·댓글·마감)은 예전 화면 그대로다. 껍데기만 바뀌었다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ArrowLeft,
  Check,
  Droplets,
  Loader2,
  LockOpen,
  MapPin,
  Send,
  Smile,
  Trash2,
} from "lucide-react";
import AppConfirmDialog from "../components/AppConfirmDialog";
import Emoticon from "../components/Emoticon";
import EmoticonPicker from "../components/EmoticonPicker";
import AppToast from "../components/AppToast";
import { casualKind, isCasualMatch, matchLogo } from "../components/home/match-result";
import { weatherEmoji } from "../lib/weather";
import PastVoteRow, { type PastVoteComment, type VoteTally } from "./PastVoteRow";
import VoterChip, { asVoters } from "./VoterChip";

interface MatchInfo {
  id: number;
  date: string;
  time: string;
  location: string;
  opponent: string;
  result: string;
  type: string;
  attendees: string;
  attendanceStatus: "진행중" | "마감";
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
  /** 더덕티콘 id. 사랑방·경기 댓글과 같은 목록을 쓴다([[app/lib/emoticons.ts]]). */
  emoticon?: string | null;
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
  currentUser: { kakaoId: string; name: string; image: string } | null;
  isAdmin: boolean;
}

/** 명단 줄. 응답별 고유색을 라벨과 칩에 함께 쓴다. */
const ROSTER_GROUPS = [
  {
    key: "attending",
    label: "참석",
    labelTone: "text-[#FF8FA3] dark:text-[#FFB6C1]",
    chipTone: "bg-[#FF8FA3]/10 text-[#FF8FA3] dark:bg-[#FFB6C1]/15 dark:text-[#FFB6C1]",
  },
  {
    key: "maybe",
    label: "미정",
    labelTone: "text-amber-500 dark:text-amber-400",
    chipTone: "bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400",
  },
  {
    key: "absent",
    label: "불참",
    labelTone: "text-gray-400 dark:text-white/35",
    chipTone: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/45",
  },
  {
    key: "noReply",
    label: "미투표",
    labelTone: "text-gray-300 dark:text-white/25",
    chipTone: "bg-gray-50 text-gray-300 dark:bg-white/5 dark:text-white/25",
  },
] as const;

const OPTIONS = [
  { key: "참석", tone: "app-choice-attending" },
  { key: "미정", tone: "app-choice-maybe" },
  { key: "불참", tone: "app-choice-absent" },
] as const;

function getDDay(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${day}`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const isUndecided = (v: string) => !v || v.trim() === "" || v.trim() === "미정";

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
  const router = useRouter();
  const [votes, setVotes] = useState<AttendanceVote[]>(initialVotes);
  const [comments, setComments] = useState<VoteComment[]>(initialComments);
  const [submittingVote, setSubmittingVote] = useState<{ matchId: number; response: string } | null>(
    null,
  );
  const [savedVote, setSavedVote] = useState<{ matchId: number; response: string } | null>(null);
  const [commentInput, setCommentInput] = useState<Record<number, string>>({});
  const [commentEmoticon, setCommentEmoticon] = useState<Record<number, string | null>>({});
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    matchId: number;
    kakaoId: string;
    timestamp: string;
    message: string;
  } | null>(null);
  const [reopenTarget, setReopenTarget] = useState<number | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const allMatches = Array.from(
    new Map([...upcomingMatches, ...pastMatches].map((m) => [m.id, m])).values(),
  );
  const [closedIds, setClosedIds] = useState<Set<number>>(
    new Set(allMatches.filter((m) => m.attendanceStatus === "마감").map((m) => m.id)),
  );

  const activeMatches = upcomingMatches.filter((m) => !closedIds.has(m.id));
  const closedMatches = [
    ...pastMatches,
    ...upcomingMatches.filter((m) => closedIds.has(m.id)),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  /**
   * 응답별 이름 묶음. 무응답은 등록 회원 중 응답 안 한 사람.
   *
   * **그 응답을 한 시각 순**으로 세운다(먼저 누른 사람이 앞). 참석 순서가 곧
   * 엔트리 순서라 "몇 번째로 손 들었나"가 보여야 한다. 백엔드는 행이 만들어진
   * 순서(=처음 투표한 순서)로 주므로, 미정에서 참석으로 바꾼 사람이 원래 자리에
   * 그대로 남아 버린다.
   */
  const tallyOf = (matchId: number): VoteTally => {
    const mine = votes.filter((v) => v.matchId === matchId);
    const at = (ts: string) => {
      const t = new Date(ts).getTime();
      // 시각을 못 읽으면 맨 뒤로 — 읽히는 사람들의 순서를 흐트러뜨리지 않는다.
      return isNaN(t) ? Number.POSITIVE_INFINITY : t;
    };
    const pick = (response: string) =>
      mine
        .filter((v) => v.response === response)
        .sort((a, b) => at(a.timestamp) - at(b.timestamp))
        .map((v) => ({ name: v.nickname, at: v.timestamp }));
    const replied = new Set(mine.map((v) => v.kakaoId));
    return {
      attending: pick("참석"),
      maybe: pick("미정"),
      absent: pick("불참"),
      noReply: users.filter((u) => !replied.has(u.kakaoId)).map((u) => u.nickname),
    };
  };

  // ── 서버 호출 (예전 화면과 동일) ──────────────────────────

  const submitVote = async (matchId: number, response: string) => {
    if (!currentUser || submittingVote) return;
    setSubmittingVote({ matchId, response });
    setSavedVote(null);

    // 낙관적 반영: 백엔드 왕복을 기다리면 탭한 뒤 잠깐 멈춘 것처럼 느껴진다.
    const before = votes;
    setVotes((prev) => {
      const filtered = prev.filter(
        (v) => !(v.matchId === matchId && v.kakaoId === currentUser.kakaoId),
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

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, response }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "투표 실패");
      router.refresh();
      setSavedVote({ matchId, response });
      window.setTimeout(() => {
        setSavedVote((cur) => (cur?.matchId === matchId && cur.response === response ? null : cur));
      }, 1200);
    } catch (e) {
      setVotes(before); // 롤백
      setToast({ message: e instanceof Error ? e.message : "투표에 실패했어요.", tone: "error" });
    } finally {
      setSubmittingVote(null);
    }
  };

  const addComment = async (matchId: number) => {
    const msg = (commentInput[matchId] || "").trim();
    const emoticon = commentEmoticon[matchId] || null;
    // 이모티콘만 보내는 것도 댓글이다.
    if ((!msg && !emoticon) || !currentUser || submittingComment) return;
    setSubmittingComment(true);

    const before = comments;
    const optimistic: VoteComment = {
      matchId,
      kakaoId: currentUser.kakaoId,
      nickname: currentUser.name,
      message: msg,
      emoticon,
      timestamp: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimistic]);
    setCommentInput((prev) => ({ ...prev, [matchId]: "" }));
    setCommentEmoticon((prev) => ({ ...prev, [matchId]: null }));
    setPickerFor(null);

    try {
      const res = await fetch("/api/vote-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, message: msg, emoticon }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "댓글 실패");
      // 서버가 저장한 실제 행(timestamp)으로 갈아끼운다.
      // 임시 timestamp 를 그대로 들고 있으면 이 댓글의 삭제가 서버에서 실패한다.
      const saved = (await res.json().catch(() => null))?.comment as VoteComment | undefined;
      if (saved?.timestamp) {
        setComments((prev) => prev.map((c) => (c === optimistic ? { ...c, ...saved } : c)));
      }
      router.refresh();
    } catch (e) {
      setComments(before);
      setCommentInput((prev) => ({ ...prev, [matchId]: msg }));
      setCommentEmoticon((prev) => ({ ...prev, [matchId]: emoticon }));
      setToast({ message: e instanceof Error ? e.message : "댓글 등록에 실패했어요.", tone: "error" });
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
      router.refresh();
      setComments((prev) =>
        prev.filter(
          (c) =>
            !(c.matchId === matchId && c.kakaoId === targetKakaoId && c.timestamp === timestamp),
        ),
      );
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "댓글 삭제에 실패했어요.", tone: "error" });
      throw e;
    }
  };

  const reopenVote = async (matchId: number) => {
    try {
      const res = await fetch("/api/attendance/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, action: "open" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "다시 열기 실패");
      router.refresh();
      setClosedIds((cur) => {
        const next = new Set(cur);
        next.delete(matchId);
        return next;
      });
      setToast({ message: "투표를 다시 열었어요.", tone: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "투표를 다시 열지 못했어요.", tone: "error" });
      throw e;
    }
  };

  // ── 진행 중 투표 (히어로) ────────────────────────────────

  const renderActive = (match: MatchInfo) => {
    const tally = tallyOf(match.id);
    const total = tally.attending.length + tally.maybe.length + tally.absent.length;
    const pct = (n: number) => (total > 0 ? `${(n / total) * 100}%` : "0%");
    const myVote = currentUser
      ? votes.find((v) => v.matchId === match.id && v.kakaoId === currentUser.kakaoId)?.response
      : undefined;
    const dDay = getDDay(match.date);
    const weather = weatherMap[match.id];
    const logo = matchLogo(match);
    const casual = isCasualMatch(match.result, match.type, match.opponent);
    const opponentLabel = casual
      ? casualKind(match.result, match.type).ko
      : isUndecided(match.opponent)
        ? "상대 미정"
        : match.opponent;
    const matchComments = comments.filter((c) => c.matchId === match.id);
    const saved = savedVote?.matchId === match.id ? savedVote.response : null;

    return (
      <section key={match.id} className="relative overflow-hidden px-4 pb-6 pt-5">
        {/* 히어로 장식 — 홈·프로필과 같은 문법 */}
        <div
          className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#FF8FA3]"
          style={{ opacity: 0.17, filter: "blur(46px)" }}
        />

        <div className="relative">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black tracking-[0.2em] text-gray-400 dark:text-white/35">
                {match.type}
              </p>
              <h2 className="mt-1.5 flex items-center gap-1.5 text-[21px] font-black leading-none tracking-[-0.035em] text-gray-900 dark:text-white">
                {logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt=""
                    className="h-5 w-5 shrink-0 rounded-full bg-white object-contain ring-1 ring-black/5"
                  />
                )}
                <span className="truncate">{opponentLabel}</span>
              </h2>
              <p className="mt-2 text-[11px] font-bold text-gray-500 dark:text-white/50">
                {formatDate(match.date)}
                {!isUndecided(match.time) && ` · ${match.time}`}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-white/50">
                <MapPin width={12} height={12} strokeWidth={2.2} className="shrink-0" />
                <span className="truncate">
                  {isUndecided(match.location) ? "장소 미정" : match.location}
                </span>
              </p>
            </div>

            <div className="shrink-0 text-right">
              {dDay !== null && (
                <p className="text-[40px] font-black leading-[0.85] tracking-[-0.05em] tabular-nums text-[#FF8FA3] dark:text-[#FFB6C1]">
                  {dDay === 0 ? "D-DAY" : dDay > 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`}
                </p>
              )}
              {weather?.available && (
                <p className="mt-2 text-[11px] font-bold text-gray-500 dark:text-white/50">
                  {weatherEmoji(weather.icon)} {weather.temp}°
                  {weather.pop >= 40 && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-blue-400">
                      <Droplets width={10} height={10} />
                      {weather.pop}%
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* 투표 버튼 — 이 화면에서 제일 큰 것 */}
          {currentUser ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {OPTIONS.map(({ key, tone }) => {
                const selected = myVote === key;
                const busy =
                  submittingVote?.matchId === match.id && submittingVote.response === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => submitVote(match.id, key)}
                    disabled={!!submittingVote}
                    aria-pressed={selected}
                    className={`app-choice flex items-center justify-center gap-1 rounded-2xl py-3.5 text-[14px] font-black ${
                      selected
                        ? tone
                        : "app-choice-idle"
                    }`}
                  >
                    {busy ? (
                      <Loader2 width={15} height={15} className="animate-spin" />
                    ) : (
                      <>
                        {key}
                        {selected && saved === key && (
                          <Check width={14} height={14} strokeWidth={3} />
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn("kakao")}
              className="mt-5 w-full rounded-2xl bg-[#FEE500] py-3.5 text-[13px] font-black text-black"
            >
              카카오 로그인하고 투표하기
            </button>
          )}

          {/* 집계 */}
          <div className="mt-4">
            {total > 0 ? (
              <>
                <div className="flex h-[7px] overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                  {tally.attending.length > 0 && (
                    <div className="bg-[#FF8FA3]" style={{ width: pct(tally.attending.length) }} />
                  )}
                  {tally.maybe.length > 0 && (
                    <div className="bg-amber-400" style={{ width: pct(tally.maybe.length) }} />
                  )}
                  {tally.absent.length > 0 && (
                    <div
                      className="bg-gray-400 dark:bg-white/25"
                      style={{ width: pct(tally.absent.length) }}
                    />
                  )}
                </div>
                <p className="mt-2 flex gap-3 text-[11px] font-black">
                  <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">
                    참석 <span className="tabular-nums">{tally.attending.length}</span>
                  </span>
                  <span className="text-amber-500 dark:text-amber-400">
                    미정 <span className="tabular-nums">{tally.maybe.length}</span>
                  </span>
                  <span className="text-gray-400 dark:text-white/35">
                    불참 <span className="tabular-nums">{tally.absent.length}</span>
                  </span>
                  {tally.noReply.length > 0 && (
                    <span className="ml-auto text-gray-300 dark:text-white/25">
                      무응답 <span className="tabular-nums">{tally.noReply.length}</span>
                    </span>
                  )}
                </p>
              </>
            ) : (
              <p className="text-[11px] font-bold text-gray-300 dark:text-white/25">
                아직 아무도 응답하지 않았어요.
              </p>
            )}
          </div>

          {/* 명단 — 참석 · 미정 · 불참 · 미투표 순으로 줄을 나눈다.
              라벨을 왼쪽 고정폭에 세우면 세 줄의 이름이 같은 지점에서 시작해 훑기 쉽다.
              얼굴은 안 붙인다 — 여긴 "누가 몇 명인지"를 세는 화면이라 칩이 작을수록 좋다.
              색은 라벨과 칩에만 두고(응답별 고유색), 배경 골격엔 안 쓴다. */}
          {(tally.attending.length > 0 ||
            tally.maybe.length > 0 ||
            tally.absent.length > 0 ||
            tally.noReply.length > 0) && (
            <div className="mt-4 flex flex-col gap-2.5 border-t border-gray-200 pt-3.5 dark:border-white/[0.08]">
              {ROSTER_GROUPS.map(({ key, label, labelTone, chipTone }) => {
                const names = tally[key];
                if (names.length === 0) return null;
                return (
                  <div key={key} className="flex items-start gap-2">
                    <span
                      className={`w-11 shrink-0 pt-0.5 text-[12px] font-black ${labelTone}`}
                    >
                      {label}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {asVoters(names).map((v) => (
                        <VoterChip key={v.name} voter={v} chipTone={chipTone} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 댓글 */}
          <div className="mt-4 border-t border-gray-200 pt-3.5 dark:border-white/[0.08]">
            <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
              댓글 <span className="tabular-nums">{matchComments.length}</span>
            </p>
            <div className="flex flex-col gap-3">
              {matchComments.map((c, i) => {
                const canDelete = isAdmin || c.kakaoId === currentUser?.kakaoId;
                return (
                  <div key={`${c.timestamp}-${i}`} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5">
                        <Link
                          href={`/players/${encodeURIComponent(c.nickname)}`}
                          className="truncate text-[12.5px] font-black text-gray-900 active:opacity-60 dark:text-white"
                        >
                          {c.nickname}
                        </Link>
                        <span className="shrink-0 text-[10px] font-bold text-gray-300 dark:text-white/25">
                          {formatTime(c.timestamp)}
                        </span>
                      </p>
                      {c.emoticon && (
                        <div className="mt-1.5">
                          <Emoticon id={c.emoticon} size={64} />
                        </div>
                      )}
                      {c.message && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-[1.55] text-gray-700 [overflow-wrap:anywhere] dark:text-white/70">
                          {c.message}
                        </p>
                      )}
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            matchId: match.id,
                            kakaoId: c.kakaoId,
                            timestamp: c.timestamp,
                            message: c.message,
                          })
                        }
                        aria-label="댓글 삭제"
                        className="shrink-0 p-1 text-gray-300 active:opacity-60 dark:text-white/25"
                      >
                        <Trash2 width={14} height={14} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                );
              })}

              {matchComments.length === 0 && (
                <p className="text-[12px] font-bold text-gray-300 dark:text-white/25">
                  아직 댓글이 없어요.
                </p>
              )}

              {/* 입력창 — 홈 피드 댓글과 같은 알약 모양.
                  투명 배경에 밑줄도 없으면 "여기 쓸 수 있다"가 안 읽힌다.
                  글자 16px 은 iOS 에서 포커스 시 화면이 확대되는 걸 막기 위한 값이다. */}
              {currentUser ? (
                <>
                {pickerFor === match.id && (
                  <EmoticonPicker
                    selected={commentEmoticon[match.id] || null}
                    onPick={(id) => {
                      setCommentEmoticon((prev) => ({
                        ...prev,
                        [match.id]: prev[match.id] === id ? null : id,
                      }));
                      setPickerFor(null);
                    }}
                  />
                )}
                {commentEmoticon[match.id] && (
                  <div className="flex items-center gap-2">
                    <Emoticon id={commentEmoticon[match.id]} size={36} />
                    <span className="flex-1 text-[10.5px] font-bold text-gray-400 dark:text-white/30">
                      이 이모티콘과 함께 올라가요
                    </span>
                    <button
                      type="button"
                      onClick={() => setCommentEmoticon((prev) => ({ ...prev, [match.id]: null }))}
                      aria-label="이모티콘 빼기"
                      className="px-1 text-[10.5px] font-black text-gray-400 active:opacity-60"
                    >
                      빼기
                    </button>
                  </div>
                )}
                <div className="mt-1 flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 dark:bg-white/[0.07]">
                  <button
                    type="button"
                    onClick={() => setPickerFor((cur) => (cur === match.id ? null : match.id))}
                    aria-label="이모티콘"
                    aria-expanded={pickerFor === match.id}
                    className={`shrink-0 transition-colors ${
                      pickerFor === match.id
                        ? "text-[#FF8FA3] dark:text-[#FFB6C1]"
                        : "text-gray-400 dark:text-white/30"
                    }`}
                  >
                    <Smile width={17} height={17} strokeWidth={2.1} />
                  </button>
                  <input
                    value={commentInput[match.id] || ""}
                    onChange={(e) =>
                      setCommentInput((prev) => ({ ...prev, [match.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) addComment(match.id);
                    }}
                    placeholder="댓글 달기…"
                    maxLength={300}
                    className="min-w-0 flex-1 bg-transparent text-[16px] text-gray-900 outline-none placeholder:text-gray-300 dark:text-white dark:placeholder:text-white/25"
                  />
                  <button
                    type="button"
                    onClick={() => addComment(match.id)}
                    disabled={
                      (!(commentInput[match.id] || "").trim() && !commentEmoticon[match.id]) ||
                      submittingComment
                    }
                    aria-label="댓글 등록"
                    className="shrink-0 text-[#FF8FA3] disabled:opacity-30 dark:text-[#FFB6C1]"
                  >
                    {submittingComment ? (
                      <Loader2 width={16} height={16} className="animate-spin" />
                    ) : (
                      <Send width={16} height={16} strokeWidth={2.2} />
                    )}
                  </button>
                </div>
                </>
              ) : (
                <p className="text-[12px] font-bold text-gray-300 dark:text-white/25">
                  로그인하면 댓글을 달 수 있어요.
                </p>
              )}
            </div>
          </div>

        </div>
      </section>
    );
  };

  return (
    <main className="relative mx-auto min-h-dvh max-w-md bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-zinc-100">
      <div className="app-page-header safe-header-py-3">
        <Link
          href="/"
          aria-label="뒤로"
          className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 dark:text-gray-300"
        >
          <ArrowLeft width={18} height={18} strokeWidth={2.4} />
        </Link>
        <span className="app-header-label">VOTE</span>
      </div>

      {activeMatches.length > 0 ? (
        <div className="divide-y divide-gray-200 dark:divide-white/[0.08]">
          {activeMatches.map(renderActive)}
        </div>
      ) : (
        <div className="px-4 py-16 text-center">
          <p className="text-[13px] font-bold text-gray-400 dark:text-gray-500">
            진행 중인 투표가 없어요.
          </p>
          <p className="mt-1 text-[11px] font-bold text-gray-300 dark:text-gray-600">
            다음 경기 일정이 등록되면 투표가 열립니다.
          </p>
        </div>
      )}

      {closedMatches.length > 0 && (
        <section className="px-4 pb-24 pt-6">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
            지난 투표 <span className="tabular-nums">{closedMatches.length}</span>
          </p>
          <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {closedMatches.map((m) => {
              const cs: PastVoteComment[] = comments
                .filter((c) => c.matchId === m.id)
                .map((c) => ({
                  nickname: c.nickname,
                  message: c.message,
                  timestamp: c.timestamp,
                  emoticon: c.emoticon,
                }));
              return (
                <div key={m.id}>
                  <PastVoteRow
                    opponent={isUndecided(m.opponent) ? "상대 미정" : m.opponent}
                    result={m.result}
                    type={m.type}
                    date={m.date}
                    location={isUndecided(m.location) ? "장소 미정" : m.location}
                    closed={closedIds.has(m.id)}
                    tally={tallyOf(m.id)}
                    comments={cs}
                  />
                  {/* 마감은 이제 경기 결과를 저장할 때 자동으로 된다(app/api/matches/[id]).
                      그래서 "마감" 버튼은 없앴고, 되돌리는 쪽만 남긴다 —
                      결과를 잘못 넣었다가 예정으로 되돌린 경우에 투표를 다시 열어야 해서다.
                      경기가 끝난 뒤엔 참석자가 이미 경기 기록에 있어서 되돌릴 이유가 없다. */}
                  {isAdmin && m.result === "예정" && closedIds.has(m.id) && (
                    <button
                      type="button"
                      onClick={() => setReopenTarget(m.id)}
                      className="mb-3 flex items-center gap-1 text-[11px] font-black text-gray-400 active:opacity-60 dark:text-white/35"
                    >
                      <LockOpen width={12} height={12} strokeWidth={2.2} />
                      투표 다시 열기
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <AppConfirmDialog
        open={!!deleteTarget}
        title="댓글을 삭제할까요?"
        description={deleteTarget?.message}
        confirmLabel="삭제"
        destructive
        busy={confirmBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setConfirmBusy(true);
          try {
            await deleteComment(deleteTarget.matchId, deleteTarget.kakaoId, deleteTarget.timestamp);
            setDeleteTarget(null);
          } catch {
            // 오류 문구는 토스트가 맡고, 확인창은 다시 시도할 수 있게 유지한다.
          } finally {
            setConfirmBusy(false);
          }
        }}
      />
      <AppConfirmDialog
        open={reopenTarget !== null}
        title="투표를 다시 열까요?"
        description="회원들이 참석 여부를 다시 변경할 수 있게 됩니다."
        confirmLabel="다시 열기"
        busy={confirmBusy}
        onCancel={() => setReopenTarget(null)}
        onConfirm={async () => {
          if (reopenTarget === null) return;
          setConfirmBusy(true);
          try {
            await reopenVote(reopenTarget);
            setReopenTarget(null);
          } catch {
            // 오류 문구는 토스트가 맡는다.
          } finally {
            setConfirmBusy(false);
          }
        }}
      />
      <AppToast message={toast?.message ?? null} tone={toast?.tone} />
    </main>
  );
}
