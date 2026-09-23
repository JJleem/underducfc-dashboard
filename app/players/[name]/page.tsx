// app/players/[name]/page.tsx
// 선수 전용 페이지 (페이스온). 칭호 + 스탯 + 출석률 + 최근 활약.
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { currentIsAdmin } from "../../lib/admin";
import { getMatchesRows } from "../../lib/matches-backend";
import { isCasualMatch, isMomOf, isOuting, matchLogo } from "../../components/home/match-result";
import {
  getStatsRows,
  getRosterRows,
  getLineupRows,
  getFeaturedRows,
} from "../../lib/backend";
import {
  featureKey,
  managerTitle,
  MANAGER_NAME,
  type EarnedTitle,
} from "../../lib/titles";
import { getTeamTitleData } from "../../lib/titles-cache";
import {
  isInSeason,
  isWrappedPublic,
  latestPublicWrappedSeason,
  resolveSeasonId,
  seasonAccent,
  seasonLabel,
  seasonMatchIds,
  maskMatchRowsToSeason,
  seasonsWithMatches,
  SEASONS,
  rowsOfMatchIds,
} from "../../lib/seasons";
import TitleHighlights from "../../components/TitleHighlights";
import PlayerTitleCards from "../../components/PlayerTitleCards";
import SeasonSelector from "../../components/SeasonSelector";
import { Sparkles, ChevronRight } from "lucide-react";
import ProfileTabs from "../../components/ProfileTabs";
import PrefPosEditor from "../../components/PrefPosEditor";
import PlayerAvatar from "../../components/PlayerAvatar";
import PlayerProfileBackButton from "../../components/PlayerProfileBackButton";
import PlayerMatchGrid, { type GridMatch } from "../../components/PlayerMatchGrid";
import ChemistryHub from "../../components/ChemistryHub";
import { buildPlayerChemistry, buildTeamChemistry } from "../../lib/chemistry";
import PlayerStatsReport from "../../components/PlayerStatsReport";
import { buildPlayerStatsReport } from "../../lib/player-stats";

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
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName).trim();
  // 프로필의 숫자·경기·케미는 전부 이 시즌 것이다. 칭호만 시즌/통산 두 벌을 보여 준다.
  const season = resolveSeasonId((await searchParams).season);

  // 순차로 await 하면 직렬 왕복이 그대로 누적돼 MY 탭이 눌린 뒤 멈춘 것처럼 보인다.
  // 전부 독립이라 병렬로 받는다. 필수 3개(stats/roster/matches)는 실패 시 그대로
  // throw 되고(에러 바운더리), 선택 2개는 빈 배열로 폴백한다.
  // (칭호 계산에 쓰던 6개 소스는 titles-cache 로 옮겨가 여기서 받지 않는다)
  const optional = (): string[][] => [];
  const [rawStats, rawRoster, rawMatches, rawLineups, rawFeatured]: string[][][] =
    await Promise.all([
      getStatsRows(season),
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

  const seasonsPlayed = [...seasonsWithMatches(rawMatches)];

  // 첫 시즌 동안은 "시즌 = 통산" 이다. 지금까지 치른 경기가 전부 이 시즌 것이라
  // 두 섹션이 같은 데이터를 컷만 달리해서 보여 준다 — "철인 프로(시즌)" 와
  // "철인 아마추어(통산)" 가 나란히 뜨는 꼴이라 읽는 사람만 헷갈린다.
  // 다음 시즌 경기가 한 건이라도 생기면 그때부터 시즌 섹션이 진짜 부분집합이 되므로
  // 자동으로 열린다.
  const seasonIsEverything = seasonsPlayed.length <= 1 && seasonsPlayed[0] === season;


  // 칭호 — 45초 캐시된 팀 전체 산출 결과를 재사용한다(요청마다 다시 계산하지 않는다).
  // allTitles[name] 은 감독 → 리더 → 자동 칭호 순으로 이미 정렬돼 있어서
  // 예전에 여기서 조립하던 순서와 동일하다.
  const { allTitles, seasonTitles, careerTitles, posLineupCounts } = await getTeamTitleData(season);
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
  // 시즌 칭호 — 그 시즌 기록만으로 딴 것. 등급 컷이 통산보다 낮아 매 시즌 다시 등반한다.
  const seasonEarned: EarnedTitle[] = seasonTitles[name] ?? [];
  const careerEarned: EarnedTitle[] = careerTitles[name] ?? (isManager ? [managerTitle()] : []);

  // 섹션을 하나만 쓸 때 보여 줄 목록 — 감독 → 리더(시즌 1위) → 통산 자동 칭호.
  // 시즌제 이전과 같은 구성이다.
  //
  // ⚠️ 리더 칭호는 seasonTitles 에만 있다. 여기에 careerTitles 만 넘기면 득점왕·도움왕이
  //    프로필에서 아예 사라진다.
  const titles: EarnedTitle[] = allTitles[name] ?? (isManager ? [managerTitle()] : []);

  // 대표 칭호를 **고르는** 모집단은 통산 + 모든 시즌이다.
  //
  // 시즌 칭호는 휘발성이라(26-27 득점왕이어도 27-28엔 사라진다) 대표로 걸어 둬야
  // 그 시즌 사실로 남는다. 지난 시즌도 고를 수 있어야 뒤늦게 아는 사람이 못 거는
  // 함정이 안 생긴다. 기록이 있는 시즌만 부르고, 각 호출은 45초 캐시된다.
  const otherSeasons = seasonsPlayed.filter((id) => id !== season);
  const otherSeasonTitles = (
    await Promise.all(
      otherSeasons.map((id) =>
        getTeamTitleData(id)
          .then((d) => d.seasonTitles[name] ?? [])
          // 한 시즌 집계가 실패해도 대표 편집 자체는 열려야 한다.
          .catch((): EarnedTitle[] => []),
      ),
    )
  ).flat();
  // 리더는 titles(allTitles)와 seasonEarned 양쪽에 같은 키로 들어 있다 — 키로 한 번만 남긴다.
  const featurePool: EarnedTitle[] = [...new Map(
    [...titles, ...seasonEarned, ...otherSeasonTitles].map((t) => [featureKey(t), t]),
  ).values()];

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
    // 시즌 스코프 — 출석률·경기 그리드·연속 출석이 전부 이 목록에서 나온다.
    .filter((m) => m.result !== "예정" && isInSeason(m.date, season));

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

  // 케미 · 관계
  // 로스터에 한 번이라도 등록된 선수만 케미 대상으로 본다. 상태가 비활동이어도
  // 로스터 행은 남아 있으므로 포함되고, 일회성 게스트 이름은 자연스럽게 빠진다.
  const rosterNames = new Set(
    rawRoster.slice(1).map((row) => (row[1] || "").trim()).filter(Boolean),
  );
  // 시즌 밖 경기는 가려서 넘긴다(행은 그대로 둬야 index=matchId 링크가 안 깨진다).
  // 라인업은 matchId 를 직접 들고 있어 그냥 걸러도 안전하다.
  const seasonMatchRows = maskMatchRowsToSeason(rawMatches, season);
  const seasonLineups = rowsOfMatchIds(rawLineups, seasonMatchIds(rawMatches, season));
  const chemistry = buildPlayerChemistry(name, seasonMatchRows, seasonLineups, rosterNames);
  const teamChemistry = canEdit
    ? buildTeamChemistry(seasonMatchRows, seasonLineups, rosterNames)
    : null;

  const accent = posColor(displayPositions[0] || registeredPos);
  const season_ = seasonAccent(season);

  // 시즌 래핑 진입점.
  //   · 공개일([[seasons]] wrappedFrom) 전에는 운영진에게만 보인다 — 시즌이 안 끝났는데
  //     "올 시즌 당신은…" 을 띄우면 김이 샌다.
  //   · 남의 프로필에서는 안 띄운다(본인 것이거나 운영진일 때만). 래핑은 "내 것" 이다.
  //   · 그 시즌 기록이 없으면 링크할 이유가 없다.
  const showSeasonTitles = seasonEarned.length > 0 && !seasonIsEverything;
  //   · 보고 있는 시즌이 아직 안 열렸으면 **막 열린 지난 시즌**을 띄운다. 공개일이 곧
  //     다음 시즌 개막일이라, 프로필 기본(현재 시즌)만 보면 버튼이 영영 안 뜬다.
  const viewerIsAdmin = await currentIsAdmin();
  const wrappedSeason =
    (isWrappedPublic(season) || viewerIsAdmin) && apps > 0 ? season : latestPublicWrappedSeason();
  const wrappedApps =
    wrappedSeason === season
      ? apps
      : rawMatches.slice(1).filter(
          (r) =>
            isInSeason(r[0], wrappedSeason ?? "") &&
            (r[6] || "예정") !== "예정" &&
            !isOuting(r[7] || "") &&
            (r[11] || "").split(",").map((v) => v.trim()).includes(name),
        ).length;
  const wrappedPublic = !!wrappedSeason && isWrappedPublic(wrappedSeason);
  const showWrapped = !!wrappedSeason && (canEdit || viewerIsAdmin) && wrappedApps > 0;
  const statsReport = buildPlayerStatsReport(name, seasonMatchRows, seasonLineups, {
    apps,
    goals,
    assists,
    mom,
  });

  // 탭이 통째로 빈 경우를 구분해야 빈 화면 대신 안내를 띄울 수 있다.
  const hasStatsTab = statsReport.totalQuarters > 0 || statsReport.recent.length > 0 || attendRate !== null;
  const hasChemTab = chemistry.partners.length > 0;

  return (
    <main
      className="season-scope min-h-dvh bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-white"
      style={{ "--season-light": season_.light, "--season-dark": season_.dark } as CSSProperties}
    >
      <div className="max-w-md mx-auto pb-28">
        {/* 상단 바 */}
        <div className="app-page-header safe-header-py-3">
          <PlayerProfileBackButton />
          <span className="app-header-label">PLAYER</span>
          <span className="ml-auto flex items-center">
            <SeasonSelector current={season} withMatches={seasonsPlayed} />
          </span>
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
        {/* 칭호 — 시즌과 통산을 나눠 보여 준다.
            시즌 칭호는 뱃지가 육각 + 브러시드라 통산(원형 + 광택)과 한눈에 갈린다.
            대표 칭호(featured)는 통산에서만 고른다 — 시즌이 넘어가도 대표가 안 사라진다. */}
        {showSeasonTitles && (
          <section className="px-4 mt-4">
            <p className="mb-2 text-[9.5px] font-black uppercase tracking-[0.16em] season-accent">
              {seasonLabel(season)} 시즌
            </p>
            <PlayerTitleCards titles={seasonEarned} />
          </section>
        )}

        {/* 대표 칭호를 고르는 줄. 시즌 섹션을 접는 동안에는 리더까지 포함한 전체(titles)를,
            두 섹션으로 갈릴 때는 통산만(careerEarned) 보여 준다 — 리더는 위 시즌 줄에 있다. */}
        <section className="px-4 mt-4">
          {showSeasonTitles && (
            <p className="mb-2 text-[9.5px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
              통산
            </p>
          )}
          <TitleHighlights
            titles={showSeasonTitles ? careerEarned : titles}
            featuredIds={featuredIds}
            canEdit={canEdit}
            featurePool={featurePool}
          />
        </section>

        {/* 시즌 래핑 진입 */}
        {showWrapped && (
          <a
            href={`/wrapped?season=${wrappedSeason}${canEdit ? "" : `&player=${encodeURIComponent(name)}`}`}
            className="mx-4 mt-4 flex items-center gap-3 rounded-2xl px-3.5 py-3 active:opacity-70"
            style={{
              background: "color-mix(in srgb, var(--season) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--season) 26%, transparent)",
            }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--season) 18%, transparent)", color: "var(--season)" }}
            >
              <Sparkles width={16} height={16} strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-black text-gray-900 dark:text-white">
                {seasonLabel(wrappedSeason ?? season)} 시즌 돌아보기
              </span>
              <span className="mt-0.5 block text-[10px] font-bold text-gray-400 dark:text-white/35">
                {wrappedPublic
                  ? "한 장씩 넘겨 보는 나의 시즌 · 선수카드"
                  : "공개 전 · 운영진만 보입니다"}
              </span>
            </span>
            <ChevronRight width={15} height={15} strokeWidth={2.4} className="shrink-0 text-gray-300 dark:text-white/25" />
          </a>
        )}

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
              <PlayerStatsReport
                report={statsReport}
                season={seasonLabel(season)}
                attendance={{
                  rate: attendRate,
                  count: attendCount,
                  total: withAttendees.length,
                  streak: currentStreak,
                  accent,
                }}
              />
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
