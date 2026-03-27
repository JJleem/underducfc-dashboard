// app/page.tsx
import { getSheetData } from "./lib/google-sheets";
import DashboardClient, {
  LineupData,
  MatchData,
  NoticeData,
  PlayerData,
} from "./components/DashboardClient";

export default async function TeamDashboardPage() {
  // 💡 1. 가져오는 데이터가 2차원 문자열 배열(string[][])임을 명시합니다.
  const rawMatches: string[][] = await getSheetData("matches!A1:L50");
  const rawRoster: string[][] = await getSheetData("roster!A1:J50");
  const rawStats: string[][] = await getSheetData("stats!A1:G50");
  const rawNotices: string[][] = await getSheetData("notice!A1:D20");
  let rawLineups: string[][] = [];
  try {
    rawLineups = await getSheetData("lineup!A1:S100");
  } catch {
    rawLineups = [];
  }
  // 💡 2. MatchData 타입에 맞춰서 가공 (row: string[] 명시)
  const matches: MatchData[] = rawMatches
    .slice(1)
    .map((row: string[], index: number) => ({
      id: index,
      date: row[0] || "",
      time: row[1] || "미정",
      location: row[2] || "미정",
      opponent: row[3] || "미정",
      ourScore: row[4] || "-",
      theirScore: row[5] || "-",
      result: row[6] || "예정",
      type: row[7] || "일반 매칭", // H열 (8번째)
      goals: row[8] || "",
      assists: row[9] || "",
      attendees: row[11] || "", // L열 참석자
    }));

  // 💡 3. Map의 Key와 Value 타입 명시
  const rosterMap = new Map<string, { no: string; pos: string }>();
  rawRoster.slice(1).forEach((row: string[]) => {
    rosterMap.set(row[0], { no: row[1] || "-", pos: row[2] || "-" });
  });

  // 라인업용 이름 → 등번호 맵 (A=등번호, B=이름)
  const lineupRosterMap: Record<string, string> = {};
  rawRoster.slice(1).forEach((row: string[]) => {
    const no = row[0]?.trim();
    const name = row[1]?.trim();
    if (name && no) lineupRosterMap[name] = no;
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
    const scoreA = Number(a.goals) + Number(a.assists) + Number(a.mom);
    const scoreB = Number(b.goals) + Number(b.assists) + Number(b.mom);

    // 1순위: 공격 포인트 합계 (내림차순)
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // 2순위: 포인트가 같을 경우, 출전 수(apps) 비교 (내림차순)
    if (Number(b.apps) !== Number(a.apps)) {
      return Number(b.apps) - Number(a.apps);
    }

    // 3순위: 포인트와 출전 수가 모두 같으면 이름순 (오름차순)
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
  }));

  const firstNoticeRow = rawNotices[1]; // index 1이 실제 첫 번째 데이터 줄

  // 2. 데이터가 있을 때만 객체로 만들고, 없으면 undefined 처리를 합니다.
  const latestNotice: NoticeData | undefined = firstNoticeRow
    ? {
        id: 0,
        date: firstNoticeRow[0] || "",
        title: firstNoticeRow[1] || "",
        content: firstNoticeRow[2] || "",
        important: firstNoticeRow[3] === "Y",
      }
    : undefined;
  return (
    <DashboardClient
      matches={matches}
      players={players}
      notice={latestNotice}
      lineups={lineups}
      rosterMap={lineupRosterMap}
    />
  );
}
