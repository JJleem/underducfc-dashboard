"use client";
// 홈 → 사랑방 진입점. 공지 줄 바로 아래 한 줄.
//
// 카드로 만들지 않는다(규칙 03). 사랑방은 매일 들르는 곳이 아니라 "할 말 생겼을 때"
// 오는 곳이라, 홈에서는 한 줄로 존재만 알리면 된다.

import Link from "next/link";
import { ChevronRight, MessageSquareHeart } from "lucide-react";
import { useUnseen } from "./useUnseen";

export default function LoungeEntry({
  stamp,
  withTopBorder,
}: {
  /** 새 글 표시의 근거. 빈 문자열이면 점을 찍지 않는다(목록을 못 읽어온 경우). */
  stamp: string;
  /** 공지가 없어서 위쪽 경계선이 비는 경우에만 켠다. */
  withTopBorder: boolean;
}) {
  const [unseen, markSeen] = useUnseen("lounge", stamp);

  return (
    <Link
      href="/lounge"
      onClick={markSeen}
      className={`mx-4 flex items-center gap-2 border-b border-gray-200 py-3 active:opacity-70 dark:border-white/[0.08] ${
        withTopBorder ? "mt-3 border-t" : ""
      }`}
    >
      <MessageSquareHeart
        width={14}
        height={14}
        strokeWidth={2.2}
        className="shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1]"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[11.5px] font-black">언더덕 사랑방</span>
          {unseen && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF5F7E]" />}
        </span>
        <span className="mt-0.5 block text-[9.5px] font-bold text-gray-400 dark:text-white/30">
          하고 싶은 말 남기기 · 이름은 공개되지 않아요
        </span>
      </span>
      <ChevronRight width={14} height={14} strokeWidth={2.4} className="shrink-0 text-gray-300 dark:text-white/20" />
    </Link>
  );
}
