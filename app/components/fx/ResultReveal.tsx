"use client";

// 경기 결과 공개 — 결과가 나온 경기의 상세에 처음 들어오면 한 번 뜬다(기본 내보내기).
// 다시 보기는 경기 상세의 스코어를 누르면 ResultRevealView 를 직접 띄운다.
//
// 자동으로 띄울지(최근 정식 경기인가)는 서버가 정해서 이 컴포넌트를 그릴지 말지로 넘긴다.
// 여기선 "이 기기에서 봤는가" 만 본다. 승리일 때만 컨페티 — 진 경기에 축포를 쏘면 놀리는 것 같다.

import { useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import Celebration, { shimmerStyle } from "./Celebration";
import { Burst, GOLD, Rings } from "./effects";
import { markSeen, wasSeen } from "./seen";
import { momNames } from "../home/match-result";

export interface ResultRevealData {
  matchId: number;
  our: number;
  their: number;
  result: string;
  opponent: string;
  logo: string | null;
  /** 득점자 CSV(같은 이름이 골 수만큼 반복). */
  goals: string;
  mom: string;
}

const COPY: Record<string, { title: string; sub: string }> = {
  승: { title: "승리!", sub: "모두 고생 많았어요" },
  무: { title: "무승부", sub: "끝까지 잘 버텼어요" },
  패: { title: "아쉬운 패배", sub: "다음 경기에서 갚아줘요" },
};

export default function ResultReveal({ data, accent }: { data: ResultRevealData; accent: string }) {
  const store = `fx_result_${data.matchId}`;
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [closed, setClosed] = useState(false);
  if (!isClient || closed || wasSeen(store)) return null;
  return (
    <ResultRevealView
      data={data}
      accent={accent}
      onClose={() => {
        markSeen(store);
        setClosed(true);
      }}
    />
  );
}

export function ResultRevealView({
  data,
  accent,
  onClose,
}: {
  data: ResultRevealData;
  accent: string;
  onClose: () => void;
}) {
  const reduce = !!useReducedMotion();
  const from = <T extends object>(v: T): T | false => (reduce ? false : v);

  const won = data.result === "승";
  const lost = data.result === "패";
  const copy = COPY[data.result] ?? { title: data.result, sub: "" };
  const color = won ? GOLD : lost ? "#94a3b8" : "#e2e8f0";
  const SLAM = 0.9;

  // "문승환, 문승환, 박상민" → "문승환 2 · 박상민"
  const goalCounts = new Map<string, number>();
  data.goals
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((n) => goalCounts.set(n, (goalCounts.get(n) ?? 0) + 1));
  const scorers = [...goalCounts.entries()].map(([n, c]) => (c > 1 ? `${n} ${c}` : n)).join(" · ");

  return (
    <Celebration
      color={won ? GOLD : accent}
      confetti={won}
      onClose={onClose}
    >
      <motion.div
        animate={reduce || lost ? undefined : { x: [0, -10, 9, -6, 4, -2, 0], y: [0, 6, -5, 3, -2, 0, 0] }}
        transition={{ delay: SLAM, duration: 0.45 }}
      >
        <motion.p
          initial={from({ opacity: 0, letterSpacing: "0.6em" })}
          animate={{ opacity: 1, letterSpacing: "0.32em" }}
          transition={{ duration: 0.8 }}
          className="text-[11px] font-black"
          style={{ color }}
        >
          FULL TIME
        </motion.p>

        <div className="relative mt-8 flex items-center justify-center gap-4">
          {!reduce && !lost && <Rings delay={SLAM} color={color} />}
          {!reduce && won && <Burst delay={SLAM} count={30} radius={190} colors={[GOLD, "#fff", accent]} />}
          <motion.div initial={from({ opacity: 0, x: -60 })} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 정적 엠블럼 */}
            <img src="/underducklogo.png" alt="" className="h-16 w-16 rounded-full" />
          </motion.div>
          <motion.p
            initial={from({ opacity: 0, scale: 4, filter: "blur(12px)" })}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: SLAM - 0.3, duration: 0.3, ease: [0.7, 0, 0.84, 0] }}
            className="text-[64px] font-black tabular-nums tracking-[-0.04em] text-white"
            style={won ? { textShadow: `0 0 40px ${GOLD}88` } : undefined}
          >
            {data.our}
            <span className="mx-2 text-white/35">:</span>
            {data.their}
          </motion.p>
          <motion.div initial={from({ opacity: 0, x: 60 })} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            {data.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- 정적 로고
              <img src={data.logo} alt="" className="h-16 w-16 rounded-full bg-white object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-[26px] font-black text-white/70">
                {data.opponent.trim().charAt(0)}
              </span>
            )}
          </motion.div>
        </div>
        <p className="mt-3 text-[13px] font-bold text-white/50">vs {data.opponent}</p>

        <motion.p
          initial={from({ opacity: 0, y: 14, filter: "blur(8px)" })}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: SLAM + 0.35, duration: 0.6 }}
          className={`mt-7 text-[40px] font-black tracking-[-0.03em] ${won ? "fx-shimmer" : "text-white"}`}
          style={won ? shimmerStyle(GOLD) : undefined}
        >
          {copy.title}
        </motion.p>
        {copy.sub && (
          <motion.p
            initial={from({ opacity: 0 })}
            animate={{ opacity: 1 }}
            transition={{ delay: SLAM + 0.7 }}
            className="mt-1 text-[14px] font-bold text-white/60"
          >
            {copy.sub}
          </motion.p>
        )}

        {(scorers || data.mom) && (
          <motion.div
            initial={from({ opacity: 0, y: 10 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: SLAM + 1.0 }}
            className="mx-auto mt-7 max-w-[300px] space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[12.5px] font-bold text-white/70"
          >
            {scorers && (
              <p>
                <span className="mr-2 text-white/40">득점</span>
                {scorers}
              </p>
            )}
            {data.mom && (
              <p>
                <span className="mr-2" style={{ color: GOLD }}>MOM</span>
                {/* 저장값은 "공격 / 수비" 와 공동 수상 쉼표가 섞여 있다("A / B,C") */}
                {momNames(data.mom).join(" · ")}
              </p>
            )}
          </motion.div>
        )}
      </motion.div>
    </Celebration>
  );
}
