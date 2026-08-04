import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

// 피드 안에서 상세 드로어로 이어지는 요약 정보는 모두 같은 문법을 쓴다.
// 장식 없이 라벨 / 내용 / 개수의 세 축만 고정한다.
export const FEED_SUMMARY_ROW =
  "flex min-h-10 w-full items-center gap-2 overflow-hidden py-2 text-left transition-colors active:bg-[#FF8FA3]/[0.06] dark:active:bg-[#FFB6C1]/[0.04]";

export function FeedSummaryLabel({ children }: { children: ReactNode }) {
  return (
    <span className="w-[68px] shrink-0 text-[12px] font-black text-[#FF718B] dark:text-[#FFB6C1]">
      {children}
    </span>
  );
}

export function FeedSummaryEnd({ label }: { label?: string }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      {label && (
        <span className="text-[12px] font-bold tabular-nums text-gray-500 dark:text-white/50">
          {label}
        </span>
      )}
      <ChevronRight
        width={15}
        height={15}
        strokeWidth={2.4}
        aria-hidden="true"
        className="shrink-0 text-[#FF8FA3]/70 dark:text-[#FFB6C1]/65"
      />
    </span>
  );
}
