"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Users, Home, UserRound, Vote, ClipboardList } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { motion } from "motion/react";
import type { MouseEvent } from "react";

type NavKey = "home" | "roster" | "vote" | "stats" | "board" | "my";

const ITEMS = [
  { key: "home" as const, label: "홈", icon: Home, href: "/" },
  { key: "roster" as const, label: "명단", icon: Users, href: "/roster" },
  { key: "vote" as const, label: "투표", icon: Vote, href: "/vote" },
  { key: "board" as const, label: "전술", icon: ClipboardList, href: "/board" },
  { key: "stats" as const, label: "스탯", icon: BarChart3, href: "/stats" },
];

/** 탭 순서(인디케이터 위치 계산용). MY는 항상 마지막. */
const ORDER: NavKey[] = [...ITEMS.map((i) => i.key), "my"];

// ── 인페이지 탭 오버라이드 ──────────────────────────────
// 대시보드의 "경기/스탯"은 URL이 아니라 DashboardClient의 클라이언트 상태다.
// (page.tsx가 ?tab=stats로 초기값만 주고, 이후 탭 전환은 URL을 바꾸지 않는다.)
// 탭바가 레이아웃으로 올라오면서 그 상태를 볼 수 없게 되므로, 페이지가 자기
// 활성 탭을 알려줄 통로를 둔다. 알려주지 않으면 pathname으로만 판단한다.
const NavTabContext = React.createContext<{
  override: NavKey | null;
  setOverride: (key: NavKey | null) => void;
}>({ override: null, setOverride: () => {} });

export function NavTabProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = React.useState<NavKey | null>(null);
  const value = React.useMemo(() => ({ override, setOverride }), [override]);
  return (
    <NavTabContext.Provider value={value}>{children}</NavTabContext.Provider>
  );
}

/**
 * 페이지가 자신의 인페이지 탭을 하단 탭바에 반영시킨다.
 * 언마운트되면 자동 해제돼 다른 라우트의 판단을 방해하지 않는다.
 */
export function useReportNavTab(key: NavKey | null): void {
  const { setOverride } = React.useContext(NavTabContext);
  React.useEffect(() => {
    setOverride(key);
    return () => setOverride(null);
  }, [key, setOverride]);
}

/** 에디터는 전체화면 작업 모드라 탭바를 띄우지 않는다. */
function isFullscreenRoute(pathname: string): boolean {
  return /^\/matches\/[^/]+\/edit\/?$/.test(pathname);
}

function activeFromPath(pathname: string, tab: string | null): NavKey | null {
  // 스탯·전적이 홈 탭에서 독립 페이지로 빠졌다. ?tab=stats 는 기존 홈에만 남아 있다.
  if (pathname.startsWith("/stats") || pathname.startsWith("/record")) return "stats";
  if (pathname === "/") return tab === "stats" ? "stats" : "home";
  if (pathname.startsWith("/roster")) return "roster";
  if (pathname.startsWith("/vote")) return "vote";
  if (pathname.startsWith("/board")) return "board";
  if (pathname.startsWith("/players")) return "my";
  if (pathname.startsWith("/matches")) return "home";
  // /titles, /media 처럼 탭에 대응되지 않는 화면은 아무것도 활성화하지 않는다.
  return null;
}

/**
 * useSearchParams()는 정적 라우트에서 Suspense 경계를 요구한다. fallback이 null이면
 * /titles·/media 같은 정적 페이지에서 탭바가 하이드레이션 후에야 나타나 깜빡인다.
 * 그래서 searchParams가 필요한 부분만 분리하고, fallback은 pathname만으로 같은 탭바를
 * 그린다(?tab을 쓰는 건 "/" 뿐이라 정적 페이지에서는 결과가 동일하다).
 */
export function AppBottomNavFallback() {
  const pathname = usePathname();
  if (isFullscreenRoute(pathname)) return null;
  return <NavBar active={activeFromPath(pathname, null)} />;
}

export default function AppBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { override } = React.useContext(NavTabContext);
  if (isFullscreenRoute(pathname)) return null;
  return (
    <NavBar active={override ?? activeFromPath(pathname, searchParams.get("tab"))} />
  );
}

function NavBar({ active }: { active: NavKey | null }) {
  const { data: session } = useSession();
  const currentUserName = session?.user?.name?.trim() || null;

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, key: NavKey) => {
    if (key !== "home" || active !== "home") return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigator.vibrate?.(8);
  };

  const selectedIndex = active ? ORDER.indexOf(active) : -1;

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-gray-200/80 bg-white/92 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#101013]/92 dark:shadow-[0_-12px_30px_rgba(0,0,0,0.3)]"
    >
      <div className="relative grid grid-cols-6">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/6 px-1"
          animate={{
            x: `${Math.max(0, selectedIndex) * 100}%`,
            opacity: selectedIndex < 0 ? 0 : 1,
          }}
          transition={{ type: "spring", stiffness: 430, damping: 34, mass: 0.72 }}
        >
          <div className="mx-auto mt-1 h-8 w-11 rounded-[14px] bg-[#FF8FA3]/11 ring-1 ring-[#FF8FA3]/10 dark:bg-[#FFB6C1]/10 dark:ring-[#FFB6C1]/10" />
        </motion.div>
        {ITEMS.map(({ key, label, icon: Icon, href }) => {
          const selected = active === key;
          return (
            <Link
              key={key}
              href={href}
              onClick={(event) => handleNavClick(event, key)}
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
            href={`/players/${encodeURIComponent(currentUserName)}`}
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
