// 전술게시판 — 유튜브 링크 공유 게시판 목록.
import { auth } from "@/auth";
import { isAdmin } from "../lib/admin";
import { listBoardPosts } from "../lib/board";
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

  return (
    <BoardClient
      posts={posts}
      currentUser={currentUser}
      admin={isAdmin(currentUser?.kakaoId)}
    />
  );
}
