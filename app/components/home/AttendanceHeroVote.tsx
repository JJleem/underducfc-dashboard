"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type AttendanceResponse = "참석" | "미정" | "불참";

export default function AttendanceHeroVote({
  matchId,
  userName,
  initialResponse,
  preview = false,
  previewNextHref,
  className = "mt-5",
}: {
  matchId: number;
  userName?: string;
  initialResponse?: string;
  preview?: boolean;
  previewNextHref?: string;
  className?: string;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState(initialResponse || "");
  const [submitting, setSubmitting] = useState<AttendanceResponse | null>(null);
  const [saved, setSaved] = useState<AttendanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (response: AttendanceResponse) => {
    if (submitting) return;
    if (!userName && !preview) {
      router.push("/vote");
      return;
    }

    const before = current;
    setCurrent(response);
    setSubmitting(response);
    setSaved(null);
    setError(null);

    if (preview) {
      setSubmitting(null);
      setSaved(response);
      window.setTimeout(() => {
        if (previewNextHref) {
          router.replace(`${previewNextHref}&vote=${encodeURIComponent(response)}`);
        } else {
          setSaved(null);
        }
      }, 1200);
      return;
    }

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, response }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "출석 투표 저장에 실패했어요.");

      setSaved(response);
      window.setTimeout(() => {
        router.refresh();
        // 캐시나 네트워크 문제로 상태 전환이 늦어져도 성공 화면에 갇히지 않는다.
        window.setTimeout(() => setSaved(null), 1600);
      }, 1200);
    } catch (cause) {
      setCurrent(before);
      setError(cause instanceof Error ? cause.message : "출석 투표 저장에 실패했어요.");
    } finally {
      setSubmitting(null);
    }
  };

  const statusIcon = (response: AttendanceResponse) => {
    if (submitting === response) return <Loader2 width={14} height={14} className="animate-spin" />;
    if (saved === response || current === response) return <Check width={14} height={14} strokeWidth={3} />;
    return null;
  };

  return (
    <div className={className} aria-busy={!!submitting}>
      <AnimatePresence>
        {saved && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.99 }}
            transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -inset-x-4 -bottom-1 -top-5 z-20 flex flex-col items-center justify-center bg-gray-50 text-center dark:bg-[#09090b]"
          >
            <motion.span
              initial={reduceMotion ? false : { scale: 0.72, rotate: -7 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF8FA3]/12 text-[#FF718B] dark:bg-[#FFB6C1]/10 dark:text-[#FFB6C1]"
            >
              <Check width={24} height={24} strokeWidth={3} />
            </motion.span>
            <p className="mt-3 text-[22px] font-black tracking-[-0.035em] text-gray-900 dark:text-white">
              투표 감사합니다!
            </p>
            <p className="mt-1 text-[11px] font-bold text-gray-500 dark:text-white/50">
              {saved}으로 답했어요
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => submit("참석")}
        disabled={!!submitting || !!saved}
        className={`press-cta flex w-full items-center justify-center gap-1.5 rounded-2xl py-3.5 text-[13px] font-black transition-colors disabled:cursor-wait ${
          current === "참석"
            ? "bg-[#F56F88] text-white"
            : "bg-[#FF8FA3] text-white active:bg-[#F97E95]"
        }`}
      >
        {statusIcon("참석")}
        참석할게요
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => submit("미정")}
          disabled={!!submitting || !!saved}
          className={`press-cta flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-black transition-colors disabled:cursor-wait ${
            current === "미정"
              ? "border-amber-400 bg-amber-400 text-white"
              : "border-amber-300/70 bg-white text-amber-500 active:bg-amber-50 dark:border-amber-300/35 dark:bg-transparent dark:text-amber-300 dark:active:bg-amber-300/10"
          }`}
        >
          {statusIcon("미정")}
          아직 미정
        </button>
        <button
          type="button"
          onClick={() => submit("불참")}
          disabled={!!submitting || !!saved}
          className={`press-cta flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-black transition-colors disabled:cursor-wait ${
            current === "불참"
              ? "border-gray-700 bg-gray-700 text-white dark:border-white/70 dark:bg-white/70 dark:text-gray-900"
              : "border-gray-200 bg-white text-gray-500 active:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white/50 dark:active:bg-white/5"
          }`}
        >
          {statusIcon("불참")}
          못 나가요
        </button>
      </div>

      <p aria-live="polite" className={`mt-2 min-h-4 text-center text-[10px] font-bold ${error ? "text-red-500" : "text-gray-400 dark:text-white/35"}`}>
        {error ||
          (saved
            ? preview
              ? `${saved} 선택 미리보기`
              : `${saved}으로 저장했어요`
            : preview
              ? "미리보기 · 실제 투표는 저장되지 않아요"
              : "누르면 바로 저장돼요")}
      </p>
    </div>
  );
}
