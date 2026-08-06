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
// 키보드가 뜨면 62% 시트를 그대로 밀어 올리는 대신, 키보드 위에 남은 공간으로 다시 그린다.
// 밀어 올리기만 하면 시트 위쪽(손잡이·제목)이 화면 밖으로 잘려 나간다.
const KEYBOARD_TOP_GAP = 56;
const MIN_SHEET_HEIGHT = 240;

interface KeyboardMetrics {
  height: number;
  bottomInset: number;
  keyboardOpen: boolean;
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
    height: 0,
    bottomInset: 0,
    keyboardOpen: false,
  });
  const sheetRef = useRef<HTMLDivElement>(null);
  const keyboardPositionMode = useRef<"native" | "manual" | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOpen(nextOpen);
  };

  // 쉴 때는 62%. 키보드가 뜨면 가려진 거리만큼 시트를 올리고(브라우저가 이미 올린
  // 기기에서는 inset이 0), 동시에 키보드 위 남은 높이로 시트를 다시 그린다.
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
          setKeyboardMetrics({ height: restingHeight, bottomInset: 0, keyboardOpen: false });
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
        setKeyboardMetrics({
          height: Math.max(MIN_SHEET_HEIGHT, visualHeight - KEYBOARD_TOP_GAP),
          bottomInset,
          keyboardOpen: true,
        });
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

  const { height, bottomInset, keyboardOpen } = keyboardMetrics;

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className={className}
      >
        {trigger}
      </button>

      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        // handleOnly 를 쓰지 않는다. 그러면 상단 모서리의 좁은 핸들에 정확히
        // 닿아야만 내려가서, 다른 드로어처럼 헤더를 잡고 내릴 수가 없다.
        //
        // 잘못 끌릴 자리는 이미 막혀 있다 — 댓글 목록과 입력창에 data-vaul-no-drag
        // 가 붙어 있어서(FeedbackThread) 목록은 스크롤되고 입력은 타이핑된다.
        // 남는 건 헤더와 핸들뿐이고, 거기가 원래 잡으라고 만든 자리다.
        repositionInputs={false}
        preventScrollRestoration
        onAnimationEnd={(nextOpen) => {
          if (!nextOpen) {
            setKeyboardMetrics({ height: 0, bottomInset: 0, keyboardOpen: false });
          }
        }}
      >
        <DrawerContent
          ref={sheetRef}
          // 핸들은 본문보다 위여야 잡힌다. 둘 다 z-10 이면 DOM 뒤쪽인 본문이
          // 덮어서 손가락이 핸들에 닿지 않는다 — handleOnly 라 핸들 말고는
          // 드래그가 안 되니, 결과적으로 이 시트만 내릴 방법이 없었다.
          handleClassName="!absolute left-1/2 top-0 z-20 -translate-x-1/2"
          overlayClassName="touch-none overscroll-none"
          className="mx-auto h-[62dvh] max-h-none w-full max-w-md overflow-visible bg-white transition-[bottom,height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none dark:bg-[#161618]"
          style={height > 0 ? { height, bottom: bottomInset } : undefined}
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
              keyboardOpen={keyboardOpen}
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
