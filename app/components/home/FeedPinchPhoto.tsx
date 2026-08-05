"use client";

// 피드 사진 확대 — 인스타와 같은 규칙.
//
//   · 누르면 아무 일도 안 일어난다. 사진을 여는 별도 화면이 없다.
//   · 두 손가락으로 벌리면 그 자리에서 커지고, 손을 떼면 제자리로 돌아온다.
//     확대 상태가 남지 않으므로 "닫는 법"을 배울 필요가 없다.
//
// 확대된 사진은 피드 위로 떠야 한다. 캐러셀은 overflow 로 잘리는 상자여서 그 안에서
// 키우면 상자 밖으로 나간 부분이 잘려 나가 "확대"가 아니라 "크롭"이 된다.
// 그래서 확대 중에만 같은 사진을 화면 최상단에 그리고(포털) 원본 자리는 비워 둔다.
//
// 브라우저 기본 핀치는 이 앱에서 막혀 있다(layout.tsx: userScalable false).
// 그래서 사진만 손가락으로 키울 수 있는 통로가 따로 필요하다.

import { useEffect, useRef, useState } from "react";
import ModalPortal from "../ModalPortal";

const MAX_SCALE = 4;
/** 되돌아가는 시간. 직접 만지던 것이 손을 떼면 따라오는 정도로만 짧게. */
const SETTLE_MS = 220;

interface Zoom {
  rect: { left: number; top: number; width: number; height: number };
  /** 핀치 중심(요소 기준). 손가락이 있는 곳에서 커져야 자연스럽다. */
  originX: number;
  originY: number;
  scale: number;
  tx: number;
  ty: number;
  /** 손을 뗀 뒤 제자리로 돌아가는 중. */
  settling: boolean;
}

const distanceOf = (a: Touch, b: Touch) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

export default function FeedPinchPhoto({
  src,
  alt = "",
  className = "",
  loading,
  fetchPriority,
}: {
  src: string;
  alt?: string;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const settleTimer = useRef(0);
  const [zoom, setZoom] = useState<Zoom | null>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      window.clearTimeout(settleTimer.current);
      const [a, b] = [e.touches[0], e.touches[1]];
      const rect = holder.getBoundingClientRect();
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      startRef.current = { dist: Math.max(1, distanceOf(a, b)), midX, midY };
      setZoom({
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        originX: midX - rect.left,
        originY: midY - rect.top,
        scale: 1,
        tx: 0,
        ty: 0,
        settling: false,
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      const start = startRef.current;
      if (!start || e.touches.length < 2) return;
      // 캐러셀 가로 스크롤과 페이지 스크롤이 같은 손가락을 물지 않게 막는다.
      if (e.cancelable) e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      // 1보다 작아지지 않게 — 원래 크기보다 줄어들면 "확대"가 아니라 사고처럼 보인다.
      const scale = Math.min(MAX_SCALE, Math.max(1, distanceOf(a, b) / start.dist));
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      setZoom((prev) =>
        prev ? { ...prev, scale, tx: midX - start.midX, ty: midY - start.midY } : prev,
      );
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!startRef.current || e.touches.length >= 2) return;
      startRef.current = null;
      setZoom((prev) => (prev ? { ...prev, scale: 1, tx: 0, ty: 0, settling: true } : prev));
      settleTimer.current = window.setTimeout(() => setZoom(null), SETTLE_MS);
    };

    holder.addEventListener("touchstart", onTouchStart, { passive: true });
    holder.addEventListener("touchmove", onTouchMove, { passive: false });
    holder.addEventListener("touchend", onTouchEnd);
    holder.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.clearTimeout(settleTimer.current);
      holder.removeEventListener("touchstart", onTouchStart);
      holder.removeEventListener("touchmove", onTouchMove);
      holder.removeEventListener("touchend", onTouchEnd);
      holder.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <>
      {/* 당겨서 새로고침에 이 손가락을 넘기지 않는다. 사진이 한 장이면 캐러셀이
          가로로 넘치지 않아 PTR 의 "스크롤 영역 안에서 시작한 터치" 판정을 통과하는데,
          그러면 두 손가락으로 벌리는 동안 화면까지 같이 끌려 내려온다. */}
      <div
        ref={holderRef}
        data-pull-to-refresh-ignore
        className={className}
        // 한 손가락은 피드의 세로 스크롤과 캐러셀의 가로 스와이프에 모두 양보한다.
        // 두 손가락 핀치가 시작된 뒤에만 위 touchmove 핸들러가 기본 동작을 막는다.
        style={{ touchAction: "pan-x pan-y" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          draggable={false}
          className="aspect-square w-full bg-gray-100 object-cover dark:bg-white/5"
          // 확대 중에는 위에 뜬 사진이 진짜다. 원본까지 보이면 두 장이 겹쳐 보인다.
          style={{ visibility: zoom ? "hidden" : undefined }}
        />
      </div>

      {zoom && (
        <ModalPortal>
          <div className="pointer-events-none fixed inset-0 z-[70]">
            <div
              className="absolute inset-0 bg-black"
              style={{
                opacity: zoom.settling ? 0 : Math.min(0.72, (zoom.scale - 1) * 0.55),
                transition: zoom.settling ? `opacity ${SETTLE_MS}ms ease-out` : undefined,
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              className="absolute object-cover"
              style={{
                left: zoom.rect.left,
                top: zoom.rect.top,
                width: zoom.rect.width,
                height: zoom.rect.height,
                transformOrigin: `${zoom.originX}px ${zoom.originY}px`,
                transform: `translate3d(${zoom.tx}px, ${zoom.ty}px, 0) scale(${zoom.scale})`,
                transition: zoom.settling
                  ? `transform ${SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                  : undefined,
              }}
            />
          </div>
        </ModalPortal>
      )}
    </>
  );
}
