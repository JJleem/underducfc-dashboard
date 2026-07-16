"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sun, Moon, RotateCcw, Save, Check, UserPlus, X, ArrowRightLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { MatchData, LineupData } from "../../../components/DashboardClient";
import { FORMATION_POSITIONS } from "../../../components/FormationField";
import type { SubstitutionEvent } from "../../../lib/lineup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

const QUARTERS = ["1Q", "2Q", "3Q", "4Q", "5Q", "6Q"];
const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1"];
const MAX_SUBS = 9;

function getLayerColor(index: number, formation: string): string {
  if (index === 0) return "#F59E0B";
  const layers = formation.split("-").map(Number);
  const totalLayers = layers.length;
  let count = 1;
  for (let i = 0; i < layers.length; i++) {
    if (index < count + layers[i]) {
      if (i === 0) return "#3B82F6";
      if (i === totalLayers - 1) return "#FF8FA3";
      return "#10B981";
    }
    count += layers[i];
  }
  return "#10B981";
}

interface ActiveSlot {
  type: "player" | "sub";
  index: number;
}

interface LineupEditorProps {
  match: MatchData;
  lineups: LineupData[];
  attendees: string[];
  rosterMap: Record<string, string>;
}

export default function LineupEditor({ match, lineups, attendees, rosterMap }: LineupEditorProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const [quarter, setQuarter] = useState(QUARTERS[0]);
  const [formation, setFormation] = useState(FORMATIONS[0]);
  const [assignments, setAssignments] = useState<(string | null)[]>(Array(11).fill(null));
  const [subs, setSubs] = useState<(string | null)[]>(Array(MAX_SUBS).fill(null));
  const [substitutions, setSubstitutions] = useState<SubstitutionEvent[]>([]);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [guests, setGuests] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState("");
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  // 쿼터 변경 시 기존 라인업 로드
  useEffect(() => {
    const existing = lineups.find((l) => l.quarter === quarter);
    if (existing) {
      setFormation(existing.formation || FORMATIONS[0]);
      const arr = Array(11).fill(null);
      existing.players.forEach((p, i) => { arr[i] = p || null; });
      setAssignments(arr);
      const subsArr = Array(MAX_SUBS).fill(null);
      existing.subs.forEach((s, i) => { subsArr[i] = s || null; });
      setSubs(subsArr);
      setSubstitutions(existing.substitutions || []);
    } else {
      setAssignments(Array(11).fill(null));
      setSubs(Array(MAX_SUBS).fill(null));
      setSubstitutions([]);
    }
    setActiveSlot(null);
  }, [quarter]); // eslint-disable-line react-hooks/exhaustive-deps

  // 포메이션 변경 시 배치 초기화
  const handleFormationChange = (f: string) => {
    setFormation(f);
    setAssignments(Array(11).fill(null));
    setActiveSlot(null);
  };

  const addGuest = () => {
    const name = guestInput.trim();
    if (!name || attendees.includes(name) || guests.includes(name)) return;
    setGuests((prev) => [...prev, name]);
    setGuestInput("");
  };

  const removeGuest = (name: string) => {
    setGuests((prev) => prev.filter((g) => g !== name));
    // 배치된 곳에서도 제거
    setAssignments((prev) => prev.map((p) => (p === name ? null : p)));
    setSubs((prev) => prev.map((s) => (s === name ? null : s)));
  };

  const allPlayers = [...attendees, ...guests];
  const substitutionPlayers = Array.from(new Set([
    ...allPlayers,
    ...assignments.filter((player): player is string => !!player),
    ...subs.filter((player): player is string => !!player),
    ...substitutions.flatMap((event) => [event.out, event.in]).filter(Boolean),
  ]));

  const assignedPlayers = new Set([
    ...assignments.filter(Boolean),
    ...subs.filter(Boolean),
  ] as string[]);

  const handleSlotClick = (type: "player" | "sub", index: number) => {
    // 같은 슬롯 → 해제
    if (activeSlot?.type === type && activeSlot.index === index) {
      setActiveSlot(null);
      return;
    }

    // activeSlot이 없으면 → 선택
    if (!activeSlot) {
      setActiveSlot({ type, index });
      return;
    }

    // activeSlot이 있고 다른 슬롯 → 두 슬롯 선수 스왑
    const activePlayer =
      activeSlot.type === "player" ? assignments[activeSlot.index] : subs[activeSlot.index];
    const targetPlayer = type === "player" ? assignments[index] : subs[index];

    if (activeSlot.type === "player" && type === "player") {
      const next = [...assignments];
      next[activeSlot.index] = targetPlayer;
      next[index] = activePlayer;
      setAssignments(next);
    } else if (activeSlot.type === "sub" && type === "sub") {
      const next = [...subs];
      next[activeSlot.index] = targetPlayer;
      next[index] = activePlayer;
      setSubs(next);
    } else if (activeSlot.type === "player" && type === "sub") {
      const nextA = [...assignments];
      const nextS = [...subs];
      nextA[activeSlot.index] = targetPlayer;
      nextS[index] = activePlayer;
      setAssignments(nextA);
      setSubs(nextS);
    } else {
      // sub → player
      const nextA = [...assignments];
      const nextS = [...subs];
      nextS[activeSlot.index] = targetPlayer;
      nextA[index] = activePlayer;
      setAssignments(nextA);
      setSubs(nextS);
    }

    setActiveSlot(null);
  };

  const handlePlayerClick = (name: string) => {
    if (!activeSlot) return;

    // 선수가 이미 배치된 위치 (assignments / subs 둘 다 확인)
    const inAssignments = assignments.indexOf(name);
    const inSubs = subs.indexOf(name);

    if (activeSlot.type === "player") {
      const next = [...assignments];
      if (inAssignments >= 0) {
        next[inAssignments] = null;
      } else if (inSubs >= 0) {
        const nextS = [...subs];
        nextS[inSubs] = null;
        setSubs(nextS);
      }
      next[activeSlot.index] = name;
      setAssignments(next);
      const nextEmpty = next.findIndex((v, i) => i > activeSlot.index && !v);
      setActiveSlot(nextEmpty >= 0 ? { type: "player", index: nextEmpty } : null);
    } else {
      const next = [...subs];
      if (inSubs >= 0) {
        next[inSubs] = null;
      } else if (inAssignments >= 0) {
        const nextA = [...assignments];
        nextA[inAssignments] = null;
        setAssignments(nextA);
      }
      next[activeSlot.index] = name;
      setSubs(next);
      const nextEmpty = next.findIndex((v, i) => i > activeSlot.index && !v);
      setActiveSlot(nextEmpty >= 0 ? { type: "sub", index: nextEmpty } : null);
    }
  };

  const hasCurrentData = assignments.some(Boolean) || subs.some(Boolean);

  const handleMoveQuarter = async (target: string) => {
    if (!target || target === quarter) return;
    setMoving(true);
    try {
      // 1. 현재 라인업을 타겟 쿼터에 저장
      const res1 = await fetch("/api/lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          quarter: target,
          formation,
          players: assignments.map((p) => p || ""),
          subs: subs.map((s) => s || ""),
          substitutions,
        }),
      });
      if (!res1.ok) throw new Error(await res1.text());

      // 2. 원본 쿼터 비우기
      const res2 = await fetch("/api/lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          quarter,
          formation: "4-3-3",
          players: Array(11).fill(""),
          subs: Array(MAX_SUBS).fill(""),
          substitutions: [],
        }),
      });
      if (!res2.ok) throw new Error(await res2.text());

      // 서버 데이터 동기화 (lineups prop 갱신). 쓰기 라우트가 캐시를 무효화하므로
      // 하드 리로드 대신 소프트 리프레시로 깜빡임 없이 최신 데이터를 받는다.
      setMoveTarget(null);
      router.refresh();
    } catch (e) {
      alert("이동 실패: " + (e instanceof Error ? e.message : e));
    } finally {
      setMoving(false);
    }
  };

  const handleSave = async () => {
    // 배치되지 않은 참석/게스트 선수를 빈 대기 슬롯에 자동으로 채움
    const leftovers = allPlayers.filter((name) => !assignedPlayers.has(name));
    const finalSubs = [...subs];
    let li = 0;
    for (let i = 0; i < finalSubs.length && li < leftovers.length; i++) {
      if (!finalSubs[i]) finalSubs[i] = leftovers[li++];
    }
    if (li > 0) setSubs(finalSubs);

    setSaving(true);
    try {
      const res = await fetch("/api/lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          quarter,
          formation,
          players: assignments.map((p) => p || ""),
          subs: finalSubs.map((s) => s || ""),
          substitutions,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.push(`/matches/${match.id}`);
      }, 1200);
    } catch (e) {
      alert("저장 실패: " + (e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  };

  const positions = FORMATION_POSITIONS[formation] || [];

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-zinc-100 font-sans max-w-md mx-auto shadow-2xl overflow-hidden">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-xl border-b border-gray-200/70 dark:border-white/[0.06]">
        <Link href={`/matches/${match.id}`} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-extrabold text-sm uppercase tracking-tight">라인업 편집</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
            <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
            <Sun className="hidden dark:block w-4 h-4 text-[#FFB6C1]" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-black transition-all ${
              saved
                ? "bg-green-500 text-white"
                : "bg-[#FFB6C1] text-black hover:bg-[#FF8FA3]"
            }`}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? "저장됨" : saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-10 animate-fade">
        {/* 경기 정보 */}
        <div className="text-center py-2">
          <p className="text-[11px] font-bold text-gray-400">{match.date} · {match.location}</p>
          <p className="text-[15px] font-black text-gray-800 dark:text-white mt-0.5">
            언더덕 vs {match.opponent}
          </p>
        </div>

        {/* 쿼터 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUARTERS.map((q) => {
            const hasData = lineups.some((l) => l.quarter === q);
            return (
              <button
                key={q}
                onClick={() => setQuarter(q)}
                className={`flex-shrink-0 text-[11px] font-black px-4 py-2 rounded-xl transition-all ${
                  quarter === q
                    ? "bg-[#FFB6C1] text-black"
                    : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10"
                }`}
              >
                {q}
                {hasData && <span className="ml-1 text-[8px] opacity-60">●</span>}
              </button>
            );
          })}
        </div>

        {/* 쿼터 이동 */}
        {hasCurrentData && (
          <div className="flex items-center gap-2">
            {moveTarget === null ? (
              <button
                onClick={() => setMoveTarget("")}
                className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                {quarter} → 다른 쿼터로 이동
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-gray-500 dark:text-gray-400">이동할 쿼터:</span>
                {QUARTERS.filter((q) => q !== quarter).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleMoveQuarter(q)}
                    disabled={moving}
                    className="text-[11px] font-black px-3 py-1.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
                <button
                  onClick={() => setMoveTarget(null)}
                  className="text-[11px] font-black px-2 py-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  취소
                </button>
                {moving && <span className="text-[10px] text-gray-400 animate-pulse">이동 중...</span>}
              </div>
            )}
          </div>
        )}

        {/* 포메이션 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 shrink-0">포메이션</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FORMATIONS.map((f) => (
              <button
                key={f}
                onClick={() => handleFormationChange(f)}
                className={`flex-shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg transition-all ${
                  formation === f
                    ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                    : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* 포메이션 필드 (슬롯 클릭으로 배치) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {activeSlot?.type === "player"
                ? `슬롯 ${activeSlot.index + 1} 선택됨 → 다른 슬롯 탭 시 스왑`
                : activeSlot?.type === "sub"
                ? `대기 슬롯 ${activeSlot.index + 1} 선택됨 → 다른 슬롯 탭 시 스왑`
                : "슬롯을 탭해서 선택하세요"}
            </span>
            <button
              onClick={() => { setAssignments(Array(11).fill(null)); setSubs(Array(MAX_SUBS).fill(null)); setActiveSlot(null); }}
              className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <RotateCcw className="w-3 h-3" /> 초기화
            </button>
          </div>

          {/* 필드 */}
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-soft ring-1 ring-black/10 dark:ring-white/10"
            style={{
              paddingBottom: "138%",
              background: "linear-gradient(180deg,#1c6a36 0%,#185e2f 33%,#1c6a36 66%,#185e2f 100%)",
            }}
          >
            {/* 비네팅: 가장자리를 살짝 어둡게 해 입체감 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(125% 80% at 50% 38%, transparent 58%, rgba(0,0,0,0.28) 100%)", zIndex: 6 }}
            />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 138" preserveAspectRatio="none" fill="none">
              <rect x="3" y="3" width="94" height="132" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
              <line x1="3" y1="69" x2="97" y2="69" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
              <circle cx="50" cy="69" r="12" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
              <rect x="22" y="3" width="56" height="20" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <rect x="34" y="3" width="32" height="9" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <rect x="22" y="115" width="56" height="20" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <rect x="34" y="126" width="32" height="9" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
              <rect x="41" y="1" width="18" height="2" stroke="rgba(255,255,255,0.7)" strokeWidth="0.7" />
              <rect x="41" y="135" width="18" height="2" stroke="rgba(255,255,255,0.7)" strokeWidth="0.7" />
            </svg>

            {/* 중앙 로고 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
              <div className="relative w-20 h-20 rounded-full overflow-hidden opacity-[0.13]">
                <Image src="/underducklogo.png" alt="" fill className="object-cover" />
              </div>
            </div>

            {positions.map((pos, i) => {
              const player = assignments[i];
              const isActive = activeSlot?.type === "player" && activeSlot.index === i;
              const color = getLayerColor(i, formation);
              const isTbd = player === "미정";
              const jerseyNo = player ? rosterMap[player] : null;
              const displayLabel = isTbd ? "?" : jerseyNo ?? (player ? "G" : String(i + 1));
              const hasPlayer = !!player;

              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center cursor-pointer"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)", zIndex: 10 }}
                  onClick={() => handleSlotClick("player", i)}
                >
                  <div
                    className={`flex items-center justify-center rounded-full font-black transition-all ${isActive ? "pulse-ring" : ""}`}
                    style={{
                      width: 36, height: 36,
                      fontSize: hasPlayer ? (displayLabel.length > 2 ? 9 : 13) : 11,
                      backgroundColor: isTbd ? "#374151" : hasPlayer ? color : "rgba(255,255,255,0.15)",
                      border: isActive
                        ? "2.5px solid #FBBF24"
                        : hasPlayer
                        ? "2.5px solid rgba(255,255,255,0.6)"
                        : "2px dashed rgba(255,255,255,0.4)",
                      color: hasPlayer ? (color === "#F59E0B" && !isTbd ? "#78350F" : "#fff") : "rgba(255,255,255,0.6)",
                      boxShadow: isActive ? "0 0 0 3px rgba(251,191,36,0.4)" : "0 2px 6px rgba(0,0,0,0.4)",
                    }}
                  >
                    {displayLabel}
                  </div>
                  {hasPlayer && (
                    <div
                      className="mt-0.5 text-[7px] font-black text-white text-center max-w-[40px] truncate"
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,1)" }}
                    >
                      {isTbd ? "미정" : player}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 대기 선수 슬롯 */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">대기 선수</p>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: MAX_SUBS }).map((_, i) => {
              const sub = subs[i];
              const isActive = activeSlot?.type === "sub" && activeSlot.index === i;
              return (
                <button
                  key={i}
                  onClick={() => handleSlotClick("sub", i)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all border ${
                    isActive
                      ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                      : sub
                      ? "border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200"
                      : "border-dashed border-gray-300 dark:border-white/10 bg-transparent text-gray-400"
                  }`}
                >
                  {sub || `SUB ${i + 1}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* 실제 교체 기록 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300">
                <ArrowRightLeft className="h-3.5 w-3.5 text-[#FF8FA3]" />
                교체 기록
              </p>
              <p className="mt-1 text-[10px] font-semibold text-gray-400">경기 중 나간 선수와 들어온 선수를 기록합니다</p>
            </div>
            <button
              type="button"
              onClick={() => setSubstitutions((events) => [...events, { out: "", in: "", time: "" }])}
              className="flex items-center gap-1 rounded-xl bg-gray-900 px-2.5 py-2 text-[10px] font-black text-white dark:bg-white dark:text-black"
            >
              <Plus className="h-3 w-3" /> 추가
            </button>
          </div>

          {substitutions.length === 0 ? (
            <button
              type="button"
              onClick={() => setSubstitutions([{ out: "", in: "", time: "" }])}
              className="w-full rounded-xl border border-dashed border-gray-200 py-4 text-[11px] font-bold text-gray-400 transition-colors hover:border-[#FF8FA3]/50 hover:text-[#FF8FA3] dark:border-white/10"
            >
              + 첫 교체 기록 추가
            </button>
          ) : (
            <div className="space-y-2">
              {substitutions.map((event, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 dark:border-white/[0.06] dark:bg-black/10"
                >
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <Select
                      value={event.out || undefined}
                      onValueChange={(value) =>
                        setSubstitutions((events) =>
                          events.map((item, i) => i === index ? { ...item, out: value } : item)
                        )
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className="rounded-lg border-gray-200 bg-white text-[11px] font-bold dark:border-white/10 dark:bg-[#202024]"
                      >
                        <SelectValue placeholder="OUT 선수" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] border-gray-200 bg-white text-gray-900 shadow-xl dark:border-white/10 dark:bg-[#17171a] dark:text-gray-100">
                        {substitutionPlayers.map((player) => (
                          <SelectItem
                            key={`out-${player}`}
                            value={player}
                            className="text-[12px] font-bold focus:bg-gray-100 dark:focus:bg-white/10"
                          >
                            {player}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ArrowRightLeft className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                    <Select
                      value={event.in || undefined}
                      onValueChange={(value) =>
                        setSubstitutions((events) =>
                          events.map((item, i) => i === index ? { ...item, in: value } : item)
                        )
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className="rounded-lg border-gray-200 bg-white text-[11px] font-bold dark:border-white/10 dark:bg-[#202024]"
                      >
                        <SelectValue placeholder="IN 선수" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] border-gray-200 bg-white text-gray-900 shadow-xl dark:border-white/10 dark:bg-[#17171a] dark:text-gray-100">
                        {substitutionPlayers.map((player) => (
                          <SelectItem
                            key={`in-${player}`}
                            value={player}
                            className="text-[12px] font-bold focus:bg-gray-100 dark:focus:bg-white/10"
                          >
                            {player}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={event.time || ""}
                      onChange={(e) =>
                        setSubstitutions((events) =>
                          events.map((item, i) => i === index ? { ...item, time: e.target.value } : item)
                        )
                      }
                      placeholder="시점 (예: 12분)"
                      className="h-8 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-bold outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
                    />
                    <button
                      type="button"
                      aria-label="교체 기록 삭제"
                      onClick={() => setSubstitutions((events) => events.filter((_, i) => i !== index))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-white/[0.06]">
            <p className="mb-2 text-[10px] font-semibold leading-relaxed text-gray-400">
              교체 기록은 현재 쿼터의 포메이션·선발·대기 선수와 함께 저장됩니다.
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-black transition-all ${
                saved
                  ? "bg-emerald-500 text-white"
                  : "bg-[#FFB6C1] text-black hover:bg-[#FF8FA3]"
              } disabled:opacity-70`}
            >
              {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? "저장됨" : saving ? "저장 중..." : `${quarter} 라인업과 교체 기록 저장`}
            </button>
          </div>
        </div>

        {/* 선수 풀 */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            참석 선수 ({allPlayers.length}명)
          </p>

          {/* 게스트 추가 입력 */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 flex-1 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <UserPlus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) addGuest();
                }}
                placeholder="게스트 이름 입력"
                className="flex-1 text-[12px] font-bold bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
            <button
              onClick={addGuest}
              className="px-3 py-2 rounded-xl bg-gray-900 dark:bg-white/10 text-white dark:text-gray-200 text-[11px] font-black hover:opacity-80 transition-opacity"
            >
              추가
            </button>
          </div>

          {/* 미정 고정 버튼 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePlayerClick("미정")}
              disabled={!activeSlot}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border border-dashed ${
                activeSlot
                  ? "border-gray-400 dark:border-white/30 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer"
                  : "border-gray-200 dark:border-white/10 bg-transparent text-gray-300 dark:text-gray-600 cursor-default"
              }`}
            >
              ? 미정
            </button>
          </div>

          {allPlayers.length === 0 ? (
            <p className="text-[12px] text-gray-400 dark:text-gray-600">
              matches 시트 L열에 참석자를 입력하거나 게스트를 추가하세요
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allPlayers.map((name) => {
                const used = assignedPlayers.has(name);
                const isGuest = guests.includes(name);
                return (
                  <div key={name} className="relative flex items-center">
                    <button
                      onClick={() => handlePlayerClick(name)}
                      disabled={!activeSlot}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                        isGuest
                          ? used
                            ? "bg-gray-200 dark:bg-white/10 text-gray-500 border border-gray-300 dark:border-white/10"
                            : activeSlot
                            ? "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 border border-dashed border-gray-400 dark:border-white/30 hover:bg-gray-200 dark:hover:bg-white/20 cursor-pointer"
                            : "bg-gray-100 dark:bg-white/5 text-gray-500 border border-dashed border-gray-300 dark:border-white/10 cursor-default"
                          : used
                          ? "bg-[#FFB6C1]/20 text-[#FF8FA3] dark:text-[#FFB6C1] border border-[#FFB6C1]/30"
                          : activeSlot
                          ? "bg-white dark:bg-white/10 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/20 cursor-pointer"
                          : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 cursor-default"
                      }`}
                    >
                      {isGuest && <span className="mr-1 text-[8px] text-gray-400">G</span>}
                      {used && !isGuest && <Check className="mr-1 w-2.5 h-2.5 inline-block align-middle" />}
                      {name}
                    </button>
                    {isGuest && (
                      <button
                        onClick={() => removeGuest(name)}
                        className="ml-1 w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
