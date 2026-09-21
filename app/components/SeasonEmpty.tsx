// 기록이 한 건도 없는 시즌의 빈 상태. /stats · /record · 프로필이 같이 쓴다.
//
// "아직 개막 전" 과 "개막했는데 아직 한 경기도 안 했다" 를 같은 문구로 덮으면 안 된다.
// 전자는 기다리는 중이고 후자는 시작된 것이다. 특히 "기록 없음" 이라고만 쓰면
// 기록이 유실된 것처럼 읽힌다.
//
// 어느 쪽이든 **지난 시즌으로 가는 길**을 같이 준다. 시즌이 넘어간 직후 빈 화면만
// 보여 주면 "내 기록 어디 갔냐" 가 되기 때문이다.

import Link from "next/link";
import { CalendarClock, ChevronRight, Sparkles } from "lucide-react";
import { SEASONS, daysUntilSeason, seasonById, seasonLabel, seasonStatus } from "../lib/seasons";

export default function SeasonEmpty({
  seasonId,
  accent,
  /** 이 시즌 링크를 붙일 경로(/stats · /record …). 지난 시즌 보기 버튼에 쓴다. */
  basePath,
  /** 경기가 있는 시즌 id 목록 — 되돌아갈 시즌을 고를 때 쓴다. */
  withMatches = [],
}: {
  seasonId: string;
  /** 시즌 대표색. `var(--season)` 처럼 CSS 값이어도 되도록 알파는 color-mix 로 낸다. */
  accent: string;
  basePath: string;
  withMatches?: string[];
}) {
  const status = seasonStatus(seasonId);
  const start = seasonById(seasonId)?.start;
  const dday = daysUntilSeason(seasonId);

  // 되돌아갈 곳: 기록이 있는 시즌 중 가장 최신. 없으면 버튼을 숨긴다.
  const fallback = [...SEASONS].reverse().find((s) => s.id !== seasonId && withMatches.includes(s.id));

  const upcoming = status === "future";
  const title = upcoming ? "아직 개막 전이에요" : status === "current" ? "새 시즌이 시작됐어요" : "이 시즌 기록이 없어요";
  const detail = upcoming
    ? start
      ? `${seasonLabel(seasonId)} 시즌은 ${start.replace(/^\d{4}-/, "").replace("-", "월 ")}일에 시작해요${dday !== null ? ` · D-${dday}` : ""}`
      : `${seasonLabel(seasonId)} 시즌 일정은 아직 정해지지 않았어요`
    : status === "current"
      ? "첫 경기를 기다리는 중이에요"
      : "이 기간에 치른 경기가 없어요";

  return (
    <section className="px-4 py-14 text-center">
      <span
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: `color-mix(in srgb, ${accent} 10%, transparent)`, color: accent }}
      >
        {upcoming ? (
          <CalendarClock width={20} height={20} strokeWidth={2.2} />
        ) : (
          <Sparkles width={20} height={20} strokeWidth={2.2} />
        )}
      </span>
      <p className="mt-3.5 text-[14px] font-black text-gray-900 dark:text-white">{title}</p>
      <p className="mt-1.5 text-[11.5px] font-bold text-gray-400 dark:text-white/40">{detail}</p>

      {fallback && (
        <Link
          href={`${basePath}?season=${fallback.id}`}
          className="mt-5 inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[11px] font-black active:opacity-60"
          style={{
            background: `color-mix(in srgb, ${accent} 10%, transparent)`,
            color: accent,
            border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
          }}
        >
          {fallback.label} 기록 보기
          <ChevronRight width={13} height={13} strokeWidth={2.8} />
        </Link>
      )}
    </section>
  );
}
