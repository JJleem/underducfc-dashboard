import { auth } from "@/auth";
import { isAdmin } from "../lib/admin";
import { getSheetData } from "../lib/google-sheets";
import { getMatchWeather, serializeWeather, parseWeather } from "../lib/weather";
import { writeMatchWeather } from "../lib/sheets-write";
import VoteClient from "./VoteClient";

export default async function VotePage() {
  const session = await auth();
  const currentUser = session?.user
    ? {
        kakaoId: (session.user as { kakaoId?: string }).kakaoId ?? "",
        name: session.user.name ?? "",
        image: session.user.image ?? "",
      }
    : null;
  const admin = isAdmin(currentUser?.kakaoId);

  // N열(날씨)까지 포함해서 fetch
  const rawMatches = await getSheetData("matches!A1:N50");
  let rawAttendanceVotes: string[][] = [];
  try {
    rawAttendanceVotes = await getSheetData("attendance_vote!A1:E500");
  } catch {
    rawAttendanceVotes = [];
  }
  let rawVoteComments: string[][] = [];
  try {
    rawVoteComments = await getSheetData("vote_comment!A1:E500");
  } catch {
    rawVoteComments = [];
  }
  let rawUsers: string[][] = [];
  try {
    rawUsers = await getSheetData("users!A1:E1000");
  } catch {
    rawUsers = [];
  }

  const normalizeTime = (raw: string): string => {
    if (!raw) return "미정";
    const m = raw.match(/(\d{1,2}):(\d{2})/);
    if (!m) return "미정";
    return `${m[1].padStart(2, "0")}:${m[2]}`;
  };

  const matches: { id: number; date: string; time: string; location: string; opponent: string; result: string; type: string; attendees: string; weatherRaw: string }[] = rawMatches.slice(1).map((row: string[], index: number) => ({
    id: index,
    date: row[0] || "",
    time: normalizeTime(row[1]),
    location: row[2] || "미정",
    opponent: row[3] || "미정",
    result: row[6] || "예정",
    type: row[7] || "일반 매칭",
    attendees: row[11] || "",
    weatherRaw: row[13] || "", // N열
  }));

  const attendanceVotes = rawAttendanceVotes
    .slice(1)
    .filter((r: string[]) => r[0])
    .map((r: string[]) => ({
      matchId: Number(r[0]) || 0,
      kakaoId: r[1] || "",
      nickname: r[2] || "",
      response: r[3] || "",
      timestamp: r[4] || "",
    }));

  const voteComments = rawVoteComments
    .slice(1)
    .filter((r: string[]) => r[0])
    .map((r: string[]) => ({
      matchId: Number(r[0]) || 0,
      kakaoId: r[1] || "",
      nickname: r[2] || "",
      message: r[3] || "",
      timestamp: r[4] || "",
    }));

  const users = rawUsers
    .slice(1)
    .filter((r: string[]) => r[0])
    .map((r: string[]) => ({
      kakaoId: r[0] || "",
      nickname: r[1] || "",
    }));

  // 예정 경기 (최신순)
  const upcomingMatches = matches
    .filter((m) => m.result === "예정" && m.type !== "야유회")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 지난 투표
  const pastVoteMatchIds = new Set(attendanceVotes.map((v) => v.matchId));
  const pastMatches = matches
    .filter((m) => m.result !== "예정" && pastVoteMatchIds.has(m.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 날씨: 시트에 저장된 값 우선, 없으면 API 조회 후 시트에 저장
  const weatherMap: Record<number, { temp: number; description: string; icon: string; pop: number; available: boolean }> = {};

  for (const m of [...upcomingMatches, ...pastMatches]) {
    if (m.weatherRaw) {
      // 시트에 이미 저장된 날씨
      weatherMap[m.id] = parseWeather(m.weatherRaw);
    } else if (m.result === "예정") {
      // 예정 경기 & 날씨 미저장 → API 조회 시도
      const weather = await getMatchWeather(m.date, m.time, m.location);
      weatherMap[m.id] = weather;
      // 조회 성공하면 시트에 기록 (다음 방문부터는 시트에서 읽음)
      if (weather.available) {
        try {
          await writeMatchWeather(m.id, serializeWeather(weather));
        } catch (e) {
          console.error(`[vote] 날씨 저장 실패 match=${m.id}:`, e);
        }
      }
    }
  }

  return (
    <VoteClient
      upcomingMatches={upcomingMatches.map(({ weatherRaw: _, ...m }) => m)}
      pastMatches={pastMatches.map(({ weatherRaw: _, ...m }) => m)}
      attendanceVotes={attendanceVotes}
      voteComments={voteComments}
      users={users}
      weatherMap={weatherMap}
      currentUser={currentUser}
      isAdmin={admin}
    />
  );
}
