"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "./ui/drawer";
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
  Upload,
} from "lucide-react";
import { shareMatchResult } from "../lib/draw-match-result";
import { MiniFormationField, FORMATION_POSITIONS } from "./FormationField";
import { shareFormation } from "../lib/draw-formation";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { DayPicker } from "react-day-picker";

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
  { date: "2026-06-06", label: "야유회 🦆" },
  { date: "2026-06-07", label: "야유회 🦆" },
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
  photos?: string; // M열 - Drive 파일ID (쉼표 구분)
}

export interface MediaData {
  id: number;
  type: "video" | "image";
  url: string;
  title: string;
  uploadedAt: string;
}

interface DashboardClientProps {
  players: PlayerData[];
  matches: MatchData[];
  notice?: NoticeData;
  lineups: LineupData[];
  rosterMap: Record<string, string>;
  media?: MediaData[];
}

export default function DashboardClient({
  players,
  matches,
  notice,
  lineups,
  rosterMap,
  media = [],
}: DashboardClientProps) {
  const { theme, setTheme } = useTheme();
  const [matchList, setMatchList] = React.useState<MatchData[]>(matches);
  const [showTopBtn, setShowTopBtn] = React.useState(false);

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

  // 미디어 콘텐츠
  const [mediaList, setMediaList] = React.useState<MediaData[]>(media);
  const [mediaUploadModal, setMediaUploadModal] = React.useState(false);
  const [mediaUploadFile, setMediaUploadFile] = React.useState<File | null>(null);
  const [mediaUploadTitle, setMediaUploadTitle] = React.useState("");
  const [mediaUploading, setMediaUploading] = React.useState(false);
  const mediaFileRef = React.useRef<HTMLInputElement>(null);

  // 어드민 PIN
  const [isMediaAdmin, setIsMediaAdmin] = React.useState(false);
  const [showPinInput, setShowPinInput] = React.useState(false);
  const [pinDraft, setPinDraft] = React.useState("");
  const [pinError, setPinError] = React.useState(false);
  const [verifyingPin, setVerifyingPin] = React.useState(false);
  const adminPinRef = React.useRef("");

  const verifyAdminPin = async () => {
    if (!pinDraft) return;
    setVerifyingPin(true);
    setPinError(false);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinDraft }),
      });
      if (res.ok) {
        adminPinRef.current = pinDraft;
        setIsMediaAdmin(true);
        setShowPinInput(false);
        setPinDraft("");
      } else {
        setPinError(true);
        setPinDraft("");
      }
    } finally {
      setVerifyingPin(false);
    }
  };

  const uploadMedia = async () => {
    if (!mediaUploadFile) return;
    setMediaUploading(true);
    try {
      const isVideo = mediaUploadFile.type.startsWith("video/");
      const resourceType = isVideo ? "video" : "image";
      const signRes = await fetch(`/api/media/sign?type=${resourceType}`, {
        headers: { "x-admin-pin": adminPinRef.current },
      });
      const { timestamp, signature, apiKey, cloudName, folder } = await signRes.json();
      const fd = new FormData();
      fd.append("file", mediaUploadFile);
      fd.append("api_key", apiKey);
      fd.append("timestamp", String(timestamp));
      fd.append("signature", signature);
      fd.append("folder", folder);
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        { method: "POST", body: fd }
      );
      const uploadData = await uploadRes.json();
      if (!uploadData.secure_url) throw new Error("업로드 실패");
      const saveRes = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": adminPinRef.current },
        body: JSON.stringify({ type: resourceType, url: uploadData.secure_url, title: mediaUploadTitle }),
      });
      if (!saveRes.ok) throw new Error("저장 실패");
      setMediaList((prev) => [
        { id: prev.length, type: resourceType as "video" | "image", url: uploadData.secure_url, title: mediaUploadTitle, uploadedAt: new Date().toISOString() },
        ...prev,
      ]);
      setMediaUploadFile(null);
      setMediaUploadTitle("");
      setMediaUploadModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setMediaUploading(false);
    }
  };

  const deleteMediaItem = async (url: string) => {
    if (!confirm("삭제할까요?")) return;
    try {
      await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-pin": adminPinRef.current },
        body: JSON.stringify({ url }),
      });
      setMediaList((prev) => prev.filter((item) => item.url !== url));
    } catch {
      alert("삭제 실패");
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
  const [openLineups, setOpenLineups] = React.useState<Set<number>>(new Set());
  const [activeQuarters, setActiveQuarters] = React.useState<Record<number, string>>({});
  const [sharingMatch, setSharingMatch] = React.useState<number | null>(null);
  const matchCardRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(new Date());

  // 경기 결과 입력
  const [matchEditModal, setMatchEditModal] = React.useState<number | null>(null);
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
    matchList.forEach((m) => {
      const key = m.date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [matchList]);

  // 결과 공유
  const [sharingResult, setSharingResult] = React.useState<number | null>(null);

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
        body: JSON.stringify({ result: editResult, ourScore: editOurScore, theirScore: editTheirScore, goals: goalsStr, assists: assistsStr, attendees: attendeesStr }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setMatchList((prev) =>
        prev.map((m) =>
          m.id === matchEditModal
            ? { ...m, result: editResult, ourScore: editOurScore || "-", theirScore: editTheirScore || "-", goals: goalsStr, assists: assistsStr, attendees: attendeesStr }
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
    .filter((m) => m.result === "예정")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const dDay = nextMatch ? getDDay(nextMatch.date) : null;

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
  const [momVoterName, setMomVoterName] = React.useState<Record<number, string>>({});
  const [submittingVote, setSubmittingVote] = React.useState<number | null>(null);
  const [openVotes, setOpenVotes] = React.useState<Set<number>>(new Set());
  const [momModal, setMomModal] = React.useState<{ matchId: number; attendees: string[] } | null>(null);
  const [momModalVoter, setMomModalVoter] = React.useState("");
  const [momModalAtk, setMomModalAtk] = React.useState("");
  const [momModalDef, setMomModalDef] = React.useState("");

  // 페이지 로드 시 마감된 경기 MOM 자동 확정 후 카드에 반영
  React.useEffect(() => {
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
  }, []);

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
          <TabsList className="grid w-full h-full grid-cols-3 bg-gray-200/60 dark:bg-white/5 p-1 mb-6 rounded-2xl border border-gray-200 dark:border-white/5">
            <TabsTrigger
              value="matches"
              className="text-gray-500 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[#FFB6C1] data-[state=active]:text-[#FF8FA3] dark:data-[state=active]:text-black rounded-xl py-2.5 font-black text-[12px] transition-all"
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1" /> 일정
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="text-gray-500 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[#FFB6C1] data-[state=active]:text-[#FF8FA3] dark:data-[state=active]:text-black rounded-xl py-2.5 font-black text-[12px] transition-all"
            >
              <Trophy className="w-3.5 h-3.5 mr-1" /> 스탯
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="text-gray-500 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-[#FFB6C1] data-[state=active]:text-[#FF8FA3] dark:data-[state=active]:text-black rounded-xl py-2.5 font-black text-[12px] transition-all"
            >
              <Film className="w-3.5 h-3.5 mr-1" /> 콘텐츠
            </TabsTrigger>
          </TabsList>

          {/* 💡 경기 일정 탭 내용 */}
          <TabsContent value="matches" className="space-y-6 outline-none">
            {/* 💡 [공지사항 섹션] 고대비 + 왼쪽 포인트 라인 디자인 */}
            {localNotice && (
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
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border-none font-bold text-[10px] px-2 py-0">
                          {localNotice.date}
                        </Badge>
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
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-[#1a1a1a]">
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
                  <div className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-4 bg-gray-50 dark:bg-[#0a0a0a] flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      다가오는 경기 일정
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 매치 캘린더 */}
            <div className="px-1 mb-6">
              <Card className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-md">
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
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-black ${circleStyle} ${isToday ? "ring-2 ring-offset-1 ring-[#FF8FA3] dark:ring-offset-[#111]" : ""}`}>
                              {date.getDate()}
                            </div>
                          );
                        }
                        if (isEvent) {
                          return (
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-black bg-sky-400 text-white ${isToday ? "ring-2 ring-offset-1 ring-sky-400 dark:ring-offset-[#111]" : ""}`}>
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
                          <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center py-2">이달의 경기가 없어요 🦆</p>
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

            {/* D-Day 배너 */}
            {nextMatch && dDay !== null && (
              <div className="mb-4 rounded-3xl bg-gradient-to-r from-[#FFB6C1]/15 to-[#FF8FA3]/5 border border-[#FFB6C1]/25 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] mb-1 tracking-widest">NEXT MATCH</p>
                  <p className="text-sm font-black text-gray-800 dark:text-white">vs {nextMatch.opponent}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {nextMatch.date} · {nextMatch.time} · {nextMatch.location}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-3xl font-black text-[#FF8FA3] dark:text-[#FFB6C1] leading-none">
                    {dDay === 0 ? "D-DAY" : dDay < 0 ? `D+${Math.abs(dDay)}` : `D-${dDay}`}
                  </div>
                </div>
              </div>
            )}

            {/* 경기 일정 등록 버튼 */}
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

            {/* 경기 일정 리스트 */}
            {[...matchList].reverse().map((match) => {
              const isInternal = match.opponent === "자체전";
              return (
                <React.Fragment key={match.id}>
                <div ref={(el) => { matchCardRefs.current[match.id] = el; }} />
                <Card
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
                        <button
                          onClick={() => openMatchEdit(match)}
                          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                          aria-label="결과 입력"
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        </button>
                        {match.mom && (
                          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-300/50 dark:border-yellow-400/30 rounded-md px-2 py-0.5">
                            <span className="text-[10px]">⭐</span>
                            <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400">
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
                                setSharingResult(match.id);
                                try { await shareMatchResult(match); }
                                catch (e) { if (e instanceof Error && e.name !== "AbortError") alert("공유 실패"); }
                                finally { setSharingResult(null); }
                              }}
                              disabled={sharingResult === match.id}
                              className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-40"
                            >
                              {sharingResult === match.id
                                ? <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                                : <Share2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
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
                                const no = rosterMap[name] || "G";
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
                            {photos.length < 5 && (
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
                                  <button
                                    onClick={() => deletePhoto(match.id, id)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/80 transition-all opacity-0 group-hover/photo:opacity-100"
                                  >
                                    <X className="w-3 h-3 text-white" />
                                  </button>
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
                      const voterName = momVoterName[match.id] || "";

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
                            <span className={`text-[10px] font-black w-14 shrink-0 truncate ${isLeader ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : "text-gray-600 dark:text-gray-400"}`}>
                              {isLeader ? "⭐ " : ""}{name}
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${isLeader ? "bg-[#FF8FA3] dark:bg-[#FFB6C1]" : "bg-gray-300 dark:bg-white/20"}`}
                                style={{ width: count > 0 ? `${pct}%` : "0%" }} />
                            </div>
                            <span className="text-[10px] text-gray-400 w-4 text-right shrink-0">{count}</span>
                            {myVote === name && <span className="text-[9px] text-[#FF8FA3] dark:text-[#FFB6C1] font-black shrink-0">✓</span>}
                          </div>
                        );
                      };

                      const hasVoted = myAtkVote || myDefVote;
                      const leaderAtk = Object.entries(atkTally).sort((a, b) => b[1] - a[1])[0]?.[0];
                      const leaderDef = Object.entries(defTally).sort((a, b) => b[1] - a[1])[0]?.[0];

                      return (
                        <div className="mt-3 border-t border-gray-100 dark:border-white/5 pt-3">
                          <button
                            onClick={() => setOpenVotes((prev) => { const next = new Set(prev); next.has(match.id) ? next.delete(match.id) : next.add(match.id); return next; })}
                            className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full"
                          >
                            <span className="text-sm">⭐</span>
                            MOM 투표
                            {votes.length > 0 && <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{votes.length}</span>}
                            {!isOpen && (leaderAtk || leaderDef) && (
                              <span className="text-[10px] text-gray-400 font-medium truncate">
                                {leaderAtk ? `⚽${leaderAtk}` : ""}{leaderAtk && leaderDef ? " · " : ""}{leaderDef ? `🛡️${leaderDef}` : ""}
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
                                <p className="text-[10px] font-black text-blue-400 mb-1.5">⚽ 공격 MOM</p>
                                <div className="space-y-1.5">
                                  {atkCandidates.map((name) => (
                                    <VoteBar key={name} name={name} tally={atkTally} myVote={myAtkVote} />
                                  ))}
                                </div>
                              </div>

                              {/* 수비 MOM */}
                              <div>
                                <p className="text-[10px] font-black text-green-500 mb-1.5">🛡️ 수비 MOM</p>
                                <div className="space-y-1.5">
                                  {defCandidates.map((name) => (
                                    <VoteBar key={name} name={name} tally={defTally} myVote={myDefVote} />
                                  ))}
                                </div>
                              </div>

                              {/* 투표하기 버튼 - 경기 당일까지만 표시 */}
                              <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                                {votingClosed ? (
                                  <p className="text-[10px] text-gray-400 text-center py-0.5">🔒 투표가 마감되었습니다</p>
                                ) : (
                                  <>
                                    <p className="text-[10px] text-gray-400 mb-2">
                                      📢 투표는 경기 당일까지만 가능합니다
                                    </p>
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
                              <p className="flex-1 min-w-0 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                <span className="font-black text-gray-700 dark:text-gray-300 mr-1.5">{firstFb.name}</span>
                                {firstFb.message}
                              </p>
                            </div>
                          )}

                          {/* 펼친 상태: 전체 피드백 + 입력 폼 */}
                          {isOpen && (
                            <div className="mt-2 space-y-3">
                              {feedbacks.length === 0 && (
                                <p className="text-[10px] text-gray-400 text-center py-2">아직 피드백이 없어요 🦆</p>
                              )}
                              {feedbacks.map((fb, i) => (
                                <div key={i} className="flex gap-2 group">
                                  <FeedbackAvatar name={fb.name} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[10px] font-black text-gray-800 dark:text-gray-200">{fb.name}</span>
                                      <span className="text-[9px] text-gray-400">{formatFeedbackTime(fb.timestamp)}</span>
                                      <button
                                        onClick={() => setDeleteTarget({ matchId: match.id, fb })}
                                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
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
            {/* 필터 버튼 */}
            {(() => {
              const filters: { key: "apps" | "goals" | "assists" | "mom"; label: string; emoji: string }[] = [
                { key: "apps", label: "출전", emoji: "🏃" },
                { key: "goals", label: "골", emoji: "⚽" },
                { key: "assists", label: "도움", emoji: "🎯" },
                { key: "mom", label: "MOM", emoji: "⭐" },
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
                    {filters.map(({ key, label, emoji }) => (
                      <button
                        key={key}
                        onClick={() => setStatSort(statSort === key ? "pos" : key)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-2xl text-[11px] font-black transition-all ${
                          statSort === key
                            ? "bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black shadow-md"
                            : "bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <span>{emoji}</span>{label}
                      </button>
                    ))}
                  </div>

                  <Card className="bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-3xl overflow-hidden shadow-lg dark:shadow-2xl">
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
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 pl-4 overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <p className="font-black text-[13px] text-gray-800 dark:text-gray-200 truncate shrink-0">
                                  {player.name}
                                </p>
                                <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${getPosBadgeStyle(player.pos)}`}>
                                  {player.pos !== "-" ? player.pos : "SUB"}
                                </span>
                              </div>
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
                                  {player.mom}<span className="text-[10px] text-yellow-500">⭐</span>
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

          {/* 콘텐츠 탭 */}
          <TabsContent value="media" className="outline-none pb-10">
            {/* 어드민 잠금/해제 */}
            <div className="flex items-center justify-end mb-3">
              {isMediaAdmin ? (
                <button
                  onClick={() => { setIsMediaAdmin(false); adminPinRef.current = ""; setShowPinInput(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 text-[11px] font-black"
                >
                  🔓 관리자
                </button>
              ) : (
                <button
                  onClick={() => { setShowPinInput((p) => !p); setPinError(false); setPinDraft(""); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-[11px] font-black"
                >
                  🔒 관리자
                </button>
              )}
            </div>

            {/* PIN 입력 */}
            {showPinInput && !isMediaAdmin && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pinDraft}
                  onChange={(e) => { setPinDraft(e.target.value); setPinError(false); }}
                  onKeyDown={(e) => e.key === "Enter" && verifyAdminPin()}
                  placeholder="PIN 입력"
                  autoFocus
                  className={`flex-1 text-[13px] font-bold bg-white dark:bg-white/10 rounded-xl px-3 py-2 outline-none border ${pinError ? "border-red-400 text-red-500 placeholder:text-red-300" : "border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400"}`}
                />
                <button
                  onClick={verifyAdminPin}
                  disabled={verifyingPin || !pinDraft}
                  className="px-3 py-2 rounded-xl bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black text-[12px] font-black disabled:opacity-40"
                >
                  {verifyingPin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "확인"}
                </button>
              </div>
            )}
            {pinError && <p className="text-[11px] text-red-500 font-bold -mt-2 mb-3 px-1">PIN이 올바르지 않습니다</p>}

            {/* 업로드 버튼 (어드민만) */}
            {isMediaAdmin && (
              <button
                onClick={() => setMediaUploadModal(true)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[#FFB6C1]/40 dark:border-[#FFB6C1]/20 text-[#FF8FA3] dark:text-[#FFB6C1] text-[13px] font-black hover:bg-[#FF8FA3]/5 dark:hover:bg-[#FFB6C1]/5 transition-colors mb-5"
              >
                <Upload className="w-4 h-4" /> 업로드
              </button>
            )}

            {mediaList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
                <Film className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-[13px] font-bold">업로드된 콘텐츠가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 비디오 */}
                {mediaList.filter((m) => m.type === "video").map((item) => (
                  <div key={item.url} className="rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 shadow-sm">
                    <video
                      src={item.url}
                      controls
                      className="w-full max-h-64 bg-black"
                      preload="metadata"
                      poster={item.url.replace("/video/upload/", "/video/upload/so_0/").replace(/\.[^.]+$/, ".jpg")}
                    />
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[13px] font-black text-gray-800 dark:text-gray-100 truncate flex-1">
                        {item.title || "제목 없음"}
                      </span>
                      {isMediaAdmin && (
                        <button
                          onClick={() => deleteMediaItem(item.url)}
                          className="ml-3 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* 이미지 */}
                {mediaList.filter((m) => m.type === "image").length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {mediaList.filter((m) => m.type === "image").map((item) => (
                      <div key={item.url} className="rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 shadow-sm relative group">
                        <img src={item.url} alt={item.title} className="w-full h-36 object-cover" />
                        <div className="px-3 py-2 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate flex-1">{item.title || "제목 없음"}</span>
                          {isMediaAdmin && (
                            <button
                              onClick={() => deleteMediaItem(item.url)}
                              className="ml-1 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 업로드 Drawer */}
            <Drawer open={mediaUploadModal} onOpenChange={setMediaUploadModal}>
              <DrawerContent className="bg-white dark:bg-[#1a1a1a] max-h-[80dvh]">
                <DrawerHeader className="pb-0">
                  <DrawerTitle className="text-[15px] font-black text-gray-900 dark:text-white">📤 콘텐츠 업로드</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 py-4 space-y-4">
                  {/* 파일 선택 */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">파일 선택 *</p>
                    <input
                      ref={mediaFileRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => setMediaUploadFile(e.target.files?.[0] || null)}
                    />
                    <button
                      onClick={() => mediaFileRef.current?.click()}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 text-[13px] font-bold text-gray-500 dark:text-gray-400 hover:border-[#FFB6C1] hover:text-[#FF8FA3] dark:hover:text-[#FFB6C1] transition-colors"
                    >
                      {mediaUploadFile ? (
                        <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">
                          {mediaUploadFile.type.startsWith("video/") ? "🎬" : "🖼️"} {mediaUploadFile.name}
                        </span>
                      ) : (
                        "사진 또는 동영상 선택"
                      )}
                    </button>
                  </div>
                  {/* 제목 */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">제목 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(선택)</span></p>
                    <input
                      type="text"
                      value={mediaUploadTitle}
                      onChange={(e) => setMediaUploadTitle(e.target.value)}
                      placeholder="콘텐츠 제목"
                      className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    />
                  </div>
                </div>
                <DrawerFooter className="pt-2">
                  <button
                    onClick={uploadMedia}
                    disabled={mediaUploading || !mediaUploadFile}
                    className="w-full py-3 rounded-2xl bg-[#FF8FA3] dark:bg-[#FFB6C1] text-[13px] font-black text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {mediaUploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> 업로드 중...</>
                    ) : "업로드"}
                  </button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </TabsContent>
        </Tabs>
      </main>

      {/* 경기 결과 입력 Drawer */}
      {(() => {
        const editingMatch = matchEditModal !== null ? matchList.find((m) => m.id === matchEditModal) : null;
        return (
          <Drawer open={matchEditModal !== null} onOpenChange={(open) => { if (!open) setMatchEditModal(null); }}>
            <DrawerContent className="bg-white dark:bg-[#1a1a1a] max-h-[92dvh]">
              <DrawerHeader className="pb-0">
                <DrawerTitle className="text-[15px] font-black text-gray-900 dark:text-white">
                  ⚽ 경기 결과 입력{editingMatch ? ` — vs ${editingMatch.opponent}` : ""}
                </DrawerTitle>
              </DrawerHeader>

              <div className="overflow-y-auto px-4 py-4 space-y-6">
                {/* 결과 */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">결과</p>
                  <div className="flex gap-2 flex-wrap">
                    {["예정", "승", "무", "패", "자체전"].map((r) => {
                      const active = editResult === r;
                      const colorMap: Record<string, string> = {
                        승: "bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black",
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
                  <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">스코어</p>
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
                  <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">
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
                      <p className="text-[10px] font-black text-gray-400 tracking-widest">
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
                              <span className="text-[10px] font-black text-gray-400 w-4">{i + 1}</span>
                              {event.scorer === "자책골" ? (
                                <span className="text-[13px] font-black text-orange-500 dark:text-orange-400">⚽ 자책골 (OG)</span>
                              ) : (
                                <>
                                  <span className="text-[13px] font-black text-gray-900 dark:text-white">⚽ {event.scorer}</span>
                                  {event.assister && (
                                    <span className="text-[11px] font-bold text-blue-400">🅰️ {event.assister}</span>
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
                          <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">⚽ 득점자</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(editAttendees).map((name) => (
                              <button
                                key={name}
                                onClick={() => { setGoalPickerScorer(name); setGoalPickerAssister(""); }}
                                className={`px-3 py-1.5 rounded-xl text-[12px] font-black transition-colors ${goalPickerScorer === name ? "bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black" : "bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10"}`}
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
                          <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">🅰️ 어시스트 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(선택)</span></p>
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
                            className="flex-1 py-2.5 rounded-xl bg-[#FF8FA3] dark:bg-[#FFB6C1] text-[12px] font-black text-white dark:text-black disabled:opacity-40"
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
                  className="w-full py-3 rounded-2xl bg-[#FF8FA3] dark:bg-[#FFB6C1] text-[13px] font-black text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {savingMatchResult ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장하기"}
                </button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        );
      })()}

      {/* 공지사항 수정 Drawer */}
      <Drawer open={noticeEditModal} onOpenChange={setNoticeEditModal}>
        <DrawerContent className="bg-white dark:bg-[#1a1a1a] max-h-[92dvh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-[15px] font-black text-gray-900 dark:text-white">📢 공지사항 수정</DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 py-4 space-y-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">날짜</p>
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
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">제목</p>
              <input
                type="text"
                value={noticeEditForm.title}
                onChange={(e) => setNoticeEditForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="공지 제목"
                className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">내용</p>
              <textarea
                value={noticeEditForm.content}
                onChange={(e) => setNoticeEditForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="공지 내용"
                rows={5}
                className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none"
              />
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">
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
              className="w-full py-3 rounded-2xl bg-[#FF8FA3] dark:bg-[#FFB6C1] text-[13px] font-black text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {savingNotice ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장하기"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* 경기 일정 등록 Drawer */}
      <Drawer open={addMatchModal} onOpenChange={setAddMatchModal}>
        <DrawerContent className="bg-white dark:bg-[#1a1a1a] max-h-[92dvh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-[15px] font-black text-gray-900 dark:text-white">🗓️ 경기 일정 등록</DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 py-4 space-y-5">
            {/* 날짜 */}
            <div>
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">날짜 *</p>
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
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">시간</p>
              <div className="flex flex-wrap gap-1.5">
                {["미정", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "24:00"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setAddMatchForm((p) => ({ ...p, time: t === "미정" ? "" : t }))}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-colors ${
                      (t === "미정" && !addMatchForm.time) || addMatchForm.time === t
                        ? "bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black"
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
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">상대팀 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(미입력 시 미정)</span></p>
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
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">장소 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(미입력 시 미정)</span></p>
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
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">경기 유형</p>
              <div className="flex gap-2">
                {["일반 매칭", "자체전"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setAddMatchForm((p) => ({ ...p, type: t }))}
                    className={`flex-1 py-2.5 rounded-xl text-[12px] font-black transition-colors ${
                      addMatchForm.type === t
                        ? "bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black"
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
              className="w-full py-3 rounded-2xl bg-[#FF8FA3] dark:bg-[#FFB6C1] text-[13px] font-black text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
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
            className="w-full max-w-xs bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] font-black text-gray-900 dark:text-white mb-4">⭐ MOM 투표</p>

            {/* 투표자(나) 선택 */}
            <div className="mb-4">
              <p className="text-[10px] font-black text-gray-400 mb-1.5 tracking-widest">나는</p>
              <div className="flex flex-wrap gap-1.5">
                {momModal.attendees.map((n) => (
                  <button
                    key={n}
                    onClick={() => { setMomModalVoter(n); if (momModalAtk === n) setMomModalAtk(""); if (momModalDef === n) setMomModalDef(""); }}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-xl transition-all ${
                      momModalVoter === n ? "bg-gray-800 dark:bg-white text-white dark:text-black" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* 공격 MOM */}
            <div className="mb-4">
              <p className="text-[10px] font-black text-blue-400 mb-1.5">⚽ 공격 MOM</p>
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
              <p className="text-[10px] font-black text-green-500 mb-1.5">🛡️ 수비 MOM</p>
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
              {!momModalVoter && (
                <p className="text-[10px] text-gray-400 mt-2">먼저 본인 이름을 선택해주세요</p>
              )}
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
                    setMomVoterName((prev) => ({ ...prev, [momModal.matchId]: momModalVoter }));
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
            className="w-full max-w-xs bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 shadow-2xl"
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
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="맨 위로"
        >
          <ChevronUp className="w-5 h-5 text-[#FF8FA3] dark:text-[#FFB6C1]" />
        </button>
      )}
    </div>
  );
}
