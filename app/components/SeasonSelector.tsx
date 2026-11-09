"use client";

// 시즌 선택 드롭다운. /stats · /record · /players/[name] 가 같은 걸 쓴다.
//
// 선택은 URL 쿼리(?season=)로 나간다 — 주소가 남아야 공유도 뒤로가기도 된다.
// (컴포넌트 상태로 들고 있으면 지난 시즌을 보다 새로고침하면 현재 시즌으로 튄다)
//
// 색은 **선택한 시즌의 대표색**을 쓴다. 시즌마다 다른 핑크라, 지금 어느 시즌을
// 보고 있는지 라벨을 안 읽어도 알게 된다. [[seasons]] 의 SeasonAccent 참고.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ALL_SEASONS, SEASONS, currentSeasonId, seasonAccent, seasonLabel, seasonStatus } from "../lib/seasons";

export default function SeasonSelector({
  current,
  /** 경기가 하나라도 있는 시즌 id. 여기 없는 시즌은 "기록 없음"으로 흐리게 보인다. */
  withMatches,
  /**
   * "전체" 항목을 넣는다. 홈 피드처럼 기본이 전체인 화면이 켠다.
   * 이때 current 에 "all" 을 넘기면 전체가 선택된 상태다.
   */
  allowAll = false,
}: {
  current: string;
  withMatches?: string[];
  allowAll?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { resolvedTheme } = useTheme();

  const isLight = resolvedTheme !== "dark";
  const accentOf = (id: string) => {
    const a = seasonAccent(id);
    return isLight ? a.light : a.dark;
  };
  const isAll = current === ALL_SEASONS;
  // 전체는 특정 시즌색이 없다 — 팀 핑크로 중립을 준다.
  const accent = isAll ? (isLight ? "var(--ud-primary)" : "var(--ud-primary)") : accentOf(current);
  const played = new Set(withMatches ?? SEASONS.map((s) => s.id));
  const currentLabel = isAll ? "전체" : seasonLabel(current);

  const go = (id: string) => {
    const next = new URLSearchParams(params.toString());
    // 오늘이 속한 시즌이 기본값이라 쿼리를 지운다 — 주소가 짧고, 시즌이 넘어가면
    // 예전에 공유된 링크가 자동으로 그때의 현재 시즌을 가리킨다.
    // (아직 개막 안 한 시즌은 기본값이 아니므로 쿼리가 남는다)
    // 기본값이면 쿼리를 지운다. 전체가 기본인 화면(allowAll)에서는 "전체"가,
    // 그 외에는 오늘이 속한 시즌이 기본이다.
    const fallback = allowAll ? ALL_SEASONS : currentSeasonId();
    if (id === fallback) next.delete("season");
    else next.set("season", id);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // 시즌이 하나뿐이면 고를 게 없다. 라벨만 조용히 보여 준다.
  if (SEASONS.length < 2) {
    return (
      <span
        className="rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums"
        style={{ color: accent, background: `${accent}1f`, border: `1px solid ${accent}40` }}
      >
        {currentLabel}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`시즌 선택 — 현재 ${currentLabel}`}
          className="press-icon flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums"
          style={{ color: accent, background: `${accent}1f`, border: `1px solid ${accent}40` }}
        >
          {currentLabel}
          <ChevronDown width={11} height={11} strokeWidth={3} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-36 rounded-2xl border-gray-200/80 bg-white/95 p-1.5 backdrop-blur-xl dark:border-white/10 dark:bg-[#17171a]/95"
      >
        {allowAll && (
          <DropdownMenuItem
            onSelect={() => go(ALL_SEASONS)}
            className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200"
          >
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300 dark:bg-white/25" />
            <span className="flex-1">전체</span>
            {isAll && <Check width={13} height={13} strokeWidth={3} style={{ color: accent }} />}
          </DropdownMenuItem>
        )}
        {/* 최신 시즌이 위로 오게 뒤집는다 */}
        {[...SEASONS].reverse().map((s) => {
          const selected = s.id === current;
          // "경기가 아직 없다" 와 "아직 개막을 안 했다" 는 다른 말이다.
          // 개막 전 시즌에 "기록 없음" 이라고 쓰면 기록이 날아간 것처럼 읽힌다.
          const upcoming = seasonStatus(s.id) === "future";
          const note = upcoming ? "개막 전" : !played.has(s.id) ? "기록 없음" : null;
          return (
            <DropdownMenuItem
              key={s.id}
              onSelect={() => go(s.id)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200"
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: accentOf(s.id) }}
              />
              <span className="flex-1 tabular-nums">{s.label}</span>
              {note && (
                <span className="text-[9px] font-bold text-gray-400 dark:text-white/30">{note}</span>
              )}
              {selected && <Check width={13} height={13} strokeWidth={3} style={{ color: accentOf(s.id) }} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
