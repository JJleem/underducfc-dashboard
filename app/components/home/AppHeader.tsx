"use client";
// 새 홈의 상단 바.
//
// 기존 홈의 헤더는 DashboardClient(3,400줄) 안에 그 컴포넌트의 상태와 엉켜 있다.
// 되돌릴 수 있어야 하는 게 이번 작업의 조건이라 그쪽은 건드리지 않고 같은 모양을
// 여기 따로 세웠다. 두 홈 중 하나가 정리되면 한쪽을 지우면 된다.

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { signIn, signOut, useSession } from "next-auth/react";
import { ChevronDown, Images, LogIn, LogOut, Moon, Sun, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import NewMatchButton from "./NewMatchButton";
import { MATCHDAY_GALLERY_SEEN_KEY } from "../../lib/matchday-gallery";
import { openingCountdown, seasonAccent, seasonLabel } from "../../lib/seasons";

/**
 * 로고 옆 시즌 표기. "25-26" 에서 **뒷자리만** 그 시즌 대표색으로 칠한다
 * (26-27 이면 27 이 로즈). 시즌이 바뀐 걸 색으로 먼저 알아챈다.
 *
 * 테마별 색은 CSS 변수로 넘긴다 — useTheme 로 고르면 서버 렌더에서 값이 없어
 * 하이드레이션이 어긋난다. [[globals.css]] 의 .season-scope 참고.
 */
function SeasonMark({ id }: { id: string }) {
  const accent = seasonAccent(id);
  // "25-26" → 앞 "25", 뒤 "26". 형식이 달라지면 통째로 한 색으로 칠한다.
  const [head, tail] = seasonLabel(id).split("-");
  return (
    <span
      className="season-scope ml-0.5 text-[11px] font-black tabular-nums tracking-tight text-gray-400 dark:text-white/50"
      style={{ "--season-light": accent.light, "--season-dark": accent.dark } as CSSProperties}
    >
      {tail ? (
        <>
          {head}-<span className="season-accent">{tail}</span>
        </>
      ) : (
        <span className="season-accent">{head}</span>
      )}
    </span>
  );
}

/**
 * 다음 시즌 개막 카운트다운. 개막 한 달 전부터 전날까지만 뜬다(openingCountdown).
 * 색은 **다음 시즌** 대표색 — 곧 바뀔 색을 미리 보여 준다. 헤더 폭 때문에 글자는 "D-9" 뿐이고 시즌 표기 위에 뜬다.
 */
function OpeningCountdown() {
  const next = openingCountdown();
  if (!next) return null;
  const accent = seasonAccent(next.seasonId);
  return (
    <span
      className="season-scope absolute -right-1 -top-3 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-black normal-case leading-none tabular-nums text-white shadow-sm"
      style={
        {
          "--season-light": accent.light,
          "--season-dark": accent.dark,
          background: "var(--season)",
        } as CSSProperties
      }
      aria-label={`${next.label} 시즌 개막까지 ${next.days}일`}
      title={`${next.label} 시즌 개막까지 ${next.days}일`}
      // 자정 전후로 서버·브라우저 날짜가 하루 어긋날 수 있다. 한 글자 차이라 경고만 끈다.
      suppressHydrationWarning
    >
      {/* 360px 폰에서 헤더에 남는 폭이 0 이라, 갤러리 NEW 뱃지처럼 시즌 표기 위에 띄운다
          (레이아웃 폭을 안 먹는다). 어느 시즌 개막인지는 뱃지 색과 aria-label 이 말한다. */}
      D-{next.days}
    </span>
  );
}

export default function AppHeader({
  seasonId,
  newMatchRoster,
}: {
  /** 로고 옆에 찍을 시즌. 오늘이 속한 시즌. */
  seasonId: string;
  newMatchRoster?: string[];
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGalleryNew, setShowGalleryNew] = useState(false);
  const user = session?.user;
  const name = user?.name?.trim() || "";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowGalleryNew(localStorage.getItem(MATCHDAY_GALLERY_SEEN_KEY) !== "1");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-1 border-b border-gray-200/70 bg-white px-4 safe-header-py-35 dark:border-white/[0.06] dark:bg-background">
      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[15px] min-[360px]:gap-1.5 font-extrabold uppercase tracking-tight text-gray-900 dark:text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--ud-primary)]" />
        UNDERDUCK
        <span className="relative">
          <SeasonMark id={seasonId} />
          <OpeningCountdown />
        </span>
      </span>

      {/* 320px 에서도 버튼 넷(관리자)이 다 들어가야 한다. 좁으면 이름·화살표부터 접는다.
          이름은 관리자(버튼 하나 더)면 420, 아니면 390 부터 낸다. 이름은 메뉴 안에도 있다. */}
      <div className="flex shrink-0 items-center gap-1 min-[360px]:gap-1.5">
        {newMatchRoster && <NewMatchButton roster={newMatchRoster} variant="header" />}

        <Link
          href="/matchday-gallery"
          prefetch={false}
          aria-label="매치데이 아카이브"
          onClick={() => {
            localStorage.setItem(MATCHDAY_GALLERY_SEEN_KEY, "1");
            setShowGalleryNew(false);
          }}
          className="press-icon touch-target relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ud-primary)]/10 text-[var(--ud-primary)] dark:bg-[var(--ud-primary)]/10 dark:text-[var(--ud-primary)]"
        >
          <Images width={16} height={16} strokeWidth={2} />
          {showGalleryNew && (
            <span className="absolute -right-2 -top-2 whitespace-nowrap rounded-full bg-[#FF5F7E] px-1.5 py-0.5 text-[11px] font-black leading-none text-white shadow-sm">
              NEW
            </span>
          )}
        </Link>

        {user ? (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${name || "회원"} 계정 메뉴`}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full pl-1 pr-1 outline-none transition min-[360px]:pr-2 ${
                  menuOpen
                    ? "bg-gray-200 ring-2 ring-[var(--ud-primary)]/20 dark:bg-white/15"
                    : "bg-gray-100 dark:bg-white/10"
                }`}
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" decoding="async" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ud-primary)] text-[11px] font-bold text-white">
                    {name.slice(0, 1) || "U"}
                  </span>
                )}
                <span
                  className={`hidden max-w-16 truncate text-xs font-semibold text-gray-700 dark:text-gray-200 ${
                    newMatchRoster ? "min-[420px]:inline" : "min-[390px]:inline"
                  }`}
                >
                  {name || "회원"}
                </span>
                <ChevronDown
                  width={12}
                  height={12}
                  strokeWidth={2}
                  className={`hidden shrink-0 text-gray-400 transition-transform duration-200 ease-out min-[360px]:block ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-44 rounded-2xl border-gray-200/80 bg-white/95 p-1.5 backdrop-blur-xl dark:border-white/10 dark:bg-[#17171a]/95"
            >
              <DropdownMenuLabel className="px-2.5 py-2 font-normal">
                <p className="text-[11px] font-bold text-gray-400">로그인 계정</p>
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
                  <User width={16} height={16} strokeWidth={2} className="!text-[var(--ud-primary)]" />
                  마이페이지
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  // 서비스워커가 저장해 둔 홈 화면(팀 데이터)을 로그아웃한 기기에 남기지 않는다.
                  await globalThis.caches?.delete("udk-home-v1").catch(() => {});
                  signOut();
                }}
                className="rounded-xl px-2.5 py-2 text-xs font-bold"
              >
                <LogOut width={16} height={16} strokeWidth={2} />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            type="button"
            onClick={() => signIn("kakao")}
            aria-label="카카오 로그인"
            className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#FEE500] px-3 text-xs font-bold text-black"
          >
            <LogIn width={16} height={16} strokeWidth={2} className="hidden shrink-0 min-[360px]:block" />
            <span className="hidden min-[390px]:inline">카카오 </span>로그인
          </button>
        )}

        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="테마 전환"
          className="press-icon touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10"
        >
          <Moon width={16} height={16} strokeWidth={2} className="block text-gray-700 dark:hidden" />
          <Sun width={16} height={16} strokeWidth={2} className="hidden text-[var(--ud-primary)] dark:block" />
        </button>
      </div>
    </header>
  );
}
