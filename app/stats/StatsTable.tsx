"use client";

// 선수별 기록. 처음에는 이름순, 필터를 고르면 해당 기록이 높은 순서로 정렬한다.
import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import PlayerFace from "../components/PlayerFace";

export interface PlayerStat {
  name: string;
  no: string;
  pos: string;
  status: string;
  apps: number;
  goals: number;
  assists: number;
  mom: number;
}

const POS_COLOR: Record<string, string> = {
  FW: "#FF8FA3",
  MF: "#10B981",
  DF: "#3B82F6",
  GK: "#F59E0B",
};

const FILTERS = [
  { key: "apps", label: "출전" },
  { key: "goals", label: "골" },
  { key: "assists", label: "어시" },
  { key: "mom", label: "MOM" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function StatsTable({ players }: { players: PlayerStat[] }) {
  const [filter, setFilter] = useState<FilterKey | null>(null);
  const reduceMotion = useReducedMotion();
  const sortedPlayers = [...players].sort((a, b) => {
    if (!filter) return a.name.localeCompare(b.name, "ko");
    return (
      Number(a.status === "비활동") - Number(b.status === "비활동") ||
      b[filter] - a[filter] ||
      a.name.localeCompare(b.name, "ko")
    );
  });

  return (
    <section className="px-4 pb-24 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
          선수 기록
        </p>
        <div className="flex gap-1.5" aria-label="선수 기록 필터">
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter((current) => (current === key ? null : key))}
                aria-pressed={active}
                className={`min-h-9 min-w-10 rounded-full px-2.5 text-[10.5px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3]/50 ${
                  active
                    ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-950"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-white/35 dark:hover:bg-white/[0.06] dark:hover:text-white/60"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-1 flex items-center justify-end">
        <div className="grid w-[146px] grid-cols-4 text-center text-[9px] font-black text-gray-400 dark:text-white/30">
          {FILTERS.map(({ key, label }) => (
            <span
              key={key}
              className={
                filter === key
                  ? "text-gray-800 dark:text-white/80"
                  : filter
                    ? undefined
                    : "text-gray-500 dark:text-white/45"
              }
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
        {sortedPlayers.map((p) => {
          const color = POS_COLOR[p.pos?.toUpperCase()] || "#94A3B8";
          const inactive = p.status === "비활동";
          return (
            <motion.div
              key={p.name}
              layout={!reduceMotion}
              transition={{ layout: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } }}
            >
              <Link
                href={`/players/${encodeURIComponent(p.name)}`}
                className={`flex items-center gap-2.5 py-3 transition-opacity active:opacity-60 ${
                  inactive ? "opacity-40 grayscale" : ""
                }`}
              >
                <PlayerFace name={p.name} size={32} />
                <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <span className="truncate text-[13.5px] font-black text-gray-900 dark:text-white">
                    {p.name}
                  </span>
                  <span
                    className="shrink-0 rounded px-1 py-px text-[9px] font-black uppercase"
                    style={{ color, background: `${color}1f` }}
                  >
                    {p.pos || "-"}
                  </span>
                  {inactive && (
                    <span className="shrink-0 rounded bg-gray-200 px-1.5 py-px text-[8.5px] font-black text-gray-500 dark:bg-white/10 dark:text-white/45">
                      비활동
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[10px] font-bold text-gray-400 dark:text-white/30">
                  No. {p.no || "-"}
                </p>
                </div>
                <div className="grid w-[146px] shrink-0 grid-cols-4 text-center text-[13px] font-black tabular-nums text-gray-800 dark:text-white/85">
                {FILTERS.map(({ key }) => (
                  <span
                    key={key}
                    className={
                      filter === key
                        ? "text-gray-950 dark:text-white"
                        : filter
                          ? "text-gray-300 dark:text-white/20"
                          : "text-gray-800 dark:text-white/85"
                    }
                  >
                    {p[key]}
                  </span>
                ))}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

    </section>
  );
}
