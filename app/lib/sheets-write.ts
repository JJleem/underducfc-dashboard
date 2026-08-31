// 쓰기 유틸리티 — 전부 underduck 백엔드로 위임.
//
// ※ 파일명은 호환을 위해 유지(예전 Google Sheets 쓰기 모듈). 내부는 백엔드 호출만 한다.
//   함수 시그니처는 그대로라 API 라우트/호출부는 변경 불필요.
// ⚠️ 서버사이드 전용([[underduck.ts]] window 가드).

import {
  udGet,
  udPost,
  udPut,
  udDelete,
  underduckFetch,
  type UnderduckIdentity,
} from "./underduck";
import { createMatch, patchMatch, addMatchPhotos, removeMatchPhoto } from "./matches-backend";
import { instructionCells, parsePositions } from "./positions";
import { normalizeLineupMembers } from "./lineup";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

// ── 대표 칭호 (featured) ──
export async function writeFeaturedTitles(
  playerName: string,
  ids: string[],
  identity?: UnderduckIdentity,
): Promise<void> {
  await udPut(
    "/api/underduck/featured",
    { player_name: playerName.trim(), title_ids: ids },
    identity,
  );
}

// ── 경기 사진 (matches 도메인) ──
export async function addPhotosToMatch(matchId: number, newUrls: string[]): Promise<void> {
  await addMatchPhotos(matchId, newUrls);
}

export async function removePhotoFromMatch(matchId: number, url: string): Promise<void> {
  await removeMatchPhoto(matchId, url);
}

// ── feedback ──
interface FeedbackRow { id: number; match_id: number | null; timestamp: string | null; name: string | null; message: string | null; emoticon?: string | null; }

export async function deleteFeedback(
  matchId: number,
  timestamp: string,
  name: string,
  message: string
): Promise<void> {
  // 백엔드는 id로 삭제 → (matchId, timestamp, name, message)로 행을 찾아 id 확보.
  const list = await udGet<FeedbackRow[]>(`/api/underduck/feedback?match_id=${matchId}`);
  const hit = list.find((f) => s(f.timestamp) === timestamp && s(f.name) === name && s(f.message) === message);
  // 못 찾았는데 조용히 성공으로 넘기면 화면에서만 사라지고 서버엔 남는다.
  if (!hit) throw new Error("삭제할 댓글을 찾지 못했습니다. 새로고침 후 다시 시도해주세요.");
  await udDelete(`/api/underduck/feedback/${hit.id}`);
}

/** 저장된 실제 행을 돌려준다(timestamp·name은 백엔드가 정하므로 화면도 이 값을 써야 한다). */
export async function appendFeedback({
  matchId,
  name,
  message,
  emoticon,
}: {
  matchId: number;
  name: string;
  message: string;
  emoticon?: string | null;
}): Promise<{ matchId: number; timestamp: string; name: string; message: string; emoticon: string | null }> {
  const row = await udPost<FeedbackRow>("/api/underduck/feedback", {
    match_id: matchId,
    name,
    message,
    ...(emoticon ? { emoticon } : {}),
  });
  return {
    matchId: Number(row?.match_id ?? matchId),
    timestamp: s(row?.timestamp),
    name: s(row?.name),
    message: s(row?.message),
    emoticon: row?.emoticon ?? null,
  };
}

// ── mom_vote ──
export async function appendMomVote({
  matchId,
  voterName,
  votedFor,
  voteType,
}: {
  matchId: number;
  voterName: string;
  votedFor: string;
  voteType: string;
}) {
  await udPost("/api/underduck/mom-vote", {
    match_id: matchId,
    voter_name: voterName,
    voted_for: votedFor,
    vote_type: voteType,
  });
}

export async function deleteMomVote(matchId: number, voterName: string, voteType?: string) {
  const body: { match_id: number; voter_name: string; vote_type?: string } = {
    match_id: matchId,
    voter_name: voterName,
  };
  if (voteType) body.vote_type = voteType;
  await udDelete("/api/underduck/mom-vote", body);
}

// ── matches (점수/MOM/날씨/출석상태) ──
export async function writeMatchMom(matchId: number, mom: string): Promise<void> {
  await patchMatch(matchId, { mom });
}

export async function updateMatchResult(
  matchId: number,
  data: {
    date: string;
    time: string;
    location: string;
    opponent: string;
    type: string;
    result: string;
    ourScore: string;
    theirScore: string;
    goals: string;
    assists: string;
    attendees: string;
  }
): Promise<void> {
  // 빈 점수 문자열은 null로 보내 비운다(예정 경기 등).
  await patchMatch(matchId, {
    date: data.date,
    time: data.time,
    location: data.location,
    opponent: data.opponent,
    type: data.type,
    result: data.result,
    our_score: data.ourScore === "" ? null : Number(data.ourScore),
    their_score: data.theirScore === "" ? null : Number(data.theirScore),
    goals: data.goals,
    assists: data.assists,
    attendees: data.attendees,
  });
}

// 날씨 기록 (업적/통계용). 형식: "28°C,맑음,01d,10"
export async function writeMatchWeather(matchId: number, weatherStr: string): Promise<void> {
  await patchMatch(matchId, { weather: weatherStr });
}

// ── roster ──
export async function appendRoster(player: {
  no: string;
  name: string;
  pos: string;
  status: string;
}): Promise<{ id: number }> {
  const out = await udPost<{ id: number }>("/api/underduck/roster", {
    no: player.no,
    name: player.name,
    pos: player.pos,
    status: player.status,
  });
  return { id: out.id };
}

export async function updateRoster(
  id: number | string,
  player: { no: string; name: string; pos: string; status: string; memo?: string }
): Promise<void> {
  await udPut(`/api/underduck/roster/${id}`, {
    no: player.no,
    name: player.name,
    pos: player.pos,
    status: player.status,
    // 주장 역할. 백엔드는 **안 보내면 기존 값을 유지**하므로, 해제하려면
    // 빈 문자열을 보내야 한다(undefined 는 "그대로 두기"다).
    ...(player.memo === undefined ? {} : { memo: player.memo }),
  });
}

// ── matches 생성 ──
export async function appendMatch(match: {
  date: string;
  time: string;
  location: string;
  opponent: string;
  type: string;
  weather?: string; // "28°C,맑음,01d,10"
}): Promise<void> {
  // 백엔드가 match_id=max+1, result="예정", attendance_status="진행중" 자동 부여.
  await createMatch({
    date: match.date,
    time: match.time,
    location: match.location,
    opponent: match.opponent,
    type: match.type,
    weather: match.weather,
  });
}

// ── notice ── (활성 공지 1건)
export async function updateNotice(notice: {
  date: string;
  title: string;
  content: string;
  important: boolean;
  location?: string;
}): Promise<void> {
  await udPut("/api/underduck/notice", {
    date: notice.date,
    title: notice.title,
    content: notice.content,
    important: notice.important,
    location: notice.location || "",
  });
}

// ── media ──
interface MediaRow { id: number; url: string | null; }

export async function appendMedia(item: {
  type: string;
  url: string;
  title: string;
}): Promise<void> {
  await udPost("/api/underduck/media", { type: item.type, url: item.url, title: item.title });
}

export async function deleteMediaByUrl(url: string): Promise<void> {
  const list = await udGet<MediaRow[]>("/api/underduck/media");
  const hit = list.find((m) => s(m.url) === url);
  // 못 찾았는데 조용히 성공으로 넘기면 화면에서만 사라지고 서버엔 남는다.
  if (!hit) throw new Error("삭제할 사진을 찾지 못했습니다. 새로고침 후 다시 시도해주세요.");
  await udDelete(`/api/underduck/media/${hit.id}`);
}

// ── lineup ── (match_id+quarter upsert, 빈값이면 백엔드가 삭제)
export async function writeLineup({
  matchId,
  quarter,
  formation,
  players,
  subs,
  substitutions,
  positions,
  tactic,
  instructions,
}: {
  matchId: number;
  quarter: string;
  formation: string;
  players: string[];
  subs: string[];
  substitutions: { out: string; in: string; time?: string }[];
  positions?: string;
  tactic?: string;
  instructions?: string;
}) {
  const normalized = normalizeLineupMembers(players, subs);
  const playerCells = [
    ...normalized.players,
    ...Array(Math.max(0, 11 - normalized.players.length)).fill(""),
  ].slice(0, 11);
  const subCells = normalized.subs.slice(0, 9);
  const cleanSubstitutions = substitutions
    .map((event) => ({
      out: String(event.out || "").trim(),
      in: String(event.in || "").trim(),
      time: String(event.time || "").trim(),
    }))
    .filter((event) => event.out || event.in);

  // "x,y;x,y;…" → [[x,y], …]. 11개가 온전히 파싱될 때만 보낸다(아니면 프리셋 사용).
  const parsedPositions = parsePositions(positions ?? null);

  await udPut("/api/underduck/lineup", {
    match_id: matchId,
    quarter,
    formation,
    players: playerCells,
    subs: subCells,
    substitutions: cleanSubstitutions,
    positions: parsedPositions ? parsedPositions.map((p) => [p.x, p.y]) : null,
    tactic: tactic || null,
    instructions: instructions ? instructionCells(instructions) : null,
  });
}

// ── push 구독 ──
export async function addPushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  await udPost("/api/underduck/push", { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await udDelete("/api/underduck/push", { endpoint });
}

export async function getAllPushSubscriptions(): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  const rows = await udGet<{ endpoint: string; p256dh: string | null; auth: string | null }[]>("/api/underduck/push");
  return rows.filter((r) => r.endpoint).map((r) => ({
    endpoint: r.endpoint,
    p256dh: r.p256dh || "",
    auth: r.auth || "",
  }));
}

// ── users (카카오 로그인 upsert) ──
export async function upsertUser(user: {
  kakaoId: string;
  nickname: string;
  profileImage: string;
}): Promise<void> {
  // 로그인 과정에서 호출된다. 이 시점엔 세션이 아직 없고, 신원 헤더를 붙이려 하면
  // auth() → jwt 콜백 → 이 함수 로 재귀가 돈다. 그래서 anonymous.
  await underduckFetch("/api/underduck/users", {
    method: "POST",
    anonymous: true,
    body: {
      kakao_id: user.kakaoId,
      nickname: user.nickname,
      profile_image: user.profileImage,
    },
  });
}

// ── 출석 투표 ──
export async function upsertAttendanceVote({
  matchId,
  kakaoId,
  nickname,
  response,
}: {
  matchId: number;
  kakaoId: string;
  nickname: string;
  response: string; // "참석" | "불참" | "미정"
}): Promise<void> {
  await udPost("/api/underduck/attendance", {
    match_id: matchId,
    kakao_id: kakaoId,
    nickname: nickname.trim(),
    response,
  });
}

export async function finalizeAttendance(matchId: number): Promise<string> {
  // 백엔드가 "참석" 응답자를 모아 matches.attendees + attendance_status="마감" 기록.
  const res = await udPost<{ attendees: string }>(`/api/underduck/attendance/${matchId}/finalize`);
  return res?.attendees ?? "";
}

export async function setAttendanceStatus(
  matchId: number,
  status: "진행중" | "마감"
): Promise<void> {
  await patchMatch(matchId, { attendance_status: status });
}

// ── 투표 댓글 (vote_comment) ──
interface VoteCommentRow {
  id: number;
  match_id?: number | null;
  kakao_id: string | null;
  nickname?: string | null;
  message?: string | null;
  timestamp: string | null;
  emoticon?: string | null;
}

/** 저장된 실제 행을 돌려준다(timestamp·nickname은 백엔드가 정하므로 화면도 이 값을 써야 한다). */
export async function appendVoteComment({
  matchId,
  kakaoId,
  nickname,
  message,
  emoticon,
}: {
  matchId: number;
  kakaoId: string;
  nickname: string;
  message: string;
  emoticon?: string | null;
}): Promise<{ matchId: number; kakaoId: string; nickname: string; message: string; timestamp: string; emoticon: string | null }> {
  const row = await udPost<VoteCommentRow>("/api/underduck/vote-comment", {
    match_id: matchId,
    kakao_id: kakaoId,
    nickname: nickname.trim(),
    message: message.trim(),
    ...(emoticon ? { emoticon } : {}),
  });
  return {
    matchId: Number(row?.match_id ?? matchId),
    kakaoId: s(row?.kakao_id),
    nickname: s(row?.nickname),
    message: s(row?.message),
    timestamp: s(row?.timestamp),
    emoticon: row?.emoticon ?? null,
  };
}

export async function deleteVoteComment(
  matchId: number,
  kakaoId: string,
  timestamp: string
): Promise<void> {
  const list = await udGet<VoteCommentRow[]>(`/api/underduck/vote-comment?match_id=${matchId}`);
  const hit = list.find((c) => s(c.kakao_id) === kakaoId && s(c.timestamp) === timestamp);
  // 못 찾았는데 조용히 성공으로 넘기면 화면에서만 사라지고 서버엔 남는다.
  if (!hit) throw new Error("삭제할 댓글을 찾지 못했습니다. 새로고침 후 다시 시도해주세요.");
  await udDelete(`/api/underduck/vote-comment/${hit.id}`);
}
