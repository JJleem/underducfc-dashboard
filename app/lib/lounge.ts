// 사랑방 백엔드 래퍼 (서버사이드 전용 — udGet/udPost/udDelete는 underduck.ts 가드).
//
// 이 게시판은 **화면엔 익명, DB엔 실명**이다. 그래서 지켜야 할 규칙이 둘 있다.
//
//  1. 실명은 백엔드가 마스킹한다. 프론트에서 가리면 개발자 도구로 그대로 다 보인다.
//     응답에 오는 `author`는 **운영진 요청일 때만** 채워져 있고, 평소엔 null 이다.
//  2. 그래서 읽기에도 신원이 필요하다 — udGet 에 withIdentity 를 켠다([[underduck.ts]]).
//     사용자마다 응답이 달라지므로 캐시는 걸지 않는다.
import { udGet, udPost, udPatch, udDelete } from "./underduck";
import { UD_TAG, udReadOptsFor } from "./cache";

export type LoungeCategory = "suggestion" | "chat";
export type LoungeStatus = "received" | "reviewing" | "resolved" | "declined";

export const LOUNGE_STATUSES: LoungeStatus[] = ["received", "reviewing", "resolved", "declined"];

export interface LoungeComment {
  id: number;
  /** 화면에 그대로 찍는 익명 라벨. "글쓴이" · "덕민 1" · "운영진" */
  authorLabel: string;
  /** 실명. 운영진에게만 내려온다. */
  author: string | null;
  mine: boolean;
  message: string;
  /** 이모티콘 id. 그림은 프론트가 찾는다([[app/lounge/emoticons.ts]]). */
  emoticon: string | null;
  createdAt: string | null;
}

export interface LoungePost {
  id: number;
  category: LoungeCategory;
  title: string;
  /** 목록 응답에는 없다(상세에서만 채워진다). */
  body: string;
  status: LoungeStatus;
  authorLabel: string;
  author: string | null;
  mine: boolean;
  commentCount: number;
  adminReply: string | null;
  adminReplyAuthor: string | null;
  adminReplyAt: string | null;
  createdAt: string | null;
}

export interface LoungePostDetail extends LoungePost {
  comments: LoungeComment[];
}

interface CommentRow {
  id: number;
  author_label?: string | null;
  author?: string | null;
  mine?: boolean | null;
  message?: string | null;
  emoticon?: string | null;
  created_at?: string | null;
}

interface PostRow {
  id: number;
  category?: string | null;
  title?: string | null;
  body?: string | null;
  status?: string | null;
  author_label?: string | null;
  author?: string | null;
  mine?: boolean | null;
  comment_count?: number | null;
  admin_reply?: string | null;
  admin_reply_author?: string | null;
  admin_reply_at?: string | null;
  created_at?: string | null;
  comments?: CommentRow[] | null;
}

/** 백엔드가 모르는 값을 보내와도 화면이 깨지지 않게 알려진 값으로만 좁힌다. */
function toCategory(raw?: string | null): LoungeCategory {
  return raw === "chat" ? "chat" : "suggestion";
}
function toStatus(raw?: string | null): LoungeStatus {
  return (LOUNGE_STATUSES as string[]).includes(raw ?? "") ? (raw as LoungeStatus) : "received";
}

function toComment(r: CommentRow): LoungeComment {
  return {
    id: r.id,
    authorLabel: r.author_label || "익명",
    author: r.author ?? null,
    mine: !!r.mine,
    message: r.message || "",
    emoticon: r.emoticon ?? null,
    createdAt: r.created_at ?? null,
  };
}

function toPost(r: PostRow): LoungePost {
  return {
    id: r.id,
    category: toCategory(r.category),
    title: r.title || "",
    body: r.body || "",
    status: toStatus(r.status),
    authorLabel: r.author_label || "익명",
    author: r.author ?? null,
    mine: !!r.mine,
    commentCount: r.comment_count ?? 0,
    adminReply: r.admin_reply ?? null,
    adminReplyAuthor: r.admin_reply_author ?? null,
    adminReplyAt: r.admin_reply_at ?? null,
    createdAt: r.created_at ?? null,
  };
}

const readOpts = { cache: "no-store" as const, withIdentity: true };

export async function listLoungePosts(): Promise<LoungePost[]> {
  const rows = await udGet<PostRow[]>("/api/underduck/lounge", readOpts);
  return rows.map(toPost);
}

/**
 * 홈의 "새 글 있음" 점에 쓸 값만.
 *
 * 홈은 목록을 그리지 않는다 — 최신 글 id 와 개수만 있으면 된다. 그래서 위의
 * `listLoungePosts` 를 쓰면 안 된다: 그건 신원을 붙인 `no-store` 읽기라
 * **홈을 열 때마다 백엔드를 한 번 더 기다리게 만든다**(홈의 다른 읽기 10개는
 * 전부 45초 캐시를 탄다). 여기서는 신원 없이 같은 캐시 규칙으로 읽는다.
 * 글을 쓰거나 지우면 UD_TAG.lounge 무효화로 즉시 반영된다.
 */
export async function getLoungeStamp(): Promise<{ latestId: number; count: number }> {
  const rows = await udGet<PostRow[]>(
    "/api/underduck/lounge",
    udReadOptsFor(UD_TAG.lounge),
  );
  return { latestId: rows[0]?.id ?? 0, count: rows.length };
}

export async function getLoungePost(id: number): Promise<LoungePostDetail | null> {
  try {
    const r = await udGet<PostRow>(`/api/underduck/lounge/${id}`, readOpts);
    return { ...toPost(r), comments: (r.comments ?? []).map(toComment) };
  } catch {
    return null;
  }
}

/**
 * 글쓰기. 작성자(kakao_id·실명)는 **본문으로 보내지 않는다** — 백엔드가 신원 헤더에서
 * 채운다. 본문으로 받으면 남의 이름으로 글을 쓸 수 있다.
 */
export async function createLoungePost(input: {
  category: LoungeCategory;
  title: string;
  body: string;
}): Promise<LoungePost> {
  return toPost(await udPost<PostRow>("/api/underduck/lounge", input));
}

/** 운영진 전용 — 상태 변경과 답변. 권한 검사는 백엔드가 신원 헤더로 한다. */
export async function updateLoungePost(
  id: number,
  patch: { status?: LoungeStatus; adminReply?: string },
): Promise<LoungePost> {
  const body: Record<string, unknown> = {};
  if (patch.status) body.status = patch.status;
  if (patch.adminReply !== undefined) body.admin_reply = patch.adminReply;
  return toPost(await udPatch<PostRow>(`/api/underduck/lounge/${id}`, body));
}

/**
 * 삭제. 소유권 검사도 백엔드에 맡긴다.
 * 전술게시판은 글의 kakaoId 를 받아 와 프론트에서 대조하지만, 사랑방은 남의 글에
 * 작성자 식별자를 딸려 보내는 것 자체가 익명성을 깎는다.
 */
export async function deleteLoungePost(id: number): Promise<void> {
  await udDelete(`/api/underduck/lounge/${id}`);
}

export async function createLoungeComment(
  postId: number,
  input: { message?: string; emoticon?: string },
): Promise<LoungeComment> {
  return toComment(
    await udPost<CommentRow>(`/api/underduck/lounge/${postId}/comments`, input),
  );
}

export async function deleteLoungeComment(postId: number, commentId: number): Promise<void> {
  await udDelete(`/api/underduck/lounge/${postId}/comments/${commentId}`);
}
