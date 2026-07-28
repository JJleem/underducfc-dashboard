// 전술게시판 백엔드 래퍼 (서버사이드 전용 — udGet/udPost/udDelete는 underduck.ts 가드).
import { udGet, udPost, udDelete } from "./underduck";
import { instructionCells, parsePositions } from "./positions";

/** 전술 글에 붙는 선발 11명 라인업. 유튜브 글이면 null. */
export interface BoardLineup {
  formation: string;
  positions: string; // "x,y;…" 직렬화 형식 ([[positions.ts]])
  players: string[]; // 11칸 (빈 자리는 "")
  instructions: string; // "id,id;…" 직렬화 형식
  tactic: string;
}

export interface BoardPost {
  id: number;
  kakaoId: string;
  author: string;
  title: string;
  youtubeUrl: string;
  body: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lineup: BoardLineup | null;
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
}

export interface BoardComment {
  id: number;
  postId: number;
  kakaoId: string;
  author: string;
  message: string;
  createdAt: string | null;
}

interface LineupRow {
  formation?: string | null;
  positions?: number[][] | null;
  players?: string[] | null;
  instructions?: string[] | null;
  tactic?: string | null;
}
interface PostRow {
  id: number; kakao_id: string | null; author: string | null; title: string | null;
  youtube_url: string | null; body: string | null; created_at: string | null;
  updated_at: string | null; lineup: LineupRow | null;
  comment_count: number; like_count: number;
}

// 백엔드는 좌표를 [[x,y],…], 개인 전술을 ["id,id",…]로 준다.
// 프론트는 [[positions.ts]]의 문자열 형식을 쓰므로 여기서 한 번만 변환한다.
const toLineup = (r: LineupRow | null): BoardLineup | null => {
  if (!r) return null;
  return {
    formation: r.formation ?? "",
    positions: r.positions?.length ? r.positions.map(([x, y]) => `${x},${y}`).join(";") : "",
    players: [...(r.players ?? []), ...Array(11).fill("")].slice(0, 11),
    instructions: r.instructions?.length ? r.instructions.join(";") : "",
    tactic: r.tactic ?? "",
  };
};
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
  updatedAt: r.updated_at ?? null,
  lineup: toLineup(r.lineup ?? null),
  commentCount: r.comment_count ?? 0,
  likeCount: r.like_count ?? 0,
  likedByMe: false,
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

/**
 * 글 작성. 유튜브 글이면 youtubeUrl을, 전술 글이면 lineup을 넘긴다.
 * 전술 글은 백엔드가 1인 1개로 upsert하므로, 이미 있으면 그 글이 갱신되어 돌아온다.
 */
export async function createBoardPost(input: {
  kakaoId: string;
  author: string;
  title: string;
  youtubeUrl?: string | null;
  body?: string | null;
  lineup?: BoardLineup | null;
}): Promise<BoardPost> {
  const r = await udPost<PostRow>("/api/underduck/board", {
    kakao_id: input.kakaoId,
    author: input.author,
    title: input.title,
    youtube_url: input.youtubeUrl ?? null,
    body: input.body ?? null,
    lineup: input.lineup
      ? {
          formation: input.lineup.formation,
          positions: parsePositions(input.lineup.positions)?.map((p) => [p.x, p.y]) ?? null,
          players: input.lineup.players,
          instructions: instructionCells(input.lineup.instructions),
          tactic: input.lineup.tactic || null,
        }
      : null,
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

export async function toggleBoardLike(
  postId: number,
  kakaoId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const r = await udPost<{ liked: boolean; like_count: number }>(
    `/api/underduck/board/${postId}/like`,
    { kakao_id: kakaoId },
  );
  return { liked: r.liked, likeCount: r.like_count };
}

/** 특정 사용자가 좋아요한 post_id 집합. */
export async function getMyLikedPostIds(kakaoId: string): Promise<Set<number>> {
  const ids = await udGet<number[]>(
    `/api/underduck/board/my-likes?kakao_id=${encodeURIComponent(kakaoId)}`,
    { cache: "no-store" },
  );
  return new Set(ids);
}
