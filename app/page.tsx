// app/page.tsx
import { auth } from "@/auth";
import { isAdmin } from "./lib/admin";
import {
  getRosterRows,
  getStatsRows,
  getNoticeRows,
  getLineupRows,
  getAttendanceVoteRows,
  getVoteCommentRows,
  getFeaturedRows,
} from "./lib/backend";
import { getMatchesRows } from "./lib/matches-backend";
import DashboardClient, {
  AttendanceVoteData,
  LineupData,
  MatchData,
  NoticeData,
  PlayerData,
} from "./components/DashboardClient";
import {
  buildContexts,
  evaluatePlayer,
  evaluateLeaders,
  managerTitle,
  pickBadges,
  MANAGER_NAME,
  type EarnedTitle,
} from "./lib/titles";
import { parseSubstitutions } from "./lib/lineup";
export default async function TeamDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialView = tab === "stats" ? "stats" : tab === "matches" ? "matches" : "home";
  // 로그인 세션 (카카오) — 로그인 안 했으면 null
  const session = await auth();
  const currentUser = session?.user
    ? {
        kakaoId: (session.user as { kakaoId?: string }).kakaoId ?? "",
        name: session.user.name ?? "",
        image: session.user.image ?? "",
      }
    : null;
  const admin = isAdmin(currentUser?.kakaoId);

  // 시트 하나가 일시 실패해도 홈 전체가 Runtime Error로 죽지 않게 병렬 안전 로딩
  const sheetResults = await Promise.allSettled([
    getMatchesRows(),
    getRosterRows(),
    getStatsRows(),
    getNoticeRows(),
    getLineupRows(),
    getAttendanceVoteRows(),
    getVoteCommentRows(),
    getFeaturedRows(),
  ]);
  const rowsOf = (index: number): string[][] =>
    sheetResults[index].status === "fulfilled" ? sheetResults[index].value : [];
  const rawMatches = rowsOf(0);
  const rawRoster = rowsOf(1);
  const rawStats = rowsOf(2);
  const rawNotices = rowsOf(3);
  const rawLineups = rowsOf(4);
  const rawAttendanceVotes = rowsOf(5);
  const rawVoteComments = rowsOf(6);
  const rawFeatured = rowsOf(7);
  // Google Sheets가 "08:00"을 시간 포맷으로 인식해 "08:00:00"으로 반환하는 경우를 정규화
  const normalizeTime = (raw: string): string => {
    if (!raw) return "미정";
    const m = raw.match(/(\d{1,2}):(\d{2})/);
    if (!m) return "미정";
    return `${m[1].padStart(2, "0")}:${m[2]}`;
  };

  // 💡 2. MatchData 타입에 맞춰서 가공 (row: string[] 명시)
  const matches: MatchData[] = rawMatches
    .slice(1)
    .map((row: string[], index: number) => ({
      id: index,
      date: row[0] || "",
      time: normalizeTime(row[1]),
      location: row[2] || "미정",
      opponent: row[3] || "미정",
      ourScore: row[4] || "-",
      theirScore: row[5] || "-",
      result: row[6] || "예정",
      type: row[7] || "일반 매칭", // H열 (8번째)
      goals: row[8] || "",
      assists: row[9] || "",
      mom: row[10] || "", // K열 MOM
      attendees: row[11] || "", // L열 참석자
      photos: row[12] || "", // M열 Drive 파일ID (쉼표 구분)
      weather: row[13] || "", // N열 날씨
      attendanceStatus: row[14] === "마감" ? "마감" : "진행중",
    }));

  // 💡 3. Map의 Key와 Value 타입 명시
  const rosterMap = new Map<string, { no: string; pos: string }>();
  rawRoster.slice(1).forEach((row: string[]) => {
    const name = row[1]?.trim();
    if (name) rosterMap.set(name, { no: row[0] || "-", pos: row[2] || "-" });
  });

  // 라인업용 이름 → 등번호 맵 (A=등번호, B=이름)
  const lineupRosterMap: Record<string, string> = {};
  rawRoster.slice(1).forEach((row: string[]) => {
    const no = row[0]?.trim();
    const name = row[1]?.trim();
    if (name) lineupRosterMap[name] = no || "?";
  });

  // 이름 → 주장 역할 맵 (F=비고: C / VC)
  const captainRoles: Record<string, string> = {};
  rawRoster.slice(1).forEach((row: string[]) => {
    const name = row[1]?.trim();
    const role = row[5]?.trim().toUpperCase();
    if (name && (role === "C" || role === "VC")) captainRoles[name] = role;
  });

  // 💡 4. PlayerData 타입에 맞춰서 가공
  const players: PlayerData[] = rawStats.slice(1).map((row: string[]) => {
    const name = row[1];
    const rosterInfo = rosterMap.get(name) || { no: "-", pos: "-" };
    const pos = row[2];
    return {
      name: name,
      no: rosterInfo.no,
      pos: pos,
      apps: Number(row[3]) || 0,
      goals: Number(row[4]) || 0,
      assists: Number(row[5]) || 0,
      mom: Number(row[6]) || 0,
    };
  });

  // 💡 5. 숫자 타입으로 변환했기 때문에 정렬 에러도 사라집니다.
  // 💡 5. TypeScript 에러 해결을 위해 Number()로 명시적 형변환
  players.sort((a, b) => {
    const scoreA = Number(a.goals) + Number(a.assists) + Number(a.mom) + Number(a.apps);
    const scoreB = Number(b.goals) + Number(b.assists) + Number(b.mom) + Number(b.apps);

    // 1순위: 포인트 합계 (내림차순)
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // 2순위: 포인트가 같으면 이름순 (오름차순)
    return a.name.localeCompare(b.name, "ko");
  });

  const lineups: LineupData[] = rawLineups.slice(1).map((row: string[]) => ({
    matchId: Number(row[0]) || 0,
    quarter: row[1] || "",
    formation: row[2] || "",
    players: [
      row[3] || "", row[4] || "", row[5] || "", row[6] || "",
      row[7] || "", row[8] || "", row[9] || "", row[10] || "",
      row[11] || "", row[12] || "", row[13] || "",
    ].filter(Boolean),
    subs: [
      row[14] || "", row[15] || "", row[16] || "", row[17] || "", row[18] || "",
    ].filter(Boolean),
    substitutions: parseSubstitutions(row[19]),
  }));

  const attendanceVotes: AttendanceVoteData[] = rawAttendanceVotes
    .slice(1)
    .filter((row: string[]) => row[0])
    .map((row: string[]) => ({
      matchId: Number(row[0]) || 0,
      kakaoId: row[1] || "",
      nickname: row[2] || "",
      response: row[3] || "",
      timestamp: row[4] || "",
    }));

  // 칭호 산출: 선수별 자동 칭호 + 리더(팀 1위) + 감독
  const contexts = buildContexts({
    rawStats,
    rawMatches,
    rawLineups,
    rawRoster,
    rawAttendanceVotes,
    rawVoteComments,
  });
  const leaders = evaluateLeaders(contexts);
  const allTitles: Record<string, EarnedTitle[]> = {};
  contexts.forEach((ctx, name) => {
    const earned = evaluatePlayer(ctx);
    const lead = leaders.get(name) ?? [];
    const all = [...lead, ...earned];
    if (name === MANAGER_NAME) all.unshift(managerTitle());
    if (all.length) allTitles[name] = all;
  });
  // 감독이 stats에 없으면(선수로 안 뜀) 감독 뱃지만 단독 부여
  if (!allTitles[MANAGER_NAME]) allTitles[MANAGER_NAME] = [managerTitle()];

  // 대표 칭호(본인 선택) 맵
  const featuredMap: Record<string, string[]> = {};
  rawFeatured.forEach((r) => {
    const nm = (r[0] || "").trim();
    if (!nm) return;
    const ids = [r[1], r[2], r[3]].map((x) => (x || "").trim()).filter(Boolean);
    if (ids.length) featuredMap[nm] = ids;
  });

  // 라인업/순위 표시용: 대표 우선, 없으면 자동 상위 3
  const playerTitles: Record<string, EarnedTitle[]> = {};
  Object.entries(allTitles).forEach(([name, all]) => {
    playerTitles[name] = pickBadges(all, featuredMap[name]);
  });

  const firstNoticeRow = rawNotices[1]; // index 1이 실제 첫 번째 데이터 줄

  // 2. 데이터가 있을 때만 객체로 만들고, 없으면 undefined 처리를 합니다.
  const latestNotice: NoticeData | undefined = firstNoticeRow
    ? {
        id: 0,
        date: firstNoticeRow[0] || "",
        title: firstNoticeRow[1] || "",
        content: firstNoticeRow[2] || "",
        important: firstNoticeRow[3] === "Y",
        location: firstNoticeRow[4] || "",
      }
    : undefined;
  return (
    <DashboardClient
      matches={matches}
      players={players}
      notice={latestNotice}
      lineups={lineups}
      rosterMap={lineupRosterMap}
      captainRoles={captainRoles}
      currentUser={currentUser}
      isAdmin={admin}
      attendanceVotes={attendanceVotes}
      playerTitles={playerTitles}
      initialView={initialView}
    />
  );
}
