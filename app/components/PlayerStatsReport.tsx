import Link from "next/link";
import { Crown, Flame, Spline, Volleyball } from "lucide-react";
import type { PlayerStatsReport as StatsReport } from "../lib/player-stats";
import { roleColor } from "../lib/positions";

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return <div className="mb-2.5"><p className="text-[10px] font-black tracking-[0.16em] text-gray-500 dark:text-gray-400">{title}</p>{note && <p className="mt-1 text-[10px] text-gray-400 dark:text-white/30">{note}</p>}</div>;
}

function MiniPitch({ report }: { report: StatsReport }) {
  return (
    <div className="relative aspect-[0.72] w-full overflow-hidden rounded-2xl border border-white/50 bg-[linear-gradient(180deg,#e6edf4,#dce7ef)] shadow-inner dark:border-white/[0.08] dark:bg-[linear-gradient(180deg,#111b2c,#0b1423)]">
      <div className="absolute inset-[7%] rounded-sm border border-white/70 dark:border-white/20" />
      <div className="absolute left-[7%] right-[7%] top-1/2 border-t border-white/70 dark:border-white/20" />
      <div className="absolute left-1/2 top-1/2 h-[17%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 dark:border-white/20" />
      <div className="absolute left-[31%] right-[31%] top-[7%] h-[14%] border-x border-b border-white/70 dark:border-white/20" />
      <div className="absolute bottom-[7%] left-[31%] right-[31%] h-[14%] border-x border-t border-white/70 dark:border-white/20" />
      {report.roles.map((role, index) => {
        const size = 22 + Math.min(role.percent, 55) * 0.28;
        const color = roleColor(role.role);
        return <div key={role.role} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_5px_14px_-5px_rgba(0,0,0,0.55)] dark:border-[#101522]" style={{ left: `${role.point.x}%`, top: `${role.point.y}%`, width: size, height: size, background: color, opacity: Math.max(0.48, 1 - index * 0.12) }}><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] font-black text-white">{role.role}</span></div>;
      })}
    </div>
  );
}

export default function PlayerStatsReport({ report, attendance }: { report: StatsReport; attendance: { rate: number | null; count: number; total: number; streak: number; accent: string } }) {
  return (
    <div className="space-y-7 pb-3">
      <section className="px-4">
        <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/70 px-4 py-4 shadow-[0_18px_48px_-34px_rgba(17,24,39,0.55)] backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.035]">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#FF8FA3]/60 to-transparent" />
          <p className="text-[9px] font-black tracking-[0.2em] text-gray-400 dark:text-white/35">SEASON REPORT</p>
          <div className="mt-4 grid grid-cols-4 divide-x divide-gray-200/80 dark:divide-white/[0.08]">
            {[["출전", `${report.totalQuarters}Q`], ["경기당", `${report.avgQuarters}Q`], ["공격P/경기", report.pointsPerGame], ["MOM률", `${report.momRate}%`]].map(([label, value]) => <div key={label} className="text-center"><p className="text-[9px] font-bold text-gray-400">{label}</p><p className="mt-1.5 text-[15px] font-black tabular-nums text-gray-900 dark:text-white">{value}</p></div>)}
          </div>
        </div>
      </section>

      {report.recent.length > 0 && <section className="px-4"><SectionTitle title="RECENT FORM" note="최근 출전 5경기" /><div className="grid grid-cols-5 overflow-hidden rounded-2xl border border-gray-200/80 bg-white/60 backdrop-blur-sm dark:border-white/[0.07] dark:bg-white/[0.025]">{report.recent.map((match) => <Link key={match.matchId} href={`/matches/${match.matchId}`} className="min-w-0 border-r border-gray-100 px-1 py-3 text-center last:border-0 dark:border-white/[0.06]"><span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black ${match.result === "승" ? "bg-[#FF8FA3]/15 text-[#F56F88] dark:text-[#FFB6C1]" : match.result === "무" ? "bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/50" : "bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-white/30"}`}>{match.result || "-"}</span><p className="mt-2 truncate text-[8px] font-bold text-gray-400">{match.opponent}</p><div className="mt-1 flex h-4 items-center justify-center gap-1 text-[9px] font-black text-gray-700 dark:text-white/70">{match.goals > 0 && <span className="inline-flex items-center"><Volleyball className="h-2.5 w-2.5" />{match.goals}</span>}{match.assists > 0 && <span className="inline-flex items-center text-gray-400"><Spline className="h-2.5 w-2.5" />{match.assists}</span>}{match.isMom && <Crown className="h-3 w-3 text-amber-400" />}{match.goals + match.assists === 0 && !match.isMom && <span className="text-gray-300">—</span>}</div></Link>)}</div></section>}

      {report.roles.length > 0 && <section className="px-4"><SectionTitle title="POSITION IDENTITY" note={report.roleSummary} /><div className="grid grid-cols-[0.9fr_1.1fr] gap-4 rounded-[22px] border border-gray-200/75 bg-white/55 p-3.5 backdrop-blur-sm dark:border-white/[0.07] dark:bg-white/[0.025]"><MiniPitch report={report} /><div className="min-w-0"><div><p className="text-[9px] font-bold text-gray-400">주 역할</p><p className="mt-0.5 text-[24px] font-black leading-none" style={{ color: report.primaryRole ? roleColor(report.primaryRole) : undefined }}>{report.primaryRole}</p>{report.primaryFormation && <p className="mt-1.5 text-[9px] font-medium text-gray-400">주 포메이션 {report.primaryFormation}</p>}</div><div className="mt-4 space-y-2.5">{report.roles.slice(0, 5).map((role) => <div key={role.role}><div className="mb-1 flex justify-between text-[9px] font-black"><span style={{ color: roleColor(role.role) }}>{role.role}</span><span className="tabular-nums text-gray-400">{role.quarters}Q · {role.percent}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]"><div className="h-full rounded-full" style={{ width: `${role.percent}%`, background: roleColor(role.role) }} /></div></div>)}</div></div></div></section>}

      {report.bestGame && <section className="px-4"><SectionTitle title="BEST PERFORMANCE" /><Link href={`/matches/${report.bestGame.matchId}`} className="flex items-center justify-between rounded-2xl border border-gray-200/75 bg-white/60 px-4 py-3.5 backdrop-blur-sm active:opacity-70 dark:border-white/[0.07] dark:bg-white/[0.025]"><div><p className="text-[9px] font-bold text-gray-400">vs</p><p className="mt-0.5 text-[14px] font-black text-gray-900 dark:text-white">{report.bestGame.opponent}</p></div><div className="flex items-center gap-2 text-[11px] font-black"><span className="inline-flex items-center gap-0.5"><Volleyball className="h-3.5 w-3.5" />{report.bestGame.goals}</span><span className="inline-flex items-center gap-0.5 text-gray-400"><Spline className="h-3.5 w-3.5" />{report.bestGame.assists}</span>{report.bestGame.isMom && <Crown className="h-4 w-4 text-amber-400" />}</div></Link></section>}

      <section className="px-4"><SectionTitle title="PERSONAL RECORDS" /><div className="grid grid-cols-3 divide-x divide-gray-200/80 border-y border-gray-200/80 py-3 dark:divide-white/[0.07] dark:border-white/[0.07]">{[["한 경기 최다 골", report.maxGoals], ["최다 공격P", report.maxPoints], ["공격P 연속", `${report.maxPointStreak}경기`]].map(([label, value]) => <div key={label} className="text-center"><p className="text-[16px] font-black tabular-nums text-gray-900 dark:text-white">{value}</p><p className="mt-1 text-[9px] font-bold text-gray-400">{label}</p></div>)}</div></section>

      {attendance.rate !== null && <section className="px-4"><div className="mb-1.5 flex items-center justify-between"><p className="text-[10px] font-black tracking-[0.14em] text-gray-500 dark:text-gray-400">ATTENDANCE <span className="font-medium text-gray-400">{attendance.count}/{attendance.total}</span></p><div className="flex items-center gap-2"><span className="text-[13px] font-black tabular-nums" style={{ color: attendance.accent }}>{attendance.rate}%</span>{attendance.streak >= 2 && <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-orange-500"><Flame className="h-3 w-3" />{attendance.streak}연속</span>}</div></div><div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.05]"><div className="h-full rounded-full" style={{ width: `${attendance.rate}%`, background: attendance.accent }} /></div></section>}
    </div>
  );
}
