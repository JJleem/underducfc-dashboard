import { udDelete, udGet, udPost } from "./underduck";

export type GalleryState = { artworkId: string; liked: boolean; likeCount: number; commentCount: number };
export type GalleryComment = { id: number; artworkId: string; kakaoId: string; author: string; message: string; createdAt: string | null };

const state = (x: { artwork_id: string; liked: boolean; like_count: number; comment_count: number }): GalleryState => ({ artworkId: x.artwork_id, liked: x.liked, likeCount: x.like_count, commentCount: x.comment_count });
const comment = (x: { id: number; artwork_id: string; kakao_id: string; author: string; message: string; created_at: string | null }): GalleryComment => ({ id: x.id, artworkId: x.artwork_id, kakaoId: x.kakao_id, author: x.author, message: x.message, createdAt: x.created_at });

export async function getGalleryState(kakaoId: string) {
  const rows = await udPost<Array<{ artwork_id: string; liked: boolean; like_count: number; comment_count: number }>>("/api/underduck/gallery/state", { kakao_id: kakaoId });
  return rows.map(state);
}
export function toggleGalleryLike(id: string, kakaoId: string) { return udPost<{ liked: boolean; like_count: number }>(`/api/underduck/gallery/${encodeURIComponent(id)}/like`, { kakao_id: kakaoId }); }
export async function getGalleryComments(id: string) { return (await udGet<Array<{ id: number; artwork_id: string; kakao_id: string; author: string; message: string; created_at: string | null }>>(`/api/underduck/gallery/${encodeURIComponent(id)}/comments`, { cache: "no-store" })).map(comment); }
export async function addGalleryComment(id: string, data: { kakaoId: string; author: string; message: string }) { return comment(await udPost(`/api/underduck/gallery/${encodeURIComponent(id)}/comments`, { kakao_id: data.kakaoId, author: data.author, message: data.message }) as Parameters<typeof comment>[0]); }
export function removeGalleryComment(id: number) { return udDelete(`/api/underduck/gallery/comments/${id}`); }
