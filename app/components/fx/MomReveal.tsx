"use client";

// MOM 발표 — 투표가 닫혀 MOM 이 확정된 뒤 홈에 처음 들어오면 한 번 뜬다(HomeCelebrations).

import { motion, useReducedMotion } from "motion/react";
import PlayerFace from "../PlayerFace";
import Celebration, { shimmerStyle } from "./Celebration";
import { Burst, EASE_OUT, GOLD, Rings } from "./effects";

export interface MomRevealData {
  matchId: number;
  names: string[];
  opponent: string;
  date: string;
}

export default function MomReveal({
  data,
  me,
  accent,
  onClose,
}: {
  data: MomRevealData;
  me?: string;
  accent: string;
  onClose: () => void;
}) {
  const reduce = !!useReducedMotion();
  const from = <T extends object>(v: T): T | false => (reduce ? false : v);
  const isMe = !!me && data.names.includes(me);
  const [, m, d] = data.date.split("-").map(Number);

  return (
    <Celebration color={GOLD} onClose={onClose}>
      <motion.p
        initial={from({ opacity: 0, letterSpacing: "0.6em" })}
        animate={{ opacity: 1, letterSpacing: "0.32em" }}
        transition={{ duration: 0.9 }}
        className="text-[11px] font-black"
        style={{ color: GOLD }}
      >
        MAN OF THE MATCH
      </motion.p>
      <p className="mt-2 text-[12.5px] font-bold text-white/50">
        vs {data.opponent}
        {m && d ? ` · ${m}월 ${d}일` : ""}
      </p>

      <div className="relative mt-9 flex items-center justify-center gap-3">
        {!reduce && <Rings delay={0.8} color={GOLD} />}
        {!reduce && <Burst delay={0.8} count={28} radius={180} colors={[GOLD, "#fff", accent]} />}
        {data.names.map((n, i) => (
          <motion.div
            key={n}
            className="relative rounded-full p-[3px]"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #fff, ${GOLD})`, boxShadow: `0 0 40px ${GOLD}88` }}
            initial={from({ opacity: 0, scale: 2.6, filter: "blur(14px)" })}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.45 + i * 0.12, duration: 0.4, ease: [0.7, 0, 0.84, 0] }}
          >
            <PlayerFace name={n} size={data.names.length > 1 ? 96 : 128} />
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={from({ opacity: 0, y: 14, filter: "blur(8px)" })}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 1.2, duration: 0.6, ease: EASE_OUT }}
        className="fx-shimmer mt-8 text-[38px] font-black leading-tight tracking-[-0.03em]"
        style={shimmerStyle(GOLD)}
      >
        {data.names.join(" · ")}
      </motion.p>
      <motion.p
        initial={from({ opacity: 0, y: 10 })}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        className="mt-3 text-[15px] font-bold leading-relaxed text-white/70"
      >
        {isMe ? "축하해요! 오늘의 주인공은 바로 당신이에요" : "오늘의 MOM이에요. 다 같이 축하해 주세요!"}
      </motion.p>
    </Celebration>
  );
}
