// 언더덕 사랑방 — 애로사항·건의를 익명으로 남기는 자리.
// 화면엔 익명, DB엔 실명. 마스킹은 백엔드가 한다([[app/lib/lounge.ts]]).
import { auth } from "@/auth";
import { isAdmin } from "../lib/admin";
import { listLoungePosts, type LoungePost } from "../lib/lounge";
import LoungeClient from "./LoungeClient";
import { PREVIEW_POSTS } from "./preview-data";

export const dynamic = "force-dynamic";

export default async function LoungePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ preview }, session] = await Promise.all([searchParams, auth()]);
  const isPreview = preview === "1";

  // 백엔드가 없거나 잠깐 멎어도 화면은 떠야 한다. 빈 목록 + 안내로 떨어진다.
  const posts: LoungePost[] = isPreview
    ? PREVIEW_POSTS
    : await listLoungePosts().catch(() => []);

  return <LoungeClient posts={posts} admin={isAdmin(session?.user)} preview={isPreview} />;
}
