import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "../../lib/admin";
import { getLoungePost } from "../../lib/lounge";
import { PREVIEW_POSTS } from "../preview-data";
import LoungeDetailClient from "./LoungeDetailClient";

export const dynamic = "force-dynamic";

export default async function LoungeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ id }, { preview }, session] = await Promise.all([params, searchParams, auth()]);
  const isPreview = preview === "1";
  const postId = Number(id);

  const post = isPreview
    ? PREVIEW_POSTS.find((p) => p.id === postId) ?? null
    : await getLoungePost(postId);
  if (!post) notFound();

  return (
    <LoungeDetailClient post={post} admin={isAdmin(session?.user)} preview={isPreview} />
  );
}
