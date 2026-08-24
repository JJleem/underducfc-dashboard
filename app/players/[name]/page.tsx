// app/players/[name]/page.tsx
// 선수 전용 페이지 (페이스온). 칭호 + 스탯 + 출석률 + 최근 활약.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown, Flame, Spline, Volleyball } from "lucide-react";
import { auth } from "@/auth";
import { getMatchesRows } from "../../lib/matches-backend";
import { isCasualMatch, isMomOf, isOuting, matchLogo } from "../../components/home/match-result";
import { getOpponentLogo } from "../../lib/opponent-logos";
import {
  getStatsRows,
  getRosterRows,
  getLineupRows,
  getFeaturedRows,
} from "../../lib/backend";
import {
  buildPlayerRelations,
  managerTitle,
  MANAGER_NAME,
  type EarnedTitle,
} from "../../lib/titles";
import { getTeamTitleData } from "../../lib/titles-cache";
import TitleHighlights from "../../components/TitleHighlights";
import ProfileTabs from "../../components/ProfileTabs";
import PrefPosEditor from "../../components/PrefPosEditor";
import PlayerAvatar from "../../components/PlayerAvatar";
import PlayerProfileBackButton from "../../components/PlayerProfileBackButton";
import PlayerMatchGrid, { type GridMatch } from "../../components/PlayerMatchGrid";
import ChemistryHub from "../../components/ChemistryHub";
import { buildPlayerChemistry, buildTeamChemistry } from "../../lib/chemistry";

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
        <span className="inline-flex items-center gap-0.5 font-black text-gray-400 dark:text-white/45">
          <Spline width={size} height={size} strokeWidth={2.4} />
          {assists > 1 && <span className="tabular-nums">×{assists}</span>}
        </span>
      )}
    </>
  );
}

/**
 * 하이라이트·케미 공통 줄.
 * 예전엔 줄마다 색 테두리 + 그라데이션 + 아이콘 배지가 따로 붙어서 여섯 개 섹션이
 * 저마다 다른 색으로 소리쳤다. 골격을 하나로 통일하고 색은 데이터(얼굴·숫자)에만 남긴다.
 */
function ListRow({
  left,
  label,
  value,
  amount,
  unit,
  href,
}: {
  left: React.ReactNode;
  label: string;
  value: React.ReactNode;
  amount: React.ReactNode;
  unit: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="shrink-0">{left}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-black tracking-wide text-gray-400 dark:text-white/40">{label}</div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] font-black text-gray-900 dark:text-white">
          {value}
        </div>
      </div>
      <div className="shrink-0 text-right leading-none">
        <div className="text-[15px] font-black tabular-nums text-gray-900 dark:text-white">{amount}</div>
        <div className="mt-1 text-[9px] font-bold text-gray-400">{unit}</div>
      </div>
    </>
  );

  // 줄 안에 선수 링크가 들어가는 경우가 있어 href 가 있는 줄만 Link 로 감싼다(중첩 방지).
  return href ? (
    <Link href={href} className="flex items-center gap-3 py-3 active:opacity-60">
      {inner}
    </Link>
  ) : (
    <div className="flex items-center gap-3 py-3">{inner}</div>
  );
}

/** 리스트 줄 왼쪽에 들어가는 상대팀 마크. 로고가 없으면 팀명 첫 글자. */
function OpponentMark({ name }: { name: string }) {
  const logo = getOpponentLogo(name);
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      className="h-7 w-7 rounded-full bg-white object-cover ring-1 ring-gray-200 dark:ring-white/10"
    />
  ) : (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[11px] font-black text-gray-400 dark:bg-white/10 dark:text-gray-500">
      {name.trim().charAt(0) || "?"}
    </span>
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

  // 순차로 await 하면 직렬 왕복이 그대로 누적돼 MY 탭이 눌린 뒤 멈춘 것처럼 보인다.
  // 전부 독립이라 병렬로 받는다. 필수 3개(stats/roster/matches)는 실패 시 그대로
  // throw 되고(에러 바운더리), 선택 2개는 빈 배열로 폴백한다.
  // (칭호 계산에 쓰던 6개 소스는 titles-cache 로 옮겨가 여기서 받지 않는다)
  const optional = (): string[][] => [];
  const [rawStats, rawRoster, rawMatches, rawLineups, rawFeatured]: string[][][] =
    await Promise.all([
      getStatsRows(),
      getRosterRows(),
      getMatchesRows(),
      getLineupRows().catch(optional),
      getFeaturedRows().catch(optional),
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

  // 칭호 — 45초 캐시된 팀 전체 산출 결과를 재사용한다(요청마다 다시 계산하지 않는다).
  // allTitles[name] 은 감독 → 리더 → 자동 칭호 순으로 이미 정렬돼 있어서
  // 예전에 여기서 조립하던 순서와 동일하다.
  const { allTitles, posLineupCounts } = await getTeamTitleData();
  const posCounts = posLineupCounts[name] ?? null;
  const maxPositionCount = posCounts ? Math.max(...Object.values(posCounts)) : 0;
  const mostPlayedPositions = posCounts
    ? (["GK", "DF", "MF", "FW"] as const).filter((position) => {
        return maxPositionCount > 0 && posCounts[position] === maxPositionCount;
      })
    : [];
  const displayPositions = Array.from(new Set([
    ...(registeredPos !== "-" ? [registeredPos] : []),
    ...mostPlayedPositions,
  ]));
  const titles: EarnedTitle[] = allTitles[name] ?? (isManager ? [managerTitle()] : []);

  // 출석률 + 최근 활약 경기
  const completed = rawMatches.slice(1)
    .map((r, i) => {
      const loc = (r[2] || "").trim();
      return {
        id: i,
        date: r[0] || "",
        location: loc === "미정" ? "" : loc,
        opponent: (r[3] || "").trim() || "상대 미정",
        ourScore: r[4] || "-",
        theirScore: r[5] || "-",
        result: r[6] || "예정",
        // 자체전·풋살·야유회 판정에 필요하다. 빠뜨리면 result·opponent 만으로
        // 판단하게 돼서 야유회(result 가 비어 있다)가 일반 경기로 샌다.
        type: r[7] || "",
        goals: r[8] || "",
        assists: r[9] || "",
        mom: r[10] || "",
        attendees: r[11] || "",
        photos: r[12] || "",
      };
    })
    .filter((m) => m.result !== "예정");

  // 야유회는 경기가 아니라 행사다. 출석률·연속출석 어디에도 넣지 않는다 —
  // 백엔드 stats 도 출전 수에서 뺀다(routers/stats.py._is_outing).
  const withAttendees = completed.filter((m) => m.attendees.trim() && !isOuting(m.type));
  const attendCount = withAttendees.filter((m) =>
    m.attendees.split(",").map((s) => s.trim()).includes(name)
  ).length;
  const attendRate = withAttendees.length > 0
    ? Math.round((attendCount / withAttendees.length) * 100)
    : null;

  const countIn = (csv: string) =>
    csv.split(",").map((s) => s.trim()).filter((s) => s === name).length;

  // 경기 그리드 — 골·도움이 있는 경기만이 아니라 "출전한 모든 경기". 인스타 프로필이
  // 잘 나온 사진만이 아니라 내 게시물 전부인 것과 같다. 최신순.
  const myMatches: GridMatch[] = completed
    .filter((m) => !isOuting(m.type))
    .filter((m) => m.attendees.split(",").map((s) => s.trim()).includes(name))
    .map((m) => ({
      id: m.id,
      date: m.date,
      opponent: m.opponent,
      location: m.location,
      result: m.result,
      ourScore: m.ourScore,
      theirScore: m.theirScore,
      photos: m.photos.split(",").map((s) => s.trim()).filter((s) => s.startsWith("http")),
      logo: matchLogo(m),
      goals: countIn(m.goals),
      assists: countIn(m.assists),
      isMom: isMomOf(m.mom, name),
    }))
    .reverse();

  // 현재 연속 출석 (최근 경기부터 거슬러 연속 참석).
  // 자체전·풋살·야유회는 나오면 정식 경기와 똑같이 +1 이고, 빠지면 없던 경기로 넘긴다 —
  // 훈련 한 번 빠졌다고 10연속이 0이 될 이유는 없다(titles.maxAttendStreak 과 같은 규칙).
  let currentStreak = 0;
  for (let i = withAttendees.length - 1; i >= 0; i--) {
    const m = withAttendees[i];
    const present = m.attendees.split(",").map((s) => s.trim()).includes(name);
    if (present) currentStreak += 1;
    else if (isCasualMatch(m.result, m.type, m.opponent)) continue;
    else break;
  }

  // 케미 · 관계 + 베스트 경기
  const relations = buildPlayerRelations(name, rawMatches, rawLineups);
  // 로스터에 한 번이라도 등록된 선수만 케미 대상으로 본다. 상태가 비활동이어도
  // 로스터 행은 남아 있으므로 포함되고, 일회성 게스트 이름은 자연스럽게 빠진다.
  const rosterNames = new Set(
    rawRoster.slice(1).map((row) => (row[1] || "").trim()).filter(Boolean),
  );
  const chemistry = buildPlayerChemistry(name, rawMatches, rawLineups, rosterNames);
  const teamChemistry = canEdit ? buildTeamChemistry(rawMatches, rawLineups, rosterNames) : null;

  // 포지션 출전 분포 (쿼터별 라인업 등장 기준)
  const posDist = posCounts
    ? (["GK", "DF", "MF", "FW"] as const)
        .map((p) => ({ pos: p, count: posCounts[p] }))
        .filter((d) => d.count > 0)
    : [];
  const posMax = posDist.reduce((mx, d) => Math.max(mx, d.count), 0);

  const accent = posColor(displayPositions[0] || registeredPos);

  // 탭이 통째로 빈 경우를 구분해야 빈 화면 대신 안내를 띄울 수 있다.
  const hasStatsTab = !!relations.bestGame || posDist.length > 0 || attendRate !== null;
  const hasChemTab = chemistry.partners.length > 0;

  return (
    <main className="min-h-dvh bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-white">
      <div className="max-w-md mx-auto pb-28">
        {/* 상단 바 */}
        <div className="app-page-header safe-header-py-3">
          <PlayerProfileBackButton />
          <span className="app-header-label">PLAYER</span>
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
              {/* 이름 줄에 등번호·포지션까지 함께 (인스타의 이름 + 카테고리 자리) */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
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
                {no && no !== "-" && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[11px] font-black leading-none text-white"
                    style={{ background: accent, boxShadow: `0 2px 6px ${accent}55` }}
                  >
                    #{no}
                  </span>
                )}
                {displayPositions.map((position) => {
                  const color = posColor(position);
                  return (
                    <span
                      key={position}
                      className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-[0.14em]"
                      style={{ color, background: `${color}1f`, border: `1px solid ${color}55` }}
                    >
                      {position}
                    </span>
                  );
                })}
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

          {/* 2단: 선호 포지션 (인스타의 소개글 자리).
              라벨과 칩의 세로 패딩·글자 크기를 맞춰야 높낮이가 어긋나지 않는다. */}
          {rosterRow && (
            <div className="relative mt-3.5 flex items-start gap-1.5">
              <span className="shrink-0 py-1 text-[11px] font-bold text-gray-400 dark:text-white/40">선호</span>
              {/* 편집을 열면 카드가 펼쳐지므로 남는 폭을 다 쓰게 둔다 */}
              <div className="min-w-0 flex-1">
                <PrefPosEditor initial={prefPos} canEdit={canEdit} />
              </div>
            </div>
          )}
        </section>

        {/* 칭호 — 인스타 스토리 하이라이트 자리.
            라벨 줄("칭호 (12) · 대표 고르기")을 통째로 걷어냈다. 레퍼런스엔 하이라이트 위에
            라벨도 개수도 없고 편집은 줄 맨 앞 ＋ 동그라미가 맡는다(TitleHighlights). */}
        <section className="px-4 mt-4">
          <TitleHighlights titles={titles} featuredIds={featuredIds} canEdit={canEdit} />
        </section>

        {/* 탭 — 피드 / 숫자 / 사람 */}
        <ProfileTabs
          feed={
            myMatches.length > 0 ? (
              <PlayerMatchGrid matches={myMatches} />
            ) : (
              <p className="px-4 py-10 text-center text-[12px] font-bold text-gray-400 dark:text-gray-600">
                아직 출전한 경기가 없어요.
              </p>
            )
          }
          stats={
            hasStatsTab ? (
              <div className="space-y-6">
                {relations.bestGame && (
                  <section className="px-4">
                    <p className="mb-2 text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-400">
                      시즌 베스트 경기
                    </p>
                    <div className="border-y border-gray-100 dark:border-white/[0.06]">
                      <ListRow
                        left={<OpponentMark name={relations.bestGame.opponent} />}
                        label={relations.bestGame.date}
                        value={
                          <>
                            <span className="truncate">vs {relations.bestGame.opponent}</span>
                            <span className="flex shrink-0 items-center gap-1.5 text-[11px]">
                              <ScorePips
                                goals={relations.bestGame.goals}
                                assists={relations.bestGame.assists}
                                size={12}
                              />
                            </span>
                            {relations.bestGame.isMom && (
                              <Crown width={12} height={12} strokeWidth={2.6} className="shrink-0 text-amber-400" />
                            )}
                          </>
                        }
                        amount={relations.bestGame.points}
                        unit="공격P"
                        href={`/matches/${relations.bestGame.matchId}`}
                      />
                    </div>
                  </section>
                )}

                {/* 포지션 출전 분포 — 막대 색은 포지션 고유색이라 그대로 둔다(데이터 색) */}
                {posDist.length > 0 && (
                  <section className="px-4">
                    <p className="mb-2 text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-400">
                      포지션 출전
                    </p>
                    <div className="space-y-2">
                      {posDist.map((d) => {
                        const color = posColor(d.pos);
                        return (
                          <div key={d.pos} className="flex items-center gap-2">
                            <span className="w-8 shrink-0 text-[10px] font-black" style={{ color }}>
                              {d.pos}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${posMax > 0 ? (d.count / posMax) * 100 : 0}%`, background: color }}
                              />
                            </div>
                            <span className="w-10 text-right text-[11px] font-black tabular-nums text-gray-500 dark:text-gray-400">
                              {d.count}쿼터
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 출석률 — 핑크 고정이던 걸 선수 포지션 색으로 맞춰 히어로(링·등번호)와 한 색으로 묶는다 */}
                {attendRate !== null && (
                  <section className="px-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-400">
                          출석률 <span className="font-medium text-gray-400">({attendCount}/{withAttendees.length})</span>
                        </p>
                        {currentStreak >= 2 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-orange-500">
                            <Flame width={11} height={11} strokeWidth={2.6} /> {currentStreak}연속
                          </span>
                        )}
                      </div>
                      <span className="text-[13px] font-black tabular-nums" style={{ color: accent }}>
                        {attendRate}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${attendRate}%`, background: accent }} />
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <p className="px-4 py-10 text-center text-[12px] font-bold text-gray-400 dark:text-gray-600">
                아직 쌓인 기록이 없어요.
              </p>
            )
          }
          chemistry={
            hasChemTab ? (
              <ChemistryHub playerName={name} personal={chemistry} team={teamChemistry} />
            ) : (
              <p className="px-4 py-10 text-center text-[12px] font-bold text-gray-400 dark:text-gray-600">
                아직 함께 뛴 기록이 부족해요.
              </p>
            )
          }
        />
      </div>
    </main>
  );
}
