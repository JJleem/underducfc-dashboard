import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lightbulb, Sparkles } from "lucide-react";
import { TitleBadge } from "../components/TitleBadges";
import { titleIcon } from "../lib/title-icons";
import {
  LEADER_TITLES,
  TITLES,
  TIER_NAMES,
  managerTitle,
  type EarnedTitle,
  type TitleCategory,
  type TitleDef,
  type TierIndex,
} from "../lib/titles";

export const metadata: Metadata = {
  title: "칭호 도감 | UNDERDUCK FC",
  description: "언더덕 FC에서 획득할 수 있는 칭호와 달성 조건",
};

const CATEGORY_COLORS: Partial<Record<TitleCategory, string>> = {
  "포지션 커리어": "#38BDF8",
  "통산 스탯": "#FF8FA3",
  "한 경기 폭발": "#FB923C",
  "포지션 특성": "#34D399",
  "근성 · 출석": "#A78BFA",
  "날씨 · 환경": "#60A5FA",
  "맞대결 · 승부": "#FBBF24",
  "대시보드 활동": "#2DD4BF",
  "언성히어로 · 반전": "#F472B6",
  리더: "#FFD45A",
  특별: "#E9C46A",
};

function earnedOf(def: TitleDef, tier: TierIndex | null): EarnedTitle {
  return {
    id: `${def.id}-${tier ?? "flat"}`,
    name: def.name,
    icon: def.icon,
    category: def.category,
    flagship: !!def.flagship,
    tier,
    tierLabel: tier === null ? null : def.tierLabels?.[tier] ?? TIER_NAMES[tier],
    desc: def.desc,
  };
}

function TitleCard({ title }: { title: TitleDef }) {
  const Icon = titleIcon(title.icon);

  return (
    <article className="relative min-w-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-[#111827]">
      {title.flagship && (
        <Sparkles className="absolute right-2.5 top-2.5 h-3 w-3 text-amber-400" />
      )}
      <div className="flex items-start gap-2.5 pr-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.3} />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[12px] font-black text-gray-900 dark:text-white">
            {title.name}
          </h2>
          <span
            className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[7px] font-black ${
              title.state === "live"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
                : "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300"
            }`}
          >
            {title.state === "live" ? "현재 적용" : "기록 반영형"}
          </span>
        </div>
      </div>

      <p className="mt-2 min-h-8 text-[9px] font-semibold leading-[1.45] text-gray-500 dark:text-gray-400">
        {title.desc}
      </p>

      {title.tiers?.length ? (
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1.5">
          {title.tiers.map((requirement, index) => {
            const tier = index as TierIndex;
            return (
              <div key={requirement} className="flex items-center gap-1">
                <TitleBadge title={earnedOf(title, tier)} size={16} />
                <span className="whitespace-nowrap text-[7px] font-bold text-gray-500 dark:text-gray-400">
                  {title.tierLabels?.[tier] ?? TIER_NAMES[tier]} {requirement}
                  {title.unit ?? ""}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5">
          <TitleBadge title={earnedOf(title, null)} size={17} />
          <span className="text-[8px] font-bold text-gray-400">조건 달성 시 획득</span>
        </div>
      )}
    </article>
  );
}

export default function TitlesPage() {
  const categories = Array.from(new Set(TITLES.map((title) => title.category)));

  return (
    <main className="min-h-dvh bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-white">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-gray-200/70 bg-white/85 px-4 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#09090b]/85">
        <Link
          href="/"
          aria-label="홈으로"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[8px] font-black tracking-[0.18em] text-[#FF8FA3] dark:text-[#FFB6C1]">
            UNDERDUCK ARCHIVE
          </p>
          <h1 className="text-[15px] font-black leading-none">칭호 도감</h1>
        </div>
        <span className="ml-auto rounded-full bg-gray-100 px-2 py-1 text-[8px] font-black text-gray-500 dark:bg-white/[0.07] dark:text-gray-400">
          {TITLES.length + LEADER_TITLES.length + 1} TITLES
        </span>
      </header>

      <div className="space-y-6 px-4 pb-10 pt-4">
        <section className="relative overflow-hidden rounded-[22px] bg-white p-4 text-gray-900 shadow-[0_16px_40px_rgba(15,23,42,0.06)] border border-gray-200/80 dark:border-white/[0.08] dark:bg-[#10182f] dark:text-white dark:shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#FF8FA3]/15 blur-2xl dark:bg-[#FF8FA3]/20" />
          <p className="text-[9px] font-black tracking-[0.16em] text-[#FF8FA3] dark:text-[#FFB6C1]">TITLE COLLECTION</p>
          <h2 className="mt-1 text-[21px] font-black tracking-[-0.04em]">기록이 쌓이면, 칭호가 된다.</h2>
          <p className="mt-2 max-w-[310px] text-[10px] font-semibold leading-relaxed text-gray-500 dark:text-slate-300">
            경기 기록과 활동에 따라 자동으로 획득하는 언더덕 FC의 칭호와 달성 조건입니다.
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-white/10 dark:bg-white/[0.06]">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-300" />
            <p className="text-[9px] font-semibold leading-relaxed text-gray-500 dark:text-slate-300">
              칭호와 조건은 주기적으로 추가되거나 변경될 수 있습니다. 재미있는 칭호 아이디어가 있다면 언제든 알려주세요.
            </p>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[12px] font-black">등급 안내</h2>
            <span className="text-[8px] font-bold text-gray-400">누적 기록에 따라 성장</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-gray-200 bg-white p-2.5 dark:border-white/[0.07] dark:bg-[#111827]">
            {TIER_NAMES.map((name, index) => {
              const sample = earnedOf(TITLES[4], index as TierIndex);
              return (
                <div key={name} className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 py-2 dark:bg-white/[0.035]">
                  <TitleBadge title={sample} size={22} />
                  <span className="text-[8px] font-black text-gray-600 dark:text-gray-300">{name}</span>
                </div>
              );
            })}
          </div>
        </section>

        {categories.map((category) => {
          const titles = TITLES.filter((title) => title.category === category);
          return (
            <section key={category}>
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className="h-4 w-1 rounded-full"
                  style={{ background: CATEGORY_COLORS[category] ?? "#FF8FA3" }}
                />
                <h2 className="text-[13px] font-black">{category}</h2>
                <span className="text-[8px] font-bold text-gray-400">{titles.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {titles.map((title) => (
                  <TitleCard key={title.id} title={title} />
                ))}
              </div>
            </section>
          );
        })}

        <section>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-[#FFD45A]" />
            <h2 className="text-[13px] font-black">리더 · 특별</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LEADER_TITLES.map((title) => {
              const Icon = titleIcon(title.icon);
              const earned: EarnedTitle = {
                id: title.id,
                name: title.name,
                icon: title.icon,
                category: "리더",
                flagship: true,
                tier: null,
                tierLabel: null,
                desc: title.desc,
                variant: "leader",
              };
              return (
                <article key={title.id} className="rounded-2xl border border-amber-300/40 bg-white p-3 dark:bg-[#111827]">
                  <div className="flex items-center gap-2">
                    <TitleBadge title={earned} size={23} />
                    <div>
                      <h2 className="text-[11px] font-black">{title.name}</h2>
                      <p className="text-[8px] font-semibold text-gray-400">{title.desc}</p>
                    </div>
                    <Icon className="ml-auto h-3 w-3 text-amber-400/50" />
                  </div>
                </article>
              );
            })}
            <article className="rounded-2xl border border-amber-300/40 bg-white p-3 dark:bg-[#111827]">
              <div className="flex items-center gap-2">
                <TitleBadge title={managerTitle()} size={23} />
                <div>
                  <h2 className="text-[11px] font-black">감독</h2>
                  <p className="text-[8px] font-semibold text-gray-400">팀을 이끄는 특별 칭호</p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
