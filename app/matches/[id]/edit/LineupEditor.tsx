"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sun, Moon, RotateCcw, Save, Check } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { MatchData, LineupData } from "../../../components/DashboardClient";
import { FORMATION_POSITIONS } from "../../../components/FormationField";

const QUARTERS = ["예상", "1Q", "2Q", "3Q", "4Q"];
const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1"];
const MAX_SUBS = 5;

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
}

export default function LineupEditor({ match, lineups, attendees }: LineupEditorProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [quarter, setQuarter] = useState(QUARTERS[0]);
  const [formation, setFormation] = useState(FORMATIONS[0]);
  const [assignments, setAssignments] = useState<(string | null)[]>(Array(11).fill(null));
  const [subs, setSubs] = useState<(string | null)[]>(Array(MAX_SUBS).fill(null));
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    } else {
      setAssignments(Array(11).fill(null));
      setSubs(Array(MAX_SUBS).fill(null));
    }
    setActiveSlot(null);
  }, [quarter]); // eslint-disable-line react-hooks/exhaustive-deps

  // 포메이션 변경 시 배치 초기화
  const handleFormationChange = (f: string) => {
    setFormation(f);
    setAssignments(Array(11).fill(null));
    setActiveSlot(null);
  };

  const assignedPlayers = new Set([
    ...assignments.filter(Boolean),
    ...subs.filter(Boolean),
  ] as string[]);

  const handleSlotClick = (type: "player" | "sub", index: number) => {
    if (activeSlot?.type === type && activeSlot.index === index) {
      setActiveSlot(null); // 같은 슬롯 → 해제
    } else {
      setActiveSlot({ type, index });
    }
  };

  const handlePlayerClick = (name: string) => {
    if (!activeSlot) return;

    const alreadyAssignedIn =
      activeSlot.type === "player"
        ? assignments.indexOf(name)
        : subs.indexOf(name);

    if (activeSlot.type === "player") {
      const next = [...assignments];
      // 이미 다른 슬롯에 있으면 제거
      if (alreadyAssignedIn >= 0) next[alreadyAssignedIn] = null;
      next[activeSlot.index] = name;
      setAssignments(next);
      // 다음 빈 슬롯으로 이동
      const nextEmpty = next.findIndex((v, i) => i > activeSlot.index && !v);
      setActiveSlot(nextEmpty >= 0 ? { type: "player", index: nextEmpty } : null);
    } else {
      const next = [...subs];
      const subIdx = subs.indexOf(name);
      if (subIdx >= 0) next[subIdx] = null;
      next[activeSlot.index] = name;
      setSubs(next);
      const nextEmpty = next.findIndex((v, i) => i > activeSlot.index && !v);
      setActiveSlot(nextEmpty >= 0 ? { type: "sub", index: nextEmpty } : null);
    }
  };

  const handleSave = async () => {
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
          subs: subs.map((s) => s || ""),
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
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-[#F5F5DC] font-sans max-w-md mx-auto shadow-2xl overflow-hidden">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
        <Link href={`/matches/${match.id}`} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-black text-sm italic uppercase">라인업 편집</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
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

      <main className="p-4 space-y-4 pb-10">
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
                ? `슬롯 ${activeSlot.index + 1} 선택됨 → 아래서 선수 탭`
                : activeSlot?.type === "sub"
                ? `교체 슬롯 ${activeSlot.index + 1} 선택됨`
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
            className="relative w-full rounded-xl overflow-hidden"
            style={{
              paddingBottom: "138%",
              background: "linear-gradient(180deg,#1a5c1a 0%,#236b23 20%,#1a5c1a 40%,#236b23 60%,#1a5c1a 80%,#236b23 100%)",
            }}
          >
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

            {positions.map((pos, i) => {
              const player = assignments[i];
              const isActive = activeSlot?.type === "player" && activeSlot.index === i;
              const color = getLayerColor(i, formation);

              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center cursor-pointer"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)", zIndex: 10 }}
                  onClick={() => handleSlotClick("player", i)}
                >
                  <div
                    className="flex items-center justify-center rounded-full font-black transition-all"
                    style={{
                      width: 36, height: 36,
                      fontSize: player ? 10 : 11,
                      backgroundColor: player ? color : "rgba(255,255,255,0.15)",
                      border: isActive
                        ? "2.5px solid #FBBF24"
                        : player
                        ? `2.5px solid rgba(255,255,255,0.6)`
                        : "2px dashed rgba(255,255,255,0.4)",
                      color: player ? (color === "#F59E0B" ? "#78350F" : "#fff") : "rgba(255,255,255,0.6)",
                      boxShadow: isActive ? "0 0 0 3px rgba(251,191,36,0.4)" : "0 2px 6px rgba(0,0,0,0.4)",
                    }}
                  >
                    {player ? player.slice(0, 2) : i + 1}
                  </div>
                  {player && (
                    <div
                      className="mt-0.5 text-[7px] font-black text-white text-center max-w-[40px] truncate"
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,1)" }}
                    >
                      {player}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 교체 선수 슬롯 */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">교체 선수</p>
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

        {/* 선수 풀 */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
            참석 선수 ({attendees.length}명)
          </p>
          {attendees.length === 0 ? (
            <p className="text-[12px] text-gray-400 dark:text-gray-600">
              matches 시트 L열에 참석자를 입력해주세요
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attendees.map((name) => {
                const used = assignedPlayers.has(name);
                return (
                  <button
                    key={name}
                    onClick={() => handlePlayerClick(name)}
                    disabled={!activeSlot}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                      used
                        ? "bg-[#FFB6C1]/20 text-[#FF8FA3] dark:text-[#FFB6C1] border border-[#FFB6C1]/30"
                        : activeSlot
                        ? "bg-white dark:bg-white/10 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/20 cursor-pointer"
                        : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 cursor-default"
                    }`}
                  >
                    {used && <span className="mr-1 text-[8px]">✓</span>}
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
