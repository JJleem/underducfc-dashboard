import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "../../lib/admin";
import { getBoardPost, listBoardComments, getMyLikedPostIds } from "../../lib/board";
import { getRosterRows } from "../../lib/backend";
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

  // 클릭 후 대기 시간을 줄이려 병렬 fetch (기존엔 순차 왕복 → 버벅임)
  const [post, comments, rosterRows, session] = await Promise.all([
    getBoardPost(postId),
    listBoardComments(postId).catch(() => []),
    getRosterRows().catch(() => [] as string[][]),
    auth(),
  ]);
  if (!post) notFound();

  // 이름 → 등번호 맵 (댓글 앞 등번호 배지용, 피드백 댓글과 동일 스타일)
  const rosterMap: Record<string, string> = {};
  rosterRows.slice(1).forEach((r) => {
    const name = (r[1] || "").trim();
    if (name) rosterMap[name] = r[0] || "";
  });

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
      rosterMap={rosterMap}
    />
  );
}
