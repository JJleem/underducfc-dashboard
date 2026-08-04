"use client";
// 관리자 — 경기 등록 버튼. 폼 자체는 MatchEditor 가 create 모드로 그린다.

import { useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import MatchEditor from "./MatchEditor";

export default function NewMatchButton({
  roster,
  variant = "feed",
}: {
  roster: string[];
  variant?: "feed" | "header";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="경기 등록"
        title="경기 등록"
        className={
          variant === "header"
            ? "press-icon flex h-8 w-8 items-center justify-center rounded-full bg-[#FF8FA3] text-white shadow-sm active:opacity-70 dark:bg-[#FF8FA3]"
            : "flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-3 text-[12px] font-black text-gray-400 active:opacity-60 dark:border-white/15 dark:text-white/35"
        }
      >
        {variant === "header" ? (
          <CalendarPlus width={16} height={16} strokeWidth={2.4} />
        ) : (
          <>
            <Plus width={15} height={15} strokeWidth={2.6} />
            경기 등록
          </>
        )}
      </button>
      {open && <MatchEditor mode="create" roster={roster} onClose={() => setOpen(false)} />}
    </>
  );
}
