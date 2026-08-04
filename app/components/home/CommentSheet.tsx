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
  keyboardHeight: number;
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
    keyboardHeight: 0,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOpen(nextOpen);
  };

  // 키보드가 차지하는 만큼 시트를 위로 확장한다. 댓글 영역은 기존 높이를 유지하고
  // 맨 아래 키보드 영역만 비워서 입력창이 키보드 바로 위에 오게 한다.
  useEffect(() => {
    if (!open) return;

    const viewport = window.visualViewport;
    const initialVisualHeight = viewport?.height ?? window.innerHeight;
    const restingHeight = initialVisualHeight * SHEET_HEIGHT_RATIO;

    const updateKeyboardHeight = () => {
      const visualHeight = viewport?.height ?? window.innerHeight;
      const nextHeight = Math.max(0, initialVisualHeight - visualHeight);
      setKeyboardMetrics({
        restingHeight,
        keyboardHeight: nextHeight > KEYBOARD_THRESHOLD ? nextHeight : 0,
      });
    };

    updateKeyboardHeight();
    viewport?.addEventListener("resize", updateKeyboardHeight);
    viewport?.addEventListener("scroll", updateKeyboardHeight);

    return () => {
      viewport?.removeEventListener("resize", updateKeyboardHeight);
      viewport?.removeEventListener("scroll", updateKeyboardHeight);
    };
  }, [open]);

  const { restingHeight, keyboardHeight } = keyboardMetrics;
  const keyboardOpen = keyboardHeight > 0 && restingHeight > 0;
  const commentsHeight = keyboardOpen ? restingHeight : undefined;

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
            setKeyboardMetrics({ restingHeight: 0, keyboardHeight: 0 });
          }
        }}
      >
        <DrawerContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus({ preventScroll: true });
          }}
          handleClassName="!absolute left-1/2 top-0 z-10 -translate-x-1/2"
          overlayClassName="touch-none overscroll-none"
          className="mx-auto h-[62dvh] max-h-none w-full max-w-md overflow-hidden bg-white transition-[height] duration-200 ease-out data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none dark:bg-[#161618]"
          style={
            keyboardOpen ? { height: restingHeight + keyboardHeight, bottom: 0 } : undefined
          }
        >
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
            <div
              className="flex min-h-0 w-full flex-col overflow-hidden"
              style={commentsHeight === undefined ? { flex: 1 } : { height: commentsHeight }}
            >
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

            {keyboardOpen && <div aria-hidden className="shrink-0" style={{ height: keyboardHeight }} />}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
