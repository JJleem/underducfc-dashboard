// 전술게시판 백엔드 래퍼 (서버사이드 전용 — udGet/udPost/udDelete는 underduck.ts 가드).
import { udGet, udPost, udDelete } from "./underduck";

export interface BoardPost {
  id: number;
  kakaoId: string;
  author: string;
  title: string;
  youtubeUrl: string;
  body: string | null;
  createdAt: string | null;
  commentCount: number;
}

export interface BoardComment {
  id: number;
  postId: number;
  kakaoId: string;
  author: string;
  message: string;
  createdAt: string | null;
}

interface PostRow {
  id: number; kakao_id: string | null; author: string | null; title: string | null;
  youtube_url: string | null; body: string | null; created_at: string | null; comment_count: number;
}
interface CommentRow {
  id: number; post_id: number | null; kakao_id: string | null; author: string | null;
  message: string | null; created_at: string | null;
}

const toPost = (r: PostRow): BoardPost => ({
  id: r.id,
  kakaoId: r.kakao_id ?? "",
  author: r.author ?? "",
  title: r.title ?? "",
  youtubeUrl: r.youtube_url ?? "",
  body: r.body,
  createdAt: r.created_at,
  commentCount: r.comment_count ?? 0,
});

const toComment = (r: CommentRow): BoardComment => ({
  id: r.id,
  postId: r.post_id ?? 0,
  kakaoId: r.kakao_id ?? "",
  author: r.author ?? "",
  message: r.message ?? "",
  createdAt: r.created_at,
});

export async function listBoardPosts(): Promise<BoardPost[]> {
  const rows = await udGet<PostRow[]>("/api/underduck/board", { cache: "no-store" });
  return rows.map(toPost);
}

export async function getBoardPost(id: number): Promise<BoardPost | null> {
  try {
    const r = await udGet<PostRow>(`/api/underduck/board/${id}`, { cache: "no-store" });
    return toPost(r);
  } catch {
    return null;
  }
}

export async function createBoardPost(input: {
  kakaoId: string; author: string; title: string; youtubeUrl: string; body?: string | null;
}): Promise<BoardPost> {
  const r = await udPost<PostRow>("/api/underduck/board", {
    kakao_id: input.kakaoId,
    author: input.author,
    title: input.title,
    youtube_url: input.youtubeUrl,
    body: input.body ?? null,
  });
  return toPost(r);
}

export async function deleteBoardPost(id: number): Promise<void> {
  await udDelete(`/api/underduck/board/${id}`);
}

export async function listBoardComments(postId: number): Promise<BoardComment[]> {
  const rows = await udGet<CommentRow[]>(`/api/underduck/board/${postId}/comments`, { cache: "no-store" });
  return rows.map(toComment);
}

export async function createBoardComment(
  postId: number,
  input: { kakaoId: string; author: string; message: string },
): Promise<BoardComment> {
  const r = await udPost<CommentRow>(`/api/underduck/board/${postId}/comments`, {
    kakao_id: input.kakaoId,
    author: input.author,
    message: input.message,
  });
  return toComment(r);
}

export async function deleteBoardComment(commentId: number): Promise<void> {
  await udDelete(`/api/underduck/board/comments/${commentId}`);
}
