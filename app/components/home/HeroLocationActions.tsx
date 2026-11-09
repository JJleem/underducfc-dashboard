"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, MapPin, Navigation } from "lucide-react";
import { isUndecided } from "../../lib/home-state";

type CopyState = "idle" | "copied" | "failed";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  // 구형 iOS 웹뷰처럼 Clipboard API가 없는 환경을 위한 대체 처리.
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

export default function HeroLocationActions({
  location,
  matchId,
  className = "mt-1",
}: {
  location: string;
  matchId: number;
  className?: string;
}) {
  const unknown = isUndecided(location);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  const handleCopy = async () => {
    try {
      await copyText(location);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopyState("idle"), 1600);
  };

  return (
    <div className={`flex min-w-0 items-center justify-between gap-2 ${className}`}>
      <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-white/50">
        <MapPin width={16} height={16} strokeWidth={2} className="shrink-0" />
        <span className="min-w-0 truncate">{unknown ? "장소 미정" : location}</span>
        {!unknown && (
          <>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={`${location} 복사`}
              className={`press-cta flex h-7 w-15 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-1 text-[11px] font-black transition-colors ${
                copyState === "copied"
                  ? "border-[var(--ud-primary)]/35 bg-[var(--ud-primary)]/12 text-[var(--ud-primary-strong)] dark:border-[var(--ud-primary)]/25 dark:bg-[var(--ud-primary)]/12 dark:text-[var(--ud-primary)]"
                  : copyState === "failed"
                    ? "border-red-500/25 bg-red-500/10 text-red-500"
                    : "border-gray-200 bg-black/[0.04] text-gray-400 active:border-[var(--ud-primary)]/30 active:bg-[var(--ud-primary)]/10 active:text-[var(--ud-primary-strong)] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/55"
              }`}
            >
              {copyState === "copied" ? (
                <Check width={12} height={12} strokeWidth={2} className="shrink-0" />
              ) : (
                <Copy width={12} height={12} strokeWidth={2} className="shrink-0" />
              )}
              <span aria-live="polite">
                {copyState === "copied" ? "복사됨" : copyState === "failed" ? "실패" : "복사"}
              </span>
            </button>

            <a
              href={`https://map.kakao.com/link/search/${encodeURIComponent(location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="press-cta flex h-7 w-15 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-[var(--ud-primary)]/35 bg-[var(--ud-primary)]/[0.07] px-1.5 text-[11px] font-black text-[var(--ud-primary-strong)] dark:border-[var(--ud-primary)]/25 dark:bg-[var(--ud-primary)]/[0.08] dark:text-[var(--ud-primary)]"
            >
              <Navigation width={12} height={12} strokeWidth={2} className="shrink-0" />
              길찾기
            </a>
          </>
        )}
      </div>

      {unknown && (
        <Link
          href={`/matches/${matchId}`}
          className="press-cta shrink-0 whitespace-nowrap rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] font-black text-gray-600 dark:bg-white/[0.08] dark:text-white/65"
        >
          장소 확인
        </Link>
      )}
    </div>
  );
}
