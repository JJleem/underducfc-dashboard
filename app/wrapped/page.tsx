// /wrapped — 시즌 래핑(개인 돌아보기).
//
// ⚠️ 공개 전에는 **운영진만** 볼 수 있다. 시즌이 아직 안 끝났는데 "올 시즌 당신은…" 을
//    띄우면 김이 샌다. 공개일은 [[seasons]] 의 SeasonDef.wrappedFrom 한 줄이고,
//    그 날이 지나면 로그인한 회원 전원에게 열린다.
//
//    막는 방식은 **404(notFound)** 다. 403 을 주면 "여기 뭔가 있다"가 드러나서
//    공개 전에 소문이 먼저 돈다.
//
// 대상: 기본은 로그인한 본인. 운영진은 ?player=이름 으로 남의 것을 미리 볼 수 있다
// (문구 검수용 — 화면에 "운영진 미리보기" 가 찍힌다).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { currentIsAdmin } from "../lib/admin";
import { getMatchesRows } from "../lib/matches-backend";
import { getLineupRows, getRosterRows, getStatsRows } from "../lib/backend";
import { getTeamTitleData } from "../lib/titles-cache";
import { buildPlayerChemistry } from "../lib/chemistry";
import { buildPlayerStatsReport } from "../lib/player-stats";
import { buildSeasonWrapped, type XiSlotSpec } from "../lib/wrapped";
import { groupOfRole, rolesFor } from "../lib/positions";
import { getOpponentLogo } from "../lib/opponent-logos";
import { parseWeather } from "../lib/weather";
import { bestDuos, opponentRecords, seasonSummary, type StatMatch } from "../lib/team-stats";
import { isOuting, isCasualMatch, isMomOf } from "../components/home/match-result";
import { cldFit } from "../lib/cloudinary";
import {
  SEASONS,
  normalizeDate,
  isInSeason,
  isWrappedPublic,
  latestPublicWrappedSeason,
  maskMatchRowsToSeason,
  resolveSeasonId,
  rowsOfMatchIds,
  seasonAccent,
  seasonById,
  seasonLabel,
  seasonMatchIds,
} from "../lib/seasons";
import WrappedStory from "../components/wrapped/WrappedStory";
import SeasonFilm, { type FilmMatch, type SeasonFilmData } from "../components/wrapped/SeasonFilm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "시즌 래핑 | UNDERDUCK FC",
  description: "언더덕 FC 시즌 돌아보기",
  // 공개 전이라 검색에 잡히면 안 된다.
  robots: { index: false, follow: false },
};

export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; player?: string }>;
}) {
  const { season: seasonParam, player: playerParam } = await searchParams;
  // 시즌을 안 찍고 들어오면 **막 열린 래핑**을 보여 준다. 현재 시즌이 아니다 —
  // 공개일부터 현재 시즌은 아직 안 열린 새 시즌이라 404 가 뜬다([[seasons]] 참고).
  const season = seasonById(seasonParam)?.id ?? latestPublicWrappedSeason() ?? resolveSeasonId(undefined);

  const session = await auth();
  const myName = session?.user?.name?.trim() || "";
  const isAdmin = await currentIsAdmin();

  // ── 게이트. 공개 전이면 운영진만.
  const isPublic = isWrappedPublic(season);
  if (!isPublic && !isAdmin) notFound();
  if (!myName && !isAdmin) notFound(); // 로그인 안 했으면 볼 대상이 없다

  // 남의 래핑은 운영진만 열 수 있다(공개 뒤에도).
  const requested = playerParam?.trim();
  const name = requested && isAdmin ? requested : myName;
  if (!name) notFound();

  const optional = (): string[][] => [];
  const [rawSeasonStats, rawRoster, rawMatches, rawLineups] = await Promise.all([
    getStatsRows(season).catch(optional),
    getRosterRows().catch(optional),
    getMatchesRows(),
    getLineupRows().catch(optional),
  ]);

  const rosterNames = new Set(
    rawRoster.slice(1).map((r) => (r[1] || "").trim()).filter(Boolean),
  );
  const no = rawRoster.slice(1).find((r) => (r[1] || "").trim() === name)?.[0]?.trim();

  // 시즌 범위로 가린 경기 + 그 시즌 라인업. (행을 지우지 않는 이유는 [[seasons]] 참고)
  const seasonMatchRows = maskMatchRowsToSeason(rawMatches, season);
  const seasonLineups = rowsOfMatchIds(rawLineups, seasonMatchIds(rawMatches, season));

  const statRow = rawSeasonStats.slice(1).find((r) => (r[1] || "").trim() === name);
  const totals = {
    apps: Number(statRow?.[3]) || 0,
    goals: Number(statRow?.[4]) || 0,
    assists: Number(statRow?.[5]) || 0,
    mom: Number(statRow?.[6]) || 0,
  };

  const report = buildPlayerStatsReport(name, seasonMatchRows, seasonLineups, totals);
  const chemistry = buildPlayerChemistry(name, seasonMatchRows, seasonLineups, rosterNames);
  const { seasonTitles } = await getTeamTitleData(season);

  // ── 출석: 그 시즌에 팀이 실제로 치른 경기(야유회·예정 제외) 대비.
  //    /players 프로필의 출석률과 같은 기준이어야 두 화면이 다른 말을 하지 않는다.
  const played = rawMatches
    .slice(1)
    .map((r) => ({
      date: r[0] || "",
      result: r[6] || "예정",
      type: r[7] || "",
      opponent: (r[3] || "").trim(),
      attendees: r[11] || "",
    }))
    .filter(
      (m) =>
        m.result !== "예정" &&
        isInSeason(m.date, season) &&
        m.attendees.trim() &&
        !isOuting(m.type),
    );
  const wasThere = (csv: string) => csv.split(",").map((v) => v.trim()).includes(name);
  const attended = played.filter((m) => wasThere(m.attendees)).length;

  // 최대 연속 출석. 자체전·풋살은 빠져도 연속이 안 끊긴다(칭호·프로필과 같은 규칙).
  let maxStreak = 0;
  let run = 0;
  for (const m of played) {
    if (wasThere(m.attendees)) run += 1;
    else if (isCasualMatch(m.result, m.type, m.opponent)) continue;
    else run = 0;
    maxStreak = Math.max(maxStreak, run);
  }

  // ── 베스트 11 재료 ──────────────────────────────────────────
  // 4개 그룹(GK/DF/MF/FW)이 아니라 **세부 역할**(LB·CAM·ST…)로 센다.
  // 그룹으로만 세면 "FW 8쿼터"인 사람이 주전 공격수로 올라온다.
  // 라인업 행 레이아웃은 backend.getLineupRows 와 같다: 2=formation, 3~13=p1~p11, 24=좌표
  const roleQuarters: Record<string, Record<string, number>> = {};
  const formationUse: Record<string, number> = {};
  seasonLineups.slice(1).forEach((r) => {
    const formation = r[2] || "";
    if (formation) formationUse[formation] = (formationUse[formation] ?? 0) + 1;
    const roles = rolesFor(formation, r[24]);
    for (let slot = 0; slot < 11; slot++) {
      const who = (r[3 + slot] || "").trim();
      if (!who || who === "미정" || !rosterNames.has(who)) continue;
      const role = roles[slot];
      (roleQuarters[who] ??= {})[role] = ((roleQuarters[who][role] ?? 0) + 1);
    }
  });

  // 틀은 **그 시즌 최다 사용 포메이션**에서 가져온다.
  // 4-3-3 으로 고정했더니 이 팀엔 윙어가 없어서(LW 7Q · RW 5Q) 수비수가 최전방에 섰다.
  const formation =
    Object.entries(formationUse).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
    "4-2-3-1";
  const xiShape: XiSlotSpec[] = rolesFor(formation).map((role) => ({
    role,
    group: groupOfRole(role),
  }));

  // ── 화면 장식용 재료 ────────────────────────────────────────
  // 사진 54장·상대 로고 7개·날씨 14경기가 있는데 래핑에서 한 번도 안 쓰고 있었다.
  const rowOf = (id: number) => rawMatches[id + 1] ?? [];
  const bestRow = report.bestGame ? rowOf(report.bestGame.matchId) : [];
  const bestPhoto = (bestRow[12] || "").split(",").map((v) => v.trim()).filter((v) => v.startsWith("http"))[0];
  const bestGameArt = {
    photo: bestPhoto,
    logo: getOpponentLogo((bestRow[3] || "").trim()) ?? undefined,
  };

  // 내가 출전한 경기만 세서 날씨 경험을 낸다(칭호의 날씨 조건과 같은 기준).
  const myMatches = played.filter((m) => wasThere(m.attendees));
  const weather = { rain: 0, heat: 0, cold: 0 };
  rawMatches.slice(1).forEach((r, id) => {
    if (!isInSeason(r[0], season)) return;
    if (!wasThere(r[11] || "")) return;
    const w = parseWeather(r[13] || "");
    // ⚠️ parseWeather 는 null 을 주지 않는다. 날씨가 없으면 { temp: 0, available: false } 다.
    //    available 을 안 보면 **기록 없는 경기가 전부 "0℃ 아래"** 로 세어진다(실제로 그랬다).
    if (!w.available) return;
    if (/비|소나기|뇌우/.test(w.description || "") || /^(09|10|11)/.test(w.icon || "")) weather.rain += 1;
    if (w.temp >= 30) weather.heat += 1;
    if (w.temp <= 0) weather.cold += 1;
  });

  // 월별 출석 — 경기 날짜에서 바로 나온다.
  const byMonth = new Map<string, { teamMatches: number; attended: number }>();
  played.forEach((m) => {
    const key = m.date.slice(0, 7);
    const cur = byMonth.get(key) ?? { teamMatches: 0, attended: 0 };
    cur.teamMatches += 1;
    if (wasThere(m.attendees)) cur.attended += 1;
    byMonth.set(key, cur);
  });
  const monthly = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, ...v }));

  // 선수별 출전 경기 수 — 순위 줄에 "39Q · 17경기" 로 같이 적는다.
  const matchesByPlayer: Record<string, number> = {};
  played.forEach((m) => {
    m.attendees.split(",").map((v) => v.trim()).filter(Boolean).forEach((n) => {
      if (rosterNames.has(n)) matchesByPlayer[n] = (matchesByPlayer[n] ?? 0) + 1;
    });
  });

  // MOM 을 언제 받았는지 — 숫자만 있으면 기록이고, 날짜가 붙어야 이야기가 된다.
  const momMatches = rawMatches
    .slice(1)
    .filter((r) => isInSeason(r[0], season) && (r[6] || "") !== "예정" && isMomOf(r[10] || "", name))
    .map((r) => ({ date: r[0] || "", opponent: (r[3] || "").trim() || "상대 미정" }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 팀 시즌 요약 — 개인 기록 사이에 한 장 끼워 호흡을 준다.
  const teamMatchRows: StatMatch[] = rawMatches
    .slice(1)
    .filter((r) => isInSeason(r[0], season))
    .map((r) => ({
      result: r[6] || "예정",
      type: r[7] || "일반 매칭",
      opponent: r[3] || "",
      location: r[2] || "",
      ourScore: r[4] || "-",
      theirScore: r[5] || "-",
    }));
  const ts = seasonSummary(teamMatchRows);
  const team = {
    played: ts.played, wins: ts.wins, draws: ts.draws, losses: ts.losses,
    goalsFor: ts.goalsFor, goalsAgainst: ts.goalsAgainst,
  };

  void myMatches;

  const data = buildSeasonWrapped({
    name,
    seasonId: season,
    seasonLabel: seasonLabel(season),
    rawSeasonStats,
    rosterNames,
    report,
    chemistry,
    titles: seasonTitles[name] ?? [],
    teamMatches: played.length,
    attended,
    maxStreak,
    roleQuarters,
    xiShape,
    formation,
    matchesByPlayer,
    monthly,
    team,
    bestGameArt,
    weather,
    momMatches,
    lineupCoverage: {
      // played = 그 시즌 치른 경기(야유회·예정 제외). 그중 라인업 행이 있는 경기만 집계에 든다.
      withLineup: new Set(seasonLineups.slice(1).map((r) => Number(r[0]))).size,
      total: played.length,
    },
  });

  const accent = seasonAccent(season).light;
  const seasonIdx = SEASONS.findIndex((x) => x.id === season);
  const film = buildFilm(rawMatches, rawSeasonStats, rosterNames, season, team, seasonTitles);
  // 개인 래핑 앞에 팀 필름을 튼다. 기록이 없는 사람도 팀의 시즌은 봤으면 해서 양쪽 다 감싼다.
  const withFilm = (node: React.ReactNode) =>
    film ? (
      <SeasonFilm data={film} accent={accent} name={name} nextLabel={SEASONS[seasonIdx + 1]?.label}>
        {node}
      </SeasonFilm>
    ) : (
      node
    );
  const exitHref = `/players/${encodeURIComponent(name)}?season=${season}`;

  // 한 경기도 안 뛴 사람에게 0으로 가득한 여덟 장을 넘기게 하지 않는다.
  if (!data.hasRecord) {
    return withFilm(
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#060409] px-8 text-center">
        <p className="text-[11px] font-black tracking-[0.3em]" style={{ color: accent }}>
          {data.seasonLabel} SEASON
        </p>
        <p className="text-[17px] font-black text-white">
          {name}님은 이번 시즌 기록이 아직 없어요
        </p>
        <p className="text-[12.5px] font-bold leading-relaxed text-white/40">
          한 경기만 뛰어도 돌아볼 거리가 생깁니다.
        </p>
        <a
          href={exitHref}
          className="mt-2 rounded-full px-4 py-2 text-[12px] font-black text-white"
          style={{ background: `${accent}2e`, border: `1px solid ${accent}66` }}
        >
          프로필로 가기
        </a>
      </main>,
    );
  }

  return withFilm(
    <WrappedStory
      data={data}
      no={no}
      accent={accent}
      exitHref={exitHref}
      preview={!isPublic}
    />,
  );
}

/** n 개를 고르게 뽑는다(앞·중간·끝이 다 들어가게). */
function spread<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list;
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))]);
}

/** 시즌 필름 재료. 치른 경기가 없으면 null — 필름 없이 바로 본편. */
function buildFilm(
  rawMatches: string[][],
  rawSeasonStats: string[][],
  rosterNames: Set<string>,
  season: string,
  team: SeasonFilmData["team"],
  seasonTitles: Awaited<ReturnType<typeof getTeamTitleData>>["seasonTitles"],
): SeasonFilmData | null {
  const photosOf = (r: string[]) =>
    (r[12] || "").split(",").map((v) => v.trim()).filter((v) => v.startsWith("http"));

  const rows = rawMatches
    .slice(1)
    .filter((r) => isInSeason(r[0], season) && (r[6] || "예정") !== "예정" && !isOuting(r[7]))
    .map((r) => ({ r, date: normalizeDate(r[0]) }))
    .filter((x) => x.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length === 0) return null;

  const num = (v: string | undefined) => (v && v.trim() !== "" && !isNaN(Number(v)) ? Number(v) : null);
  const matches: FilmMatch[] = rows.map(({ r, date }) => {
    const result = r[6] || "";
    const type = r[7] || "";
    const opp = (r[3] || "").trim();
    const casual = isCasualMatch(result, type, opp);
    const photos = photosOf(r);
    return {
      date,
      opponent: casual ? (type.trim() || "자체전") : opp || "상대 미정",
      logo: casual ? null : getOpponentLogo(opp),
      our: num(r[4]),
      their: num(r[5]),
      result,
      casual,
      photo: photos[0] ? cldFit(photos[0], 1080) : undefined,
    };
  });

  const allPhotos = rows.flatMap(({ r }, i) =>
    photosOf(r).map((src) => ({ src: cldFit(src, 1080), date: matches[i].date, opponent: matches[i].opponent })),
  );

  // 리더 — 시즌 stats 행: 1=이름, 3=출전, 4=골, 5=도움, 6=MOM
  const stats = rawSeasonStats
    .slice(1)
    .map((r) => ({
      name: (r[1] || "").trim(),
      apps: Number(r[3]) || 0,
      goals: Number(r[4]) || 0,
      assists: Number(r[5]) || 0,
      mom: Number(r[6]) || 0,
    }))
    .filter((p) => p.name && rosterNames.has(p.name));
  const leader = (label: string, unit: string, key: "goals" | "assists" | "mom" | "apps") => {
    const top = Math.max(0, ...stats.map((p) => p[key]));
    if (top <= 0) return null;
    return {
      label,
      unit,
      value: top,
      names: stats.filter((p) => p[key] === top).map((p) => p.name).sort((a, b) => a.localeCompare(b, "ko")),
    };
  };
  // 공격포인트왕·클린시트왕은 새로 세지 않고 칭호의 리더 판정을 그대로 쓴다(/stats 와 같은 기준).
  // 클린시트는 GK 로 무실점한 경기라 라인업이 있어야 셀 수 있다 — 여기서 다시 세면 어긋난다.
  const fromTitle = (label: string, unit: string, id: string) => {
    const won = Object.entries(seasonTitles)
      .map(([n, ts]) => ({ n, t: ts.find((t) => t.id === id) }))
      .filter((x) => x.t);
    const value = Number(won[0]?.t?.stats?.[0]?.value) || 0;
    if (!won.length || value <= 0) return null;
    return { label, unit, value, names: won.map((x) => x.n).sort((a, b) => a.localeCompare(b, "ko")) };
  };
  const leaders = [
    leader("득점왕", "골", "goals"),
    leader("도움왕", "도움", "assists"),
    fromTitle("공포왕", "P", "lead_points"),
    leader("MOM", "회", "mom"),
    fromTitle("클린시트왕", "경기", "lead_cleansheet"),
    leader("개근", "경기", "apps"),
  ].filter((l): l is NonNullable<typeof l> => l !== null);

  const squad = stats
    .filter((p) => p.apps > 0)
    .sort((a, b) => b.apps - a.apps || a.name.localeCompare(b.name, "ko"))
    .map((p) => p.name);

  // 가장 짜릿했던 날 — 정식 경기 중 점수 차가 가장 큰 승리(같으면 많이 넣은 쪽).
  const biggestWin =
    matches
      .filter((m) => !m.casual && m.our !== null && m.their !== null && m.our > m.their)
      .sort((a, b) => b.our! - b.their! - (a.our! - a.their!) || b.our! - a.our!)[0] ?? null;

  // ── 기록실 재료
  // 연승·무패는 정식 경기만 센다. 자체전은 승패가 우리끼리라 흐름을 끊지도 잇지도 않는다.
  let winRun = 0, maxWin = 0, unbeatenRun = 0, maxUnbeaten = 0;
  matches
    .filter((m) => !m.casual && m.our !== null && m.their !== null)
    .forEach((m) => {
      const won = m.our! > m.their!;
      const lost = m.our! < m.their!;
      winRun = won ? winRun + 1 : 0;
      unbeatenRun = lost ? 0 : unbeatenRun + 1;
      maxWin = Math.max(maxWin, winRun);
      maxUnbeaten = Math.max(maxUnbeaten, unbeatenRun);
    });
  const csv = (v: string | undefined) => (v || "").split(",").map((x) => x.trim()).filter(Boolean);
  const scorers = new Set(rows.flatMap(({ r }) => csv(r[8])).filter((n) => rosterNames.has(n)));
  const venues = new Set(rows.map(({ r }) => (r[2] || "").trim()).filter(Boolean));
  const byMonth = new Map<string, number>();
  rows.forEach(({ date }) => byMonth.set(date.slice(0, 7), (byMonth.get(date.slice(0, 7)) ?? 0) + 1));
  const monthly = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }));

  // 최고의 콤비 — 득점·도움 짝. 2번 이상 합작한 짝만.
  const statMatches: StatMatch[] = rows.map(({ r }) => ({
    result: r[6] || "",
    type: r[7] || "일반 매칭",
    opponent: r[3] || "",
    location: r[2] || "",
    ourScore: r[4] || "-",
    theirScore: r[5] || "-",
    goals: r[8] || "",
    assists: r[9] || "",
  }));
  const duo = bestDuos(statMatches, 2, 1)[0] ?? null;

  // 라이벌 — 가장 많이 붙은 상대(2번 이상).
  const rivalRow = opponentRecords(statMatches).find((o) => o.played >= 2);
  const rival = rivalRow
    ? {
        name: rivalRow.key,
        logo: getOpponentLogo(rivalRow.key),
        played: rivalRow.played,
        w: rivalRow.w,
        d: rivalRow.d,
        l: rivalRow.l,
        // 맞대결 하나하나 — 언제·어디서·몇 대 몇
        games: rows
          .filter(({ r }) => (r[3] || "").trim() === rivalRow.key && !isCasualMatch(r[6] || "", r[7], r[3]))
          .map(({ r, date }) => ({
            date,
            venue: (r[2] || "").trim(),
            our: num(r[4]),
            their: num(r[5]),
            result: r[6] || "",
          })),
      }
    : null;

  // 날씨 — 기록이 있는 경기만(parseWeather 는 없으면 available:false 를 준다).
  const weathered = rows
    .map(({ r, date }) => ({ date, w: parseWeather(r[13] || "") }))
    .filter((x) => x.w.available);
  const rainy = weathered.filter((x) => /비|소나기|뇌우/.test(x.w.description || "") || /^(09|10|11)/.test(x.w.icon || "")).length;
  const byTemp = [...weathered].sort((a, b) => a.w.temp - b.w.temp);
  const weather =
    weathered.length >= 3
      ? {
          rainy,
          coldest: { temp: byTemp[0].w.temp, date: byTemp[0].date },
          hottest: { temp: byTemp[byTemp.length - 1].w.temp, date: byTemp[byTemp.length - 1].date },
        }
      : null;

  return {
    seasonId: season,
    seasonLabel: seasonLabel(season),
    isFirstSeason: SEASONS[0]?.id === season,
    matchCount: rows.length,
    team,
    matches,
    montage: spread(allPhotos, 16),
    collage: spread(allPhotos, 15).map((p) => p.src),
    leaders,
    squad,
    biggestWin,
    opponentCount: new Set(matches.filter((m) => !m.casual).map((m) => m.opponent)).size,
    records: {
      winStreak: maxWin,
      unbeaten: maxUnbeaten,
      scorers: scorers.size,
      venues: venues.size,
      photos: allPhotos.length,
    },
    monthly,
    duo,
    rival,
    weather,
  };
}
