"use client";

// 화면 효과 부품 — 시즌 필름에서 처음 만들고, 평소 기능의 "한 번 크게 터지는 순간"
// (MOM 발표 · 경기 결과 · 칭호 획득)에도 같이 쓴다.
//
// 전부 장식이다. prefers-reduced-motion 이면 쓰는 쪽에서 아예 그리지 않는다.

import { motion } from "motion/react";

export const GOLD = "#FFD27A";
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 고정 시드 의사난수 0~1. 같은 (i, salt) 면 서버·클라이언트가 같은 값을 낸다. */
export function rnd(i: number, salt = 0): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** 표면을 한 번(또는 반복해서) 쓸고 지나가는 광택. 부모가 relative + overflow-hidden 이어야 한다. */
export function Shine({ delay = 0, repeat = false }: { delay?: number; repeat?: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12"
      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
      initial={{ x: "-150%" }}
      animate={{ x: "300%" }}
      transition={{ delay, duration: 0.9, ease: "easeInOut", ...(repeat ? { repeat: Infinity, repeatDelay: 2.2 } : {}) }}
    />
  );
}

/** 충격파 — 가운데서 고리 세 개가 퍼진다. */
export function Rings({ delay, color }: { delay: number; color: string }) {
  return (
    <>
      {[0, 1, 2].map((k) => (
        <motion.span
          key={k}
          className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ border: `${3 - k}px solid ${color}` }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.4, 3 + k] }}
          transition={{ delay: delay + k * 0.12, duration: 1.1, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

/** 불꽃 — 가운데서 사방으로 튄다. */
export function Burst({ delay, count, radius, colors }: { delay: number; count: number; radius: number; colors: string[] }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + rnd(i, 11) * 0.4;
        const dist = radius * (0.55 + rnd(i, 12) * 0.6);
        const size = 3 + Math.round(rnd(i, 13) * 5);
        return (
          <motion.span
            key={i}
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, background: colors[i % colors.length], boxShadow: `0 0 8px ${colors[i % colors.length]}` }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
            animate={{ x: Math.cos(a) * dist, y: Math.sin(a) * dist, opacity: [0, 1, 0], scale: [1, 1, 0.3] }}
            transition={{ delay, duration: 0.9 + rnd(i, 14) * 0.5, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

/** 위에서 계속 떨어지는 컨페티. */
export function Confetti({ colors }: { colors: string[] }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: 36 }, (_, i) => {
        const w = 5 + Math.round(rnd(i, 21) * 4);
        return (
          <motion.span
            key={i}
            className="absolute top-0 block rounded-[1px]"
            style={{ left: `${rnd(i, 22) * 100}%`, width: w, height: w * 1.8, background: colors[i % colors.length] }}
            initial={{ y: "-10vh", rotate: 0, x: 0, opacity: 0.9 }}
            animate={{ y: "110vh", rotate: 360 * (rnd(i, 23) > 0.5 ? 2 : -2), x: [0, (rnd(i, 24) - 0.5) * 80, 0] }}
            transition={{ duration: 4 + rnd(i, 25) * 3, delay: 0.6 + rnd(i, 26) * 3, ease: "linear", repeat: Infinity }}
          />
        );
      })}
    </div>
  );
}

/**
 * 지금 화면의 시즌 대표색. 루트 레이아웃이 --season-light 로 깔아 둔다([[seasons]]).
 * 축하 화면을 클릭으로 다시 열 때처럼 서버에서 색을 넘겨받기 번거로운 자리에서 쓴다.
 */
export function pageAccent(): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue("--season-light").trim() || "#FF8FA3";
  } catch {
    return "#FF8FA3";
  }
}
