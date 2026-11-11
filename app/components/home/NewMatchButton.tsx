"use client";
// 관리자 — 경기 등록 버튼. 폼 자체는 MatchEditor 가 create 모드로 그린다.

import { useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import dynamic from "next/dynamic";

// 경기 편집기는 운영진이 눌렀을 때만 필요하다(달력 포함).
const MatchEditor = dynamic(() => import("./MatchEditor"), { ssr: false });

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
            ? "press-icon touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ud-primary)] text-white shadow-sm active:opacity-70 dark:bg-[var(--ud-primary)]"
            : "flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-dashed border-gray-300 py-3 text-[12px] font-black text-gray-400 active:opacity-60 dark:border-white/15 dark:text-white/50"
        }
      >
        {variant === "header" ? (
          <CalendarPlus width={16} height={16} strokeWidth={2} />
        ) : (
          <>
            <Plus width={16} height={16} strokeWidth={2} />
            경기 등록
          </>
        )}
      </button>
      {open && <MatchEditor mode="create" roster={roster} onClose={() => setOpen(false)} />}
    </>
  );
}
