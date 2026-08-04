"use client";
// 새 홈의 상단 바.
//
// 기존 홈의 헤더는 DashboardClient(3,400줄) 안에 그 컴포넌트의 상태와 엉켜 있다.
// 되돌릴 수 있어야 하는 게 이번 작업의 조건이라 그쪽은 건드리지 않고 같은 모양을
// 여기 따로 세웠다. 두 홈 중 하나가 정리되면 한쪽을 지우면 된다.

import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";
import { signIn, signOut, useSession } from "next-auth/react";
import { ChevronDown, LogIn, LogOut, Moon, Sun, Trophy, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import NewMatchButton from "./NewMatchButton";

export default function AppHeader({ newMatchRoster }: { newMatchRoster?: string[] }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = session?.user;
  const name = user?.name?.trim() || "";

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/70 bg-white/70 px-5 safe-header-py-35 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#09090b]/70">
      <span className="flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-tight text-gray-900 dark:text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-[#FF8FA3]" />
        UNDERDUCK
      </span>

      <div className="flex items-center gap-2">
        {newMatchRoster && <NewMatchButton roster={newMatchRoster} variant="header" />}

        <Link
          href="/titles"
          prefetch={false}
          aria-label="칭호 도감"
          className="press-icon flex h-8 w-8 items-center justify-center rounded-full bg-[#FF8FA3]/10 text-[#FF8FA3] dark:bg-[#FFB6C1]/10 dark:text-[#FFB6C1]"
        >
          <Trophy className="h-4 w-4" />
        </Link>

        {user ? (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`flex h-8 items-center gap-1.5 rounded-full pl-1 pr-2 outline-none transition-all ${
                  menuOpen
                    ? "bg-gray-200 ring-2 ring-[#FF8FA3]/20 dark:bg-white/15"
                    : "bg-gray-100 dark:bg-white/10"
                }`}
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF8FA3] text-[10px] font-bold text-white">
                    {name.slice(0, 1) || "U"}
                  </span>
                )}
                <span className="max-w-[64px] truncate text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {name || "회원"}
                </span>
                <ChevronDown
                  className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-44 rounded-2xl border-gray-200/80 bg-white/95 p-1.5 backdrop-blur-xl dark:border-white/10 dark:bg-[#17171a]/95"
            >
              <DropdownMenuLabel className="px-2.5 py-2 font-normal">
                <p className="text-[10px] font-bold text-gray-400">로그인 계정</p>
                <p className="mt-0.5 truncate text-xs font-extrabold text-gray-800 dark:text-gray-100">
                  {name || "회원"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/[0.07]" />
              <DropdownMenuItem
                asChild
                className="rounded-xl px-2.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200"
              >
                <Link href={`/players/${encodeURIComponent(name)}`}>
                  <User className="h-4 w-4 !text-[#FF8FA3]" />
                  마이페이지
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => signOut()}
                className="rounded-xl px-2.5 py-2 text-xs font-bold"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            type="button"
            onClick={() => signIn("kakao")}
            className="flex h-8 items-center gap-1.5 rounded-full bg-[#FEE500] px-3 text-xs font-bold text-black"
          >
            <LogIn className="h-3.5 w-3.5" />
            카카오 로그인
          </button>
        )}

        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="테마 전환"
          className="press-icon flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10"
        >
          <Moon className="block h-4 w-4 text-gray-700 dark:hidden" />
          <Sun className="hidden h-4 w-4 text-[#FFB6C1] dark:block" />
        </button>
      </div>
    </header>
  );
}
