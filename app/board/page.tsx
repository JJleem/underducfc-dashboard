// 전술게시판 — 유튜브 링크 공유 게시판 목록.
import { auth } from "@/auth";
import { isAdmin } from "../lib/admin";
import { listBoardPosts, getMyLikedPostIds } from "../lib/board";
import BoardClient from "./BoardClient";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const session = await auth();
  const currentUser = session?.user
    ? {
        kakaoId: (session.user as { kakaoId?: string }).kakaoId ?? "",
        name: session.user.name ?? "",
      }
    : null;

  let posts = [] as Awaited<ReturnType<typeof listBoardPosts>>;
  try {
    posts = await listBoardPosts();
  } catch {
    posts = [];
  }

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
      admin={isAdmin(currentUser?.kakaoId)}
    />
  );
}
