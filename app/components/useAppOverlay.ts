"use client";

import { useCallback, useEffect, useId, useRef } from "react";

/**
 * 포털 오버레이를 PWA의 한 화면처럼 다룬다.
 *
 * - Android 하드웨어 뒤로가기: 페이지를 떠나는 대신 오버레이를 닫는다.
 * - Escape: 같은 방식으로 닫는다.
 * - 열린 동안 뒤 페이지 스크롤을 잠근다.
 *
 * Vaul Drawer는 자체 스크롤 잠금이 있으므로 일반 포털 모달에만 사용한다.
 */
export default function useAppOverlay(open: boolean, onClose: () => void) {
  const reactId = useId();
  const marker = `ud-overlay-${reactId}`;
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    let pushed = false;
    // 개발 모드의 Strict Effects는 effect를 setup→cleanup→setup으로 한 번 더 검증한다.
    // 히스토리를 동기 추가하면 그 검증만으로 뒤로가기가 생기므로 다음 프레임에 확정한다.
    const frame = requestAnimationFrame(() => {
      window.history.pushState(
        { ...(window.history.state ?? {}), __udOverlay: marker },
        "",
      );
      pushed = true;
    });

    const onPopState = () => closeRef.current();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (window.history.state?.__udOverlay === marker) window.history.back();
      else closeRef.current();
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      // 닫기 버튼·배경 탭으로 닫힌 경우 우리가 추가한 히스토리 한 칸도 회수한다.
      if (pushed && window.history.state?.__udOverlay === marker) window.history.back();
    };
  }, [marker, open]);

  return useCallback(() => {
    if (window.history.state?.__udOverlay === marker) window.history.back();
    else closeRef.current();
  }, [marker]);
}
