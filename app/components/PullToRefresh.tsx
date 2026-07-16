"use client";
// app/components/PullToRefresh.tsx
// 📱 앱처럼 화면을 아래로 당겨서 새로고침 (iOS/Android PWA standalone 대응)
import React from "react";
import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { refreshAppData } from "../lib/actions";

const THRESHOLD = 75; // 이 거리 이상 당기면 새로고침 발동
const MAX_PULL = 120; // 최대 당김 거리

export default function PullToRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pull, setPull] = React.useState(0);
  // 서버 캐시 무효화 + 소프트 리프레시가 끝날 때까지 스피너 유지
  const [isPending, startTransition] = React.useTransition();
  const [busting, setBusting] = React.useState(false);
  const refreshing = isPending || busting;
  const startY = React.useRef<number | null>(null);
  const pullRef = React.useRef(0);
  const refreshingRef = React.useRef(false);

  // 전역 터치 리스너가 최신 refreshing 값을 읽을 수 있게 ref 동기화
  React.useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  // 캐시 무효화(서버) → 소프트 리프레시. 리프레시 동안은 refreshing 이 화면을 잡아둔다.
  const doRefresh = React.useCallback(() => {
    if (refreshingRef.current) return;
    pullRef.current = 0;
    setPull(0);
    setBusting(true);
    startTransition(async () => {
      try {
        await refreshAppData();
      } catch {
        /* 캐시 무효화 실패해도 새로고침은 진행 */
      }
      router.refresh();
      setBusting(false);
    });
  }, [router]);

  // 전역 리스너(빈 deps effect)에서 최신 함수를 참조하도록 ref에 보관.
  const triggerRef = React.useRef(doRefresh);
  React.useEffect(() => {
    triggerRef.current = doRefresh;
  }, [doRefresh]);

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
        triggerRef.current();
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

  // 리프레시 중에는 화면/인디케이터를 THRESHOLD 위치에 고정
  const displayPull = refreshing ? THRESHOLD : pull;
  const progress = Math.min(1, displayPull / THRESHOLD);

  return (
    <>
      {/* 당김 인디케이터 */}
      <div
        className="fixed left-1/2 z-[60] pointer-events-none"
        style={{
          top: 0,
          transform: `translate(-50%, ${displayPull - 44}px)`,
          opacity: displayPull > 4 ? Math.min(1, progress * 1.2) : 0,
          transition:
            displayPull === 0 ? "transform 0.3s ease-out, opacity 0.2s" : "none",
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
          displayPull > 0
            ? {
                transform: `translateY(${displayPull}px)`,
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
