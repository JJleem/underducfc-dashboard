// app/lib/backend.ts
//
// matches 외 도메인의 underduck 백엔드 읽기 래퍼.
// 백엔드 응답(JSON)을 기존 getSheetData(...)가 주던 string[][] 레이아웃으로 환원해,
// 소비처(파서)를 바꾸지 않고 getSheetData 호출만 이 함수들로 교체할 수 있게 한다.
//
// ⚠️ 서버사이드 전용([[underduck.ts]]의 window 가드). route handler / server component에서만.

import { udGet } from "./underduck";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const pad = (arr: (string | null)[] | null | undefined, n: number): string[] => {
  const x = (arr ?? []).slice(0, n).map(s);
  while (x.length < n) x.push("");
  return x;
};

// ── roster ── 시트 컬럼: A=no B=name C=pos D=status (E 미사용) F=memo(주장역할)
interface RosterOut {
  id: number; no: string | null; name: string | null;
  pos: string | null; status: string | null; memo: string | null;
}
export async function getRosterRows(): Promise<string[][]> {
  const rows = await udGet<RosterOut[]>("/api/underduck/roster");
  const HEADER = ["no", "name", "pos", "status", "", "memo"];
  return [HEADER, ...rows.map((r) => [s(r.no), s(r.name), s(r.pos), s(r.status), "", s(r.memo)])];
}

// ── stats ── 시트 컬럼: A=no B=name C=pos D=apps E=goals F=assists G=mom
// 백엔드 stats는 matches/mom_vote 실시간 집계라 no/pos가 null → roster에서 이름으로 보강.
interface StatOut {
  id: number; no: string | null; name: string | null; pos: string | null;
  apps: number | null; goals: number | null; assists: number | null; mom: number | null;
}
export async function getStatsRows(): Promise<string[][]> {
  const [stats, roster] = await Promise.all([
    udGet<StatOut[]>("/api/underduck/stats"),
    udGet<RosterOut[]>("/api/underduck/roster"),
  ]);
  const byName = new Map<string, { no: string; pos: string }>();
  for (const r of roster) {
    const name = (r.name ?? "").trim();
    if (name) byName.set(name, { no: s(r.no), pos: s(r.pos) });
  }
  const HEADER = ["no", "name", "pos", "apps", "goals", "assists", "mom"];
  return [HEADER, ...stats.map((r) => {
    const info = byName.get((r.name ?? "").trim());
    return [info?.no ?? s(r.no), s(r.name), info?.pos ?? s(r.pos), s(r.apps), s(r.goals), s(r.assists), s(r.mom)];
  })];
}

// ── notice ── 단일 객체(또는 null). 소비처는 rawNotices[1]을 첫 데이터행으로 읽음.
interface NoticeOut {
  id: number; date: string | null; title: string | null;
  content: string | null; important: boolean; location: string | null;
}
export async function getNoticeRows(): Promise<string[][]> {
  const n = await udGet<NoticeOut | null>("/api/underduck/notice");
  const HEADER = ["date", "title", "content", "important", "location"];
  if (!n) return [HEADER];
  return [HEADER, [s(n.date), s(n.title), s(n.content), n.important ? "Y" : "N", s(n.location)]];
}

// ── lineup ── 시트: A=matchId B=quarter C=formation D~N=p1..p11 O~S=sub1..sub5 T=substitutions(JSON)
interface LineupOut {
  id: number; match_id: number | null; quarter: string | null; formation: string | null;
  players: string[] | null; subs: string[] | null; substitutions: unknown[] | null;
}
export async function getLineupRows(): Promise<string[][]> {
  const rows = await udGet<LineupOut[]>("/api/underduck/lineup");
  const HEADER = ["matchId", "quarter", "formation",
    "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11",
    "sub1", "sub2", "sub3", "sub4", "sub5", "sub6", "sub7", "sub8", "sub9", "substitutions"];
  return [HEADER, ...rows.map((r) => [
    s(r.match_id), s(r.quarter), s(r.formation),
    ...pad(r.players, 11), ...pad(r.subs, 9),
    r.substitutions && r.substitutions.length ? JSON.stringify(r.substitutions) : "",
  ])];
}

// ── attendance_vote ── 시트: A=matchId B=kakaoId C=nickname D=response E=timestamp
interface AttendanceOut {
  id: number; match_id: number | null; kakao_id: string | null;
  nickname: string | null; response: string | null; timestamp: string | null;
}
export async function getAttendanceVoteRows(): Promise<string[][]> {
  const rows = await udGet<AttendanceOut[]>("/api/underduck/attendance");
  const HEADER = ["matchId", "kakaoId", "nickname", "response", "timestamp"];
  return [HEADER, ...rows.map((r) => [s(r.match_id), s(r.kakao_id), s(r.nickname), s(r.response), s(r.timestamp)])];
}

// ── vote_comment ── 시트: A=matchId B=kakaoId C=nickname D=message E=timestamp
interface VoteCommentOut {
  id: number; match_id: number | null; kakao_id: string | null;
  nickname: string | null; message: string | null; timestamp: string | null;
}
export async function getVoteCommentRows(): Promise<string[][]> {
  const rows = await udGet<VoteCommentOut[]>("/api/underduck/vote-comment");
  const HEADER = ["matchId", "kakaoId", "nickname", "message", "timestamp"];
  return [HEADER, ...rows.map((r) => [s(r.match_id), s(r.kakao_id), s(r.nickname), s(r.message), s(r.timestamp)])];
}

// ── featured ── 시트: A=선수명 B=id1 C=id2 D=id3 (소비처는 헤더 미스킵 → 헤더 포함 유지)
interface FeaturedOut {
  player_name: string; title_id1: string | null; title_id2: string | null; title_id3: string | null;
}
export async function getFeaturedRows(): Promise<string[][]> {
  const rows = await udGet<FeaturedOut[]>("/api/underduck/featured");
  const HEADER = ["선수명", "칭호id", "칭호id", "칭호id"];
  return [HEADER, ...rows.map((r) => [s(r.player_name), s(r.title_id1), s(r.title_id2), s(r.title_id3)])];
}

// ── feedback ── 시트: A=matchId B=timestamp C=name D=message
interface FeedbackOut {
  id: number; match_id: number | null; timestamp: string | null; name: string | null; message: string | null;
}
export async function getFeedbackRows(): Promise<string[][]> {
  const rows = await udGet<FeedbackOut[]>("/api/underduck/feedback");
  const HEADER = ["matchId", "timestamp", "name", "message"];
  return [HEADER, ...rows.map((r) => [s(r.match_id), s(r.timestamp), s(r.name), s(r.message)])];
}

// ── media ── 시트: A=type B=url C=title D=uploadedAt
interface MediaOut {
  id: number; type: string | null; url: string | null; title: string | null; uploaded_at: string | null;
}
export async function getMediaRows(): Promise<string[][]> {
  const rows = await udGet<MediaOut[]>("/api/underduck/media");
  const HEADER = ["type", "url", "title", "uploadedAt"];
  return [HEADER, ...rows.map((r) => [s(r.type), s(r.url), s(r.title), s(r.uploaded_at)])];
}

// ── mom_vote ── 시트: A=matchId B=voterName C=votedFor D=voteType E=timestamp
interface MomVoteOut {
  id: number; match_id: number | null; voter_name: string | null;
  voted_for: string | null; vote_type: string | null; timestamp: string | null;
}
export async function getMomVoteRows(): Promise<string[][]> {
  const rows = await udGet<MomVoteOut[]>("/api/underduck/mom-vote");
  const HEADER = ["matchId", "voterName", "votedFor", "voteType", "timestamp"];
  return [HEADER, ...rows.map((r) => [s(r.match_id), s(r.voter_name), s(r.voted_for), s(r.vote_type), s(r.timestamp)])];
}

// ── users ── 시트: A=kakaoId B=nickname C=profileImage D=joinedAt E=lastLogin
interface UserOut {
  kakao_id: string; nickname: string | null; profile_image: string | null;
  joined_at: string | null; last_login: string | null;
}
export async function getUsersRows(): Promise<string[][]> {
  const rows = await udGet<UserOut[]>("/api/underduck/users");
  const HEADER = ["kakaoId", "nickname", "profileImage", "joinedAt", "lastLogin"];
  return [HEADER, ...rows.map((r) => [s(r.kakao_id), s(r.nickname), s(r.profile_image), s(r.joined_at), s(r.last_login)])];
}
