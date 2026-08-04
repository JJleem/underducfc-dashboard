// 주목 포인트 요약과 드로어 본문.
// 피드에서는 한 줄로 압축하고, 드로어에서는 팀 흐름과 선수 기록을 나눠 훑는다.
// 항목마다 카드를 만들면 최대 26개가 벽처럼 쌓이므로 색은 제목·아이콘·이름에만 쓰고,
// 각 기록은 드로어 기본 바탕 위에서 헤어라인으로 구분한다.

import type { Storyline } from "../../lib/storylines";
import {
  CalendarCheck,
  ChartNoAxesCombined,
  CircleDot,
  Clapperboard,
  Crown,
  Flame,
  Handshake,
  HeartPulse,
  Medal,
  Repeat2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

const STORY_ICONS: Record<string, LucideIcon> = {
  "🎬": Clapperboard,
  "🔙": RotateCcw,
  "🔥": Flame,
  "⚡": Zap,
  "🎖️": Medal,
  "💯": Target,
  "⚽": CircleDot,
  "🅰️": Handshake,
  "🥇": Trophy,
  "👑": Crown,
  "📅": CalendarCheck,
  "🧤": ShieldCheck,
  "📈": TrendingUp,
  "🩹": HeartPulse,
  "📊": ChartNoAxesCombined,
  "🔁": Repeat2,
  "🆚": Swords,
};

/**
 * "최동권 20경기 출전" → ["최동권", "20경기 출전"]
 * 팀 서사("팀 4연패 중…")는 주어가 사람이 아니라 나누지 않는다.
 */
function splitSubject(story: Storyline): [string, string] {
  if (story.kind === "team") return ["", story.text];
  const at = story.text.indexOf(" ");
  if (at <= 0) return ["", story.text];
  return [story.text.slice(0, at), story.text.slice(at + 1)];
}

export default function Storylines({
  items,
  limit,
  singleLine = false,
}: {
  items: Storyline[];
  /** 없으면 전부. 있으면 앞에서 그 개수만. */
  limit?: number;
  /** 피드 요약처럼 한 줄 안에서만 보여줄 때. 넘치는 칩은 드로어 진입점 뒤로 숨긴다. */
  singleLine?: boolean;
}) {
  if (items.length === 0) return null;
  const shown = limit ? items.slice(0, limit) : items;

  if (!singleLine) {
    const groups = [
      {
        kind: "team" as const,
        label: "팀 흐름",
        items: shown.filter((story) => story.kind === "team"),
        labelTone: "text-blue-500 dark:text-blue-400",
        dividerTone: "border-blue-500/20 dark:border-blue-400/15",
        iconTone: "text-blue-500 dark:text-blue-400",
      },
      {
        kind: "player" as const,
        label: "선수 기록",
        items: shown.filter((story) => story.kind === "player"),
        labelTone: "text-[#F45F7A] dark:text-[#FFB6C1]",
        dividerTone: "border-[#FF8FA3]/25 dark:border-[#FFB6C1]/15",
        iconTone: "text-[#F45F7A] dark:text-[#FFB6C1]",
      },
    ].filter((group) => group.items.length > 0);

    return (
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.kind}>
            <div
              className={`flex items-center justify-between border-b pb-2 ${group.dividerTone}`}
            >
              <p className={`text-[10px] font-black tracking-[0.15em] ${group.labelTone}`}>
                {group.label}
              </p>
              <span className="text-[9.5px] font-bold tabular-nums text-gray-400 dark:text-white/35">
                {group.items.length}개
              </span>
            </div>
            <div>
              {group.items.map((story, index) => {
                const [who, what] = splitSubject(story);
                const StoryIcon = STORY_ICONS[story.icon] ?? Sparkles;
                return (
                  <div
                    key={`${story.text}-${index}`}
                    className={`flex items-start gap-2.5 py-3 ${
                      index > 0 ? "border-t border-gray-100 dark:border-white/[0.06]" : ""
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center ${group.iconTone}`}
                    >
                      <StoryIcon width={16} height={16} strokeWidth={2.25} />
                    </span>
                    <p className="min-w-0 pt-0.5 text-[13px] leading-[1.55] text-gray-600 dark:text-white/60">
                      {who && (
                        <b className={`mr-1 font-black ${group.labelTone}`}>{who}</b>
                      )}
                      {what}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="truncate whitespace-nowrap text-[13px] font-bold text-gray-800 dark:text-white/75">
      {shown.map((story, i) => {
        const [who, what] = splitSubject(story);
        return (
          <span
            key={`${story.text}-${i}`}
            className=""
          >
            {i > 0 && (
              <span className="mx-1.5 text-gray-300 dark:text-white/20">·</span>
            )}
            {who && <b className="font-black text-gray-900 dark:text-white">{who}</b>}
            {who && " "}
            {what}
          </span>
        );
      })}
    </div>
  );
}
