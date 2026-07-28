"use client";
// 선발 11명을 배치하는 필드 + 개인 전술 패널.
//
// 경기 라인업 편집기와 전술게시판이 같은 코드를 쓴다.
// 좌표 판정은 [[positions.ts]], 여기는 그 위의 조작(드래그·탭·지시 선택)만 담당한다.
//
// 상태는 전부 부모가 들고, 이 컴포넌트는 드래그 진행 상태만 내부에 둔다.
import React, { useRef, useState } from "react";
import Image from "next/image";
import { ArrowRightLeft, X } from "lucide-react";
import {
  MAX_INSTRUCTIONS,
  POSITION_ZONES,
  formationOf,
  instructionAllowed,
  instructionShort,
  instructionsFor,
  roleColor,
  roleFromPoint,
  zoneIndexOf,
  type Point,
} from "../lib/positions";

// 2% 격자에 스냅해서 라인이 삐뚤어지지 않게 한다
const SNAP = 2;
// 필드 가장자리 여백 (마커가 잘리지 않도록)
const EDGE = 5;
// 이 거리 이상 움직여야 드래그로 본다 (그 미만은 탭)
const DRAG_THRESHOLD_PX = 6;

const snap = (v: number) =>
  Math.min(100 - EDGE, Math.max(EDGE, Math.round(v / SNAP) * SNAP));

// 포지션이 바뀌는 순간의 짧은 진동 (미지원 기기는 무시)
const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch { /* 무시 */ }
};

export interface LineupPitchProps {
  positions: Point[];
  /** 슬롯별 선수 이름 (11칸, 빈 자리는 null) */
  players: (string | null)[];
  /** 슬롯별 개인 전술 id (11칸) */
  instructions: string[][];
  rosterMap: Record<string, string>;
  /** 선택된 선발 슬롯 (대기 슬롯이 선택된 상태면 null) */
  selectedSlot: number | null;
  /** 자리 바꾸기 출발 슬롯 */
  swapSlot?: number | null;
  onSlotTap: (index: number) => void;
  onPositionsChange: (next: Point[]) => void;
  onInstructionsChange: (next: string[][]) => void;
  /** 드래그 중 실시간 포메이션 이름. 드래그가 끝나면 null이 온다. */
  onLiveShape?: (name: string | null) => void;
  onDragStart?: () => void;
  /** 넘기면 개인 전술 패널에 "자리 바꾸기" 버튼이 생긴다 */
  onSwapRequest?: (index: number) => void;
  onCloseSlot?: () => void;
}

export default function LineupPitch({
  positions,
  players,
  instructions,
  rosterMap,
  selectedSlot,
  swapSlot = null,
  onSlotTap,
  onPositionsChange,
  onInstructionsChange,
  onLiveShape,
  onDragStart,
  onSwapRequest,
  onCloseSlot,
}: LineupPitchProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  // 드래그 중 현재 들어가 있는 존. 칸이 바뀔 때만 갱신되므로 리렌더는 몇 번뿐이다.
  const [dragZone, setDragZone] = useState<number | null>(null);

  // 드래그 중에는 상태를 건드리지 않고 DOM 위치만 옮긴다 (모바일 끊김 방지)
  const fieldRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const drag = useRef<{
    index: number;
    startX: number;
    startY: number;
    latest: Point;
    moved: boolean;
    zone: number;
  } | null>(null);

  const pointToPercent = (clientX: number, clientY: number): Point | null => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    return {
      x: snap(((clientX - rect.left) / rect.width) * 100),
      y: snap(((clientY - rect.top) / rect.height) * 100),
    };
  };

  /** 드래그 중인 선수를 현재 존 높이에 놓았다고 치고 포메이션 이름을 계산 */
  const reportShape = (index: number, zone: number) => {
    if (!onLiveShape) return;
    const live = positions.map((p, i) =>
      i === index ? { x: p.x, y: POSITION_ZONES[zone].y0 } : p
    );
    onLiveShape(formationOf(live));
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(null);
    setDragZone(null);
    onLiveShape?.(null);
  };

  const handlePointerDown = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      index: i,
      startX: e.clientX,
      startY: e.clientY,
      latest: positions[i],
      moved: false,
      zone: zoneIndexOf(positions[i]),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    if (!state.moved) {
      const dist = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
      if (dist < DRAG_THRESHOLD_PX) return;
      state.moved = true;
      setDragging(state.index);
      setDragZone(state.zone);
      reportShape(state.index, state.zone);
      onDragStart?.();
    }
    const next = pointToPercent(e.clientX, e.clientY);
    if (!next) return;
    state.latest = next;
    const el = slotRefs.current[state.index];
    if (el) {
      el.style.left = `${next.x}%`;
      el.style.top = `${next.y}%`;
    }
    // 존이 바뀐 순간에만 리렌더 → 포지션 이름과 포메이션이 즉시 따라 바뀐다
    const zone = zoneIndexOf(next);
    if (zone !== state.zone) {
      state.zone = zone;
      setDragZone(zone);
      reportShape(state.index, zone);
      buzz();
    }
  };

  const handlePointerUp = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    endDrag();
    if (!state) return;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!state.moved) {
      onSlotTap(i); // 움직이지 않았으면 탭
      return;
    }
    onPositionsChange(
      positions.map((p, idx) => (idx === state.index ? state.latest : p))
    );
    // 포지션이 바뀌면 더 이상 맞지 않는 개인 전술은 해제한다
    const role = roleFromPoint(state.latest);
    onInstructionsChange(
      instructions.map((ids, idx) =>
        idx === state.index ? ids.filter((id) => instructionAllowed(id, role)) : ids
      )
    );
  };

  const panelSlot =
    selectedSlot !== null && players[selectedSlot] ? selectedSlot : null;

  return (
    <>
      <div
        ref={fieldRef}
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

        {/* 포지션 존 오버레이 — 드래그 중에만 보인다 */}
        {dragging !== null && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 8 }}>
            <div className="absolute inset-0" style={{ background: "rgba(3,8,26,0.35)" }} />
            {POSITION_ZONES.map((zone, zi) => {
              const isHere = dragZone === zi;
              return (
                <div
                  key={zi}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${zone.x0}%`,
                    top: `${zone.y0}%`,
                    width: `${zone.x1 - zone.x0}%`,
                    height: `${zone.y1 - zone.y0}%`,
                    border: isHere
                      ? "1.5px solid rgba(255,143,163,0.95)"
                      : "1px dashed rgba(255,255,255,0.22)",
                    background: isHere ? "rgba(255,143,163,0.22)" : "transparent",
                  }}
                >
                  <span
                    className="font-black leading-none"
                    style={{
                      fontSize: isHere ? 12 : 9,
                      color: isHere ? "#fff" : "rgba(255,255,255,0.5)",
                      textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                    }}
                  >
                    {zone.role}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {positions.map((pos, i) => {
          const player = players[i];
          const isActive = selectedSlot === i;
          const isSwapSource = swapSlot === i;
          // 드래그 중인 선수는 손가락이 있는 존의 이름을 즉시 반영한다
          const role =
            dragging === i && dragZone !== null
              ? POSITION_ZONES[dragZone].role
              : roleFromPoint(pos);
          const color = roleColor(role);
          const isTbd = player === "미정";
          const jerseyNo = player ? rosterMap[player] : null;
          const displayLabel = isTbd ? "?" : jerseyNo ?? (player ? "G" : String(i + 1));
          const hasPlayer = !!player;
          const isDragging = dragging === i;

          return (
            <div
              key={i}
              ref={(el) => { slotRefs.current[i] = el; }}
              className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%,-50%)",
                zIndex: isDragging ? 20 : 10,
                touchAction: "none",
              }}
              onPointerDown={handlePointerDown(i)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp(i)}
              onPointerCancel={endDrag}
            >
              <span
                className="mb-0.5 rounded px-1 text-[8px] font-black leading-[1.4] text-white"
                style={{ background: color, boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
              >
                {role}
              </span>
              <div
                className={`flex items-center justify-center rounded-full font-black transition-all ${isActive || isSwapSource ? "pulse-ring" : ""}`}
                style={{
                  width: 36, height: 36,
                  fontSize: hasPlayer ? (displayLabel.length > 2 ? 9 : 13) : 11,
                  backgroundColor: isTbd ? "#374151" : hasPlayer ? color : "rgba(255,255,255,0.15)",
                  border: isSwapSource
                    ? "2.5px solid #FF8FA3"
                    : isActive
                    ? "2.5px solid #FBBF24"
                    : hasPlayer
                    ? "2.5px solid rgba(255,255,255,0.6)"
                    : "2px dashed rgba(255,255,255,0.4)",
                  color: hasPlayer ? (color === "#F59E0B" && !isTbd ? "#78350F" : "#fff") : "rgba(255,255,255,0.6)",
                  boxShadow: isDragging
                    ? "0 0 0 4px rgba(255,143,163,0.45), 0 6px 14px rgba(0,0,0,0.5)"
                    : isActive
                    ? "0 0 0 3px rgba(251,191,36,0.4)"
                    : "0 2px 6px rgba(0,0,0,0.4)",
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
              {hasPlayer && instructions[i].map((id) => instructionShort(id) && (
                <div
                  key={id}
                  className="mt-px rounded-sm px-0.5 text-[6px] font-black leading-[1.5] text-white whitespace-nowrap"
                  style={{ background: "rgba(255,143,163,0.9)", boxShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                >
                  {instructionShort(id)}
                </div>
              ))}
            </div>
          );
        })}

        {/* 선택된 선수의 개인 전술 — 마커 옆에 바로 펼쳐서 그 자리에서 고른다 */}
        {panelSlot !== null && (() => {
          const slot = panelSlot;
          const pos = positions[slot];
          const role = roleFromPoint(pos);
          const current = instructions[slot];
          // 아래쪽 선수는 위로, 위쪽 선수는 아래로 펼쳐 필드 밖으로 안 나가게 한다
          const below = pos.y < 62;
          return (
            <div
              className="absolute left-1.5 right-1.5"
              style={{
                top: `calc(${pos.y}% + ${below ? 26 : -62}px)`,
                zIndex: 30,
              }}
            >
              <div
                className="flex items-center gap-1 rounded-xl px-1.5 py-1.5"
                style={{
                  background: "rgba(3,8,26,0.92)",
                  border: "1px solid rgba(255,182,193,0.35)",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
                }}
              >
                <span
                  className="shrink-0 rounded px-1 text-[9px] font-black text-white"
                  style={{ background: roleColor(role) }}
                >
                  {role}
                </span>
                <div className="flex flex-1 gap-1 overflow-x-auto scrollbar-none">
                  {instructionsFor(role).map((ins) => {
                    const on = current.includes(ins.id);
                    const full = current.length >= MAX_INSTRUCTIONS;
                    return (
                      <button
                        key={ins.id}
                        disabled={!on && full}
                        onClick={() =>
                          onInstructionsChange(
                            instructions.map((ids, i) => {
                              if (i !== slot) return ids;
                              if (ids.includes(ins.id)) return ids.filter((id) => id !== ins.id);
                              return [...ids, ins.id].slice(0, MAX_INSTRUCTIONS);
                            })
                          )
                        }
                        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black transition-all ${
                          on
                            ? "bg-[#FF8FA3] text-white"
                            : full
                            ? "bg-white/5 text-white/25"
                            : "bg-white/10 text-white/80"
                        }`}
                      >
                        {ins.label}
                      </button>
                    );
                  })}
                </div>
                {onSwapRequest && (
                  <button
                    onClick={() => onSwapRequest(slot)}
                    aria-label="자리 바꾸기"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/70"
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                  </button>
                )}
                {onCloseSlot && (
                  <button
                    onClick={onCloseSlot}
                    aria-label="닫기"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
