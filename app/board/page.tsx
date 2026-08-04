// 전술게시판 — 영상 공유와 쿼터별 전술을 함께 보는 게시판 목록.
import { auth } from "@/auth";
import { isAdmin } from "../lib/admin";
import { listBoardPosts, getMyLikedPostIds } from "../lib/board";
import BoardClient from "./BoardClient";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const [session, loadedPosts] = await Promise.all([
    auth(),
    listBoardPosts().catch(() => [] as Awaited<ReturnType<typeof listBoardPosts>>),
  ]);
  const currentUser = session?.user
    ? {
        kakaoId: (session.user as { kakaoId?: string }).kakaoId ?? "",
        name: session.user.name ?? "",
      }
    : null;

  let posts = loadedPosts;

  // 로그인 시 내가 좋아요한 글 표시
  if (currentUser?.kakaoId) {
    try {
      const liked = await getMyLikedPostIds(currentUser.kakaoId);
      posts = posts.map((p) => ({ ...p, likedByMe: liked.has(p.id) }));
    } catch {
      /* 좋아요 조회 실패는 무시 */
    }
  }

  return (
    <BoardClient
      posts={posts}
      currentUser={currentUser}
      admin={isAdmin(session?.user)}
    />
  );
}
