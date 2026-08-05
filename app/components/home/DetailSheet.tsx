"use client";
// 액션 하나 = 드로어 하나.
//
// 경기 하나에 딸린 것들(댓글·참석·라인업·주목 포인트·MOM)을 본문에 다 펼치면
// 게시물 하나가 화면 세 개가 된다. 그렇다고 각자 다른 방식으로 열면 다섯 번 배워야 한다.
// 그래서 여는 방법을 하나로 통일한다 — 액션 줄의 아이콘을 누르면 밑에서 드로어가 올라온다.
//
// 트리거만 밖에서 받고 나머지(제목·스크롤·안전영역)는 여기서 똑같이 처리한다.

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";

export default function DetailSheet({
  title,
  subtitle,
  trigger,
  children,
  className = "",
  contentClassName = "",
  onOpen,
}: {
  title: string;
  subtitle?: string;
  /** 누르면 열리는 요소. 액션 줄 아이콘이나 요약 줄이 들어온다. */
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** 내용 성격에 따라 기본 드로어 높이를 키울 때 쓴다. */
  contentClassName?: string;
  /** 열릴 때 한 번. 내용을 그때 불러오는 드로어가 쓴다. */
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        className={className}
      >
        {trigger}
      </button>

      <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
        <DrawerContent className={`max-h-[88dvh] bg-white dark:bg-[#161618] ${contentClassName}`}>
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-[15px] font-bold text-gray-900 dark:text-white">
              {title}
            </DrawerTitle>
            {subtitle && <p className="mt-0.5 text-[11px] font-bold text-gray-400">{subtitle}</p>}
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
