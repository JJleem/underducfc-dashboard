"use client";
// 그 자리에서 펼치는 토글.
//
// 홈에서 라인업·참석자·공지를 보려고 다른 페이지로 나갔다 돌아오면 뎁스가 한 겹 늘고,
// 돌아왔을 때 스크롤 위치도 잃는다. 그래서 이탈 대신 접었다 편다.
//
// 접혀 있으면 "안에 뭐가 있는지" 모르는 게 문제라, 새 내용이 있으면 점을 찍는다.
// 한 번 펼치면 본 것으로 처리해 점이 사라진다(useUnseen).
//
// 여는 쪽만 클라이언트다. 안에 들어가는 내용은 서버에서 그린 걸 children 으로 받는다.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useUnseen } from "./useUnseen";

// MatchRow 와 같은 스케일을 쓴다. 두 곳의 화살표가 다른 크기면 다른 동작으로 읽힌다.
const CHEVRON = 14;
const STROKE = 2.6;

/**
 * row    — 목록의 한 줄. 눌리는 영역이 화면 끝까지 닿고 화살표는 오른쪽 끝에 붙는다.
 * button — 테두리 있는 버튼. 라벨과 화살표가 가운데 모인다.
 */
type Variant = "row" | "button";

export default function Disclosure({
  summary,
  children,
  className = "",
  variant = "row",
  defaultOpen = false,
  seenKey,
  seenStamp = "",
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
  defaultOpen?: boolean;
  /** 새 내용 점을 쓰려면 식별자와 상태값을 함께 넘긴다. */
  seenKey?: string;
  seenStamp?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [unseen, markSeen] = useUnseen(seenKey ?? "", seenStamp);
  const showDot = !!seenKey && unseen && !open;

  // 누를 수 있다는 신호는 화살표 하나로는 약하다. 누를 때 배경이 깔리고,
  // 열리면 화살표가 뒤집히고 진해진다.
  const shape =
    variant === "row"
      ? "-mx-4 w-[calc(100%+2rem)] px-4 py-1.5 active:bg-gray-50 dark:active:bg-white/[0.03]"
      : "w-full justify-center rounded-xl border border-gray-200 px-4 py-2.5 active:bg-gray-50 dark:border-white/10 dark:active:bg-white/[0.03]";

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (seenKey) markSeen();
        }}
        aria-expanded={open}
        className={`flex items-center gap-1.5 transition-colors ${shape} ${className}`}
      >
        {summary}
        {showDot && (
          <span
            aria-label="새 내용"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF8FA3] dark:bg-[#FFB6C1]"
          />
        )}
        <ChevronDown
          width={CHEVRON}
          height={CHEVRON}
          strokeWidth={STROKE}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-200 ${
            variant === "row" ? "ml-auto" : ""
          } ${open ? "rotate-180 text-gray-500 dark:text-white/50" : "text-gray-300 dark:text-white/25"}`}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
