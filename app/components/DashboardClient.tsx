"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "./ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
  Plus,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Trash2,
  Pencil,
  Film,
  MessageCircle,
  Star,
  Tent,
  User,
  Shield,
  Lock,
  Check,
  Swords,
  Sparkles,
  LogIn,
  LogOut,
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { shareStoryCard } from "../lib/draw-story-card";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import { parseWeather, weatherEmoji } from "../lib/weather";
import { TitleBadges } from "./TitleBadges";
import type { EarnedTitle } from "../lib/titles";
import type { SubstitutionEvent } from "../lib/lineup";
import AppBottomNav from "./AppBottomNav";
import LineupViewer from "./LineupViewer";

// 숫자가 0에서 목표값까지 부드럽게 올라가는 카운트업 (전광판 느낌)
function CountUp({
  value,
  decimals = 0,
  duration = 1000,
}: {
  value: number;
  decimals?: number;
  duration?: number;
}) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    let startTs = 0;
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const t = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display.toFixed(decimals)}</>;
}

// 모바일 햅틱: 지원 기기에서만 짧게 진동
const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch { /* 미지원 무시 */ }
};

function getMatchDotStyle(result: string): string {
  if (result === "승") return "bg-[#FF8FA3]";
  if (result === "패") return "bg-gray-400";
  if (result === "무") return "bg-amber-400";
  if (result === "자체전") return "bg-violet-400";
  return "border border-gray-400 dark:border-gray-500";
}

function getMatchCircleStyle(result: string): string {
  if (result === "승") return "bg-[#FF8FA3] text-white";
  if (result === "패") return "bg-gray-500 text-white";
  if (result === "무") return "bg-amber-400 text-white";
  if (result === "자체전") return "bg-violet-400 text-white";
  return "border-2 border-[#FF8FA3] dark:border-[#FFB6C1] text-[#FF8FA3] dark:text-[#FFB6C1]";
}

function toMatchDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const SPECIAL_EVENTS: { date: string; label: string }[] = [
  { date: "2026-06-06", label: "야유회" },
  { date: "2026-06-07", label: "야유회" },
];

// --- 타입 정의 ---
export interface MomVoteData {
  matchId: number;
  voterName: string;
  votedFor: string;
  voteType: string; // "공격" | "수비"
  timestamp: string;
}

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
  location?: string;
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
  quarter: string; // "예상" | "1Q" | "2Q" | "3Q" | "4Q" | "5Q" | "6Q"
  formation: string; // "4-3-3" | "4-4-2" | "3-5-2" | "4-2-3-1" 등
  players: string[]; // p1~p11
  subs: string[]; // 대기 선수 sub1~sub5
  substitutions: SubstitutionEvent[]; // 실제 교체 OUT → IN
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
  photos?: string; // M열 - Drive 파일ID (쉼표 구분)
  weather?: string; // N열 - "28°C,맑음,01d,10"
  attendanceStatus?: "진행중" | "마감"; // O열 - 출석 투표 상태
}

export interface MediaData {
  id: number;
  type: "video" | "image";
  url: string;
  title: string;
  uploadedAt: string;
}

export interface AttendanceVoteData {
  matchId: number;
  kakaoId: string;
  nickname: string;
  response: string; // "참석" | "불참" | "미정"
  timestamp: string;
}

interface DashboardClientProps {
  players: PlayerData[];
  matches: MatchData[];
  notice?: NoticeData;
  lineups: LineupData[];
  rosterMap: Record<string, string>;
  captainRoles?: Record<string, string>;
  currentUser?: { kakaoId: string; name: string; image: string } | null;
  isAdmin?: boolean;
  attendanceVotes?: AttendanceVoteData[];
  playerTitles?: Record<string, EarnedTitle[]>;
  initialView?: "home" | "matches" | "stats";
}

export default function DashboardClient({
  players,
  matches,
  notice,
  lineups,
  rosterMap,
  captainRoles,
  currentUser,
  isAdmin = false,
  attendanceVotes: initialAttendanceVotes = [],
  playerTitles = {},
  initialView = "home",
}: DashboardClientProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [matchList, setMatchList] = React.useState<MatchData[]>(matches);
  const [showTopBtn, setShowTopBtn] = React.useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(initialView === "stats" ? "stats" : "matches");

  // 출석 투표 (요약 카드용, 읽기 전용)
  const attendanceVoteMap = React.useMemo(() => {
    const map: Record<number, AttendanceVoteData[]> = {};
    initialAttendanceVotes.forEach((v) => {
      if (!map[v.matchId]) map[v.matchId] = [];
      map[v.matchId].push(v);
    });
    return map;
  }, [initialAttendanceVotes]);

  // 공지사항 로컬 상태
  const [localNotice, setLocalNotice] = React.useState(notice);
  const [noticeEditModal, setNoticeEditModal] = React.useState(false);
  const [noticeEditForm, setNoticeEditForm] = React.useState({
    date: notice?.date || "",
    title: notice?.title || "",
    content: notice?.content || "",
    important: notice?.important || false,
    location: notice?.location || "",
  });
  const [savingNotice, setSavingNotice] = React.useState(false);

  const saveNotice = async () => {
    setSavingNotice(true);
    try {
      const res = await fetch("/api/notice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeEditForm),
      });
      if (!res.ok) throw new Error("저장 실패");
      setLocalNotice({ id: 0, ...noticeEditForm });
      setNoticeEditModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSavingNotice(false);
    }
  };

  // 경기 일정 등록
  const [addMatchModal, setAddMatchModal] = React.useState(false);
  const [addMatchForm, setAddMatchForm] = React.useState({
    date: "",
    time: "",
    location: "",
    opponent: "",
    type: "일반 매칭",
  });
  const [addingMatch, setAddingMatch] = React.useState(false);

  const addMatch = async () => {
    if (!addMatchForm.date) return;
    setAddingMatch(true);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addMatchForm),
      });
      if (!res.ok) throw new Error("등록 실패");
      const newMatch: MatchData = {
        id: matchList.length,
        date: addMatchForm.date,
        time: addMatchForm.time || "미정",
        location: addMatchForm.location || "미정",
        opponent: addMatchForm.opponent || "미정",
        ourScore: "-",
        theirScore: "-",
        result: "예정",
        type: addMatchForm.type,
        goals: "",
        assists: "",
        mom: "",
        attendees: "",
        photos: "",
        attendanceStatus: "진행중",
      };
      setMatchList((prev) => [...prev, newMatch]);
      setAddMatchModal(false);
      setAddMatchForm({ date: "", time: "", location: "", opponent: "", type: "일반 매칭" });
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setAddingMatch(false);
    }
  };

  React.useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [statSort, setStatSort] = React.useState<"pos" | "apps" | "goals" | "assists" | "mom">("pos");
  const matchCardRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(new Date());

  // 경기 결과 입력
  const [matchEditModal, setMatchEditModal] = React.useState<number | null>(null);
  const [editDate, setEditDate] = React.useState("");
  const [editTime, setEditTime] = React.useState("");
  const [editLocation, setEditLocation] = React.useState("");
  const [editOpponent, setEditOpponent] = React.useState("");
  const [editType, setEditType] = React.useState("일반 매칭");
  const [editResult, setEditResult] = React.useState("예정");
  const [editOurScore, setEditOurScore] = React.useState("");
  const [editTheirScore, setEditTheirScore] = React.useState("");
  const [editAttendees, setEditAttendees] = React.useState<Set<string>>(new Set());
  const [editGoalEvents, setEditGoalEvents] = React.useState<{ scorer: string; assister: string }[]>([]);
  const [showGoalPicker, setShowGoalPicker] = React.useState(false);
  const [goalPickerScorer, setGoalPickerScorer] = React.useState("");
  const [goalPickerAssister, setGoalPickerAssister] = React.useState("");
  const [savingMatchResult, setSavingMatchResult] = React.useState(false);
  const rosterNames = React.useMemo(() => Object.keys(rosterMap), [rosterMap]);

  // 라인업 필드/프로필용 이름 → 시즌 스탯 맵
  const playerStatsMap = React.useMemo(() => {
    const m: Record<string, { apps: number; goals: number; assists: number; mom: number; pos?: string }> = {};
    players.forEach((p) => {
      m[p.name.trim()] = {
        apps: Number(p.apps) || 0,
        goals: Number(p.goals) || 0,
        assists: Number(p.assists) || 0,
        mom: Number(p.mom) || 0,
        pos: p.pos,
      };
    });
    return m;
  }, [players]);

  // 선수 프로필 바텀시트
  const goToPlayer = (n: string) =>
    router.push(`/players/${encodeURIComponent(n.trim())}`);

  // 스토리 카드 공유
  const [sharingStory, setSharingStory] = React.useState<number | null>(null);

  const scrollToMatch = (id: number) => {
    const anchor = matchCardRefs.current[id];
    if (!anchor) return;
    const card = anchor.nextElementSibling as HTMLElement | null;
    if (!card) return;
    const top = window.scrollY + card.getBoundingClientRect().top + card.offsetHeight / 2 - window.innerHeight / 2;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const matchesByDate = React.useMemo(() => {
    const map: Record<string, MatchData[]> = {};
    matchList.filter((m) => m.type !== "야유회").forEach((m) => {
      const key = m.date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [matchList]);

  // D-Day 계산
  const getDDay = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const openMatchEdit = (match: MatchData) => {
    setEditDate(match.date || "");
    setEditTime(match.time === "미정" ? "" : (match.time || ""));
    setEditLocation(match.location === "미정" ? "" : (match.location || ""));
    setEditOpponent(match.opponent || "");
    setEditType(match.type || "일반 매칭");
    setEditResult(match.result || "예정");
    setEditOurScore(!match.ourScore || match.ourScore === "-" ? "" : String(match.ourScore));
    setEditTheirScore(!match.theirScore || match.theirScore === "-" ? "" : String(match.theirScore));
    const attendeeArr = match.attendees ? match.attendees.split(",").map((s) => s.trim()).filter(Boolean) : [];
    setEditAttendees(new Set(attendeeArr));
    const goalArr = match.goals ? match.goals.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const assistArr = match.assists ? match.assists.split(",").map((s) => s.trim()) : [];
    setEditGoalEvents(goalArr.map((scorer, i) => ({ scorer, assister: assistArr[i] || "" })));
    setShowGoalPicker(false);
    setGoalPickerScorer("");
    setGoalPickerAssister("");
    setMatchEditModal(match.id);
  };

  const saveMatchResult = async () => {
    if (matchEditModal === null) return;
    setSavingMatchResult(true);
    try {
      const goalsStr = editGoalEvents.map((e) => e.scorer).join(",");
      const assistsStr = editGoalEvents.map((e) => e.assister || "").join(",");
      const attendeesStr = Array.from(editAttendees).join(",");
      const res = await fetch(`/api/matches/${matchEditModal}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: editDate, time: editTime, location: editLocation, opponent: editOpponent, type: editType, result: editResult, ourScore: editOurScore, theirScore: editTheirScore, goals: goalsStr, assists: assistsStr, attendees: attendeesStr }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setMatchList((prev) =>
        prev.map((m) =>
          m.id === matchEditModal
            ? { ...m, date: editDate, time: editTime, location: editLocation, opponent: editOpponent, type: editType, result: editResult, ourScore: editOurScore || "-", theirScore: editTheirScore || "-", goals: goalsStr, assists: assistsStr, attendees: attendeesStr }
            : m
        )
      );
      setMatchEditModal(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSavingMatchResult(false);
    }
  };

  const nextMatch = [...matchList]
    .filter((m) => m.result === "예정" && m.type !== "야유회" && m.attendanceStatus !== "마감")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const dDay = nextMatch ? getDDay(nextMatch.date) : null;
  const nextVotes = nextMatch ? attendanceVoteMap[nextMatch.id] || [] : [];
  const nextAttending = nextVotes.filter((vote) => vote.response === "참석").length;
  const nextMaybe = nextVotes.filter((vote) => vote.response === "미정").length;
  const nextAbsent = nextVotes.filter((vote) => vote.response === "불참").length;
  const nextVoteTotal = nextAttending + nextMaybe + nextAbsent;
  const myNextVote = currentUser
    ? nextVotes.find((vote) => vote.kakaoId === currentUser.kakaoId)?.response
    : undefined;

  // 사진 상태
  const [openPhotos, setOpenPhotos] = React.useState<Set<number>>(new Set());
  const [localPhotoMap, setLocalPhotoMap] = React.useState<Record<number, string[]>>({});
  const [deletedPhotos, setDeletedPhotos] = React.useState<Record<number, string[]>>({});
  const [uploadingPhoto, setUploadingPhoto] = React.useState<number | null>(null);
  const [lightbox, setLightbox] = React.useState<{ ids: string[]; index: number } | null>(null);
  const fileInputRefs = React.useRef<Record<number, HTMLInputElement | null>>({});

  const togglePhotos = (matchId: number) => {
    setOpenPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const handlePhotoUpload = async (matchId: number, files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setUploadingPhoto(matchId);
    try {
      // 1. 서버에서 서명 발급
      const signRes = await fetch("/api/photos/sign");
      const { timestamp, signature, apiKey, cloudName, folder } = await signRes.json();

      // 2. Cloudinary에 직접 병렬 업로드
      const uploadedUrls = await Promise.all(
        fileArray.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("api_key", apiKey);
          fd.append("timestamp", String(timestamp));
          fd.append("signature", signature);
          fd.append("folder", folder);
          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: "POST", body: fd }
          );
          const data = await res.json();
          if (!data.secure_url) throw new Error("업로드 실패");
          return data.secure_url as string;
        })
      );

      // 3. 서버에 URL 저장
      const saveRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, urls: uploadedUrls }),
      });
      if (saveRes.ok) {
        setLocalPhotoMap((prev) => ({
          ...prev,
          [matchId]: [...(prev[matchId] || []), ...uploadedUrls],
        }));
      } else {
        const { error } = await saveRes.json();
        alert(error || "저장 실패");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploadingPhoto(null);
    }
  };

  // MOM 투표 상태
  const [momVoteMap, setMomVoteMap] = React.useState<Record<number, MomVoteData[]>>({});
  const [submittingVote, setSubmittingVote] = React.useState<number | null>(null);
  const [openVotes, setOpenVotes] = React.useState<Set<number>>(new Set());
  const [momModal, setMomModal] = React.useState<{ matchId: number; attendees: string[] } | null>(null);
  const [momModalVoter, setMomModalVoter] = React.useState("");
  const [momModalAtk, setMomModalAtk] = React.useState("");
  const [momModalDef, setMomModalDef] = React.useState("");

  // 페이지 로드 시 마감된 경기 MOM 자동 확정 후 카드에 반영 (관리자 방문 시에만 실행)
  React.useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/mom-vote/finalize", { method: "POST" })
      .then((r) => r.json())
      .then((data: { finalized?: { matchId: number; mom: string }[] }) => {
        if (data.finalized && data.finalized.length > 0) {
          setMatchList((prev) =>
            prev.map((m) => {
              const found = data.finalized!.find((f) => f.matchId === m.id);
              return found ? { ...m, mom: found.mom } : m;
            })
          );
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  React.useEffect(() => {
    fetch("/api/mom-vote")
      .then((r) => r.json())
      .then((data: MomVoteData[]) => {
        const map: Record<number, MomVoteData[]> = {};
        data.forEach((v) => {
          if (!map[v.matchId]) map[v.matchId] = [];
          map[v.matchId].push(v);
        });
        setMomVoteMap(map);
      })
      .catch(() => {});
  }, []);

  const submitMomVote = async (matchId: number, voterName: string, votedFor: string, voteType: string) => {
    if (!voterName.trim()) return;
    setSubmittingVote(matchId);
    try {
      const res = await fetch("/api/mom-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, voterName: voterName.trim(), votedFor, voteType }),
      });
      if (!res.ok) throw new Error("투표 저장 실패");
      setMomVoteMap((prev) => {
        const filtered = (prev[matchId] || []).filter(
          (v) => !(v.voterName === voterName.trim() && v.voteType === voteType)
        );
        return {
          ...prev,
          [matchId]: [...filtered, { matchId, voterName: voterName.trim(), votedFor, voteType, timestamp: new Date().toISOString() }],
        };
      });
    } finally {
      setSubmittingVote(null);
    }
  };

  const cancelMomVote = async (matchId: number, voterName: string, voteType: string) => {
    if (!voterName.trim()) return;
    const res = await fetch("/api/mom-vote", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, voterName: voterName.trim(), voteType }),
    });
    if (res.ok) {
      setMomVoteMap((prev) => ({
        ...prev,
        [matchId]: (prev[matchId] || []).filter(
          (v) => !(v.voterName === voterName.trim() && v.voteType === voteType)
        ),
      }));
    }
  };

  // 엔트리 상태
  const [openEntries, setOpenEntries] = React.useState<Set<number>>(new Set());
  const toggleEntry = (matchId: number) => {
    buzz();
    setOpenEntries((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId); else next.add(matchId);
      return next;
    });
  };

  // 피드백 상태
  const [feedbackMap, setFeedbackMap] = React.useState<Record<number, FeedbackData[]>>({});
  const [openFeedbacks, setOpenFeedbacks] = React.useState<Set<number>>(new Set());
  const [feedbackForms, setFeedbackForms] = React.useState<Record<number, { name: string; message: string }>>({});
  const [submittingFeedback, setSubmittingFeedback] = React.useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ matchId: number; fb: FeedbackData } | null>(null);

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

  const deletePhoto = async (matchId: number, url: string) => {
    const res = await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, url }),
    });
    if (res.ok) {
      setLocalPhotoMap((prev) => ({
        ...prev,
        [matchId]: (prev[matchId] || []).filter((u) => u !== url),
      }));
      // props photos도 로컬에서 반영 (제거된 것 추적)
      setDeletedPhotos((prev) => ({ ...prev, [matchId]: [...(prev[matchId] || []), url] }));
    }
  };

  const deleteFeedbackItem = async (matchId: number, fb: FeedbackData) => {
    const res = await fetch("/api/feedback", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, timestamp: fb.timestamp, name: fb.name, message: fb.message }),
    });
    if (res.ok) {
      setFeedbackMap((prev) => ({
        ...prev,
        [matchId]: (prev[matchId] || []).filter(
          (f) => !(f.timestamp === fb.timestamp && f.name === fb.name && f.message === fb.message)
        ),
      }));
    }
  };

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
    const name = currentUser?.name?.trim();
    if (!name || !form?.message?.trim()) return;
    setSubmittingFeedback(matchId);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, name, message: form.message }),
      });
      if (res.ok) {
        const newFb: FeedbackData = {
          matchId,
          timestamp: new Date().toISOString(),
          name,
          message: form.message.trim(),
        };
        setFeedbackMap((prev) => ({
          ...prev,
          [matchId]: [...(prev[matchId] || []), newFb],
        }));
        setFeedbackForms((prev) => ({ ...prev, [matchId]: { name: "", message: "" } }));
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

  const getMatchLineups = (matchId: number) =>
    lineups.filter((l) => l.matchId === matchId);

  const QUARTER_ORDER = ["예상", "1Q", "2Q", "3Q", "4Q", "5Q", "6Q"];
  // 💡 1. 완료된 경기만 필터링 (결과가 '예정'이 아닌 경우)
  const completedMatches = matchList.filter(
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

  // 💡 상대팀별 / 장소별 전적 (자체전·내전 제외, completedMatches 기반)
  type AggRow = { played: number; w: number; d: number; l: number; gf: number; ga: number };
  const buildAgg = (keyOf: (m: MatchData) => string) => {
    const map: Record<string, AggRow> = {};
    completedMatches.forEach((m) => {
      if ((m.opponent || "").trim() === "자체전") return; // 내전 제외
      if ((m.type || "").replace(/\s/g, "") !== "일반매칭") return; // 일반 매칭만
      const key = keyOf(m).trim();
      if (!key) return;
      const gf = Number(m.ourScore) || 0;
      const ga = Number(m.theirScore) || 0;
      const s = (map[key] ||= { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
      s.played++;
      s.gf += gf;
      s.ga += ga;
      if (gf > ga) s.w++;
      else if (gf === ga) s.d++;
      else s.l++;
    });
    return Object.entries(map).map(([key, s]) => ({
      key,
      ...s,
      winRate: Math.round((s.w / s.played) * 100),
    }));
  };
  const opponentStats = buildAgg((m) => m.opponent || "").sort(
    (a, b) => b.played - a.played || b.winRate - a.winRate,
  );
  const venueStats = buildAgg((m) => m.location || "").sort(
    (a, b) => b.winRate - a.winRate || b.played - a.played,
  );

  // 💡 최고의 듀오: (득점자 + 어시스트) 조합을 순서 무관하게 합산
  const duoAll = (() => {
    const map: Record<string, { a: string; b: string; count: number }> = {};
    completedMatches.forEach((m) => {
      const scorers = (m.goals || "").split(",").map((s) => s.trim());
      const assisters = (m.assists || "").split(",").map((s) => s.trim());
      scorers.forEach((scorer, i) => {
        const assister = assisters[i] || "";
        if (!scorer || !assister || scorer === assister) return;
        if (scorer === "자책골" || assister === "자책골") return;
        const [a, b] = [scorer, assister].sort((x, y) => x.localeCompare(y, "ko"));
        const e = (map[`${a}|${b}`] ||= { a, b, count: 0 });
        e.count++;
      });
    });
    return Object.values(map).sort(
      (x, y) =>
        y.count - x.count ||
        x.a.localeCompare(y.a, "ko") ||
        x.b.localeCompare(y.b, "ko"),
    );
  })();
  // 2회 이상 합작한 조합만 '듀오'로 인정
  const duoStats = duoAll.filter((d) => d.count >= 2).slice(0, 3);

  const getResultBadgeStyle = (result: string) => {
    if (result === "승")
      return "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black shadow-[0_0_10px_rgba(255,182,193,0.3)]";
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
    <div className="min-h-dvh bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-zinc-100 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-300">
      {/* 📱 앱 헤더 */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-xl border-b border-gray-200/70 dark:border-white/[0.06]">
        <span className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight text-gray-900 dark:text-white uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF8FA3]" />
          UNDERDUCK
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/titles"
            aria-label="칭호 도감"
            title="칭호 도감"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF8FA3]/10 text-[#FF8FA3] transition-colors hover:bg-[#FF8FA3]/20 dark:bg-[#FFB6C1]/10 dark:text-[#FFB6C1]"
          >
            <Trophy className="h-4 w-4" />
          </Link>
          {currentUser ? (
            <DropdownMenu open={accountMenuOpen} onOpenChange={setAccountMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 h-8 pl-1 pr-2 rounded-full outline-none transition-all ${
                    accountMenuOpen
                      ? "bg-gray-200 dark:bg-white/15 ring-2 ring-[#FF8FA3]/20"
                      : "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15"
                  }`}
                >
                  {currentUser.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUser.image}
                      alt={currentUser.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FF8FA3] text-white text-[10px] font-bold">
                      {currentUser.name.slice(0, 1) || "U"}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 max-w-[64px] truncate">
                    {currentUser.name || "회원"}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                      accountMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-44 rounded-2xl border-gray-200/80 dark:border-white/10 bg-white/95 dark:bg-[#17171a]/95 p-1.5 shadow-[0_14px_38px_rgba(15,23,42,0.18)] dark:shadow-[0_18px_42px_rgba(0,0,0,0.45)] backdrop-blur-xl"
              >
                <DropdownMenuLabel className="px-2.5 py-2 font-normal">
                  <p className="text-[10px] font-bold text-gray-400">로그인 계정</p>
                  <p className="mt-0.5 text-xs font-extrabold text-gray-800 dark:text-gray-100 truncate">
                    {currentUser.name || "회원"}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/[0.07]" />
                <DropdownMenuItem
                  asChild
                  className="rounded-xl px-2.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 focus:bg-gray-100 dark:focus:bg-white/[0.07]"
                >
                  <Link href={`/players/${encodeURIComponent(currentUser.name.trim())}`}>
                    <User className="w-4 h-4 !text-[#FF8FA3]" />
                    마이페이지
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => signOut()}
                  className="rounded-xl px-2.5 py-2 text-xs font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => signIn("kakao")}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#FEE500] text-black text-xs font-bold transition-all hover:brightness-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              카카오 로그인
            </button>
          )}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 transition-all"
          >
            <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
            <Sun className="hidden dark:block w-4 h-4 text-[#FFB6C1]" />
          </button>
        </div>
      </header>

      <main className="p-5 pb-28">
        {/* 팀 인트로 */}
        <div className="animate-rise relative mb-5 overflow-hidden rounded-[24px] border border-gray-200/70 bg-white px-4 py-4 shadow-sm dark:border-white/[0.07] dark:bg-[#141416]">
          <div className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-[#FF8FA3]/15 blur-3xl dark:bg-[#FFB6C1]/10" />
          <div className="relative flex items-center gap-3 pr-10 min-[380px]:gap-3.5">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[18px] bg-white shadow-md ring-1 ring-gray-200 dark:bg-[#161618] dark:ring-white/10 min-[380px]:h-16 min-[380px]:w-16 min-[380px]:rounded-[20px]">
            <Image src="/underducklogo.png" alt="Underduck Logo" fill priority className="object-cover" />
            <Badge className="absolute bottom-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap border-none bg-gray-950/75 px-1.5 py-0 text-[6px] font-black text-white backdrop-blur-sm">
              EST 2025
            </Badge>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="whitespace-nowrap text-[20px] font-black leading-none tracking-[-0.04em] text-gray-900 dark:text-white min-[380px]:text-[23px]">
              UNDERDUCK FC
            </h1>
            <p className="mt-1.5 whitespace-nowrap text-[8px] font-bold tracking-[0.04em] text-gray-400 min-[380px]:text-[9px] min-[380px]:tracking-[0.08em]">
              NOT BECAUSE OF, BUT THANKS TO
            </p>
            <p className="mt-1.5 text-[10px] font-semibold leading-[1.55] text-gray-500 dark:text-gray-400 min-[380px]:text-[10.5px]">
              <span className="block">언더덕 FC는 &apos;때문에&apos;란 말보다</span>
              <span className="block">
                &quot;<span className="font-black text-[#FF8FA3] dark:text-[#FFB6C1]">덕분에</span>&quot;란 말을 추구하며, 서로를 존중합니다.
              </span>
            </p>
          </div>
          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
            <Link href="/roster" aria-label="로스터" className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm dark:bg-white/10 dark:text-[#FFB6C1]">
              <Menu className="h-4 w-4" />
            </Link>
            <Link href="/media" aria-label="콘텐츠" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
              <Film className="h-4 w-4" />
            </Link>
          </div>
          </div>
        </div>

        {/* 다음 경기 허브 */}
        {nextMatch && dDay !== null && (() => {
          const weather = parseWeather(nextMatch.weather || "");
          return (
            <section className="relative mb-5 overflow-hidden rounded-[26px] bg-white p-4 text-gray-900 shadow-soft ring-1 ring-gray-200 dark:bg-[#10182f] dark:text-white dark:shadow-[0_16px_36px_rgba(15,23,42,0.22)] dark:ring-white/10">
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#FF8FA3]/20 blur-3xl dark:bg-[#FF8FA3]/25" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black tracking-[0.18em] text-[#FF8FA3] dark:text-[#FFB6C1]">NEXT MATCH</p>
                    <h2 className="mt-1 truncate text-[19px] font-black">vs {nextMatch.opponent}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-white/55">
                      <CalendarDays className="h-3 w-3" />
                      {nextMatch.date} · {nextMatch.time}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 dark:text-white/55">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{nextMatch.location}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[30px] font-black leading-none text-[#FF8FA3] dark:text-[#FFB6C1] tabular-nums">
                      {dDay === 0 ? "D-DAY" : dDay < 0 ? `D+${Math.abs(dDay)}` : `D-${dDay}`}
                    </p>
                    {weather.available && (
                      <p className="mt-2 text-[10px] font-bold text-gray-500 dark:text-white/60">
                        {weatherEmoji(weather.icon)} {weather.temp}° · {weather.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-[10px] font-black text-gray-600 dark:text-white/65">
                      <Users className="h-3 w-3" /> 출석 현황
                    </p>
                    {myNextVote && (
                      <span className="rounded-full bg-[#FF8FA3]/10 px-2 py-0.5 text-[9px] font-black text-[#FF8FA3] dark:bg-white/10 dark:text-[#FFB6C1]">
                        나는 {myNextVote}
                      </span>
                    )}
                  </div>
                  {nextVoteTotal > 0 ? (
                    <>
                      <div className="mb-2 flex h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                        {nextAttending > 0 && <div className="bg-[#FF8FA3]" style={{ width: `${(nextAttending / nextVoteTotal) * 100}%` }} />}
                        {nextMaybe > 0 && <div className="bg-amber-400" style={{ width: `${(nextMaybe / nextVoteTotal) * 100}%` }} />}
                        {nextAbsent > 0 && <div className="bg-gray-400 dark:bg-white/25" style={{ width: `${(nextAbsent / nextVoteTotal) * 100}%` }} />}
                      </div>
                      <div className="flex gap-3 text-[9px] font-black">
                        <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">참석 {nextAttending}</span>
                        <span className="text-amber-500 dark:text-amber-300">미정 {nextMaybe}</span>
                        <span className="text-gray-400 dark:text-white/40">불참 {nextAbsent}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-white/40">아직 등록된 투표가 없습니다.</p>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href="/vote" className="flex items-center justify-center rounded-xl bg-[#FF8FA3] py-2.5 text-[11px] font-black text-white">
                    {myNextVote ? "투표 확인하기" : "출석 투표하기"}
                  </Link>
                  <Link href={`/matches/${nextMatch.id}`} className="flex items-center justify-center rounded-xl bg-gray-100 py-2.5 text-[11px] font-black text-gray-700 dark:bg-white/10 dark:text-white/85">
                    경기 상세 보기
                  </Link>
                </div>
              </div>
            </section>
          );
        })()}

        {/* 탭 섹션 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
          {/* 💡 탭은 다시 2개로 조정 */}
          <TabsList
            onClick={buzz}
            className="grid w-full h-full grid-cols-3 bg-gray-100 dark:bg-white/[0.04] p-1 mb-6 rounded-2xl border border-gray-200/70 dark:border-white/[0.06]"
          >
            <TabsTrigger
              value="matches"
              className="text-gray-500 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.08] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl py-2.5 font-semibold text-[12px] transition-all"
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1" /> 일정
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="text-gray-500 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.08] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl py-2.5 font-semibold text-[12px] transition-all"
            >
              <Trophy className="w-3.5 h-3.5 mr-1" /> 스탯
            </TabsTrigger>
            <TabsTrigger
              value="record"
              className="text-gray-500 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.08] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl py-2.5 font-semibold text-[12px] transition-all"
            >
              <Swords className="w-3.5 h-3.5 mr-1" /> 전적
            </TabsTrigger>
          </TabsList>

          {/* 💡 경기 일정 탭 내용 */}
          <TabsContent value="matches" className="space-y-6 outline-none animate-tab">
            {/* 💡 [공지사항 섹션] 고대비 + 왼쪽 포인트 라인 디자인 */}
            {localNotice && (
              <div className="px-1 mb-8">
                <Card className="relative overflow-hidden border-none shadow-soft bg-white dark:bg-[#161618]">
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
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border-none font-bold text-[10px] px-2 py-0">
                          {localNotice.date}
                        </Badge>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setNoticeEditForm({
                                date: localNotice.date,
                                title: localNotice.title,
                                content: localNotice.content,
                                important: localNotice.important,
                                location: localNotice.location || "",
                              });
                              setNoticeEditModal(true);
                            }}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            aria-label="공지 수정"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[15px] font-black text-gray-900 dark:text-white leading-tight">
                        {localNotice.title}
                      </h3>

                      <div className="relative">
                        {/* 💡 배경에 아주 연한 핑크색을 깔아 본문 가독성 확보 */}
                        <p className="text-[12px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap bg-[#FF8FA3]/5 dark:bg-white/5 p-4 rounded-2xl border border-[#FF8FA3]/10 dark:border-white/5">
                          {localNotice.content}
                        </p>
                      </div>

                      {localNotice.location && (
                        <div className="mt-1 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10">
                          <iframe
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(localNotice.location)}&output=embed&hl=ko&z=15`}
                            className="w-full h-40 border-0"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-[#161618]">
                            <MapPin className="w-3.5 h-3.5 text-[#FF8FA3] dark:text-[#FFB6C1] shrink-0" />
                            <span className="flex-1 text-[12px] font-bold text-gray-700 dark:text-gray-300 truncate">{localNotice.location}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(localNotice.location!)}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-[11px] font-black text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                            >
                              복사
                            </button>
                            <a
                              href={`https://map.kakao.com/?q=${encodeURIComponent(localNotice.location)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 text-[11px] font-black text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-950/50 transition-colors"
                            >
                              카카오맵
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 💡 섹션 구분선 (영문 제거 및 한국어 변경) */}
                <div className="mt-8 mb-4 border-b border-gray-200 dark:border-white/10 relative">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-4 bg-gray-50 dark:bg-[#09090b] flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      다가오는 경기 일정
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 매치 캘린더 */}
            <div className="px-1 mb-6">
              <Card className="bg-white dark:bg-[#161618] border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-soft">
                <CardContent className="p-4">
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-[#FF8FA3] dark:text-[#FFB6C1]" />
                      <span className="text-[11px] font-black text-gray-700 dark:text-white tracking-widest">CALENDAR</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {[
                        { dot: "bg-[#FF8FA3]", label: "승" },
                        { dot: "bg-gray-500", label: "패" },
                        { dot: "bg-amber-400", label: "무" },
                        { dot: "bg-violet-400", label: "자체전" },
                        { dot: "border border-[#FF8FA3] dark:border-[#FFB6C1]", label: "예정" },
                        { dot: "bg-sky-400", label: "이벤트" },
                      ].map(({ dot, label }) => (
                        <div key={label} className="flex items-center gap-1 text-[9px] font-black text-gray-400 dark:text-gray-500">
                          <div className={`w-2 h-2 rounded-full ${dot}`} />
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 달력 그리드 */}
                  <DayPicker
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    showOutsideDays
                    classNames={{
                      months: "flex flex-col w-full",
                      month: "flex flex-col gap-1 w-full",
                      caption: "flex justify-center py-1.5 relative items-center",
                      caption_label: "text-sm font-black text-gray-800 dark:text-white",
                      nav: "flex items-center gap-1",
                      nav_button: "size-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 opacity-70 hover:opacity-100 transition-opacity",
                      nav_button_previous: "absolute left-0",
                      nav_button_next: "absolute right-0",
                      table: "w-full border-collapse",
                      head_row: "flex",
                      head_cell: "flex-1 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 py-1",
                      row: "flex w-full",
                      cell: "flex-1 p-0 flex items-center justify-center py-0.5",
                      day: "flex items-center justify-center hover:opacity-70 transition-opacity cursor-pointer",
                      day_outside: "opacity-25",
                      day_disabled: "opacity-20 cursor-default",
                      day_hidden: "invisible",
                    }}
                    onDayClick={(date) => {
                      const key = toMatchDateStr(date);
                      const match = (matchesByDate[key] ?? [])[0];
                      if (match) {
                        scrollToMatch(match.id);
                      }
                    }}
                    components={{
                      IconLeft: () => <ChevronLeft className="size-4" />,
                      IconRight: () => <ChevronRight className="size-4" />,
                      DayContent: (props: { date: Date }) => {
                        const { date } = props;
                        const dateStr = toMatchDateStr(date);
                        const dayMatches = matchesByDate[dateStr] ?? [];
                        const isToday = dateStr === toMatchDateStr(new Date());
                        const isEvent = SPECIAL_EVENTS.some((e) => e.date === dateStr);

                        if (dayMatches.length > 0) {
                          const circleStyle = getMatchCircleStyle(dayMatches[0].result);
                          return (
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-black ${circleStyle} ${isToday ? "ring-2 ring-offset-1 ring-[#FF8FA3] dark:ring-offset-[#161618]" : ""}`}>
                              {date.getDate()}
                            </div>
                          );
                        }
                        if (isEvent) {
                          return (
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-black bg-sky-400 text-white ${isToday ? "ring-2 ring-offset-1 ring-sky-400 dark:ring-offset-[#161618]" : ""}`}>
                              {date.getDate()}
                            </div>
                          );
                        }
                        return (
                          <div className={`w-8 h-8 flex items-center justify-center rounded-full text-[12px] ${isToday ? "font-black text-[#FF8FA3] dark:text-[#FFB6C1] bg-[#FF8FA3]/10" : "font-medium text-gray-600 dark:text-gray-400"}`}>
                            {date.getDate()}
                          </div>
                        );
                      },
                    }}
                  />

                  {/* 이달의 경기 목록 */}
                  {(() => {
                    const monthMatches = matchList
                      .filter((m) => {
                        if (!m.date) return false;
                        if (m.type === "야유회") return false;
                        const d = new Date(m.date);
                        return (
                          d.getFullYear() === calendarMonth.getFullYear() &&
                          d.getMonth() === calendarMonth.getMonth()
                        );
                      })
                      .sort((a, b) => a.date.localeCompare(b.date));

                    const monthEvents = SPECIAL_EVENTS.filter((e) => {
                      const d = new Date(e.date);
                      return (
                        d.getFullYear() === calendarMonth.getFullYear() &&
                        d.getMonth() === calendarMonth.getMonth()
                      );
                    });

                    const isEmpty = monthMatches.length === 0 && monthEvents.length === 0;

                    // 경기 + 이벤트를 날짜순으로 합침
                    type ListItem =
                      | { kind: "match"; data: typeof monthMatches[number] }
                      | { kind: "event"; date: string; label: string };
                    const items: ListItem[] = [
                      ...monthMatches.map((m) => ({ kind: "match" as const, data: m })),
                      ...monthEvents.map((e) => ({ kind: "event" as const, date: e.date, label: e.label })),
                    ].sort((a, b) => {
                      const da = a.kind === "match" ? a.data.date : a.date;
                      const db = b.kind === "match" ? b.data.date : b.date;
                      return da.localeCompare(db);
                    });

                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                        {isEmpty ? (
                          <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center py-2">이달의 경기가 없어요</p>
                        ) : (
                          <div className="space-y-0.5">
                            {items.map((item, idx) => {
                              if (item.kind === "event") {
                                return (
                                  <div
                                    key={`event-${item.date}`}
                                    className="flex items-center gap-2.5 px-2 py-2"
                                  >
                                    <span className="text-[11px] font-black text-gray-400 w-9 shrink-0 tabular-nums">
                                      {item.date.slice(5).replace("-", ".")}
                                    </span>
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-sky-400" />
                                    <span className="flex-1 text-[12px] font-bold text-sky-500 dark:text-sky-400">
                                      {item.label}
                                    </span>
                                  </div>
                                );
                              }
                              const m = item.data;
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => scrollToMatch(m.id)}
                                  className="w-full flex items-center gap-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl px-2 py-2 transition-colors"
                                >
                                  <span className="text-[11px] font-black text-gray-400 w-9 shrink-0 tabular-nums">
                                    {m.date.slice(5).replace("-", ".")}
                                  </span>
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getMatchDotStyle(m.result)}`} />
                                  <span className="flex-1 min-w-0 text-[12px] font-bold text-gray-700 dark:text-gray-200 truncate">
                                    vs {m.opponent}
                                  </span>
                                  {m.result !== "예정" && m.ourScore && m.ourScore !== "-" && (
                                    <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                                      {m.ourScore} : {m.theirScore}
                                    </span>
                                  )}
                                  <Badge className={`shrink-0 border-none font-black text-[9px] px-2 py-0.5 ${getResultBadgeStyle(m.result)}`}>
                                    {m.result}
                                  </Badge>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* 최근 5경기 폼 */}
            {completedMatches.length > 0 && (
              <div className="mb-4 rounded-2xl bg-white dark:bg-[#141416] border border-gray-200/70 dark:border-white/[0.06] shadow-sm px-4 py-3 flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-[0.14em]">
                  최근 5경기
                </p>
                <div className="flex items-center gap-1.5">
                  {completedMatches.slice(-5).map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => { buzz(); scrollToMatch(m.id); }}
                      style={{ animationDelay: `${i * 70}ms` }}
                      className={`animate-rise flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black ${getMatchCircleStyle(m.result)}`}
                      aria-label={`vs ${m.opponent} ${m.result}`}
                    >
                      {m.result}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 경기 일정 등록 버튼 (관리자 전용) */}
            {isAdmin && (
              <button
                onClick={() => {
                  setAddMatchForm({ date: "", time: "", location: "", opponent: "", type: "일반 매칭" });
                  setAddMatchModal(true);
                }}
                className="w-full mb-2 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#FFB6C1]/40 dark:border-[#FFB6C1]/20 text-[#FF8FA3] dark:text-[#FFB6C1] text-[12px] font-black hover:bg-[#FF8FA3]/5 dark:hover:bg-[#FFB6C1]/5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                경기 일정 등록
              </button>
            )}

            {/* 경기 일정 리스트 */}
            <div id="match-list" className="scroll-mt-24" />
            {[...matchList].reverse().map((match, mi) => {
              const isInternal = match.opponent === "자체전";
              const riseDelay = `${Math.min(mi, 8) * 60}ms`;

              // 야유회 포스터 카드
              if (match.type === "야유회") {
                const deleted = deletedPhotos[match.id] || [];
                const propPhotos = (match.photos ? match.photos.split(",").filter(Boolean) : []).filter((u) => !deleted.includes(u));
                const localPhotos = localPhotoMap[match.id] || [];
                const allPhotos = [...propPhotos, ...localPhotos];
                const posterImg = allPhotos[0] ?? null;

                const feedbacks = feedbackMap[match.id] || [];
                const isFbOpen = openFeedbacks.has(match.id);
                const fbForm = feedbackForms[match.id] || { name: "", message: "" };
                const firstFb = feedbacks[feedbacks.length - 1];

                const FbAvatar = ({ name }: { name: string }) => {
                  const no = rosterMap[name.trim()];
                  return no ? (
                    <div className="w-7 h-7 rounded-full bg-[#FFB6C1]/20 border border-[#FFB6C1]/40 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">#{no}</span>
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    </div>
                  );
                };

                return (
                  <React.Fragment key={match.id}>
                    <div ref={(el) => { matchCardRefs.current[match.id] = el; }} />
                    <Card style={{ animationDelay: riseDelay }} className="animate-rise bg-white dark:bg-[#161618] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-3xl overflow-hidden shadow-soft">
                      {/* 포스터 이미지 영역 */}
                      <div className="relative w-full aspect-[1/1] overflow-hidden bg-gray-100 dark:bg-white/[0.04]">
                        {posterImg ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={posterImg.replace("/upload/", "/upload/c_fill,w_800,q_auto,f_auto/")}
                            alt="야유회 포스터"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightbox({ ids: allPhotos, index: 0 })}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
                            <Tent className="w-12 h-12" strokeWidth={1.5} />
                            <p className="text-sm font-semibold">포스터 준비중</p>
                          </div>
                        )}
                        {/* 하단 그라데이션 오버레이 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                        {/* 오버레이 텍스트 */}
                        <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
                          <div className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-2">
                            <Tent className="w-3 h-3" /> 야유회
                          </div>
                          <div className="text-white font-black text-xl leading-tight drop-shadow">
                            {match.opponent || "UNDERDUCK 야유회"}
                          </div>
                          <div className="text-white/80 text-xs mt-1 flex items-center gap-2">
                            <span>{match.date}</span>
                            {match.location && <><span>·</span><span>{match.location}</span></>}
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-5 space-y-4">
                        {/* 프로그램 */}
                        {match.goals && (
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3.5">
                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">프로그램</p>
                            <p className="text-[12px] text-gray-600 dark:text-gray-300 leading-relaxed">{match.goals}</p>
                          </div>
                        )}

                        {/* 참석자 */}
                        {match.attendees && (() => {
                          const names = match.attendees.split(",").map((n) => n.trim()).filter(Boolean);
                          return (
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 mb-2 flex items-center gap-1">
                                <Users className="w-3 h-3" /> 참석자 {names.length}명
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {names.map((name, i) => (
                                  <span key={i} className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/40 px-2 py-0.5 rounded-full font-medium">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* 사진 섹션 */}
                        <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400">
                              <Camera className="w-3.5 h-3.5 text-[#FFB6C1]" />
                              {allPhotos.length > 1 ? `사진 ${allPhotos.length - 1}` : "사진 없음"}
                            </div>
                            {isAdmin && allPhotos.length < 10 && (
                              <>
                                <button
                                  onClick={() => fileInputRefs.current[match.id]?.click()}
                                  disabled={uploadingPhoto === match.id}
                                  className="text-[10px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] hover:opacity-70 transition-opacity disabled:opacity-40"
                                >
                                  {uploadingPhoto === match.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "+ 추가"}
                                </button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  ref={(el) => { fileInputRefs.current[match.id] = el; }}
                                  onChange={(e) => { if (e.target.files?.length) handlePhotoUpload(match.id, e.target.files); e.target.value = ""; }}
                                />
                              </>
                            )}
                          </div>
                          {allPhotos.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-none">
                              {allPhotos.slice(1).map((url, i) => (
                                <div key={url} className="relative shrink-0 group/photo">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={url.replace("/upload/", "/upload/c_fill,w_200,h_200,q_auto,f_auto/")}
                                    alt={`야유회 사진 ${i + 2}`}
                                    onClick={() => setLightbox({ ids: allPhotos, index: i + 1 })}
                                    className="h-24 w-24 object-cover rounded-2xl cursor-pointer"
                                  />
                                  {isAdmin && (
                                    <button
                                      onClick={() => deletePhoto(match.id, url)}
                                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-all opacity-0 group-hover/photo:opacity-100"
                                    >
                                      <X className="w-3 h-3 text-white" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 피드백 */}
                        <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                          <button
                            onClick={() => toggleFeedback(match.id)}
                            className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#FFB6C1]" />
                            댓글
                            {feedbacks.length > 0 && <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{feedbacks.length}</span>}
                            <span className="ml-auto">
                              {isFbOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </span>
                          </button>
                          {!isFbOpen && firstFb && (
                            <div className="flex items-center gap-2 mt-2 px-1">
                              <FbAvatar name={firstFb.name} />
                              <p className="flex-1 min-w-0 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                <span className="font-black text-gray-700 dark:text-gray-300 mr-1.5">{firstFb.name}</span>
                                {firstFb.message}
                              </p>
                            </div>
                          )}
                          {isFbOpen && (
                            <div className="mt-2 space-y-3">
                              {feedbacks.length === 0 && (
                                <p className="text-[10px] text-gray-400 text-center py-2">아직 댓글이 없어요</p>
                              )}
                              {feedbacks.map((fb, i) => (
                                <div key={i} className="flex gap-2 group">
                                  <FbAvatar name={fb.name} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[10px] font-black text-gray-800 dark:text-gray-200">{fb.name}</span>
                                      <span className="text-[9px] text-gray-400">{formatFeedbackTime(fb.timestamp)}</span>
                                      <button onClick={() => setDeleteTarget({ matchId: match.id, fb })} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 break-words leading-relaxed">{fb.message}</p>
                                  </div>
                                </div>
                              ))}
                              <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="text-[10px] text-gray-400 shrink-0">닉네임</span>
                                  <input
                                    type="text"
                                    placeholder="이름 입력"
                                    value={fbForm.name}
                                    maxLength={20}
                                    onChange={(e) => setFeedbackForms((prev) => ({ ...prev, [match.id]: { ...fbForm, name: e.target.value } }))}
                                    className="w-28 text-[11px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-2.5 py-1.5 outline-none focus:border-[#FFB6C1]/60 dark:focus:border-[#FFB6C1]/60 placeholder:text-gray-400 text-gray-800 dark:text-gray-200"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <FbAvatar name={fbForm.name} />
                                  <div className="flex-1 flex items-center gap-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-3 py-2 focus-within:border-[#FFB6C1]/60 dark:focus-within:border-[#FFB6C1]/60 transition-colors">
                                    <input
                                      type="text"
                                      placeholder="댓글 달기"
                                      value={fbForm.message}
                                      maxLength={200}
                                      onChange={(e) => setFeedbackForms((prev) => ({ ...prev, [match.id]: { ...fbForm, message: e.target.value } }))}
                                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitFeedback(match.id); } }}
                                      className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-gray-400 text-gray-800 dark:text-gray-200 min-w-0"
                                    />
                                    <button
                                      onClick={() => submitFeedback(match.id)}
                                      disabled={submittingFeedback === match.id || !fbForm.name?.trim() || !fbForm.message?.trim()}
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
                      </CardContent>
                    </Card>
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={match.id}>
                <div ref={(el) => { matchCardRefs.current[match.id] = el; }} />
                <Card
                  style={{ animationDelay: riseDelay }}
                  className="animate-rise bg-white dark:bg-[#161618] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-3xl overflow-hidden shadow-soft"
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
                        {/* 날씨 */}
                        {match.weather && (() => {
                          const w = parseWeather(match.weather);
                          if (!w.available) return null;
                          return (
                            <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                              {weatherEmoji(w.icon)} {w.temp}°C {w.description} <span className="text-blue-400">💧{w.pop}%</span>
                            </span>
                          );
                        })()}
                        {/* 상대전적 미리보기 */}
                        {!isInternal && (match.type || "").replace(/\s/g, "") === "일반매칭" && (() => {
                          const h2h = opponentStats.find((o) => o.key === (match.opponent || "").trim());
                          if (!h2h) return null;
                          return (
                            <span className="flex items-center gap-1 w-fit text-[9px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.04] border border-gray-200/70 dark:border-white/[0.06] rounded-md px-1.5 py-0.5 ml-1">
                              <Swords className="w-2.5 h-2.5 text-[#FFB6C1]" />
                              상대전적 {h2h.played}전 <span className="text-blue-500">{h2h.w}승</span>
                              {h2h.d > 0 && <span>{h2h.d}무</span>}
                              <span className="text-[#FF8FA3]">{h2h.l}패</span>
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {isAdmin && (
                          <button
                            onClick={() => openMatchEdit(match)}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            aria-label="결과 입력"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          </button>
                        )}
                        {match.mom && (
                          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-300/50 dark:border-yellow-400/30 rounded-md px-2 py-0.5">
                            <Star className="w-2.5 h-2.5 text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
                            <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                              {match.mom.trim()}
                            </span>
                          </div>
                        )}
                        {match.result && match.result !== "예정" && (
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`border-none font-black text-[11px] px-3 ${getResultBadgeStyle(match.result)}`}
                            >
                              {match.result}
                            </Badge>
                            <button
                              onClick={async () => {
                                buzz();
                                setSharingStory(match.id);
                                try {
                                  await shareStoryCard(match);
                                } catch (e) {
                                  if (e instanceof Error && e.name !== "AbortError") alert("공유 실패");
                                } finally {
                                  setSharingStory(null);
                                }
                              }}
                              disabled={sharingStory === match.id}
                              className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FFB6C1]/20 hover:bg-[#FFB6C1]/35 transition-colors disabled:opacity-40"
                              aria-label="스토리 카드 공유"
                            >
                              {sharingStory === match.id
                                ? <Loader2 className="w-3 h-3 animate-spin text-[#FF8FA3]" />
                                : <Sparkles className="w-3 h-3 text-[#FF8FA3] dark:text-[#FFB6C1]" />
                              }
                            </button>
                          </div>
                        )}
                        {match.result === "예정" && (
                          <Badge className={`border-none font-black text-[11px] px-3 ${getResultBadgeStyle(match.result)}`}>
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
                          <div className="text-2xl font-extrabold tracking-tight text-gray-300 dark:text-gray-600">
                            VS
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 w-full">
                            <div className="flex items-center gap-3 text-[32px] font-extrabold tracking-tight tabular-nums">
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
                                        {scorer.trim()}
                                      </div>
                                      {assistant && (
                                        <div className="text-[9px] text-[#FF8FA3] dark:text-[#FFB6C1]">
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
                          <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-full mb-2 flex items-center justify-center border border-gray-200 dark:border-white/10 text-[11px] font-bold text-gray-400 shrink-0">
                            상대팀
                          </div>
                        )}

                        {/* 팀명 표시 */}
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate w-full text-center px-1">
                          {isInternal ? "언더덕 B" : match.opponent}
                        </span>
                      </div>
                    </div>
                    {/* 엔트리 */}
                    {match.attendees && (() => {
                      const attendees = match.attendees!.split(",").map((n) => n.trim()).filter(Boolean);
                      if (attendees.length === 0) return null;
                      const isOpen = openEntries.has(match.id);
                      return (
                        <div className="mt-3 border-t border-gray-100 dark:border-white/5 pt-3">
                          <button
                            onClick={() => toggleEntry(match.id)}
                            className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full"
                          >
                            <Users className="w-3.5 h-3.5 text-[#FFB6C1]" />
                            엔트리
                            <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{attendees.length}명</span>
                            <span className="ml-auto">
                              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </span>
                          </button>
                          {isOpen && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {attendees.map((name) => {
                                const no = rosterMap[name] || "?";
                                return (
                                  <span
                                    key={name}
                                    className="flex items-center gap-1 text-[11px] font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-0.5"
                                  >
                                    <span className="font-black text-[#FF8FA3] dark:text-[#FFB6C1] text-[10px] min-w-[12px] text-center">{no}</span>
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 풀스크린 라인업 */}
                    {(() => {
                      const matchLineups = getMatchLineups(match.id);
                      return (
                        <div className="mt-4 border-t border-gray-100 dark:border-white/5 pt-3">
                          {matchLineups.length > 0 ? (
                            <LineupViewer
                              match={match}
                              lineups={matchLineups}
                              rosterMap={rosterMap}
                              captainRoles={captainRoles}
                              playerStats={playerStatsMap}
                              playerTitles={playerTitles}
                              editHref={isAdmin ? `/matches/${match.id}/edit` : undefined}
                            />
                          ) : (
                            <div className="flex items-center justify-between rounded-2xl border border-dashed border-gray-200 px-3.5 py-3 dark:border-white/10">
                              <span className="flex items-center gap-1.5 text-[11px] font-black text-gray-400">
                              <Users className="w-3.5 h-3.5 text-[#FFB6C1]" />
                                라인업 미등록
                              </span>
                              {isAdmin && (
                              <Link
                                href={`/matches/${match.id}/edit`}
                                className="text-[10px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] hover:opacity-70 transition-opacity"
                              >
                                  + 추가
                              </Link>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 사진 섹션 */}
                    {(() => {
                      const deleted = deletedPhotos[match.id] || [];
                      const propIds = (match.photos ? match.photos.split(",").filter(Boolean) : []).filter((u) => !deleted.includes(u));
                      const localIds = localPhotoMap[match.id] || [];
                      const photos = [...propIds, ...localIds];
                      const hasPhotos = photos.length > 0;

                      return (
                        <div className="mt-3 border-t border-gray-100 dark:border-white/5 pt-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400">
                              <Camera className="w-3.5 h-3.5 text-[#FFB6C1]" />
                              {hasPhotos ? `경기 사진 ${photos.length}` : "경기 사진 없음"}
                            </div>
                            {isAdmin && photos.length < 5 && (
                              <>
                                <button
                                  onClick={() => fileInputRefs.current[match.id]?.click()}
                                  disabled={uploadingPhoto === match.id}
                                  className="text-[10px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] hover:opacity-70 transition-opacity disabled:opacity-40"
                                >
                                  {uploadingPhoto === match.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : "+ 추가"
                                  }
                                </button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  ref={(el) => { fileInputRefs.current[match.id] = el; }}
                                  onChange={(e) => {
                                    if (e.target.files?.length) handlePhotoUpload(match.id, e.target.files);
                                    e.target.value = "";
                                  }}
                                />
                              </>
                            )}
                          </div>
                          {hasPhotos && (
                            <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-none">
                              {photos.map((id, i) => (
                                <div key={id} className="relative shrink-0 group/photo">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={id.replace("/upload/", "/upload/c_fill,w_200,h_200,q_auto,f_auto/")}
                                    alt={`경기사진 ${i + 1}`}
                                    onClick={() => setLightbox({ ids: photos, index: i })}
                                    className="h-24 w-24 object-cover rounded-2xl cursor-pointer transition-opacity"
                                  />
                                  {isAdmin && (
                                    <button
                                      onClick={() => deletePhoto(match.id, id)}
                                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-all opacity-0 group-hover/photo:opacity-100"
                                    >
                                      <X className="w-3 h-3 text-white" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* MOM 투표 섹션 */}
                    {match.result !== "예정" && match.attendees && (() => {
                      const attendees = match.attendees!.split(",").map((n) => n.trim()).filter(Boolean);
                      const votes = momVoteMap[match.id] || [];
                      const isOpen = openVotes.has(match.id);
                      // 투표자 신원 = 로그인한 카카오 이름 (자동)
                      const voterName = currentUser?.name || "";

                      // 경기 당일까지만 투표 가능, 다음날부터 잠금
                      const matchDay = new Date(match.date);
                      matchDay.setHours(0, 0, 0, 0);
                      const todayDay = new Date();
                      todayDay.setHours(0, 0, 0, 0);
                      const votingClosed = matchDay < todayDay;

                      // 득표 집계 (타입별)
                      const makeTally = (type: string) => {
                        const tally: Record<string, number> = {};
                        votes.filter((v) => v.voteType === type).forEach((v) => { tally[v.votedFor] = (tally[v.votedFor] || 0) + 1; });
                        return tally;
                      };
                      const atkTally = makeTally("공격");
                      const defTally = makeTally("수비");

                      // 포지션으로 공격/수비 분류 (실제 득표가 있으면 포지션 무관하게 포함)
                      const posMap: Record<string, string> = {};
                      players.forEach((p) => { posMap[p.name] = p.pos?.toUpperCase() || ""; });
                      const atkPos = new Set(["FW", "MF"]);
                      const defPos = new Set(["GK", "DF"]);
                      const atkCandidates = attendees.filter((n) => atkPos.has(posMap[n]) || (!atkPos.has(posMap[n]) && !defPos.has(posMap[n])) || (atkTally[n] > 0));
                      const defCandidates = attendees.filter((n) => defPos.has(posMap[n]) || (!atkPos.has(posMap[n]) && !defPos.has(posMap[n])) || (defTally[n] > 0));

                      const myAtkVote = votes.find((v) => v.voterName === voterName && v.voteType === "공격")?.votedFor;
                      const myDefVote = votes.find((v) => v.voterName === voterName && v.voteType === "수비")?.votedFor;

                      const VoteBar = ({ name, tally, myVote }: { name: string; tally: Record<string, number>; myVote?: string }) => {
                        const sorted = Object.keys(tally).sort((a, b) => tally[b] - tally[a]);
                        const maxV = Math.max(...Object.values(tally), 1);
                        const count = tally[name] || 0;
                        const pct = Math.round((count / maxV) * 100);
                        const isLeader = count > 0 && count === (tally[sorted[0]] || 0);
                        return (
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-0.5 text-[10px] font-bold w-14 shrink-0 ${isLeader ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : "text-gray-600 dark:text-gray-400"}`}>
                              {isLeader && <Star className="w-2.5 h-2.5 shrink-0 fill-current" />}
                              <span className="truncate">{name}</span>
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${isLeader ? "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1]" : "bg-gray-300 dark:bg-white/20"}`}
                                style={{ width: count > 0 ? `${pct}%` : "0%" }} />
                            </div>
                            <span className="text-[10px] text-gray-400 w-4 text-right shrink-0">{count}</span>
                            {myVote === name && <Check className="w-3 h-3 text-[#FF8FA3] dark:text-[#FFB6C1] shrink-0" />}
                          </div>
                        );
                      };

                      const hasVoted = myAtkVote || myDefVote;
                      // 동률 공동 1위는 전원 표시
                      const topNames = (tally: Record<string, number>) => {
                        const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
                        if (entries.length === 0 || entries[0][1] === 0) return "";
                        const max = entries[0][1];
                        return entries.filter(([, c]) => c === max).map(([n]) => n).join(", ");
                      };
                      const leaderAtk = topNames(atkTally);
                      const leaderDef = topNames(defTally);

                      return (
                        <div className="mt-3 border-t border-gray-100 dark:border-white/5 pt-3">
                          <button
                            onClick={() => setOpenVotes((prev) => { const next = new Set(prev); next.has(match.id) ? next.delete(match.id) : next.add(match.id); return next; })}
                            className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full"
                          >
                            <Star className="w-3.5 h-3.5 text-[#FFB6C1]" />
                            MOM 투표
                            {votes.length > 0 && <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{votes.length}</span>}
                            {matchDay.getTime() === todayDay.getTime() && (
                              <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#FF8FA3]/10 dark:bg-[#FFB6C1]/15 text-[#FF8FA3] dark:text-[#FFB6C1] animate-pulse">
                                오늘 마감
                              </span>
                            )}
                            {!isOpen && (leaderAtk || leaderDef) && (
                              <span className="text-[10px] text-gray-400 font-medium truncate">
                                {leaderAtk || ""}{leaderAtk && leaderDef ? " · " : ""}{leaderDef || ""}
                              </span>
                            )}
                            <span className="ml-auto shrink-0">
                              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="mt-3 space-y-4">
                              {/* 공격 MOM */}
                              <div>
                                <p className="text-[10px] font-bold text-blue-400 mb-1.5 flex items-center gap-1"><Target className="w-3 h-3" /> 공격 MOM</p>
                                <div className="space-y-1.5">
                                  {atkCandidates.map((name) => (
                                    <VoteBar key={name} name={name} tally={atkTally} myVote={myAtkVote} />
                                  ))}
                                </div>
                              </div>

                              {/* 수비 MOM */}
                              <div>
                                <p className="text-[10px] font-bold text-green-500 mb-1.5 flex items-center gap-1"><Shield className="w-3 h-3" /> 수비 MOM</p>
                                <div className="space-y-1.5">
                                  {defCandidates.map((name) => (
                                    <VoteBar key={name} name={name} tally={defTally} myVote={myDefVote} />
                                  ))}
                                </div>
                              </div>

                              {/* 투표하기 버튼 - 경기 당일까지만 표시 */}
                              <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                                {votingClosed ? (
                                  <p className="flex items-center justify-center gap-1 text-[10px] text-gray-400 py-0.5"><Lock className="w-2.5 h-2.5" /> 투표가 마감되었습니다</p>
                                ) : (
                                  <>
                                    <p className="text-[10px] text-gray-400 mb-2">
                                      투표는 경기 당일까지만 가능합니다
                                    </p>
                                    {currentUser ? (
                                      <div className="flex items-center justify-between">
                                        <button
                                          onClick={() => {
                                            setMomModalVoter(voterName);
                                            setMomModalAtk(myAtkVote || "");
                                            setMomModalDef(myDefVote || "");
                                            setMomModal({ matchId: match.id, attendees });
                                          }}
                                          className="text-[11px] font-black px-4 py-1.5 rounded-2xl bg-[#FF8FA3]/10 dark:bg-[#FFB6C1]/10 text-[#FF8FA3] dark:text-[#FFB6C1] hover:bg-[#FF8FA3]/20 transition-colors"
                                        >
                                          {hasVoted ? "투표 변경" : "투표하기"}
                                        </button>
                                        {hasVoted && (
                                          <button
                                            onClick={async () => {
                                              if (myAtkVote) await cancelMomVote(match.id, voterName, "공격");
                                              if (myDefVote) await cancelMomVote(match.id, voterName, "수비");
                                            }}
                                            className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
                                          >
                                            투표 취소
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => signIn("kakao")}
                                        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-black py-2 rounded-2xl bg-[#FEE500] text-black/85 hover:opacity-90 transition-opacity"
                                      >
                                        <Lock className="w-3 h-3" /> 로그인하고 투표하기
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
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
                          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          </div>
                        );
                      };

                      return (
                        <div className="mt-3 border-t border-gray-100 dark:border-white/5 pt-3">
                          <button
                            onClick={() => toggleFeedback(match.id)}
                            className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#FFB6C1]" />
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
                              <Link
                                href={`/players/${encodeURIComponent(firstFb.name.trim())}`}
                                aria-label={`${firstFb.name} 프로필 보기`}
                              >
                                <FeedbackAvatar name={firstFb.name} />
                              </Link>
                              <p className="flex-1 min-w-0 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                <Link
                                  href={`/players/${encodeURIComponent(firstFb.name.trim())}`}
                                  className="mr-1.5 font-black text-gray-700 hover:text-[#FF8FA3] dark:text-gray-300 dark:hover:text-[#FFB6C1]"
                                >
                                  {firstFb.name}
                                </Link>
                                {firstFb.message}
                              </p>
                            </div>
                          )}

                          {/* 펼친 상태: 전체 피드백 + 입력 폼 */}
                          {isOpen && (
                            <div className="mt-2 space-y-3">
                              {feedbacks.length === 0 && (
                                <p className="text-[10px] text-gray-400 text-center py-2">아직 피드백이 없어요</p>
                              )}
                              {feedbacks.map((fb, i) => (
                                <div key={i} className="flex gap-2 group">
                                  <Link
                                    href={`/players/${encodeURIComponent(fb.name.trim())}`}
                                    aria-label={`${fb.name} 프로필 보기`}
                                    className="shrink-0"
                                  >
                                    <FeedbackAvatar name={fb.name} />
                                  </Link>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <Link
                                        href={`/players/${encodeURIComponent(fb.name.trim())}`}
                                        className="text-[10px] font-black text-gray-800 hover:text-[#FF8FA3] dark:text-gray-200 dark:hover:text-[#FFB6C1]"
                                      >
                                        {fb.name}
                                      </Link>
                                      <span className="text-[9px] text-gray-400">{formatFeedbackTime(fb.timestamp)}</span>
                                      {(isAdmin || (currentUser && fb.name === currentUser.name)) && (
                                        <button
                                          onClick={() => setDeleteTarget({ matchId: match.id, fb })}
                                          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 break-words leading-relaxed">{fb.message}</p>
                                  </div>
                                </div>
                              ))}

                              {/* 입력 폼 (로그인 회원만) */}
                              <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                                {currentUser ? (
                                  <div className="flex items-center gap-2">
                                    <FeedbackAvatar name={currentUser.name} />
                                    <div className="flex-1 flex items-center gap-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-3 py-2 focus-within:border-[#FFB6C1]/60 dark:focus-within:border-[#FFB6C1]/60 transition-colors">
                                      <input
                                        type="text"
                                        placeholder={`${currentUser.name}(으)로 댓글 달기`}
                                        value={form.message}
                                        maxLength={200}
                                        onChange={(e) => setFeedbackForms((prev) => ({ ...prev, [match.id]: { ...form, message: e.target.value } }))}
                                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitFeedback(match.id); } }}
                                        className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-gray-400 text-gray-800 dark:text-gray-200 min-w-0"
                                      />
                                      <button
                                        onClick={() => submitFeedback(match.id)}
                                        disabled={submittingFeedback === match.id || !form.message?.trim()}
                                        className="shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1] disabled:opacity-30 hover:opacity-70 transition-opacity"
                                      >
                                        <SendHorizonal className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => signIn("kakao")}
                                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-black py-2.5 rounded-2xl bg-[#FEE500] text-black/85 hover:opacity-90 transition-opacity"
                                  >
                                    <Lock className="w-3 h-3" /> 로그인하고 댓글 쓰기
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
                </React.Fragment>
              );
            })}
          </TabsContent>

          {/* 라이트박스 */}
          {lightbox && (
            <div
              className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
              onClick={() => setLightbox(null)}
            >
              {/* 닫기 */}
              <button
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                onClick={() => setLightbox(null)}
              >
                <X className="w-7 h-7" />
              </button>
              {/* 이전 */}
              {lightbox.index > 0 && (
                <button
                  className="absolute left-4 text-white/70 hover:text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLightbox((p) => p ? { ...p, index: p.index - 1 } : null); }}
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
              )}
              {/* 이미지 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.ids[lightbox.index].replace("/upload/", "/upload/q_auto,f_auto/")}
                alt="경기사진"
                className="max-h-[88vh] max-w-[88vw] object-contain rounded-xl"
                onClick={(e) => e.stopPropagation()}
              />
              {/* 다음 */}
              {lightbox.index < lightbox.ids.length - 1 && (
                <button
                  className="absolute right-4 text-white/70 hover:text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLightbox((p) => p ? { ...p, index: p.index + 1 } : null); }}
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              )}
              {/* 인디케이터 */}
              {lightbox.ids.length > 1 && (
                <div className="absolute bottom-5 flex gap-1.5">
                  {lightbox.ids.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setLightbox((p) => p ? { ...p, index: i } : null); }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === lightbox.index ? "bg-white w-4" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 선수 스탯 탭 */}
          <TabsContent value="stats" className="outline-none animate-tab">
            {/* 💡 하나의 통합된 전광판 스타일 카드 (모바일 화면 깨짐 완벽 방지) */}
            <Card className="mb-6 bg-white dark:bg-[#161618] border-gray-200 dark:border-white/10 rounded-3xl shadow-soft overflow-hidden flex flex-col">
              {/* 상단 섹션: 전적 및 승률 (배경색을 살짝 다르게 주어 분리감 형성) */}
              <div className="p-4 sm:p-5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 mb-1.5">
                    팀 통산 전적
                  </p>
                  {/* flex-wrap을 주어 만약 화면이 극단적으로 좁아져도 자연스럽게 떨어지도록 처리 */}
                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                    <span className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tabular-nums">
                      <CountUp value={totalMatchesCount} />
                      <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 ml-0.5">
                        전
                      </span>
                    </span>
                    <span className="text-lg sm:text-xl font-black text-blue-500 ml-1 tabular-nums">
                      <CountUp value={wins} />
                      <span className="text-[10px] sm:text-[11px] font-medium text-blue-500/70 ml-0.5">
                        승
                      </span>
                    </span>
                    <span className="text-lg sm:text-xl font-black text-gray-500 ml-1 tabular-nums">
                      <CountUp value={draws} />
                      <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 ml-0.5">
                        무
                      </span>
                    </span>
                    <span className="text-lg sm:text-xl font-black text-[#FF8FA3] ml-1 tabular-nums">
                      <CountUp value={losses} />
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
                  <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tabular-nums">
                    <CountUp value={winRate} />%
                  </p>
                </div>
              </div>

              {/* 하단 섹션: 총 득/실 및 평균 득/실 (4분할) */}
              <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
                {/* 1. 총 득점 영역 */}
                <div className="p-3 sm:p-5 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 mb-1.5">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                      총 득점
                    </p>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-blue-500 tabular-nums">
                    <CountUp value={totalGoalsFor} />
                    <span className="text-[9px] sm:text-[11px] font-medium text-gray-400 ml-0.5 sm:ml-1">
                      골
                    </span>
                  </p>
                </div>

                {/* 2. 총 실점 영역 */}
                <div className="p-3 sm:p-5 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 mb-1.5">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                      총 실점
                    </p>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-[#FF8FA3] tabular-nums">
                    <CountUp value={totalGoalsAgainst} />
                    <span className="text-[9px] sm:text-[11px] font-medium text-gray-400 ml-0.5 sm:ml-1">
                      골
                    </span>
                  </p>
                </div>

                {/* 3. 평균 득점 영역 */}
                <div className="p-3 sm:p-5 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 mb-1.5">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                      평균 득점
                    </p>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-blue-500 tabular-nums">
                    <CountUp value={Number(avgGoalsFor)} decimals={1} />
                    <span className="text-[9px] sm:text-[11px] font-medium text-gray-400 ml-0.5 sm:ml-1">
                      골
                    </span>
                  </p>
                </div>

                {/* 4. 평균 실점 영역 */}
                <div className="p-3 sm:p-5 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 mb-1.5">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                      평균 실점
                    </p>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-[#FF8FA3] tabular-nums">
                    <CountUp value={Number(avgGoalsAgainst)} decimals={1} />
                    <span className="text-[9px] sm:text-[11px] font-medium text-gray-400 ml-0.5 sm:ml-1">
                      골
                    </span>
                  </p>
                </div>
              </div>
            </Card>

            {/* 💡 최고의 듀오 Top 3 */}
            <Card className="mb-6 bg-white dark:bg-[#161618] border-gray-200 dark:border-white/10 rounded-3xl shadow-soft overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 dark:border-white/5">
                <Users className="w-3.5 h-3.5 text-[#FF8FA3] dark:text-[#FFB6C1]" />
                <span className="text-[11px] font-bold text-gray-700 dark:text-white tracking-widest">최고의 듀오</span>
                <span className="text-[10px] text-gray-400 ml-1">골+어시 합작</span>
              </div>
              {duoStats.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-gray-400">아직 2회 이상 합작한 듀오가 없어요</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {duoStats.map((d) => {
                    // 동률은 공동 순위 (예: 1, 1, 3)
                    const rank = duoStats.filter((x) => x.count > d.count).length + 1;
                    const rankStyle = [
                      "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
                      "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300",
                      "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
                    ][rank - 1];
                    return (
                      <div key={`${d.a}|${d.b}`} className="flex items-center gap-3 px-4 py-2.5">
                        <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black shrink-0 ${rankStyle}`}>
                          {rank}
                        </span>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] font-bold text-gray-900 dark:text-white">
                          <span className="truncate">{d.a}</span>
                          <span className="text-gray-300 dark:text-gray-600 shrink-0">×</span>
                          <span className="truncate">{d.b}</span>
                        </div>
                        <span className="shrink-0 text-[13px] font-extrabold text-[#FF8FA3] dark:text-[#FFB6C1] tabular-nums">
                          {d.count}
                          <span className="text-[10px] font-medium text-gray-400 ml-0.5">회</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
            {/* 필터 버튼 */}
            {(() => {
              const filters: { key: "apps" | "goals" | "assists" | "mom"; label: string }[] = [
                { key: "apps", label: "출전" },
                { key: "goals", label: "골" },
                { key: "assists", label: "도움" },
                { key: "mom", label: "MOM" },
              ];
              const POS_ORDER: Record<string, number> = { FW: 0, MF: 1, DF: 2, GK: 3 };
              const sortedPlayers = [...players].sort((a, b) => {
                if (statSort === "pos") {
                  const pa = POS_ORDER[a.pos?.toUpperCase()] ?? 4;
                  const pb = POS_ORDER[b.pos?.toUpperCase()] ?? 4;
                  if (pa !== pb) return pa - pb;
                  return a.name.localeCompare(b.name, "ko");
                }
                const diff = (Number(b[statSort]) || 0) - (Number(a[statSort]) || 0);
                if (diff !== 0) return diff;
                return a.name.localeCompare(b.name, "ko");
              });

              return (
                <>
                  <div className="flex gap-2 mb-3">
                    {filters.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setStatSort(statSort === key ? "pos" : key)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                          statSort === key
                            ? "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black shadow-sm"
                            : "bg-white dark:bg-[#141416] border border-gray-200/70 dark:border-white/[0.06] text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <Card className="bg-white dark:bg-[#161618] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-3xl overflow-hidden shadow-soft">
                    <table className="w-full text-left table-fixed border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-tighter">
                          <th className="w-[30%] py-4 pl-4">선수</th>
                          <th className={`w-[17%] py-4 text-center ${statSort === "apps" ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : ""}`}>출전</th>
                          <th className={`w-[17%] py-4 text-center ${statSort === "goals" ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : ""}`}>골</th>
                          <th className={`w-[17%] py-4 text-center ${statSort === "assists" ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : ""}`}>도움</th>
                          <th className={`w-[17%] py-4 text-center ${statSort === "mom" ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : ""}`}>MOM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {sortedPlayers.map((player, idx) => (
                          <tr
                            key={idx}
                            onClick={() => { buzz(); goToPlayer(player.name); }}
                            className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                          >
                            <td className="py-4 pl-4 overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <p className="font-black text-[13px] text-gray-800 dark:text-gray-200 truncate shrink-0">
                                  {player.name}
                                </p>
                                <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${getPosBadgeStyle(player.pos)}`}>
                                  {player.pos !== "-" ? player.pos : "SUB"}
                                </span>
                              </div>
                              {playerTitles[player.name.trim()]?.length ? (
                                <div className="mt-1.5">
                                  <TitleBadges titles={playerTitles[player.name.trim()]} size={15} max={3} gap={3} />
                                </div>
                              ) : null}
                            </td>
                            <td className={`py-4 text-center text-[13px] font-bold ${statSort === "apps" ? "text-[#FF8FA3] dark:text-[#FFB6C1] font-black" : "text-gray-400"}`}>
                              {player.apps}
                            </td>
                            <td className={`py-4 text-center text-[13px] font-bold ${statSort === "goals" ? "text-[#FF8FA3] dark:text-[#FFB6C1] font-black" : "text-gray-700 dark:text-gray-300"}`}>
                              {player.goals}
                            </td>
                            <td className={`py-4 text-center text-[13px] font-bold ${statSort === "assists" ? "text-[#FF8FA3] dark:text-[#FFB6C1] font-black" : "text-gray-700 dark:text-gray-300"}`}>
                              {player.assists}
                            </td>
                            <td className="py-4 text-center text-[13px] font-bold text-gray-700 dark:text-gray-300">
                              {Number(player.mom) > 0 ? (
                                <span className={`flex items-center justify-center gap-0.5 ${statSort === "mom" ? "text-[#FF8FA3] dark:text-[#FFB6C1] font-black" : ""}`}>
                                  {player.mom}<Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                </span>
                              ) : (
                                <span className="text-gray-200 dark:text-gray-800">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                </>
              );
            })()}
          </TabsContent>

          {/* 전적 탭 */}
          <TabsContent value="record" className="outline-none pb-10 animate-tab space-y-6">
            {/* 상대팀별 전적 */}
            <div>
              <div className="flex items-center gap-1.5 mb-3 px-1">
                <Swords className="w-3.5 h-3.5 text-[#FF8FA3] dark:text-[#FFB6C1]" />
                <span className="text-[11px] font-bold text-gray-700 dark:text-white tracking-widest">상대팀별 전적</span>
                <span className="text-[10px] text-gray-400 ml-1">일반 매칭 기준</span>
              </div>
              <Card className="bg-white dark:bg-[#161618] border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-soft">
                {opponentStats.length === 0 ? (
                  <CardContent className="py-10 text-center text-[12px] text-gray-400">
                    기록된 경기가 없어요
                  </CardContent>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-white/5">
                    {opponentStats.map((o) => {
                      const wrColor = o.winRate >= 60 ? "text-emerald-500" : o.winRate <= 30 ? "text-rose-400" : "text-gray-500 dark:text-gray-300";
                      return (
                        <div key={o.key} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">vs {o.key}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                              {o.played}경기 · {o.w}승 {o.d}무 {o.l}패 · {o.gf}<span className="text-gray-300 dark:text-gray-600">득</span> {o.ga}<span className="text-gray-300 dark:text-gray-600">실</span>
                            </p>
                          </div>
                          <div className="shrink-0 w-16 text-right">
                            <p className={`text-[15px] font-extrabold tabular-nums ${wrColor}`}>{o.winRate}%</p>
                            <div className="w-full h-1 bg-gray-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#FFB6C1] to-[#FF8FA3]" style={{ width: `${o.winRate}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* 장소별 승률 */}
            <div>
              <div className="flex items-center gap-1.5 mb-3 px-1">
                <MapPin className="w-3.5 h-3.5 text-[#FF8FA3] dark:text-[#FFB6C1]" />
                <span className="text-[11px] font-bold text-gray-700 dark:text-white tracking-widest">장소별 승률</span>
                <span className="text-[10px] text-gray-400 ml-1">일반 매칭 기준</span>
              </div>
              <Card className="bg-white dark:bg-[#161618] border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-soft">
                {venueStats.length === 0 ? (
                  <CardContent className="py-10 text-center text-[12px] text-gray-400">
                    기록된 경기가 없어요
                  </CardContent>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-white/5">
                    {venueStats.map((v, i) => {
                      const wrColor = v.winRate >= 60 ? "text-emerald-500" : v.winRate <= 30 ? "text-rose-400" : "text-gray-500 dark:text-gray-300";
                      return (
                        <div key={v.key} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{v.key}</p>
                              {i === 0 && (
                                <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                                  <Star className="w-2.5 h-2.5 fill-amber-500" /> 최고
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                              {v.played}경기 · {v.w}승 {v.d}무 {v.l}패
                            </p>
                          </div>
                          <div className="shrink-0 w-16 text-right">
                            <p className={`text-[15px] font-extrabold tabular-nums ${wrColor}`}>{v.winRate}%</p>
                            <div className="w-full h-1 bg-gray-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#FFB6C1] to-[#FF8FA3]" style={{ width: `${v.winRate}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* 경기 결과 입력 Drawer */}
      {(() => {
        const editingMatch = matchEditModal !== null ? matchList.find((m) => m.id === matchEditModal) : null;
        return (
          <Drawer open={matchEditModal !== null} onOpenChange={(open) => { if (!open) setMatchEditModal(null); }} handleOnly repositionInputs={false}>
            <DrawerContent className="bg-white dark:bg-[#161618] max-h-[92dvh]">
              <DrawerHeader className="pb-0">
                <DrawerTitle className="text-[15px] font-bold text-gray-900 dark:text-white">
                  경기 결과 입력{editingMatch ? ` — vs ${editingMatch.opponent}` : ""}
                </DrawerTitle>
              </DrawerHeader>

              <div className="overflow-y-auto px-4 py-4 space-y-6">
                {/* 날짜 */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">날짜</p>
                  <Calendar
                    mode="single"
                    selected={editDate ? new Date(editDate + "T12:00:00") : undefined}
                    onSelect={(date) => { if (date) setEditDate(toMatchDateStr(date)); }}
                    className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 w-full p-3"
                    classNames={{
                      months: "w-full",
                      month: "w-full space-y-2",
                      caption: "flex justify-center relative items-center mb-1",
                      caption_label: "text-[13px] font-black text-gray-800 dark:text-white",
                      nav: "flex items-center gap-1",
                      nav_button: "h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors",
                      nav_button_previous: "absolute left-0",
                      nav_button_next: "absolute right-0",
                      table: "w-full border-collapse",
                      head_row: "flex w-full",
                      head_cell: "flex-1 text-center text-[11px] font-black text-gray-400 dark:text-gray-500 pb-1",
                      row: "flex w-full mt-0.5",
                      cell: "flex-1 p-0.5 [&:has([aria-selected])]:bg-transparent",
                      day: "w-full h-9 text-[12px] font-bold text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors",
                      day_selected: "!bg-[#FF8FA3] dark:!bg-[#FFB6C1] !text-white dark:!text-black font-black hover:!bg-[#FF8FA3] dark:hover:!bg-[#FFB6C1]",
                      day_today: "border-2 border-[#FF8FA3] dark:border-[#FFB6C1] text-[#FF8FA3] dark:text-[#FFB6C1] font-black",
                      day_outside: "text-gray-300 dark:text-gray-700 opacity-50",
                      day_disabled: "text-gray-200 dark:text-gray-800",
                      day_hidden: "invisible",
                    }}
                  />
                  {editDate && (
                    <p className="text-[11px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] mt-1.5 text-center">{editDate} 선택됨</p>
                  )}
                </div>

                {/* 시간 */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">시간</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["미정", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "24:00"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setEditTime(t === "미정" ? "" : t)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-colors ${
                          (t === "미정" && !editTime) || editTime === t
                            ? "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black"
                            : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 상대팀 */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">상대팀</p>
                  <input
                    type="text"
                    value={editOpponent}
                    onChange={(e) => setEditOpponent(e.target.value)}
                    placeholder="상대팀 이름"
                    className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>

                {/* 장소 */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">장소</p>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="경기장 이름"
                    className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>

                {/* 경기 유형 */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">경기 유형</p>
                  <div className="flex gap-2">
                    {["일반 매칭", "자체전"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setEditType(t)}
                        className={`flex-1 py-2.5 rounded-xl text-[12px] font-black transition-colors ${
                          editType === t
                            ? "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black"
                            : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 결과 */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">결과</p>
                  <div className="flex gap-2 flex-wrap">
                    {["예정", "승", "무", "패", "자체전"].map((r) => {
                      const active = editResult === r;
                      const colorMap: Record<string, string> = {
                        승: "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black",
                        패: "bg-gray-500 text-white",
                        무: "bg-amber-400 text-white",
                        자체전: "bg-violet-400 text-white",
                        예정: "bg-gray-200 dark:bg-white/20 text-gray-700 dark:text-white",
                      };
                      return (
                        <button
                          key={r}
                          onClick={() => setEditResult(r)}
                          className={`flex-1 min-w-[56px] py-2.5 rounded-xl text-[12px] font-black transition-colors ${active ? colorMap[r] : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"}`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 스코어 */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">스코어</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-center">
                      <p className="text-[10px] text-gray-400 mb-1">언더덕</p>
                      <input
                        type="number"
                        min={0}
                        value={editOurScore}
                        onChange={(e) => setEditOurScore(e.target.value)}
                        placeholder="0"
                        className="w-full text-center text-[20px] font-black bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-3 py-3 outline-none"
                      />
                    </div>
                    <span className="text-[20px] font-black text-gray-300 dark:text-gray-600">:</span>
                    <div className="flex-1 text-center">
                      <p className="text-[10px] text-gray-400 mb-1">{editingMatch?.opponent || "상대팀"}</p>
                      <input
                        type="number"
                        min={0}
                        value={editTheirScore}
                        onChange={(e) => setEditTheirScore(e.target.value)}
                        placeholder="0"
                        className="w-full text-center text-[20px] font-black bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-3 py-3 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 참석자 */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">
                    참석자 <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{editAttendees.size}명</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rosterNames.map((name) => {
                      const selected = editAttendees.has(name);
                      return (
                        <button
                          key={name}
                          onClick={() => {
                            setEditAttendees((prev) => {
                              const next = new Set(prev);
                              if (next.has(name)) {
                                next.delete(name);
                                setEditGoalEvents((prev) => prev.filter((e) => e.scorer !== name && e.assister !== name));
                              } else {
                                next.add(name);
                              }
                              return next;
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[12px] font-black transition-colors ${selected ? "bg-gray-800 dark:bg-white text-white dark:text-black" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"}`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 골 기록 */}
                {editAttendees.size > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-gray-400 tracking-widest">
                        골 기록 <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{editGoalEvents.length}골</span>
                      </p>
                      {!showGoalPicker && (
                        <button
                          onClick={() => { setShowGoalPicker(true); setGoalPickerScorer(""); setGoalPickerAssister(""); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF8FA3]/10 dark:bg-[#FFB6C1]/10 text-[#FF8FA3] dark:text-[#FFB6C1] text-[11px] font-black"
                        >
                          <Plus className="w-3 h-3" /> 골 추가
                        </button>
                      )}
                    </div>

                    {/* 골 이벤트 목록 */}
                    {editGoalEvents.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {editGoalEvents.map((event, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-gray-400 w-4">{i + 1}</span>
                              {event.scorer === "자책골" ? (
                                <span className="text-[13px] font-bold text-orange-500 dark:text-orange-400">자책골 (OG)</span>
                              ) : (
                                <>
                                  <span className="text-[13px] font-bold text-gray-900 dark:text-white">{event.scorer}</span>
                                  {event.assister && (
                                    <span className="text-[11px] font-bold text-blue-400">A. {event.assister}</span>
                                  )}
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => setEditGoalEvents((prev) => prev.filter((_, idx) => idx !== i))}
                              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                              <X className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 골 추가 피커 */}
                    {showGoalPicker && (
                      <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 space-y-4">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">득점자</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(editAttendees).map((name) => (
                              <button
                                key={name}
                                onClick={() => { setGoalPickerScorer(name); setGoalPickerAssister(""); }}
                                className={`px-3 py-1.5 rounded-xl text-[12px] font-black transition-colors ${goalPickerScorer === name ? "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black" : "bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10"}`}
                              >
                                {name}
                              </button>
                            ))}
                            <button
                              onClick={() => { setGoalPickerScorer("자책골"); setGoalPickerAssister(""); }}
                              className={`px-3 py-1.5 rounded-xl text-[12px] font-black transition-colors ${goalPickerScorer === "자책골" ? "bg-orange-400 text-white" : "bg-orange-50 dark:bg-orange-950/30 text-orange-500 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50"}`}
                            >
                              자책골 (OG)
                            </button>
                          </div>
                        </div>
                        {goalPickerScorer !== "자책골" && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">어시스트 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(선택)</span></p>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(editAttendees).filter((n) => n !== goalPickerScorer).map((name) => (
                              <button
                                key={name}
                                onClick={() => setGoalPickerAssister((prev) => prev === name ? "" : name)}
                                className={`px-3 py-1.5 rounded-xl text-[12px] font-black transition-colors ${goalPickerAssister === name ? "bg-blue-400 text-white" : "bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10"}`}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowGoalPicker(false)}
                            className="flex-1 py-2.5 rounded-xl bg-gray-200 dark:bg-white/10 text-[12px] font-black text-gray-600 dark:text-gray-300"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => {
                              if (!goalPickerScorer) return;
                              setEditGoalEvents((prev) => [...prev, { scorer: goalPickerScorer, assister: goalPickerAssister }]);
                              setGoalPickerScorer("");
                              setGoalPickerAssister("");
                              setShowGoalPicker(false);
                            }}
                            disabled={!goalPickerScorer}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-[12px] font-black text-white dark:text-black disabled:opacity-40"
                          >
                            확인
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DrawerFooter className="pt-2">
                <button
                  onClick={saveMatchResult}
                  disabled={savingMatchResult}
                  className="w-full py-3 rounded-2xl bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-[13px] font-black text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {savingMatchResult ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장하기"}
                </button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        );
      })()}

      {/* 공지사항 수정 Drawer */}
      <Drawer open={noticeEditModal} onOpenChange={setNoticeEditModal} handleOnly repositionInputs={false}>
        <DrawerContent className="bg-white dark:bg-[#161618] max-h-[92dvh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-[15px] font-bold text-gray-900 dark:text-white">공지사항 수정</DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 py-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">날짜</p>
              <Calendar
                mode="single"
                selected={noticeEditForm.date ? new Date(noticeEditForm.date + "T12:00:00") : undefined}
                onSelect={(date) => {
                  if (date) setNoticeEditForm((p) => ({ ...p, date: toMatchDateStr(date) }));
                }}
                className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 w-full p-3"
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-2",
                  caption: "flex justify-center relative items-center mb-1",
                  caption_label: "text-[13px] font-black text-gray-800 dark:text-white",
                  nav: "flex items-center gap-1",
                  nav_button: "h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors",
                  nav_button_previous: "absolute left-0",
                  nav_button_next: "absolute right-0",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell: "flex-1 text-center text-[11px] font-black text-gray-400 dark:text-gray-500 pb-1",
                  row: "flex w-full mt-0.5",
                  cell: "flex-1 p-0.5 [&:has([aria-selected])]:bg-transparent",
                  day: "w-full h-9 text-[12px] font-bold text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors",
                  day_selected: "!bg-[#FF8FA3] dark:!bg-[#FFB6C1] !text-white dark:!text-black font-black hover:!bg-[#FF8FA3] dark:hover:!bg-[#FFB6C1]",
                  day_today: "border-2 border-[#FF8FA3] dark:border-[#FFB6C1] text-[#FF8FA3] dark:text-[#FFB6C1] font-black",
                  day_outside: "text-gray-300 dark:text-gray-700 opacity-50",
                  day_disabled: "text-gray-200 dark:text-gray-800",
                  day_hidden: "invisible",
                }}
              />
              {noticeEditForm.date && (
                <p className="text-[11px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] mt-1.5 text-center">{noticeEditForm.date} 선택됨</p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">제목</p>
              <input
                type="text"
                value={noticeEditForm.title}
                onChange={(e) => setNoticeEditForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="공지 제목"
                className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">내용</p>
              <textarea
                value={noticeEditForm.content}
                onChange={(e) => setNoticeEditForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="공지 내용"
                rows={5}
                className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none"
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">
                장소 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(선택 — 구장 안내 시 지도 표시)</span>
              </p>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/10 rounded-xl px-4 py-2.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={noticeEditForm.location}
                  onChange={(e) => setNoticeEditForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="예: 서울 월드컵 풋살파크"
                  className="flex-1 text-[13px] font-medium bg-transparent text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                />
                {noticeEditForm.location && (
                  <button
                    onClick={() => setNoticeEditForm((p) => ({ ...p, location: "" }))}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <DrawerFooter className="pt-2">
            <button
              onClick={saveNotice}
              disabled={savingNotice || !noticeEditForm.title || !noticeEditForm.content}
              className="w-full py-3 rounded-2xl bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-[13px] font-black text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {savingNotice ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장하기"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* 경기 일정 등록 Drawer */}
      <Drawer open={addMatchModal} onOpenChange={setAddMatchModal} handleOnly repositionInputs={false}>
        <DrawerContent className="bg-white dark:bg-[#161618] max-h-[92dvh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-[15px] font-bold text-gray-900 dark:text-white">경기 일정 등록</DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 py-4 space-y-5">
            {/* 날짜 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">날짜 *</p>
              <Calendar
                mode="single"
                selected={addMatchForm.date ? new Date(addMatchForm.date + "T12:00:00") : undefined}
                onSelect={(date) => {
                  if (date) setAddMatchForm((p) => ({ ...p, date: toMatchDateStr(date) }));
                }}
                className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 w-full p-3"
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-2",
                  caption: "flex justify-center relative items-center mb-1",
                  caption_label: "text-[13px] font-black text-gray-800 dark:text-white",
                  nav: "flex items-center gap-1",
                  nav_button: "h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors",
                  nav_button_previous: "absolute left-0",
                  nav_button_next: "absolute right-0",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell: "flex-1 text-center text-[11px] font-black text-gray-400 dark:text-gray-500 pb-1",
                  row: "flex w-full mt-0.5",
                  cell: "flex-1 p-0.5 [&:has([aria-selected])]:bg-transparent",
                  day: "w-full h-9 text-[12px] font-bold text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors",
                  day_selected: "!bg-[#FF8FA3] dark:!bg-[#FFB6C1] !text-white dark:!text-black font-black hover:!bg-[#FF8FA3] dark:hover:!bg-[#FFB6C1]",
                  day_today: "border-2 border-[#FF8FA3] dark:border-[#FFB6C1] text-[#FF8FA3] dark:text-[#FFB6C1] font-black",
                  day_outside: "text-gray-300 dark:text-gray-700 opacity-50",
                  day_disabled: "text-gray-200 dark:text-gray-800",
                  day_hidden: "invisible",
                }}
              />
              {addMatchForm.date && (
                <p className="text-[11px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] mt-1.5 text-center">{addMatchForm.date} 선택됨</p>
              )}
            </div>

            {/* 시간 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">시간</p>
              <div className="flex flex-wrap gap-1.5">
                {["미정", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "24:00"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setAddMatchForm((p) => ({ ...p, time: t === "미정" ? "" : t }))}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-colors ${
                      (t === "미정" && !addMatchForm.time) || addMatchForm.time === t
                        ? "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black"
                        : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 상대팀 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">상대팀 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(미입력 시 미정)</span></p>
              <input
                type="text"
                value={addMatchForm.opponent}
                onChange={(e) => setAddMatchForm((p) => ({ ...p, opponent: e.target.value }))}
                placeholder="상대팀 이름"
                className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            {/* 장소 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">장소 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(미입력 시 미정)</span></p>
              <input
                type="text"
                value={addMatchForm.location}
                onChange={(e) => setAddMatchForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="경기장 이름"
                className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            {/* 경기 유형 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">경기 유형</p>
              <div className="flex gap-2">
                {["일반 매칭", "자체전"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setAddMatchForm((p) => ({ ...p, type: t }))}
                    className={`flex-1 py-2.5 rounded-xl text-[12px] font-black transition-colors ${
                      addMatchForm.type === t
                        ? "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black"
                        : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DrawerFooter className="pt-2">
            <button
              onClick={addMatch}
              disabled={addingMatch || !addMatchForm.date}
              className="w-full py-3 rounded-2xl bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-[13px] font-black text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {addingMatch ? <Loader2 className="w-4 h-4 animate-spin" /> : "등록하기"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* MOM 투표 모달 */}
      {momModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
          onClick={() => setMomModal(null)}
        >
          <div
            className="w-full max-w-xs bg-white dark:bg-[#161618] rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] font-bold text-gray-900 dark:text-white mb-1">MOM 투표</p>
            <p className="text-[11px] text-gray-400 mb-4">
              <span className="font-black text-gray-700 dark:text-gray-300">{momModalVoter}</span> 님으로 투표합니다
            </p>

            {/* 공격 MOM */}
            <div className="mb-4">
              <p className="text-[10px] font-bold text-blue-400 mb-1.5 flex items-center gap-1"><Target className="w-3 h-3" /> 공격 MOM</p>
              <div className="flex flex-wrap gap-1.5">
                {momModal.attendees.filter((n) => n !== momModalVoter).map((n) => (
                  <button
                    key={n}
                    onClick={() => setMomModalAtk((prev) => prev === n ? "" : n)}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-xl transition-all ${
                      momModalAtk === n ? "bg-blue-400 text-white" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-400/20"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* 수비 MOM */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-green-500 mb-1.5 flex items-center gap-1"><Shield className="w-3 h-3" /> 수비 MOM</p>
              <div className="flex flex-wrap gap-1.5">
                {momModal.attendees.filter((n) => n !== momModalVoter).map((n) => (
                  <button
                    key={n}
                    onClick={() => setMomModalDef((prev) => prev === n ? "" : n)}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-xl transition-all ${
                      momModalDef === n ? "bg-green-400 text-white" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-400/20"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setMomModal(null)}
                className="flex-1 py-2.5 rounded-2xl bg-gray-100 dark:bg-white/10 text-[12px] font-black text-gray-600 dark:text-gray-300"
              >
                취소
              </button>
              <button
                disabled={!momModalVoter || (!momModalAtk && !momModalDef) || submittingVote === momModal.matchId}
                onClick={async () => {
                  try {
                    if (momModalAtk) await submitMomVote(momModal.matchId, momModalVoter, momModalAtk, "공격");
                    if (momModalDef) await submitMomVote(momModal.matchId, momModalVoter, momModalDef, "수비");
                    setMomModal(null);
                  } catch {
                    alert("투표 저장에 실패했습니다. 다시 시도해주세요.");
                  }
                }}
                className="flex-1 py-2.5 rounded-2xl bg-[#FF8FA3] text-[12px] font-black text-white disabled:opacity-40 transition-opacity"
              >
                {submittingVote === momModal.matchId ? "투표 중..." : "투표 완료"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-xs bg-white dark:bg-[#161618] rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[13px] font-black text-gray-900 dark:text-white mb-1">댓글을 삭제할까요?</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-5 leading-relaxed break-words">
              &ldquo;{deleteTarget.fb.message}&rdquo;
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-2xl bg-gray-100 dark:bg-white/10 text-[12px] font-black text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  await deleteFeedbackItem(deleteTarget.matchId, deleteTarget.fb);
                  setDeleteTarget(null);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-red-500 text-[12px] font-black text-white hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 위로 가기 버튼 */}
      {showTopBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-6 z-50 w-10 h-10 rounded-full bg-white dark:bg-[#161618] border border-gray-200 dark:border-white/10 shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="맨 위로"
        >
          <ChevronUp className="w-5 h-5 text-[#FF8FA3] dark:text-[#FFB6C1]" />
        </button>
      )}
      <AppBottomNav
        active={activeTab === "stats" ? "stats" : initialView === "home" ? "home" : "matches"}
        currentUserName={currentUser?.name}
      />
    </div>
  );
}
