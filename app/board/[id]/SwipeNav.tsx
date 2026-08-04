"use client";
// 글 사이를 위아래로 넘기는 제스처. 릴스에서 "쑉쑉 넘기는" 그 감각을 노린 것이다.
//
// 자동재생은 하지 않는다. 스와이프의 쾌감은 사실 "재생이 알아서 되는 것"보다
// "다음으로 넘어가는 게 쉬운 것"에서 오고, 인스타 릴스는 임베드 재생 자체가 막혀 있어
// 절반만 동작하는 뷰어가 된다(BoardGrid 주석 참고).
//
// 일반 스크롤과 싸우지 않게 규칙을 하나 둔다: **끝에 닿았을 때만** 넘긴다.
//   맨 위에서 아래로 당기면  → 이전 글
//   맨 아래에서 위로 밀면    → 다음 글
// 중간에서는 평소처럼 스크롤된다. 댓글을 읽다가 글이 튀는 사고를 막는다.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";

/** 이 거리(px)를 넘겨야 이동한다. 짧으면 스크롤 끝에서 오작동한다. */
const THRESHOLD = 70;
/** 세로 제스처로 인정할 최소 비율(가로로 흘리면 무시). */
const VERTICAL_RATIO = 1.5;

export default function SwipeNav({
  prevId,
  nextId,
}: {
  /** 목록에서 위에 있는 글(더 최신) */
  prevId: number | null;
  /** 목록에서 아래에 있는 글(더 오래됨) */
  nextId: number | null;
}) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number; atTop: boolean; atBottom: boolean } | null>(null);
  // 판정에 쓰는 값은 ref 로 둔다. touchend 는 등록 시점의 state 를 캡처하므로
  // state 만 보면 항상 옛 값을 읽는다. state 는 화면 표시에만 쓴다.
  const gesture = useRef<{ dir: "prev" | "next"; ratio: number } | null>(null);
  const [hint, setHint] = useState<{ dir: "prev" | "next"; ratio: number } | null>(null);

  // 미리 받아두면 넘길 때 흰 화면이 안 뜬다.
  useEffect(() => {
    if (prevId !== null) router.prefetch(`/board/${prevId}`);
    if (nextId !== null) router.prefetch(`/board/${nextId}`);
  }, [prevId, nextId, router]);

  useEffect(() => {
    const scrollEdges = () => {
      const el = document.scrollingElement || document.documentElement;
      return {
        atTop: el.scrollTop <= 1,
        // 1px 여유 — 브라우저마다 소수점이 남아 정확히 안 떨어진다.
        atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 1,
      };
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, ...scrollEdges() };
    };

    const onMove = (e: TouchEvent) => {
      const s = start.current;
      if (!s || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dy = t.clientY - s.y;
      const dx = t.clientX - s.x;
      if (Math.abs(dy) < Math.abs(dx) * VERTICAL_RATIO) {
        gesture.current = null;
        setHint(null);
        return; // 가로 제스처
      }

      // 위로 미는 중 + 바닥 → 다음 글 / 아래로 당기는 중 + 꼭대기 → 이전 글
      const dir: "prev" | "next" | null =
        dy < 0 && s.atBottom && nextId !== null
          ? "next"
          : dy > 0 && s.atTop && prevId !== null
            ? "prev"
            : null;
      if (!dir) {
        // 방향을 되돌렸는데 예전 임계값이 남아 있으면 손을 놓는 순간 원치 않게 이동한다.
        gesture.current = null;
        setHint(null);
        return;
      }

      const next = { dir, ratio: Math.min(Math.abs(dy) / THRESHOLD, 1) };
      gesture.current = next;
      setHint(next);
    };

    const onEnd = () => {
      const h = gesture.current;
      start.current = null;
      gesture.current = null;
      if (h && h.ratio >= 1) {
        const target = h.dir === "next" ? nextId : prevId;
        if (target !== null) router.push(`/board/${target}`);
      }
      setHint(null);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [prevId, nextId, router]);

  if (!hint) return null;

  const atTop = hint.dir === "prev";
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center ${
        atTop
          ? "top-0 pt-[max(12px,env(safe-area-inset-top))]"
          : "bottom-[calc(4.25rem+env(safe-area-inset-bottom))]"
      }`}
    >
      <span
        className="flex items-center gap-1 rounded-full bg-gray-900/85 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-sm transition-transform"
        style={{ transform: `scale(${0.9 + hint.ratio * 0.1})`, opacity: 0.5 + hint.ratio * 0.5 }}
      >
        {atTop ? (
          <ChevronUp width={13} height={13} strokeWidth={2.6} />
        ) : (
          <ChevronDown width={13} height={13} strokeWidth={2.6} />
        )}
        {hint.ratio >= 1 ? "놓으면 이동" : atTop ? "이전 글" : "다음 글"}
      </span>
    </div>
  );
}
