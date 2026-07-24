"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ChevronLeft, Trash2, Send } from "lucide-react";
import { youtubeEmbed } from "../../lib/youtube";
import AppBottomNav from "../../components/AppBottomNav";
import type { BoardPost, BoardComment } from "../../lib/board";

function fmt(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export default function BoardDetailClient({
  post,
  comments: initialComments,
  currentUser,
  admin,
}: {
  post: BoardPost;
  comments: BoardComment[];
  currentUser: { kakaoId: string; name: string } | null;
  admin: boolean;
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const embed = youtubeEmbed(post.youtubeUrl);

  const canDeletePost = currentUser && (currentUser.kakaoId === post.kakaoId || admin);
  const canDeleteComment = (c: BoardComment) =>
    currentUser && (currentUser.kakaoId === c.kakaoId || admin);

  async function addComment() {
    if (!message.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/board/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "댓글 등록 실패");
      }
      const created: BoardComment = await res.json();
      setComments((prev) => [...prev, created]);
      setMessage("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "댓글 등록 실패");
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(cid: number) {
    if (!confirm("댓글을 삭제할까요?")) return;
    const res = await fetch(`/api/board/${post.id}/comments/${cid}`, { method: "DELETE" });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== cid));
    else alert("삭제 실패");
  }

  async function removePost() {
    if (!confirm("이 글을 삭제할까요?")) return;
    const res = await fetch(`/api/board/${post.id}`, { method: "DELETE" });
    if (res.ok) router.push("/board");
    else alert("삭제 실패");
  }

  return (
    <div className="pb-24 text-gray-900 dark:text-white">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-200/70 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#101013]/90">
        <Link href="/board" aria-label="목록으로" className="rounded-full p-1 active:opacity-60">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-base font-black">전술게시판</h1>
        {canDeletePost && (
          <button onClick={removePost} className="ml-auto rounded-full p-1.5 text-gray-400 active:opacity-60" aria-label="글 삭제">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className="px-4 pt-4">
        {/* 영상 */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
          {embed ? (
            <iframe
              src={embed}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <a href={post.youtubeUrl} target="_blank" rel="noreferrer" className="flex h-full items-center justify-center text-sm text-white/80 underline">
              유튜브에서 열기
            </a>
          )}
        </div>

        {/* 제목/작성자/본문 */}
        <h2 className="mt-3 text-lg font-black leading-snug">{post.title}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {post.author} · {fmt(post.createdAt)}
        </p>
        {post.body && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{post.body}</p>
        )}

        {/* 댓글 */}
        <div className="mt-6 border-t border-gray-100 pt-4 dark:border-white/5">
          <p className="mb-3 text-sm font-black">댓글 {comments.length}</p>
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <div className="flex-1 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-white/5">
                  <p className="text-[11px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">{c.author}</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200">{c.message}</p>
                </div>
                {canDeleteComment(c) && (
                  <button onClick={() => removeComment(c.id)} className="mt-1 shrink-0 p-1 text-gray-400 active:opacity-60" aria-label="댓글 삭제">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
            {comments.length === 0 && (
              <li className="py-4 text-center text-xs text-gray-400">첫 댓글을 남겨보세요</li>
            )}
          </ul>

          {/* 입력 */}
          {currentUser ? (
            <div className="mt-4 flex items-center gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
                placeholder="댓글 달기…"
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
              />
              <button
                onClick={addComment}
                disabled={!message.trim() || busy}
                className="rounded-full bg-[#FF8FA3] p-2.5 text-white active:opacity-80 disabled:opacity-40 dark:bg-[#FFB6C1] dark:text-black"
                aria-label="댓글 등록"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => signIn("kakao")} className="mt-4 w-full rounded-full border border-dashed border-gray-300 py-2.5 text-sm font-bold text-gray-500 active:opacity-70 dark:border-white/15 dark:text-gray-400">
              로그인하고 댓글 달기
            </button>
          )}
        </div>
      </div>

      <AppBottomNav active="board" currentUserName={currentUser?.name} />
    </div>
  );
}
