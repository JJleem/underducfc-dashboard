"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, Home, UserRound, Vote, Youtube } from "lucide-react";
import { signIn } from "next-auth/react";

type NavKey = "home" | "matches" | "vote" | "stats" | "board" | "my";

export default function AppBottomNav({
  active,
  currentUserName,
}: {
  active: NavKey;
  currentUserName?: string | null;
}) {
  const items = [
    { key: "home" as const, label: "홈", icon: Home, href: "/" },
    { key: "matches" as const, label: "경기", icon: CalendarDays, href: "/?tab=matches#match-list" },
    { key: "vote" as const, label: "투표", icon: Vote, href: "/vote" },
    { key: "board" as const, label: "전술", icon: Youtube, href: "/board" },
    { key: "stats" as const, label: "스탯", icon: BarChart3, href: "/?tab=stats" },
  ];

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-gray-200/80 bg-white/92 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#101013]/92 dark:shadow-[0_-12px_30px_rgba(0,0,0,0.3)]"
    >
      <div className="grid grid-cols-6">
        {items.map(({ key, label, icon: Icon, href }) => {
          const selected = active === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black transition-colors ${
                selected
                  ? "text-[#FF8FA3] dark:text-[#FFB6C1]"
                  : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
              }`}
            >
              <span className={`rounded-xl p-1.5 ${selected ? "bg-[#FF8FA3]/10 dark:bg-[#FFB6C1]/10" : ""}`}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={selected ? 2.6 : 2} />
              </span>
              {label}
            </Link>
          );
        })}

        {currentUserName ? (
          <Link
            href={`/players/${encodeURIComponent(currentUserName.trim())}`}
            aria-current={active === "my" ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black transition-colors ${
              active === "my"
                ? "text-[#FF8FA3] dark:text-[#FFB6C1]"
                : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
            }`}
          >
            <span className={`rounded-xl p-1.5 ${active === "my" ? "bg-[#FF8FA3]/10 dark:bg-[#FFB6C1]/10" : ""}`}>
              <UserRound className="h-[18px] w-[18px]" strokeWidth={active === "my" ? 2.6 : 2} />
            </span>
            MY
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => signIn("kakao")}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
          >
            <span className="rounded-xl p-1.5">
              <UserRound className="h-[18px] w-[18px]" />
            </span>
            MY
          </button>
        )}
      </div>
    </nav>
  );
}
