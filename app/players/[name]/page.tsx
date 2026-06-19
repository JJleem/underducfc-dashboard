// app/players/[name]/page.tsx
// 선수 전용 페이지 (페이스온). 칭호 + 스탯 + 출석률 + 최근 활약.
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { getMatchesRows } from "../../lib/matches-backend";
import {
  getStatsRows,
  getRosterRows,
  getLineupRows,
  getAttendanceVoteRows,
  getVoteCommentRows,
  getFeaturedRows,
} from "../../lib/backend";
import {
  buildContexts,
  evaluatePlayer,
  evaluateLeaders,
  managerTitle,
  MANAGER_NAME,
  type EarnedTitle,
} from "../../lib/titles";
import PlayerTitleCards from "../../components/PlayerTitleCards";
import FeaturedEditor from "../../components/FeaturedEditor";
import PlayerAvatar from "../../components/PlayerAvatar";
import AppBottomNav from "../../components/AppBottomNav";

export const dynamic = "force-dynamic";

const posColor = (pos: string): string => {
  const p = pos?.toUpperCase();
  if (p === "FW") return "#FF8FA3";
  if (p === "MF") return "#10B981";
  if (p === "DF") return "#3B82F6";
  if (p === "GK") return "#F59E0B";
  return "#94A3B8";
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName).trim();

  const rawStats: string[][] = await getStatsRows();
  const rawRoster: string[][] = await getRosterRows();
  const rawMatches: string[][] = await getMatchesRows();
  let rawLineups: string[][] = [];
  try { rawLineups = await getLineupRows(); } catch { rawLineups = []; }
  let rawAttendanceVotes: string[][] = [];
  try { rawAttendanceVotes = await getAttendanceVoteRows(); } catch { rawAttendanceVotes = []; }
  let rawVoteComments: string[][] = [];
  try { rawVoteComments = await getVoteCommentRows(); } catch { rawVoteComments = []; }
  let rawFeatured: string[][] = [];
  try { rawFeatured = await getFeaturedRows(); } catch { rawFeatured = []; }

  const isManager = name === MANAGER_NAME;

  // 본인 확인: 로그인 카카오 닉네임 == 선수명 이면 대표 칭호 편집 가능
  const session = await auth();
  const canEdit = !!session?.user?.name && session.user.name.trim() === name;

  // 현재 대표 칭호 ids
  const featuredRow = rawFeatured.find((r) => (r[0] || "").trim() === name);
  const featuredIds = featuredRow
    ? [featuredRow[1], featuredRow[2], featuredRow[3]].map((x) => (x || "").trim()).filter(Boolean)
    : [];

  // 로스터 정보 (등번호 / 포지션 / 주장)
  const rosterRow = rawRoster.slice(1).find((r) => (r[1] || "").trim() === name);
  const no = rosterRow?.[0]?.trim() || "-";
  const pos = rosterRow?.[2]?.trim() || "-";
  const role = rosterRow?.[5]?.trim().toUpperCase();

  // 스탯
  const statRow = rawStats.slice(1).find((r) => (r[1] || "").trim() === name);
  const apps = Number(statRow?.[3]) || 0;
  const goals = Number(statRow?.[4]) || 0;
  const assists = Number(statRow?.[5]) || 0;
  const mom = Number(statRow?.[6]) || 0;

  // 등록되지 않은 이름 (감독 제외) → 404
  if (!rosterRow && !statRow && !isManager) notFound();

  // 칭호
  const contexts = buildContexts({
    rawStats, rawMatches, rawLineups, rawRoster, rawAttendanceVotes, rawVoteComments,
  });
  const leaders = evaluateLeaders(contexts);
  const ctx = contexts.get(name);
  const titles: EarnedTitle[] = [
    ...(isManager ? [managerTitle()] : []),
    ...(leaders.get(name) ?? []),
    ...(ctx ? evaluatePlayer(ctx) : []),
  ];

  // 출석률 + 최근 활약 경기
  const completed = rawMatches.slice(1)
    .map((r, i) => ({
      id: i,
      date: r[0] || "",
      opponent: (r[3] || "").trim() || "상대 미정",
      result: r[6] || "예정",
      goals: r[8] || "",
      assists: r[9] || "",
      attendees: r[11] || "",
    }))
    .filter((m) => m.result !== "예정");

  const withAttendees = completed.filter((m) => m.attendees.trim());
  const attendCount = withAttendees.filter((m) =>
    m.attendees.split(",").map((s) => s.trim()).includes(name)
  ).length;
  const attendRate = withAttendees.length > 0
    ? Math.round((attendCount / withAttendees.length) * 100)
    : null;

  const countIn = (csv: string) =>
    csv.split(",").map((s) => s.trim()).filter((s) => s === name).length;
  const contributed = completed
    .filter((m) => countIn(m.goals) > 0 || countIn(m.assists) > 0)
    .slice(-6)
    .reverse();

  const accent = posColor(pos);

  return (
    <main className="min-h-dvh bg-gray-50 dark:bg-[#0a0a0c] text-gray-900 dark:text-white">
      <div className="max-w-md mx-auto pb-28">
        {/* 상단 바 */}
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-gray-50/80 dark:bg-[#0a0a0c]/80 backdrop-blur border-b border-gray-200/60 dark:border-white/[0.06]">
          <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="text-[12px] font-black tracking-widest text-gray-400">PLAYER</span>
        </div>

        {/* 페이스온 히어로 */}
        <div
          className="relative mx-4 mt-4 rounded-3xl overflow-hidden ring-1 ring-white/10"
          style={{
            background:
              "linear-gradient(180deg,#0c1430 0%,#0f1a3c 55%,#0a0f24 100%)",
            boxShadow: "0 16px 44px rgba(5,10,30,0.5)",
          }}
        >
          {/* 포지션 컬러 글로우 */}
          <div
            className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: accent, opacity: 0.22, filter: "blur(46px)" }}
          />
          {/* 잔디 로고 워터마크 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
            <div className="relative w-40 h-40">
              <Image src="/underducklogo.png" alt="" fill className="object-contain" />
            </div>
          </div>

          <div className="relative px-6 pt-7 pb-6 flex flex-col items-center">
            {/* 프로필 사진 (없으면 기본 아바타) · 등번호는 코너 배지 */}
            <PlayerAvatar name={name} no={no} accent={accent} />

            <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
              <h1 className="text-2xl font-black tracking-tight text-white">{name}</h1>
              {isManager && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md text-amber-950"
                  style={{ background: "linear-gradient(135deg,#FFE9A8,#D4A017)" }}>
                  감독
                </span>
              )}
              {role && (role === "C" || role === "VC") && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-gradient-to-br from-amber-200 to-amber-500 text-amber-950">
                  {role}
                </span>
              )}
            </div>
            {pos !== "-" && (
              <span
                className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full"
                style={{ color: accent, background: `${accent}1f`, border: `1px solid ${accent}55` }}
              >
                {pos}
              </span>
            )}
          </div>

          {/* 스탯 4분할 */}
          <div className="relative grid grid-cols-4 border-t border-white/10 divide-x divide-white/10">
            {[
              { label: "출전", value: apps },
              { label: "골", value: goals },
              { label: "도움", value: assists },
              { label: "MOM", value: mom },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center justify-center py-3.5">
                <span className="text-xl font-black tabular-nums text-white">{s.value}</span>
                <span className="text-[9px] font-bold text-white/45 mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 칭호 */}
        <section className="px-4 mt-6">
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest mb-2.5">
            칭호 <span className="text-gray-400 font-bold">({titles.length})</span>
          </p>
          {canEdit && <FeaturedEditor titles={titles} current={featuredIds} />}
          <PlayerTitleCards titles={titles} />
        </section>

        {/* 출석률 */}
        {attendRate !== null && (
          <section className="px-4 mt-6">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest">
                출석률 <span className="text-gray-400 font-medium">({attendCount}/{withAttendees.length})</span>
              </p>
              <span className="text-[13px] font-black text-[#FF8FA3] dark:text-[#FFB6C1] tabular-nums">{attendRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FFB6C1] to-[#FF8FA3]" style={{ width: `${attendRate}%` }} />
            </div>
          </section>
        )}

        {/* 최근 활약 경기 */}
        {contributed.length > 0 && (
          <section className="px-4 mt-6">
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest mb-2">
              최근 활약한 경기
            </p>
            <div className="space-y-1.5">
              {contributed.map((m) => {
                const g = countIn(m.goals);
                const a = countIn(m.assists);
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center justify-between rounded-xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] px-3 py-2.5 active:scale-[0.98] transition-transform"
                  >
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">
                      vs {m.opponent} <span className="text-gray-400 font-medium ml-1">{m.date}</span>
                    </span>
                    <span className="shrink-0 flex items-center gap-1.5 ml-2">
                      {g > 0 && <span className="text-[11px] font-black text-gray-800 dark:text-gray-200">⚽{g > 1 ? `×${g}` : ""}</span>}
                      {a > 0 && <span className="text-[11px] font-black text-emerald-500">🅰️{a > 1 ? `×${a}` : ""}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <AppBottomNav active="my" currentUserName={session?.user?.name} />
    </main>
  );
}
