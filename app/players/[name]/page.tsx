// app/players/[name]/page.tsx
// 선수 전용 페이지 (페이스온). 칭호 + 스탯 + 출석률 + 최근 활약.
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Crown,
  Flame,
  Handshake,
  Spline,
  Target,
  UsersRound,
  Volleyball,
} from "lucide-react";
import { auth } from "@/auth";
import { getMatchesRows } from "../../lib/matches-backend";
import {
  getStatsRows,
  getRosterRows,
  getLineupRows,
  getAttendanceVoteRows,
  getVoteCommentRows,
  getFeaturedRows,
  getFeedbackRows,
  getBoardCommentRows,
  getBoardPostRows,
  getBoardLikeGiverRows,
} from "../../lib/backend";
import {
  buildContexts,
  evaluatePlayer,
  evaluateLeaders,
  buildPlayerRelations,
  managerTitle,
  MANAGER_NAME,
  type EarnedTitle,
} from "../../lib/titles";
import PlayerTitleCards from "../../components/PlayerTitleCards";
import FeaturedEditor from "../../components/FeaturedEditor";
import PrefPosEditor from "../../components/PrefPosEditor";
import PlayerAvatar from "../../components/PlayerAvatar";
import PlayerFace from "../../components/PlayerFace";
import PlayerProfileBackButton from "../../components/PlayerProfileBackButton";

export const dynamic = "force-dynamic";

/**
 * 골·도움 표시. 베스트 경기와 최근 활약 두 곳에서 같은 모양이어야 해서 한 군데로 모았다.
 * (예전엔 ⚽ / 🅰️ 이모지라 기기·OS마다 다르게 그려졌고 나머지 lucide 아이콘과 톤이 어긋났다)
 */
function ScorePips({ goals, assists, size = 12 }: { goals: number; assists: number; size?: number }) {
  return (
    <>
      {goals > 0 && (
        <span className="inline-flex items-center gap-0.5 font-black text-gray-800 dark:text-gray-100">
          <Volleyball width={size} height={size} strokeWidth={2.4} />
          {goals > 1 && <span className="tabular-nums">×{goals}</span>}
        </span>
      )}
      {assists > 0 && (
        <span className="inline-flex items-center gap-0.5 font-black text-emerald-500">
          <Spline width={size} height={size} strokeWidth={2.4} />
          {assists > 1 && <span className="tabular-nums">×{assists}</span>}
        </span>
      )}
    </>
  );
}

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

  // 11개 소스를 순차로 await 하면 직렬 왕복이 그대로 누적돼 MY 탭이 눌린 뒤 멈춘 것처럼
  // 보인다. 전부 독립이라 병렬로 받는다. 필수 3개(stats/roster/matches)는 기존처럼 실패 시
  // 그대로 throw 되고(에러 바운더리), 선택 8개는 기존처럼 빈 배열로 폴백한다.
  const optional = (): string[][] => [];
  const [
    rawStats,
    rawRoster,
    rawMatches,
    rawLineups,
    rawAttendanceVotes,
    rawVoteComments,
    rawFeatured,
    rawFeedbacks,
    rawBoardComments,
    rawBoardPosts,
    rawBoardLikeGivers,
  ]: string[][][] = await Promise.all([
    getStatsRows(),
    getRosterRows(),
    getMatchesRows(),
    getLineupRows().catch(optional),
    getAttendanceVoteRows().catch(optional),
    getVoteCommentRows().catch(optional),
    getFeaturedRows().catch(optional),
    getFeedbackRows().catch(optional),
    getBoardCommentRows().catch(optional),
    getBoardPostRows().catch(optional),
    getBoardLikeGiverRows().catch(optional),
  ]);

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
  const registeredPos = rosterRow?.[2]?.trim().toUpperCase() || "-";
  const role = rosterRow?.[5]?.trim().toUpperCase();
  const prefPos = (rosterRow?.[7] || "").split(",").map((s) => s.trim()).filter(Boolean);

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
    rawStats, rawMatches, rawLineups, rawRoster, rawAttendanceVotes, rawVoteComments, rawFeedbacks, rawBoardComments, rawBoardPosts, rawBoardLikeGivers,
  });
  const leaders = evaluateLeaders(contexts);
  const ctx = contexts.get(name);
  const maxPositionCount = ctx ? Math.max(...Object.values(ctx.posLineupCounts)) : 0;
  const mostPlayedPositions = ctx
    ? (["GK", "DF", "MF", "FW"] as const).filter((position) => {
        return maxPositionCount > 0 && ctx.posLineupCounts[position] === maxPositionCount;
      })
    : [];
  const displayPositions = Array.from(new Set([
    ...(registeredPos !== "-" ? [registeredPos] : []),
    ...mostPlayedPositions,
  ]));
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

  // 현재 연속 출석 (최근 경기부터 거슬러 연속 참석)
  let currentStreak = 0;
  for (let i = withAttendees.length - 1; i >= 0; i--) {
    const present = withAttendees[i].attendees.split(",").map((s) => s.trim()).includes(name);
    if (present) currentStreak += 1;
    else break;
  }

  // 케미 · 관계 + 베스트 경기
  const relations = buildPlayerRelations(name, rawMatches, rawLineups);

  // 포지션 출전 분포 (쿼터별 라인업 등장 기준)
  const posDist = ctx
    ? (["GK", "DF", "MF", "FW"] as const)
        .map((p) => ({ pos: p, count: ctx.posLineupCounts[p] }))
        .filter((d) => d.count > 0)
    : [];
  const posMax = posDist.reduce((mx, d) => Math.max(mx, d.count), 0);

  const accent = posColor(displayPositions[0] || registeredPos);

  return (
    <main className="min-h-dvh bg-gray-50 dark:bg-[#0a0a0c] text-gray-900 dark:text-white">
      <div className="max-w-md mx-auto pb-28">
        {/* 상단 바 */}
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 safe-header-py-3 bg-gray-50/80 dark:bg-[#0a0a0c]/80 backdrop-blur border-b border-gray-200/60 dark:border-white/[0.06]">
          <PlayerProfileBackButton />
          <span className="text-[12px] font-black tracking-widest text-gray-400">PLAYER</span>
        </div>

        {/* 히어로 — 인스타 프로필 구조.
            [원형 프로필 사진 | 이름 + 스탯] → 정보 줄(등번호·포지션·선호) → 액션 → 하이라이트.
            카드로 감싸지 않고 페이지 배경 위에 그대로 올려야 그 구조가 산다. */}
        <section className="relative px-4 pt-5">
          {/* 포지션 컬러 글로우 */}
          <div
            className="pointer-events-none absolute -top-8 right-0 h-40 w-40 rounded-full"
            style={{ background: accent, opacity: 0.16, filter: "blur(48px)" }}
          />
          {/* 로고 워터마크. underducklogo.png 는 알파 없는 RGB(네이비 배경) 1024² 2.1MB라
              투명도만 낮춰 깔면 마크가 아니라 '네모난 네이비 덩어리'가 깔렸다.
              밝기를 알파로 바꾼 underduck-mark.png(16KB)를 마스크로 써서 모양만 남긴다. */}
          <div
            className="pointer-events-none absolute -right-6 top-2 h-32 w-32 bg-gray-900/[0.06] dark:bg-white/[0.07]"
            style={{
              WebkitMaskImage: "url(/underduck-mark.png)",
              maskImage: "url(/underduck-mark.png)",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            }}
          />

          {/* 1단: 프로필 사진 + 이름 · 스탯 */}
          <div className="relative flex items-center gap-4">
            <PlayerAvatar name={name} no={no} accent={accent} width={92} shape="circle" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-[19px] font-black leading-none tracking-tight text-gray-900 dark:text-white">
                  {name}
                </h1>
                {isManager && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[9px] font-black text-amber-950"
                    style={{ background: "linear-gradient(135deg,#FFE9A8,#D4A017)" }}
                  >
                    감독
                  </span>
                )}
                {role && (role === "C" || role === "VC") && (
                  <span className="rounded bg-gradient-to-br from-amber-200 to-amber-500 px-1.5 py-0.5 text-[9px] font-black text-amber-950">
                    {role}
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1">
                {[
                  { label: "출전", value: apps },
                  { label: "골", value: goals },
                  { label: "도움", value: assists },
                  { label: "MOM", value: mom },
                ].map((s) => (
                  <div key={s.label} className="min-w-0">
                    <p className="text-[17px] font-black leading-none tabular-nums text-gray-900 dark:text-white">
                      {s.value}
                    </p>
                    <p className="mt-1 text-[9.5px] font-bold text-gray-400 dark:text-white/45">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2단: 정보 줄 (인스타의 소개글 자리) */}
          <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
            {no && no !== "-" && (
              <span
                className="rounded-md px-2 py-0.5 text-[12px] font-black text-white"
                style={{ background: accent, boxShadow: `0 2px 8px ${accent}55` }}
              >
                #{no}
              </span>
            )}
            {displayPositions.map((position) => {
              const color = posColor(position);
              return (
                <span
                  key={position}
                  className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{ color, background: `${color}1f`, border: `1px solid ${color}55` }}
                >
                  {position}
                </span>
              );
            })}
          </div>

          {/* 선호 포지션 — 정보 줄 바로 아래 */}
          {rosterRow && (
            <div className="relative mt-2 flex items-start gap-1.5">
              <span className="mt-1.5 shrink-0 text-[10px] font-bold text-gray-400 dark:text-white/40">선호</span>
              {/* 편집을 열면 카드가 펼쳐지므로 남는 폭을 다 쓰게 둔다 */}
              <div className="min-w-0 flex-1">
                <PrefPosEditor initial={prefPos} canEdit={canEdit} />
              </div>
            </div>
          )}
        </section>

        {/* 칭호 — 인스타 스토리 하이라이트 자리 */}
        <section className="px-4 mt-5">
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest mb-1">
            칭호 <span className="text-gray-400 font-bold">({titles.length})</span>
          </p>
          {canEdit && <FeaturedEditor titles={titles} current={featuredIds} />}
          <PlayerTitleCards titles={titles} featuredIds={featuredIds} />
        </section>

        {/* 최고의 듀오 */}
        {relations.bestDuo && (
          <section className="px-4 mt-4">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-400/10 to-transparent px-4 py-3">
              <div className="flex items-center -space-x-2 shrink-0">
                {relations.bestDuo.names.map((nm) => (
                  <Link key={nm} href={`/players/${encodeURIComponent(nm)}`} className="active:opacity-60">
                    <PlayerFace name={nm} size={36} />
                  </Link>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">최고의 듀오</p>
                <p className="text-[13px] font-black text-gray-900 dark:text-white truncate">
                  {name} <span className="text-gray-400 font-bold">×</span>{" "}
                  {relations.bestDuo.names.map((nm, i) => (
                    <span key={nm}>
                      {i > 0 && <span className="text-gray-400"> · </span>}
                      <Link href={`/players/${encodeURIComponent(nm)}`} className="underline-offset-2 hover:underline">
                        {nm}
                      </Link>
                    </span>
                  ))}
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className="text-[16px] font-black text-emerald-500 tabular-nums">{relations.bestDuo.count}</span>
                <span className="text-[10px] font-bold text-gray-400 ml-0.5">골 합작</span>
              </span>
            </div>
          </section>
        )}

        {/* 시즌 베스트 경기 */}
        {relations.bestGame && (
          <section className="px-4 mt-6">
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest mb-2">
              시즌 베스트 경기
            </p>
            <Link
              href={`/matches/${relations.bestGame.matchId}`}
              className="block rounded-2xl border border-[#FF8FA3]/30 dark:border-[#FFB6C1]/20 bg-gradient-to-r from-[#FF8FA3]/10 to-transparent dark:from-[#FFB6C1]/10 px-4 py-3 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-gray-900 dark:text-white truncate">
                    vs {relations.bestGame.opponent}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{relations.bestGame.date}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-1.5 text-[12px]">
                    <ScorePips goals={relations.bestGame.goals} assists={relations.bestGame.assists} size={13} />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FF8FA3]/15 text-[#FF8FA3] dark:text-[#FFB6C1]">
                      공격P {relations.bestGame.points}
                    </span>
                    {relations.bestGame.isMom && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded bg-gradient-to-br from-amber-200 to-amber-500 text-amber-950">
                        <Crown width={11} height={11} strokeWidth={2.6} /> MOM
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* 케미 · 관계 */}
        {(relations.mostPlayedWith || relations.assistRecipients || relations.assistGivers) && (
          <section className="px-4 mt-6">
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest mb-2">
              케미
            </p>
            <div className="space-y-1.5">
              {[
                { icon: UsersRound, tint: "#38BDF8", label: "가장 많이 함께 뛴 동료", rel: relations.mostPlayedWith, unit: "경기" },
                { icon: Target, tint: "#34D399", label: "내 도움을 가장 많이 받은 선수", rel: relations.assistRecipients, unit: "골" },
                { icon: Handshake, tint: "#FF8FA3", label: "나를 가장 많이 살린 도우미", rel: relations.assistGivers, unit: "도움" },
              ].map((item) =>
                item.rel ? (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border px-3 py-2.5"
                    style={{
                      borderColor: `${item.tint}33`,
                      background: `linear-gradient(90deg, ${item.tint}14, transparent 70%)`,
                    }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${item.tint}1f`, color: item.tint }}
                    >
                      <item.icon width={17} height={17} strokeWidth={2.4} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9.5px] font-black tracking-wide" style={{ color: item.tint }}>
                        {item.label}
                      </p>
                      <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap mt-1">
                        {item.rel.names.map((nm) => (
                          <Link
                            key={nm}
                            href={`/players/${encodeURIComponent(nm)}`}
                            className="inline-flex items-center gap-1.5 active:opacity-60"
                          >
                            <PlayerFace name={nm} size={20} />
                            <span className="text-[12.5px] font-black text-gray-900 dark:text-white underline-offset-2 hover:underline">{nm}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <span className="shrink-0 text-right leading-none">
                      <span className="block text-[17px] font-black tabular-nums" style={{ color: item.tint }}>
                        {item.rel.count}
                      </span>
                      <span className="block text-[9px] font-bold text-gray-400 mt-0.5">{item.unit}</span>
                    </span>
                  </div>
                ) : null
              )}
            </div>
          </section>
        )}

        {/* 포지션 출전 분포 */}
        {posDist.length > 0 && (
          <section className="px-4 mt-6">
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest mb-2">
              포지션 출전
            </p>
            <div className="space-y-2">
              {posDist.map((d) => {
                const color = posColor(d.pos);
                return (
                  <div key={d.pos} className="flex items-center gap-2">
                    <span className="text-[10px] font-black w-8 shrink-0" style={{ color }}>
                      {d.pos}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${posMax > 0 ? (d.count / posMax) * 100 : 0}%`, background: color }}
                      />
                    </div>
                    <span className="text-[11px] font-black tabular-nums text-gray-500 dark:text-gray-400 w-10 text-right">
                      {d.count}쿼터
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 출석률 */}
        {attendRate !== null && (
          <section className="px-4 mt-6">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest">
                  출석률 <span className="text-gray-400 font-medium">({attendCount}/{withAttendees.length})</span>
                </p>
                {currentStreak >= 2 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-orange-500">
                    <Flame width={11} height={11} strokeWidth={2.6} /> {currentStreak}연속
                  </span>
                )}
              </div>
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
                      <span className="inline-flex items-center gap-1.5 text-[11px]">
                        <ScorePips goals={g} assists={a} />
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
