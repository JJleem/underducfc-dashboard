"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HeroStateTransition({
  stateKey,
  children,
}: {
  stateKey: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      layout={!reduceMotion}
      className="relative"
      transition={{ layout: { duration: 0.36, ease: EASE } }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stateKey}
          initial={reduceMotion ? false : { opacity: 0, y: 8, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -5, filter: "blur(2px)" }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
