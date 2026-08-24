import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { ChemistryPartner, PlayerChemistry as ChemistryReport } from "../lib/chemistry";
import PlayerFace from "./PlayerFace";

function ResultDots({ results }: { results: ChemistryPartner["record"]["recent"] }) {
  if (!results.length) return <span className="text-[10px] text-gray-400">전적 없음</span>;
  return (
    <span className="flex gap-1" aria-label={`최근 동반 전적 ${results.join(" ")}`}>
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${
            result === "승"
              ? "bg-[#FF8FA3]/15 text-[#F56F88] dark:bg-[#FFB6C1]/15 dark:text-[#FFB6C1]"
              : result === "무"
                ? "bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/50"
                : "bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-white/30"
          }`}
        >
          {result}
        </span>
      ))}
    </span>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="min-w-0 border-l border-gray-200/80 pl-3 first:border-l-0 first:pl-0 dark:border-white/[0.08]">
      <p className="text-[9px] font-bold tracking-wide text-gray-400 dark:text-white/35">{label}</p>
      <p className="mt-1 text-[18px] font-black leading-none tabular-nums text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1.5 truncate text-[9px] font-medium text-gray-400 dark:text-white/30">{note}</p>
    </div>
  );
}

export default function PlayerChemistry({ playerName, report }: { playerName: string; report: ChemistryReport }) {
  const featured = report.featured;
  if (!featured) {
    return <p className="px-4 py-10 text-center text-[12px] font-bold text-gray-400">아직 같은 쿼터를 뛴 기록이 부족해요.</p>;
  }

  return (
    <div className="space-y-7 pb-3">
      <section className="px-4">
        <div className="relative overflow-hidden rounded-[22px] border border-gray-200/80 bg-white px-4 pb-4 pt-4 shadow-[0_16px_45px_-32px_rgba(17,24,39,0.45)] dark:border-white/[0.08] dark:bg-white/[0.035]">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#FF8FA3]/60 to-transparent" />
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black tracking-[0.2em] text-gray-400 dark:text-white/35">SIGNATURE PARTNER</p>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-black text-gray-500 dark:bg-white/[0.07] dark:text-white/45">
              {featured.strength}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3.5">
            <div className="flex shrink-0 items-center -space-x-3">
              <PlayerFace name={playerName} size={48} />
              <PlayerFace name={featured.name} size={48} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-[#F56F88] dark:text-[#FFB6C1]">{featured.label}</p>
              <p className="mt-0.5 truncate text-[18px] font-black tracking-tight text-gray-950 dark:text-white">
                {playerName} <span className="font-light text-gray-300 dark:text-white/20">×</span> {featured.name}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3">
            <Metric label="호흡" value={`${featured.sharedQuarters}Q`} note={`${featured.sharedMatches}경기 동반`} />
            <Metric label="합작" value={`${featured.combinedGoals}`} note={`주고받은 골`} />
            <Metric
              label="동반 전적"
              value={featured.record.played ? `${featured.record.winRate}%` : "—"}
              note={featured.record.played ? `${featured.record.wins}승 ${featured.record.draws}무 ${featured.record.losses}패` : "집계 전"}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between px-4">
          <div>
            <p className="text-[10px] font-black tracking-[0.16em] text-gray-500 dark:text-gray-400">PARTNER INDEX</p>
            <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-white/30">같은 쿼터에 선 조합 기준</p>
          </div>
          <span className="text-[10px] font-bold tabular-nums text-gray-400">{report.partners.length}명</span>
        </div>

        <div className="border-y border-gray-200/70 dark:border-white/[0.07]">
          {report.partners.map((partner, index) => (
            <details key={partner.name} className="group border-b border-gray-100 last:border-b-0 dark:border-white/[0.055]">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                <span className="w-4 shrink-0 text-center text-[10px] font-black tabular-nums text-gray-300 dark:text-white/20">{index + 1}</span>
                <PlayerFace name={partner.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-black text-gray-900 dark:text-white">{partner.name}</span>
                    <span className="truncate text-[9px] font-bold text-[#F56F88] dark:text-[#FFB6C1]">{partner.label}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-medium text-gray-400 dark:text-white/30">
                    {partner.sharedQuarters}쿼터 · {partner.sharedMatches}경기 · 합작 {partner.combinedGoals}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-open:rotate-180 dark:text-white/20" />
              </summary>

              <div className="mx-4 mb-4 ml-[4.25rem] border-l border-gray-200 pl-3 dark:border-white/[0.08]">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400">동반 밀도</p>
                    <p className="mt-0.5 text-[12px] font-black tabular-nums text-gray-800 dark:text-white/80">{partner.affinity}%</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400">골 연결</p>
                    <p className="mt-0.5 text-[12px] font-black tabular-nums text-gray-800 dark:text-white/80">
                      {playerName}→{partner.name} {partner.supplied} · 반대 {partner.received}
                    </p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400">최근 동반 전적</p>
                      <div className="mt-1"><ResultDots results={partner.record.recent} /></div>
                    </div>
                    <Link
                      href={`/players/${encodeURIComponent(partner.name)}`}
                      className="inline-flex items-center gap-1 text-[10px] font-black text-gray-500 active:opacity-60 dark:text-white/45"
                    >
                      프로필 <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
        <p className="px-4 pt-2.5 text-[9px] leading-relaxed text-gray-400 dark:text-white/25">
          동반 전적은 두 선수가 같은 쿼터에 출전한 경기 결과이며, 개인 기여도를 뜻하지 않아요.
        </p>
      </section>
    </div>
  );
}
