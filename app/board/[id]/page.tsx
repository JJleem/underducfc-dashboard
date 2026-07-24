import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "../../lib/admin";
import { getBoardPost, listBoardComments, getMyLikedPostIds } from "../../lib/board";
import BoardDetailClient from "./BoardDetailClient";

export const dynamic = "force-dynamic";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) notFound();

  const post = await getBoardPost(postId);
  if (!post) notFound();

  const comments = await listBoardComments(postId).catch(() => []);

  const session = await auth();
  const currentUser = session?.user
    ? {
        kakaoId: (session.user as { kakaoId?: string }).kakaoId ?? "",
        name: session.user.name ?? "",
      }
    : null;

  if (currentUser?.kakaoId) {
    try {
      const liked = await getMyLikedPostIds(currentUser.kakaoId);
      post.likedByMe = liked.has(post.id);
    } catch {
      /* 무시 */
    }
  }

  return (
    <BoardDetailClient
      post={post}
      comments={comments}
      currentUser={currentUser}
      admin={isAdmin(currentUser?.kakaoId)}
    />
  );
}
