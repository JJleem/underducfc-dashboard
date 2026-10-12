"use client";

// 칭호 획득 — 지난번 홈에 왔을 때 없던 칭호가 생겼으면 한 번 뜬다(HomeCelebrations).

import { motion, useReducedMotion } from "motion/react";
import type { EarnedTitle } from "../../lib/titles";
import { TitleBadge } from "../TitleBadges";
import Celebration, { shimmerStyle } from "./Celebration";
import { Burst, EASE_OUT, GOLD, Rings, Shine } from "./effects";

/** 한 번에 보여 줄 최대 개수. 넘치면 "외 N개" 로 적는다. */
const MAX = 3;

export default function TitleReveal({
  titles,
  upgraded,
  titleKey,
  accent,
  onClose,
}: {
  titles: EarnedTitle[];
  /** 등급이 오른 칭호의 키(titleKey). 없으면 전부 새로 딴 칭호. */
  upgraded?: Set<string>;
  titleKey?: (t: EarnedTitle) => string;
  accent: string;
  onClose: () => void;
}) {
  const reduce = !!useReducedMotion();
  const from = <T extends object>(v: T): T | false => (reduce ? false : v);
  const shown = titles.slice(0, MAX);
  const main = shown[0];
  const mainUpgraded = !!upgraded && !!titleKey && upgraded.has(titleKey(main));
  const label = (t: EarnedTitle) =>
    `${t.scope === "season" && t.seasonLabel ? `${t.seasonLabel} ` : ""}${t.name}${t.tierLabel ? ` · ${t.tierLabel}` : ""}`;

  return (
    <Celebration color={accent} onClose={onClose}>
      <motion.p
        initial={from({ opacity: 0, letterSpacing: "0.6em" })}
        animate={{ opacity: 1, letterSpacing: "0.32em" }}
        transition={{ duration: 0.9 }}
        className="text-[11px] font-black"
        style={{ color: accent }}
      >
        {mainUpgraded ? "TITLE UPGRADE" : "NEW TITLE"}
      </motion.p>

      <div className="relative mt-10 flex items-center justify-center gap-4" style={{ perspective: 700 }}>
        {!reduce && <Rings delay={0.9} color={accent} />}
        {!reduce && <Burst delay={0.9} count={24} radius={170} colors={[accent, GOLD, "#fff"]} />}
        {shown.map((t, i) => (
          <motion.div
            key={`${t.scope ?? "career"}:${t.id}`}
            className="relative overflow-hidden rounded-full"
            initial={from({ opacity: 0, rotateY: 540, scale: 0.3 })}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.2, duration: 1.0, ease: EASE_OUT }}
            style={{ filter: `drop-shadow(0 0 24px ${accent}aa)` }}
          >
            <TitleBadge title={t} size={i === 0 ? 112 : 76} />
            {!reduce && <Shine delay={1.4 + i * 0.2} />}
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={from({ opacity: 0, y: 12 })}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-9 text-[15px] font-bold text-white/60"
      >
        {mainUpgraded ? "칭호 등급이 올랐어요!" : "새 칭호를 얻었어요!"}
      </motion.p>
      <motion.p
        initial={from({ opacity: 0, y: 14, filter: "blur(8px)" })}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 1.35, duration: 0.6, ease: EASE_OUT }}
        className="fx-shimmer mt-1.5 text-[30px] font-black leading-tight tracking-[-0.03em]"
        style={shimmerStyle(accent)}
      >
        {label(main)}
      </motion.p>
      {main.desc && (
        <motion.p
          initial={from({ opacity: 0 })}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
          className="mt-2 text-[13px] font-bold text-white/50"
        >
          {main.desc}
        </motion.p>
      )}
      {shown.length > 1 && (
        <motion.p
          initial={from({ opacity: 0 })}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.9 }}
          className="mt-4 text-[12px] font-bold text-white/45"
        >
          {shown.slice(1).map(label).join(" · ")}
          {titles.length > MAX ? ` 외 ${titles.length - MAX}개` : ""}
        </motion.p>
      )}
    </Celebration>
  );
}
