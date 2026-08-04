"use client";
// 선수 프로필 하단 탭 바 — 레퍼런스(인스타 프로필)의 게시물/릴스/태그됨 자리.
//
// 나눔 기준은 피드 / 숫자 / 사람이다.
//   경기 = 사진 그리드(기본. 인스타의 "게시물" 자리라 프로필로 읽히려면 여기가 먼저다)
//   기록 = 시즌 베스트 경기 · 포지션 출전 · 출석률
//   케미 = 최고의 듀오 · 함께 뛴 동료 · 도움 주고받은 선수
//
// 안 보이는 탭도 DOM 에 남기고 display:none 으로만 감춘다. 그래야 경기 그리드가
// 몇 장까지 펼쳐졌는지(점진 렌더 상태)가 탭을 오갈 때 초기화되지 않고,
// 동시에 숨은 동안엔 lazy 이미지가 받아지지 않아 낭비도 없다.

import { useState } from "react";
import { ChartColumnBig, Grid3x3, UsersRound } from "lucide-react";

const TABS = [
  { key: "feed", label: "경기", Icon: Grid3x3 },
  { key: "stats", label: "스탯", Icon: ChartColumnBig },
  { key: "chem", label: "케미", Icon: UsersRound },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ProfileTabs({
  feed,
  stats,
  chemistry,
}: {
  feed: React.ReactNode;
  stats: React.ReactNode;
  chemistry: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("feed");
  const panes: Record<TabKey, React.ReactNode> = { feed, stats, chem: chemistry };

  return (
    <div className="mt-5">
      <div
        role="tablist"
        className="grid grid-cols-3 border-y border-gray-200/70 dark:border-white/[0.08]"
      >
        {TABS.map(({ key, label, Icon }) => {
          const on = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={label}
              onClick={() => setTab(key)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-black transition-colors ${
                on
                  ? "text-[#FF8FA3] dark:text-[#FFB6C1]"
                  : "text-gray-300 dark:text-white/25"
              }`}
            >
              <Icon width={19} height={19} strokeWidth={on ? 2.4 : 2} />
              <span>{label}</span>
              {on && (
                <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-8 rounded-full bg-[#FF8FA3] dark:bg-[#FFB6C1]" />
              )}
            </button>
          );
        })}
      </div>

      {TABS.map(({ key }) => (
        <div
          key={key}
          role="tabpanel"
          hidden={tab !== key}
          className={key === "feed" ? "pt-0" : "pt-5"}
        >
          {panes[key]}
        </div>
      ))}
    </div>
  );
}
