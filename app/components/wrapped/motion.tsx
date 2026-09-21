"use client";

// 래핑 전용 연출 부품.
//
// 지금까지는 장을 넘길 때 통째로 페이드인만 했다. 열 장이 같은 리듬이라 밋밋했다.
// 숫자는 올라가고, 목록은 위에서 하나씩 내려오게 해서 "펼쳐지는" 느낌을 만든다.
//
// ⚠️ 접근성: prefers-reduced-motion 이면 둘 다 즉시 최종 상태로 간다.
//    움직임이 불편한 사람에게 0.8초짜리 카운트업은 그냥 읽기 힘든 숫자다.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/** 0 → value 로 올라가는 숫자. key 가 바뀌면(=장이 바뀌면) 다시 센다. */
export function CountUp({
  value,
  duration = 900,
  format,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const reduce = useReducedMotion();
  // 애니메이션을 안 할 땐 상태를 아예 안 건드리고 값을 그대로 그린다.
  // (effect 안에서 동기 setState 를 하면 렌더가 연쇄된다)
  const animated = !reduce && value > 0;
  const [shown, setShown] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!animated) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — 끝에서 부드럽게 멎어야 숫자가 "도착"한 느낌이 난다
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [value, duration, animated]);

  const n = animated ? shown : value;
  return <>{format ? format(n) : n}</>;
}

/** 자식들을 위에서부터 차례로 들여보낸다. */
export function Stagger({
  children,
  delay = 0,
  step = 55,
}: {
  children: ReactNode[];
  /** 첫 항목 지연(ms). */
  delay?: number;
  /** 항목 간 간격(ms). */
  step?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut", delay: (delay + i * step) / 1000 }}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}
