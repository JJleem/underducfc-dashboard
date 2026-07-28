"use client";
// 게시판용 전술 편집기.
// 경기 라인업 편집기와 같은 [[LineupPitch]]를 쓰되, 쿼터·대기명단·교체기록 없이
// 선발 11명 + 팀 전술 + 개인 전술만 다룬다. 선수 풀은 활동 중인 로스터 전원.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, RotateCcw, Save, Move, Plus, Trash2 } from "lucide-react";
import LineupPitch from "../../components/LineupPitch";
import {
  FORMATION_PRESETS,
  TACTICS,
  formationOf,
  instructionAllowed,
  parseInstructions,
  parsePositions,
  roleFromPoint,
  serializeInstructions,
  serializePositions,
  type Point,
} from "../../lib/positions";
import type { BoardPost } from "../../lib/board";

const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1"];
const QUARTER_NAMES = ["1Q", "2Q", "3Q", "4Q"];
const MAX_QUARTERS = QUARTER_NAMES.length;

/** 편집 중인 쿼터 하나 */
interface QuarterDraft {
  quarter: string;
  formation: string;
  positions: Point[];
  assignments: (string | null)[];
  instructions: string[][];
  tactic: string;
}

const emptyQuarter = (quarter: string): QuarterDraft => ({
  quarter,
  formation: FORMATIONS[0],
  positions: FORMATION_PRESETS[FORMATIONS[0]],
  assignments: Array(11).fill(null),
  instructions: Array.from({ length: 11 }, () => []),
  tactic: "",
});

// 선호 포지션 카테고리 색 (GK 주황 / 수비 파랑 / 미드 초록 / 공격 핑크)
const PREF_POS_COLOR: Record<string, string> = {
  GK: "#F59E0B",
  LB: "#3B82F6", CB: "#3B82F6", RB: "#3B82F6",
  CDM: "#10B981", CM: "#10B981", CAM: "#10B981",
  LW: "#FF8FA3", RW: "#FF8FA3", ST: "#FF8FA3",
};

export default function BoardLineupClient({
  author,
  players: pool,
  rosterMap,
  prefPosMap = {},
  existing,
}: {
  author: string;
  players: string[];
  rosterMap: Record<string, string>;
  prefPosMap?: Record<string, string[]>;
  existing: BoardPost | null;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  // 쿼터별 안 (최대 4개). 저장된 글이 있으면 그대로 불러온다.
  const [quarters, setQuarters] = useState<QuarterDraft[]>(() => {
    const saved = existing?.lineup?.quarters ?? [];
    if (!saved.length) return [emptyQuarter("1Q")];
    return saved.map((q) => ({
      quarter: q.quarter,
      formation: q.formation || FORMATIONS[0],
      positions: parsePositions(q.positions) ?? FORMATION_PRESETS[FORMATIONS[0]],
      assignments: (() => {
        const arr = Array<string | null>(11).fill(null);
        q.players.forEach((p, i) => { if (i < 11) arr[i] = p || null; });
        return arr;
      })(),
      instructions: parseInstructions(q.instructions),
      tactic: q.tactic ?? "",
    }));
  });
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [swapFrom, setSwapFrom] = useState<number | null>(null);
  const [liveShape, setLiveShape] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const cur = quarters[active];
  const { formation, positions, assignments, instructions, tactic } = cur;
  /** 현재 쿼터만 갱신 */
  const patch = (p: Partial<QuarterDraft>) =>
    setQuarters((prev) => prev.map((q, i) => (i === active ? { ...q, ...p } : q)));
  const setPositions = (next: Point[]) => patch({ positions: next });
  const setInstructions = (
    next: string[][] | ((prev: string[][]) => string[][])
  ) => patch({ instructions: typeof next === "function" ? next(instructions) : next });
  const setAssignments = (
    updater: (prev: (string | null)[]) => (string | null)[]
  ) => patch({ assignments: updater(assignments) });
  const setTactic = (next: string) => patch({ tactic: next });

  const addQuarter = () => {
    if (quarters.length >= MAX_QUARTERS) return;
    const used = new Set(quarters.map((q) => q.quarter));
    const next = QUARTER_NAMES.find((q) => !used.has(q)) ?? `${quarters.length + 1}Q`;
    setQuarters((prev) => [...prev, emptyQuarter(next)]);
    setActive(quarters.length);
    setSelected(null);
  };

  const removeQuarter = (index: number) => {
    if (quarters.length <= 1) return;
    setQuarters((prev) => prev.filter((_, i) => i !== index));
    setActive((prev) => (prev >= index && prev > 0 ? prev - 1 : prev));
    setSelected(null);
  };

  const shapeName = liveShape ?? formationOf(positions);
  const matchesPreset = (name: string) => {
    const preset = FORMATION_PRESETS[name];
    return !!preset && positions.every((p, i) => p.x === preset[i].x && p.y === preset[i].y);
  };
  const isCustom = !matchesPreset(formation);
  const placed = new Set(assignments.filter(Boolean) as string[]);
  const filled = placed.size;

  const handleFormationChange = (f: string) => {
    patch({ formation: f, positions: FORMATION_PRESETS[f] ?? FORMATION_PRESETS[FORMATIONS[0]] });
    setSelected(null);
  };

  /** 선수 풀에서 선수를 탭 → 선택된 슬롯에 배치 (이미 배치돼 있으면 그 자리는 비운다) */
  const placePlayer = (name: string) => {
    if (selected === null) return;
    setAssignments((prev) => {
      const next = prev.map((p) => (p === name ? null : p));
      next[selected] = name;
      return next;
    });
    const nextEmpty = assignments.findIndex((v, i) => i > selected && !v);
    setSelected(nextEmpty >= 0 ? nextEmpty : null);
  };

  const clearSlot = () => {
    if (selected === null) return;
    setAssignments((prev) => prev.map((p, i) => (i === selected ? null : p)));
    setInstructions((prev) => prev.map((ids, i) => (i === selected ? [] : ids)));
  };

  const handleSlotTap = (index: number) => {
    if (swapFrom !== null) {
      if (swapFrom !== index) {
        setAssignments((prev) => {
          const next = [...prev];
          next[swapFrom] = prev[index];
          next[index] = prev[swapFrom];
          return next;
        });
        // 개인 전술도 선수를 따라가되, 새 자리에 맞지 않는 지시는 뺀다
        setInstructions((prev) => {
          const next = [...prev];
          const keep = (ids: string[], slot: number) =>
            ids.filter((id) => instructionAllowed(id, roleFromPoint(positions[slot])));
          next[swapFrom] = keep(prev[index], swapFrom);
          next[index] = keep(prev[swapFrom], index);
          return next;
        });
      }
      setSwapFrom(null);
      setSelected(null);
      return;
    }
    setSelected((prev) => (prev === index ? null : index));
  };

  async function submit() {
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    const incomplete = quarters.find(
      (q) => new Set(q.assignments.filter(Boolean)).size < 11
    );
    if (incomplete) {
      setError(`${incomplete.quarter} 선발 11명을 채워주세요.`);
      setActive(quarters.indexOf(incomplete));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || null,
          lineup: {
            quarters: quarters.map((q) => ({
              quarter: q.quarter,
              formation: formationOf(q.positions),
              positions: serializePositions(q.positions),
              players: q.assignments.map((p) => p || ""),
              instructions: serializeInstructions(q.instructions),
              tactic: q.tactic,
            })),
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "저장 실패");
      const post = await res.json();
      setDone(true);
      setTimeout(() => router.push(`/board/${post.id}`), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-zinc-100 font-sans max-w-md mx-auto shadow-2xl">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/70 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#09090b]/70">
        <Link href="/board" className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-extrabold">{existing ? "내 전술 수정" : "전술 짜기"}</span>
        </Link>
        <button
          onClick={submit}
          disabled={submitting || done}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-black transition-all ${
            done ? "bg-green-500 text-white" : "bg-[#FFB6C1] text-black hover:bg-[#FF8FA3]"
          } disabled:opacity-70`}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {done ? "올렸어요" : submitting ? "올리는 중..." : existing ? "수정" : "올리기"}
        </button>
      </header>

      <main className="space-y-4 p-4 pb-16">
        {existing && (
          <p className="rounded-xl bg-[#FF8FA3]/10 px-3 py-2 text-[11px] font-bold text-[#e75f7c] dark:text-[#FFB6C1]">
            이미 올린 전술이 있어 수정 모드예요. 저장하면 기존 글이 갱신되고 목록 맨 위로 올라갑니다.
          </p>
        )}

        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 (예: 어미새전 이렇게 가면 어때요)"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="설명 (선택)"
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
          />
          <p className="px-1 text-[11px] font-bold text-gray-400">작성자 · {author}</p>
        </div>

        {/* 쿼터 탭 — 한 사람이 쿼터별로 다른 안을 낼 수 있다 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {quarters.map((q, i) => {
            const done = new Set(q.assignments.filter(Boolean)).size >= 11;
            return (
              <button
                key={q.quarter}
                onClick={() => { setActive(i); setSelected(null); }}
                className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-black transition-all ${
                  active === i
                    ? "bg-[#FF8FA3] text-white"
                    : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                }`}
              >
                {q.quarter}
                {done ? (
                  <span className="text-[8px] opacity-70">●</span>
                ) : (
                  <span
                    className={`rounded px-1 text-[8px] font-black leading-[1.6] ${
                      active === i
                        ? "bg-white/25 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    미완성
                  </span>
                )}
              </button>
            );
          })}
          {quarters.length < MAX_QUARTERS && (
            <button
              onClick={addQuarter}
              className="flex shrink-0 items-center gap-1 rounded-xl border border-dashed border-gray-300 px-2.5 py-1.5 text-[11px] font-black text-gray-400 dark:border-white/15"
            >
              <Plus className="h-3 w-3" /> 쿼터
            </button>
          )}
          {quarters.length > 1 && (
            <button
              onClick={() => removeQuarter(active)}
              aria-label="현재 쿼터 삭제"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 포메이션 — 이름은 실제 배치에서 계산된다 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-black text-gray-500 dark:text-gray-400">포메이션</span>
            <span className="rounded-lg bg-gray-900 px-2 py-1 text-[13px] font-black leading-none text-white dark:bg-white dark:text-black">
              {shapeName}
            </span>
            {isCustom && <span className="text-[10px] font-black text-[#FF8FA3]">커스텀 배치</span>}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FORMATIONS.map((f) => (
              <button
                key={f}
                onClick={() => handleFormationChange(f)}
                className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
                  matchesPreset(f)
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                    : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* 팀 전술 */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-black text-gray-500 dark:text-gray-400">전술</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TACTICS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTactic(tactic === t.id ? "" : t.id)}
                title={t.desc}
                className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
                  tactic === t.id
                    ? "bg-[#FF8FA3] text-white"
                    : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {swapFrom !== null
                ? "바꿀 상대 슬롯을 탭하세요"
                : selected !== null
                ? assignments[selected]
                  ? `${assignments[selected]} 선택됨 → 아래에서 개인 전술 설정`
                  : `빈 슬롯 ${selected + 1} → 선수 목록에서 탭`
                : `선발 ${filled}/11 · 탭해서 배치 · 끌면 위치 이동`}
            </span>
            <div className="flex items-center gap-2.5">
              {isCustom && (
                <button
                  onClick={() => patch({ positions: FORMATION_PRESETS[formation] ?? FORMATION_PRESETS[FORMATIONS[0]] })}
                  className="flex items-center gap-1 text-[10px] font-bold text-[#FF8FA3] hover:opacity-75"
                >
                  <Move className="h-3 w-3" /> 배치 복귀
                </button>
              )}
              <button
                onClick={() => {
                  patch({
                    assignments: Array(11).fill(null),
                    instructions: Array.from({ length: 11 }, () => []),
                  });
                  setSelected(null);
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <RotateCcw className="h-3 w-3" /> 초기화
              </button>
            </div>
          </div>

          <LineupPitch
            positions={positions}
            players={assignments}
            instructions={instructions}
            rosterMap={rosterMap}
            selectedSlot={selected}
            swapSlot={swapFrom}
            onSlotTap={handleSlotTap}
            onPositionsChange={setPositions}
            onInstructionsChange={setInstructions}
            onLiveShape={setLiveShape}
            onDragStart={() => setSwapFrom(null)}
            onSwapRequest={setSwapFrom}
            onCloseSlot={() => setSelected(null)}
          />
        </div>

        {/* 선수 풀 — 활동 중인 전원 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              선수 ({pool.length}명)
            </p>
            {selected !== null && assignments[selected] && (
              <button
                onClick={clearSlot}
                className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500 dark:bg-white/5 dark:text-gray-400"
              >
                이 자리 비우기
              </button>
            )}
          </div>
          {pool.length === 0 ? (
            <p className="text-[12px] text-gray-400">활동 중인 선수가 없어요</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pool.map((name) => {
                const used = placed.has(name);
                const pref = prefPosMap[name] ?? [];
                return (
                  <div key={name} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => placePlayer(name)}
                      disabled={selected === null}
                      className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition-all ${
                        used
                          ? "border border-[#FFB6C1]/30 bg-[#FFB6C1]/20 text-[#FF8FA3] dark:text-[#FFB6C1]"
                          : selected !== null
                          ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 dark:border-white/20 dark:bg-white/10 dark:text-gray-100"
                          : "cursor-default border border-gray-200 bg-white text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
                      }`}
                    >
                      {used && <Check className="mr-1 inline-block h-2.5 w-2.5 align-middle" />}
                      {name}
                    </button>
                    {/* 선호 포지션 — 로스터 전원이 뜨는 화면이라 배치 힌트가 특히 중요 */}
                    {pref.length > 0 && (
                      <div className="flex gap-0.5">
                        {pref.map((v) => (
                          <span
                            key={v}
                            className="rounded px-1 text-[8px] font-black leading-[1.5]"
                            style={{
                              color: PREF_POS_COLOR[v] ?? "#94A3B8",
                              backgroundColor: `${PREF_POS_COLOR[v] ?? "#94A3B8"}1f`,
                            }}
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] font-bold text-red-500 dark:bg-red-500/10">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
