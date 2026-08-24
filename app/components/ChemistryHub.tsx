"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PlayerChemistry as PersonalReport, TeamChemistry, TeamChemistryPair } from "../lib/chemistry";
import PlayerChemistry from "./PlayerChemistry";
import PlayerFace from "./PlayerFace";

type View = "mine" | "map" | "trio";

const pairId = (a: string, b: string) => [a, b].sort((x, y) => x.localeCompare(y, "ko")).join("|");

function PairSummary({ pair }: { pair: TeamChemistryPair }) {
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-[0_14px_35px_-30px_rgba(17,24,39,0.5)] dark:border-white/[0.08] dark:bg-white/[0.035]">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2.5">
          {pair.names.map((name) => <PlayerFace key={name} name={name} size={38} />)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-black text-gray-900 dark:text-white">{pair.names.join(" × ")}</p>
          <p className="mt-0.5 text-[10px] font-medium text-gray-400">선택한 조합의 동반 기록</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 divide-x divide-gray-200/80 dark:divide-white/[0.08]">
        {[
          ["호흡", `${pair.sharedQuarters}Q`],
          ["밀도", `${pair.affinity}%`],
          ["합작", `${pair.combinedGoals}`],
          ["승률", pair.record.played ? `${pair.record.winRate}%` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="text-center">
            <p className="text-[9px] font-bold text-gray-400">{label}</p>
            <p className="mt-1 text-[14px] font-black tabular-nums text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamMap({ report, playerName }: { report: TeamChemistry; playerName: string }) {
  const [metric, setMetric] = useState<"affinity" | "combinedGoals" | "winRate">("affinity");
  const [selected, setSelected] = useState<TeamChemistryPair | null>(null);
  const pairs = useMemo(() => new Map(report.pairs.map((pair) => [pairId(...pair.names), pair])), [report.pairs]);
  const values = report.pairs.map((pair) => metric === "winRate" ? pair.record.winRate : pair[metric]);
  const max = Math.max(...values, 1);
  const valueOf = (pair: TeamChemistryPair) => metric === "winRate" ? pair.record.winRate : pair[metric];
  const suffix = metric === "affinity" || metric === "winRate" ? "%" : "";

  return (
    <div className="pb-3">
      <div className="flex items-end justify-between px-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.16em] text-gray-500 dark:text-gray-400">TEAM CONNECTION MAP</p>
          <p className="mt-1 text-[10px] text-gray-400 dark:text-white/30">셀을 누르면 조합 기록을 볼 수 있어요</p>
        </div>
        <div className="flex rounded-full bg-gray-100 p-0.5 dark:bg-white/[0.06]">
          {([['affinity', '호흡'], ['combinedGoals', '합작'], ['winRate', '승률']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setMetric(key)} className={`rounded-full px-2.5 py-1.5 text-[9px] font-black ${metric === key ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white" : "text-gray-400"}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto border-y border-gray-200/70 dark:border-white/[0.07]">
        <div className="w-max min-w-full bg-gray-50 dark:bg-[#09090b]">
          <div className="grid" style={{ gridTemplateColumns: `64px repeat(${report.players.length}, 42px)` }}>
            <div className="sticky left-0 z-20 bg-gray-50 dark:bg-[#09090b]" />
            {report.players.map((name) => (
              <div key={name} className={`flex h-16 items-end justify-center pb-1 text-[9px] font-black [writing-mode:vertical-rl] ${name === playerName ? "text-[#F56F88] dark:text-[#FFB6C1]" : "text-gray-400 dark:text-white/30"}`}>{name}</div>
            ))}
            {report.players.map((rowName) => (
              <div key={`row-${rowName}`} className="contents">
                <div className={`sticky left-0 z-10 flex h-10 items-center truncate border-t border-gray-100 bg-gray-50 px-2 text-[9px] font-black dark:border-white/[0.04] dark:bg-[#09090b] ${rowName === playerName ? "text-[#F56F88] dark:text-[#FFB6C1]" : "text-gray-500 dark:text-white/35"}`}>{rowName}</div>
                {report.players.map((colName) => {
                  const pair = rowName === colName ? null : pairs.get(pairId(rowName, colName));
                  const value = pair ? valueOf(pair) : 0;
                  const alpha = pair ? 0.08 + (value / max) * 0.62 : 0;
                  return rowName === colName ? (
                    <div key={colName} className="m-1 rounded-md bg-gray-200/60 dark:bg-white/[0.05]" />
                  ) : (
                    <button
                      key={colName}
                      type="button"
                      disabled={!pair}
                      aria-label={pair ? `${rowName}, ${colName}: ${value}${suffix}` : `${rowName}, ${colName}: 기록 없음`}
                      onClick={() => pair && setSelected(pair)}
                      className="m-1 flex h-8 items-center justify-center rounded-md text-[8px] font-black tabular-nums text-gray-800 disabled:opacity-20 dark:text-white"
                      style={pair ? { backgroundColor: `rgba(255,143,163,${alpha})` } : undefined}
                    >
                      {pair && value > 0 ? `${value}${suffix}` : ""}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {selected ? <PairSummary pair={selected} /> : (
        <p className="px-4 pt-3 text-[9px] leading-relaxed text-gray-400 dark:text-white/25">호흡은 두 선수의 전체 출전 쿼터 대비 함께 선 비율이에요.</p>
      )}
    </div>
  );
}

function TrioList({ report }: { report: TeamChemistry }) {
  if (!report.trios.length) return <p className="px-4 py-10 text-center text-[12px] font-bold text-gray-400">분석할 3인 조합 기록이 부족해요.</p>;
  return (
    <div className="pb-3">
      <div className="px-4">
        <p className="text-[10px] font-black tracking-[0.16em] text-gray-500 dark:text-gray-400">TRIO INDEX</p>
        <p className="mt-1 text-[10px] text-gray-400 dark:text-white/30">같은 쿼터를 가장 많이 책임진 세 선수</p>
      </div>
      <div className="mt-3 border-y border-gray-200/70 dark:border-white/[0.07]">
        {report.trios.map((trio, index) => (
          <details key={trio.names.join("|")} className="group border-b border-gray-100 last:border-0 dark:border-white/[0.055]">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <span className="w-4 text-center text-[10px] font-black text-gray-300 dark:text-white/20">{index + 1}</span>
              <div className="flex -space-x-2.5">{trio.names.map((name) => <PlayerFace key={name} name={name} size={32} />)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-black text-gray-900 dark:text-white">{trio.names.join(" · ")}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">{trio.sharedQuarters}쿼터 · {trio.sharedMatches}경기</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-300 transition-transform group-open:rotate-180 dark:text-white/20" />
            </summary>
            <div className="mx-4 mb-4 ml-9 grid grid-cols-3 divide-x divide-gray-200 border-l border-gray-200 pl-3 text-center dark:divide-white/[0.08] dark:border-white/[0.08]">
              {[
                ["동반 밀도", `${trio.cohesion}%`],
                ["내부 합작", `${trio.combinedGoals}`],
                ["동반 승률", trio.record.played ? `${trio.record.winRate}%` : "—"],
              ].map(([label, value]) => <div key={label}><p className="text-[9px] text-gray-400">{label}</p><p className="mt-1 text-[11px] font-black text-gray-800 dark:text-white/80">{value}</p></div>)}
            </div>
          </details>
        ))}
      </div>
      <p className="px-4 pt-2.5 text-[9px] leading-relaxed text-gray-400 dark:text-white/25">최소 2쿼터 이상 함께 뛴 조합 중 상위 12개만 보여줘요.</p>
    </div>
  );
}

export default function ChemistryHub({ playerName, personal, team }: { playerName: string; personal: PersonalReport; team?: TeamChemistry | null }) {
  const [view, setView] = useState<View>("mine");
  if (!team) return <PlayerChemistry playerName={playerName} report={personal} />;
  const tabs: Array<[View, string]> = [["mine", "나의 조합"], ["map", "팀 맵"], ["trio", "3인 조합"]];
  return (
    <div>
      <div className="mx-4 mb-5 grid grid-cols-3 rounded-xl bg-gray-100 p-1 dark:bg-white/[0.055]">
        {tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setView(key)} className={`rounded-[9px] py-2 text-[10px] font-black ${view === key ? "bg-white text-gray-900 shadow-sm dark:bg-white/[0.1] dark:text-white" : "text-gray-400 dark:text-white/30"}`}>{label}</button>)}
      </div>
      {view === "mine" && <PlayerChemistry playerName={playerName} report={personal} />}
      {view === "map" && <TeamMap report={team} playerName={playerName} />}
      {view === "trio" && <TrioList report={team} />}
    </div>
  );
}
