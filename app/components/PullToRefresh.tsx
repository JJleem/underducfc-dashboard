"use client";
// app/components/PullToRefresh.tsx
// 📱 앱처럼 화면을 아래로 당겨서 새로고침 (iOS/Android PWA standalone 대응)
import React from "react";
import { RotateCw } from "lucide-react";

const THRESHOLD = 75; // 이 거리 이상 당기면 새로고침 발동
const MAX_PULL = 120; // 최대 당김 거리

export default function PullToRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef<number | null>(null);
  const pullRef = React.useRef(0);
  const refreshingRef = React.useRef(false);

  React.useEffect(() => {
    // 드로어/모달 내부, 또는 자체 스크롤 영역 안에서 시작된 터치는 무시
    const isInsideScrollableOrDialog = (target: EventTarget | null) => {
      let node = target instanceof Element ? target : null;
      while (node && node !== document.body) {
        if (node.getAttribute("role") === "dialog") return true;
        const style = window.getComputedStyle(node);
        if (
          /(auto|scroll)/.test(style.overflowY) &&
          node.scrollHeight > node.clientHeight
        )
          return true;
        node = node.parentElement;
      }
      return false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (
        window.scrollY <= 0 &&
        !refreshingRef.current &&
        !isInsideScrollableOrDialog(e.target)
      ) {
        startY.current = e.touches[0].clientY;
      } else {
        startY.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshingRef.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY <= 0) {
        // 저항감: 당길수록 천천히 늘어남
        const eased = Math.min(MAX_PULL, delta * 0.45);
        pullRef.current = eased;
        setPull(eased);
        if (e.cancelable) e.preventDefault();
      } else if (pullRef.current > 0) {
        pullRef.current = 0;
        setPull(0);
      }
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(THRESHOLD);
        window.location.reload();
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <>
      {/* 당김 인디케이터 */}
      <div
        className="fixed left-1/2 z-[60] pointer-events-none"
        style={{
          top: 0,
          transform: `translate(-50%, ${pull - 44}px)`,
          opacity: pull > 4 ? Math.min(1, progress * 1.2) : 0,
          transition:
            pull === 0 ? "transform 0.3s ease-out, opacity 0.2s" : "none",
        }}
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-[#1c1c1f] shadow-lg border border-gray-200/70 dark:border-white/10">
          <RotateCw
            className={`w-4 h-4 ${
              progress >= 1 || refreshing
                ? "text-[#FF8FA3] dark:text-[#FFB6C1]"
                : "text-gray-400"
            } ${refreshing ? "animate-spin" : ""}`}
            style={
              refreshing
                ? undefined
                : { transform: `rotate(${progress * 270}deg)` }
            }
          />
        </div>
      </div>

      {/* 본문: 당기는 동안만 transform 적용 (fixed 요소 깨짐 방지) */}
      <div
        className="flex-1 flex flex-col"
        style={
          pull > 0
            ? {
                transform: `translateY(${pull}px)`,
                transition: refreshing ? "none" : undefined,
              }
            : { transition: "transform 0.3s ease-out" }
        }
      >
        {children}
      </div>
    </>
  );
}
