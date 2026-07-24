"use client";

import Link from "next/link";
import { BarChart3, Users, Home, UserRound, Vote, Youtube } from "lucide-react";
import { signIn } from "next-auth/react";
import { motion } from "motion/react";

type NavKey = "home" | "roster" | "vote" | "stats" | "board" | "my";

export default function AppBottomNav({
  active,
  currentUserName,
}: {
  active: NavKey;
  currentUserName?: string | null;
}) {
  const items = [
    { key: "home" as const, label: "홈", icon: Home, href: "/" },
    { key: "roster" as const, label: "명단", icon: Users, href: "/roster" },
    { key: "vote" as const, label: "투표", icon: Vote, href: "/vote" },
    { key: "board" as const, label: "전술", icon: Youtube, href: "/board" },
    { key: "stats" as const, label: "스탯", icon: BarChart3, href: "/?tab=stats" },
  ];
  const selectedIndex = Math.max(
    0,
    [...items.map((item) => item.key), "my" as const].indexOf(active),
  );

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-gray-200/80 bg-white/92 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#101013]/92 dark:shadow-[0_-12px_30px_rgba(0,0,0,0.3)]"
    >
      <div className="relative grid grid-cols-6">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/6 px-1"
          animate={{ x: `${selectedIndex * 100}%` }}
          transition={{ type: "spring", stiffness: 430, damping: 34, mass: 0.72 }}
        >
          <div className="mx-auto mt-1 h-8 w-11 rounded-[14px] bg-[#FF8FA3]/11 ring-1 ring-[#FF8FA3]/10 dark:bg-[#FFB6C1]/10 dark:ring-[#FFB6C1]/10" />
        </motion.div>
        {items.map(({ key, label, icon: Icon, href }) => {
          const selected = active === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={`relative z-10 flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-extrabold transition-colors ${
                selected
                  ? "text-[#FF8FA3] dark:text-[#FFB6C1]"
                  : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
              }`}
            >
              <motion.span
                className="rounded-xl p-1.5"
                animate={{ scale: selected ? 1.07 : 1, y: selected ? -1 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={selected ? 2.6 : 2} />
              </motion.span>
              {label}
            </Link>
          );
        })}

        {currentUserName ? (
          <Link
            href={`/players/${encodeURIComponent(currentUserName.trim())}`}
            aria-current={active === "my" ? "page" : undefined}
            className={`relative z-10 flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-extrabold transition-colors ${
              active === "my"
                ? "text-[#FF8FA3] dark:text-[#FFB6C1]"
                : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
            }`}
          >
            <motion.span
              className="rounded-xl p-1.5"
              animate={{ scale: active === "my" ? 1.07 : 1, y: active === "my" ? -1 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
            >
              <UserRound className="h-[19px] w-[19px]" strokeWidth={active === "my" ? 2.6 : 2} />
            </motion.span>
            MY
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => signIn("kakao")}
            className="relative z-10 flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-extrabold text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
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
