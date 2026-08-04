"use client";

// 댓글 전용 바텀 시트.
// 짧은 내용에 따라 높이가 달라지지 않는 고정형 시트다.
// 목록과 입력창을 분리하고 배경 스크롤을 잠가, 키보드가 올라와도 피드 위치는 움직이지 않는다.

import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import FeedbackThread, { type Feedback } from "./FeedbackThread";

const SHEET_HEIGHT_RATIO = 0.62;
const KEYBOARD_THRESHOLD = 120;

interface KeyboardFrame {
  height: number;
  bottom: number;
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
  const [keyboardFrame, setKeyboardFrame] = useState<KeyboardFrame | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setKeyboardFrame(null);
  };

  // iOS는 input을 화면에 넣으려고 document 자체를 스크롤한다. 시트가 열린 동안
  // body를 현재 위치에 고정하고, 닫을 때 정확히 같은 피드 위치로 복원한다.
  useEffect(() => {
    if (!open) return;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(scrollX, scrollY);
    };
  }, [open]);

  // iOS는 레이아웃 viewport를 줄이지 않고 visual viewport만 줄인다. 이 경우에만
  // 키보드 윗선에 시트를 직접 붙인다. Android의 resizes-content 환경은 bottom: 0이면 된다.
  useEffect(() => {
    if (!open) return;

    const viewport = window.visualViewport;
    const baseLayoutHeight = window.innerHeight;
    const baseVisualHeight = viewport?.height ?? baseLayoutHeight;

    const updateKeyboardFrame = () => {
      const layoutHeight = window.innerHeight;
      const visualHeight = viewport?.height ?? layoutHeight;
      const visualOffsetTop = viewport?.offsetTop ?? 0;
      const keyboardOpen = baseVisualHeight - visualHeight > KEYBOARD_THRESHOLD;

      if (!keyboardOpen) {
        setKeyboardFrame(null);
        return;
      }

      const layoutWasResized = baseLayoutHeight - layoutHeight > KEYBOARD_THRESHOLD;
      const bottom = layoutWasResized
        ? 0
        : Math.max(0, baseLayoutHeight - visualOffsetTop - visualHeight);

      setKeyboardFrame({
        height: Math.min(baseLayoutHeight * SHEET_HEIGHT_RATIO, visualHeight),
        bottom,
      });
    };

    updateKeyboardFrame();
    viewport?.addEventListener("resize", updateKeyboardFrame);
    viewport?.addEventListener("scroll", updateKeyboardFrame);
    window.addEventListener("resize", updateKeyboardFrame);

    return () => {
      viewport?.removeEventListener("resize", updateKeyboardFrame);
      viewport?.removeEventListener("scroll", updateKeyboardFrame);
      window.removeEventListener("resize", updateKeyboardFrame);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => handleOpenChange(true)} className={className}>
        {trigger}
      </button>

      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        handleOnly
        repositionInputs={false}
        preventScrollRestoration
      >
        <DrawerContent
          handleClassName="!absolute left-1/2 top-0 z-10 -translate-x-1/2"
          className="mx-auto h-[62dvh] max-h-none w-full max-w-md overflow-hidden bg-white data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none dark:bg-[#161618]"
          style={
            keyboardFrame
              ? { height: keyboardFrame.height, bottom: keyboardFrame.bottom }
              : undefined
          }
        >
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
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
        </DrawerContent>
      </Drawer>
    </>
  );
}
