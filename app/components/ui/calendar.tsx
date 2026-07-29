"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";

/**
 * react-day-picker v9 기준.
 *
 * ⚠️ v8 키 이름(caption / table / head_row / head_cell / row / cell / day /
 *    day_selected / day_today / nav_button …)은 v9의 DeprecatedUI 타입에 그대로
 *    남아있어서 **넘겨도 타입 에러가 안 나고 조용히 무시된다.** 빌드는 통과하는데
 *    스타일만 사라지므로 반드시 아래 v9 키만 쓸 것.
 *
 * v9 구조상 유의점 두 가지:
 *  1) modifier 클래스(selected/today/outside/disabled)가 버튼이 아니라 셀(td)에 붙는다.
 *     이 앱 디자인은 분홍 알약이 버튼에 있으므로 [&>button] 로 내려보내 모양을 유지한다.
 *  2) Nav 가 month_caption 안이 아니라 Months 직속 형제로 렌더된다. 그래서 nav 를
 *     상단에 absolute 오버레이로 깔아 "가운데 캡션 + 좌우 화살표" 배치를 유지한다.
 *
 * 대시보드의 날짜 선택 3곳(매치 수정 / 공지 수정 / 매치 추가)이 모두 똑같은 테마를
 * 넘기고 있었어서, 그 테마를 여기 기본값으로 올렸다. classNames 를 넘기면 키 단위로
 * 계속 덮어쓸 수 있다.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "w-full rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5",
        className,
      )}
      classNames={{
        months: "relative w-full",
        month: "w-full space-y-2",
        nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between",
        button_previous:
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-white/10",
        button_next:
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-white/10",
        month_caption: "mb-1 flex h-7 items-center justify-center",
        caption_label: "text-[13px] font-black text-gray-800 dark:text-white",
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full",
        weekday:
          "flex-1 pb-1 text-center text-[11px] font-black text-gray-400 dark:text-gray-500",
        week: "mt-0.5 flex w-full",
        day: "flex-1 p-0.5",
        day_button:
          "h-9 w-full rounded-xl text-[12px] font-bold text-gray-800 transition-colors hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-white/10",
        selected:
          "[&>button]:!bg-[#FF8FA3] [&>button]:!text-white [&>button]:font-black dark:[&>button]:!bg-[#FFB6C1] dark:[&>button]:!text-black",
        today:
          "[&>button]:border-2 [&>button]:border-[#FF8FA3] [&>button]:font-black [&>button]:text-[#FF8FA3] dark:[&>button]:border-[#FFB6C1] dark:[&>button]:text-[#FFB6C1]",
        outside:
          "[&>button]:text-gray-300 [&>button]:opacity-50 dark:[&>button]:text-gray-700",
        disabled: "[&>button]:text-gray-200 dark:[&>button]:text-gray-800",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        // v9는 IconLeft/IconRight 대신 orientation 을 받는 Chevron 하나를 쓴다.
        // size/disabled 는 svg 속성이 아니라 lucide 로 넘기지 않는다.
        Chevron: ({ orientation, className: chevronClassName }) =>
          orientation === "right" ? (
            <ChevronRight className={cn("size-4", chevronClassName)} />
          ) : (
            <ChevronLeft className={cn("size-4", chevronClassName)} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
