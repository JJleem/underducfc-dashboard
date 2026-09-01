import { auth } from "@/auth";
import { isAdmin } from "../lib/admin";
import { getMatchesRows } from "../lib/matches-backend";
import { getAttendanceVoteRows, getVoteCommentRows, getUsersRows, getRosterRows } from "../lib/backend";
import { getMatchWeather, serializeWeather, parseWeather } from "../lib/weather";
import { isVoteClosed, isMatchDayOver } from "../lib/vote-deadline";
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
  const admin = isAdmin(session?.user);

  // O열(출석 투표 상태)까지 포함해서 fetch.
  // 4개가 서로 독립이라 병렬로 받는다(직렬이면 왕복이 그대로 누적됨).
  // matches는 기존처럼 실패 시 throw, 나머지 3개는 빈 배열로 폴백.
  const optional = (): string[][] => [];
  const [rawMatches, rawAttendanceVotes, rawVoteComments, rawUsers, rawRoster]: string[][][] =
    await Promise.all([
      getMatchesRows(),
      getAttendanceVoteRows().catch(optional),
      getVoteCommentRows().catch(optional),
      getUsersRows().catch(optional),
      // 비활동 인원을 미투표 명단에서 빼기 위해 함께 읽는다.
      getRosterRows().catch(optional),
    ]);

  const normalizeTime = (raw: string): string => {
    if (!raw) return "미정";
    const m = raw.match(/(\d{1,2}):(\d{2})/);
    if (!m) return "미정";
    return `${m[1].padStart(2, "0")}:${m[2]}`;
  };

  const matches: { id: number; date: string; time: string; location: string; opponent: string; result: string; type: string; attendees: string; weatherRaw: string; attendanceStatus: "진행중" | "마감" }[] = rawMatches.slice(1).map((row: string[], index: number) => ({
    id: index,
    date: row[0] || "",
    time: normalizeTime(row[1]),
    location: row[2] || "미정",
    opponent: row[3] || "미정",
    result: row[6] || "예정",
    type: row[7] || "일반 매칭",
    attendees: row[11] || "",
    weatherRaw: row[13] || "", // N열
    // 저장된 "마감"에 더해, 경기 전날 23:00(KST)이 지나면 자동으로 마감으로 본다.
    // 크론으로 값을 뒤집지 않고 여기서 계산한다([[app/lib/vote-deadline.ts]]).
    attendanceStatus: isVoteClosed(row[0] || "", row[14]) ? "마감" : "진행중",
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
      emoticon: r[5] || null,
    }));

  // 비활동 인원은 애초에 투표하지 않는다. 미투표 명단에 계속 남아 있으면
  // "아직 안 한 사람"이 실제보다 많아 보여서 명단이 안 읽힌다.
  // (부상은 뺀다 — 못 나온다는 표시를 하러 투표하는 사람들이다)
  // 이름은 users.nickname 과 roster.name 을 그대로 맞춘다. 못 맞추면 남겨 둔다 —
  // 잘못 빼서 사람을 감추는 것보다 한 명 더 보이는 쪽이 낫다.
  const inactiveNames = new Set(
    rawRoster
      .slice(1)
      .filter((r: string[]) => (r[3] || "").trim() === "비활동")
      .map((r: string[]) => (r[1] || "").trim()),
  );

  const users = rawUsers
    .slice(1)
    .filter((r: string[]) => r[0])
    .map((r: string[]) => ({
      kakaoId: r[0] || "",
      nickname: r[1] || "",
    }))
    .filter((u) => !inactiveNames.has(u.nickname.trim()));

  // 예정 경기 (가까운 순)
  // **투표가 마감돼도 경기 당일까지는 여기 남긴다** — 그날 아침에 명단과 시간·장소를
  // 확인하는 게 이 화면의 주 용도다. 날짜가 지나야 아래로 내려간다.
  const upcomingMatches = matches
    .filter((m) => m.result === "예정" && m.type !== "야유회" && !isMatchDayOver(m.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 지난 투표 — 위에 남아 있는 경기는 빼서 두 곳에 겹쳐 나오지 않게 한다.
  const upcomingIds = new Set(upcomingMatches.map((m) => m.id));
  const pastVoteMatchIds = new Set(attendanceVotes.map((v) => v.matchId));
  const pastMatches = matches
    .filter(
      (m) =>
        !upcomingIds.has(m.id) &&
        (m.attendanceStatus === "마감" || (m.result !== "예정" && pastVoteMatchIds.has(m.id))),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 날씨: 시트에 저장된 값 우선, 없으면 API 조회 후 시트에 저장
  const weatherMap: Record<number, { temp: number; description: string; icon: string; pop: number; available: boolean }> = {};

  const weatherEntries = await Promise.all(
    [...upcomingMatches, ...pastMatches].map(async (m) => {
      if (m.weatherRaw) return [m.id, parseWeather(m.weatherRaw)] as const;
      if (m.result !== "예정") return null;

      // 날씨가 비어 있는 경기가 여러 개여도 외부 조회를 직렬로 기다리지 않는다.
      const weather = await getMatchWeather(m.date, m.time, m.location);
      if (weather.available) {
        try {
          await writeMatchWeather(m.id, serializeWeather(weather));
        } catch (e) {
          console.error(`[vote] 날씨 저장 실패 match=${m.id}:`, e);
        }
      }
      return [m.id, weather] as const;
    }),
  );
  weatherEntries.forEach((entry) => {
    if (entry) weatherMap[entry[0]] = entry[1];
  });

  return (
    <VoteClient
      upcomingMatches={upcomingMatches.map((match) => {
        const { weatherRaw, ...withoutWeather } = match;
        void weatherRaw;
        return withoutWeather;
      })}
      pastMatches={pastMatches.map((match) => {
        const { weatherRaw, ...withoutWeather } = match;
        void weatherRaw;
        return withoutWeather;
      })}
      attendanceVotes={attendanceVotes}
      voteComments={voteComments}
      users={users}
      weatherMap={weatherMap}
      currentUser={currentUser}
      isAdmin={admin}
    />
  );
}
