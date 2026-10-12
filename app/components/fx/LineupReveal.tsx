"use client";

// 라인업 공개 — 1쿼터 선발만, 3초 안에 끝나는 짧은 연출.
//   피치 선이 그려지고 → 포메이션 숫자가 내리꽂히고 → 선수가 GK 부터 FW 까지 아래에서 날아와 자리에 꽂힌다.
// 1~4쿼터를 다 돌리면 길어서 지루하다. 나머지 쿼터는 원래 라인업 화면에서 본다.
//
// 언제 띄우는지는 LineupViewer 가 정한다(홈의 다음 경기에서 처음 한 번 + "공개 영상" 버튼).

import { motion, useReducedMotion } from "motion/react";
import PlayerFace from "../PlayerFace";
import { positionsFor } from "../../lib/positions";
import Celebration from "./Celebration";
import { EASE_OUT, GOLD, Shine } from "./effects";

export interface LineupRevealData {
  opponent: string;
  date: string;
  formation: string;
  players: string[];
  /** 자유 배치 좌표(없으면 포메이션 프리셋). */
  positions?: string;
  /** 완장을 찬 사람. 없으면 표시하지 않는다. */
  captain?: string;
}

export default function LineupReveal({
  data,
  accent,
  onClose,
}: {
  data: LineupRevealData;
  accent: string;
  onClose: () => void;
}) {
  const reduce = !!useReducedMotion();
  const from = <T extends object>(v: T): T | false => (reduce ? false : v);
  const points = positionsFor(data.formation, data.positions);
  const [, m, d] = data.date.split("-").map(Number);
  const LAND = 0.75; // 첫 선수가 출발하는 시각
  const STEP = 0.07;

  return (
    <Celebration color={accent} confetti={false} onClose={onClose}>
      <motion.p
        initial={from({ opacity: 0, letterSpacing: "0.6em" })}
        animate={{ opacity: 1, letterSpacing: "0.32em" }}
        transition={{ duration: 0.7 }}
        className="text-[11px] font-black"
        style={{ color: accent }}
      >
        STARTING XI
      </motion.p>
      <p className="mt-1.5 text-[12.5px] font-bold text-white/55">
        vs {data.opponent}
        {m && d ? ` · ${m}월 ${d}일` : ""} · 1쿼터 선발
      </p>

      <div className="relative mx-auto mt-5 aspect-[3/4] w-full max-w-[330px] overflow-hidden rounded-2xl">
        {/* 잔디 — 줄무늬 + 시즌색 조명 */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, ${accent}33, transparent 60%), repeating-linear-gradient(180deg, #0f2a1a 0 9%, #0c2316 9% 18%)`,
          }}
          initial={from({ opacity: 0, scale: 1.15 })}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        />

        {/* 피치 선이 그려진다 */}
        <svg viewBox="0 0 100 133" className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6">
          {[
            "M4 4 H96 V129 H4 Z",
            "M4 66.5 H96",
            "M30 4 V22 H70 V4",
            "M30 129 V111 H70 V129",
          ].map((dPath, i) => (
            <motion.path
              key={i}
              d={dPath}
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.55, ease: "easeInOut" }}
            />
          ))}
          <motion.circle
            cx="50"
            cy="66.5"
            r="12"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.3, duration: 0.55 }}
          />
        </svg>

        {/* 포메이션 숫자가 내리꽂혔다가 워터마크로 물러난다 */}
        <motion.p
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[64px] font-black tracking-[-0.04em] text-white"
          initial={from({ opacity: 0, scale: 3 })}
          animate={{ opacity: [0, 1, 1, 0.12], scale: [3, 1, 1, 1] }}
          transition={{ duration: 1.6, times: [0, 0.15, 0.45, 1], ease: "easeOut" }}
        >
          {data.formation}
        </motion.p>

        {/* 선수 — GK 부터 차례로 아래에서 날아와 꽂힌다 */}
        {points.map((pt, i) => {
          const name = (data.players[i] || "").trim();
          if (!name || name === "미정") return null;
          const isCaptain = !!data.captain && data.captain === name;
          const delay = LAND + i * STEP;
          return (
            <motion.div
              key={i}
              className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
              initial={from({ opacity: 0, y: 260, scale: 0.4 })}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay, type: "spring", stiffness: 260, damping: 20 }}
            >
              <span className="relative">
                {!reduce && (
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{ boxShadow: `0 0 0 2px ${accent}` }}
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ opacity: [0, 1, 0], scale: [1, 1.9] }}
                    transition={{ delay: delay + 0.25, duration: 0.6 }}
                  />
                )}
                <span className="block rounded-full" style={{ boxShadow: `0 0 0 2px ${isCaptain ? GOLD : accent}, 0 4px 14px rgba(0,0,0,0.5)` }}>
                  <PlayerFace name={name} size={36} />
                </span>
                {isCaptain && (
                  <span
                    className="absolute -right-1.5 -top-1 rounded-[3px] px-1 text-[8px] font-black leading-[13px] text-[#4A2E00]"
                    style={{ background: `linear-gradient(180deg, #FFF4CC, ${GOLD})` }}
                  >
                    C
                  </span>
                )}
              </span>
              <span className="mt-1 max-w-full truncate rounded bg-black/55 px-1 text-[9.5px] font-black text-white">
                {name}
              </span>
            </motion.div>
          );
        })}

        {!reduce && <Shine delay={LAND + points.length * STEP + 0.5} />}
      </div>
    </Celebration>
  );
}
