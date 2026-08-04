"use client";

// 댓글 전용 바텀 시트.
// 짧은 내용에 따라 높이가 달라지지 않는 고정형 시트다.
// 목록과 입력창을 분리하고 배경 스크롤을 잠가, 키보드가 올라와도 피드 위치는 움직이지 않는다.

import { useEffect, useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import FeedbackThread, { type Feedback } from "./FeedbackThread";

const SHEET_HEIGHT_RATIO = 0.62;
const KEYBOARD_THRESHOLD = 120;

interface KeyboardMetrics {
  restingHeight: number;
  bottomInset: number;
}

export default function CommentSheet({
  title = "댓글",
  subtitle,
  trigger,
  className = "",
  matchId,
  feedbacks,
  userName,
  isAdmin = false,
}: {
  title?: string;
  subtitle?: string;
  trigger: React.ReactNode;
  className?: string;
  matchId: number;
  feedbacks: Feedback[];
  userName?: string;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [keyboardMetrics, setKeyboardMetrics] = useState<KeyboardMetrics>({
    restingHeight: 0,
    bottomInset: 0,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const keyboardPositionMode = useRef<"native" | "manual" | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOpen(nextOpen);
  };

  // 시트 높이는 처음 열린 62%로 고정한다. 키보드가 뜨면 실제로 가려진 거리만
  // 측정해 시트 전체를 올린다. 브라우저가 이미 올린 기기에서는 inset이 0이 된다.
  useEffect(() => {
    if (!open) return;

    const viewport = window.visualViewport;
    const initialVisualHeight = viewport?.height ?? window.innerHeight;
    const initialVisualBottom = (viewport?.offsetTop ?? 0) + initialVisualHeight;
    const restingHeight = initialVisualHeight * SHEET_HEIGHT_RATIO;
    let frame = 0;
    keyboardPositionMode.current = null;

    const updatePosition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const visualHeight = viewport?.height ?? window.innerHeight;
        const keyboardHeight = Math.max(0, initialVisualHeight - visualHeight);

        if (keyboardHeight <= KEYBOARD_THRESHOLD) {
          keyboardPositionMode.current = null;
          setKeyboardMetrics({ restingHeight, bottomInset: 0 });
          return;
        }

        const visualBottom = (viewport?.offsetTop ?? 0) + visualHeight;
        if (keyboardPositionMode.current === null) {
          const renderedBottom = sheetRef.current?.getBoundingClientRect().bottom ?? visualBottom;
          keyboardPositionMode.current = renderedBottom - visualBottom > 8 ? "manual" : "native";
        }

        const bottomInset =
          keyboardPositionMode.current === "manual"
            ? Math.max(0, initialVisualBottom - visualBottom)
            : 0;
        setKeyboardMetrics({ restingHeight, bottomInset });
      });
    };

    updatePosition();
    viewport?.addEventListener("resize", updatePosition);
    viewport?.addEventListener("scroll", updatePosition);

    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", updatePosition);
      viewport?.removeEventListener("scroll", updatePosition);
    };
  }, [open]);

  const { restingHeight, bottomInset } = keyboardMetrics;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => handleOpenChange(true)}
        className={className}
      >
        {trigger}
      </button>

      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        handleOnly
        repositionInputs={false}
        preventScrollRestoration
        onAnimationEnd={(nextOpen) => {
          if (!nextOpen) {
            setKeyboardMetrics({ restingHeight: 0, bottomInset: 0 });
          }
        }}
      >
        <DrawerContent
          ref={sheetRef}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus({ preventScroll: true });
          }}
          handleClassName="!absolute left-1/2 top-0 z-10 -translate-x-1/2"
          overlayClassName="touch-none overscroll-none"
          className="mx-auto h-[62dvh] max-h-none w-full max-w-md overflow-visible bg-white transition-[bottom] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none dark:bg-[#161618]"
          style={restingHeight > 0 ? { height: restingHeight, bottom: bottomInset } : undefined}
        >
          <div className="relative z-10 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-t-lg bg-white dark:bg-[#161618]">
            <DrawerHeader className="shrink-0 border-b border-gray-100 pb-3 pt-7 dark:border-white/[0.06]">
              <DrawerTitle className="text-center text-[15px] font-black text-gray-900 dark:text-white">
                {title}
              </DrawerTitle>
              {subtitle && (
                <p className="text-center text-[10.5px] font-bold text-gray-400 dark:text-white/30">
                  {subtitle}
                </p>
              )}
            </DrawerHeader>

            <FeedbackThread
              matchId={matchId}
              initial={feedbacks}
              userName={userName}
              isAdmin={isAdmin}
              collapsedCount={0}
              sheetLayout
            />
          </div>
          {bottomInset > 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-full bg-white dark:bg-[#161618]"
              style={{ height: bottomInset }}
            />
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
