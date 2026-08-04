"use client";

// 댓글 전용 바텀 시트.
// 짧은 내용에 따라 높이가 달라지지 않고 62%에서 시작하며, 손잡이로 94%까지 확장한다.
// 목록과 입력창은 분리해 키보드가 올라와도 작성 영역이 시트 하단에 남는다.

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import FeedbackThread, { type Feedback } from "./FeedbackThread";

const INITIAL_SNAP = 0.62;
const EXPANDED_SNAP = 0.94;
const SNAP_POINTS: (number | string)[] = [INITIAL_SNAP, EXPANDED_SNAP];

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
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(INITIAL_SNAP);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) setActiveSnapPoint(INITIAL_SNAP);
  };

  return (
    <>
      <button type="button" onClick={() => handleOpenChange(true)} className={className}>
        {trigger}
      </button>

      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        snapPoints={SNAP_POINTS}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={setActiveSnapPoint}
        fadeFromIndex={0}
        handleOnly
        fixed
        repositionInputs
        preventScrollRestoration
      >
        <DrawerContent
          handleClassName="!absolute left-1/2 top-0 z-10 -translate-x-1/2"
          className="mx-auto h-[100dvh] max-h-none w-full max-w-md overflow-hidden bg-white data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none dark:bg-[#161618]"
        >
          <div
            className="flex min-h-0 w-full flex-col overflow-hidden"
            style={{
              height: `min(${
                (typeof activeSnapPoint === "number" ? activeSnapPoint : INITIAL_SNAP) * 100
              }dvh, 100%)`,
            }}
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
              onComposerFocus={() => setActiveSnapPoint(EXPANDED_SNAP)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
