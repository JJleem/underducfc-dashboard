// 프로필 "숫자" 탭 맨 위 — 시즌 비교 표. 계산은 [[season-compare]] 가 한다.
// 시즌 헤더는 그 시즌 대표색이다. 증감 화살표는 경기당 수치·출석률에만 붙는다.

import type { CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { seasonAccent } from "../lib/seasons";
import type { SeasonCompare, Trend } from "../lib/season-compare";
import { TREND_MIN_APPS } from "../lib/season-compare";

function TrendMark({ trend }: { trend: Trend }) {
  if (trend === "up") return <ArrowUpRight className="h-3 w-3 text-emerald-500" strokeWidth={3} aria-label="상승" />;
  if (trend === "down") return <ArrowDownRight className="h-3 w-3 text-gray-400" strokeWidth={3} aria-label="하락" />;
  if (trend === "same") return <Minus className="h-3 w-3 text-gray-300 dark:text-white/25" strokeWidth={3} aria-label="같음" />;
  return <span className="w-3" />;
}

export default function SeasonCompareTable({ compare }: { compare: SeasonCompare }) {
  const cols = compare.seasons.length;
  const grid = { gridTemplateColumns: `1fr repeat(${cols}, minmax(0, 0.8fr))` };
  const trendless = compare.rows.every((r) => r.trend === null);

  return (
    <section className="px-4">
      <div className="mb-2.5 flex items-end justify-between">
        <p className="text-[10px] font-black tracking-[0.14em] text-gray-500 dark:text-gray-400">SEASON VS SEASON</p>
        {trendless && (
          <p className="text-[9px] font-bold text-gray-400">새 시즌 {TREND_MIN_APPS}경기부터 증감 표시</p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/75 bg-white/55 backdrop-blur-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        {/* 헤더 — 시즌 칩 */}
        <div className="grid items-center border-b border-gray-100 px-3.5 py-2.5 dark:border-white/[0.06]" style={grid}>
          <span />
          {compare.seasons.map((s) => {
            const a = seasonAccent(s.id);
            return (
              <span key={s.id} className="flex justify-end">
                <span
                  className="season-scope rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums"
                  style={
                    {
                      "--season-light": a.light,
                      "--season-dark": a.dark,
                      color: "var(--season)",
                      background: "color-mix(in srgb, var(--season) 13%, transparent)",
                    } as CSSProperties
                  }
                >
                  {s.label}
                </span>
              </span>
            );
          })}
        </div>

        {compare.rows.map((r, i) => (
          <div
            key={r.key}
            className={`grid items-center px-3.5 py-2 ${
              // 누적 네 줄과 경기당·출석 네 줄 사이에 선을 긋는다.
              i === 4 ? "border-t border-gray-100 dark:border-white/[0.06]" : ""
            }`}
            style={grid}
          >
            <span className="text-[11px] font-bold text-gray-500 dark:text-white/50">{r.label}</span>
            {r.values.map((v, j) => {
              const last = j === r.values.length - 1;
              return (
                <span
                  key={j}
                  className={`flex items-center justify-end gap-0.5 text-[13px] font-black tabular-nums ${
                    last ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-white/40"
                  }`}
                >
                  {v}
                  {last && <TrendMark trend={r.trend} />}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
