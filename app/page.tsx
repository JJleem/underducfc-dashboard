// app/page.tsx
import { getSheetData } from "./lib/google-sheets";
import DashboardClient, {
  MatchData,
  NoticeData,
  PlayerData,
} from "./components/DashboardClient";

export default async function TeamDashboardPage() {
  // 💡 1. 가져오는 데이터가 2차원 문자열 배열(string[][])임을 명시합니다.
  const rawMatches: string[][] = await getSheetData("matches!A1:J50");
  const rawRoster: string[][] = await getSheetData("roster!A1:J50");
  const rawStats: string[][] = await getSheetData("stats!A1:F50");
  const rawNotices: string[][] = await getSheetData("notice!A1:D20");
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
      goals: row[8] || "", // I열 (9번째) 득점자
      assists: row[9] || "", // J열 (10번째) 어시스트
    }));

  // 💡 3. Map의 Key와 Value 타입 명시
  const rosterMap = new Map<string, { no: string; pos: string }>();
  rawRoster.slice(1).forEach((row: string[]) => {
    rosterMap.set(row[0], { no: row[1] || "-", pos: row[2] || "-" });
  });

  // 💡 4. PlayerData 타입에 맞춰서 가공
  const players: PlayerData[] = rawStats.slice(1).map((row: string[]) => {
    const name = row[1];
    const rosterInfo = rosterMap.get(name) || { no: "-", pos: "-" };

    return {
      name: name,
      no: rosterInfo.no,
      pos: rosterInfo.pos,
      apps: Number(row[2]) || 0,
      goals: Number(row[3]) || 0,
      assists: Number(row[4]) || 0,
      mom: Number(row[5]) || 0,
    };
  });

  // 💡 5. 숫자 타입으로 변환했기 때문에 정렬 에러도 사라집니다.
  players.sort((a, b) => {
    const scoreA = Number(a.goals) + Number(a.assists) + Number(a.mom);
    const scoreB = Number(b.goals) + Number(b.assists) + Number(b.mom);

    // 점수가 다르면 높은 순서대로 (내림차순)
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // 점수가 같으면 이름 가나다 순으로 (오름차순)
    return a.name.localeCompare(b.name, "ko");
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
      }
    : undefined;
  return (
    <DashboardClient
      matches={matches}
      players={players}
      notice={latestNotice}
    />
  );
}
