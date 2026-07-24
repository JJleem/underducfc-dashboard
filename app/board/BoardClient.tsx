"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ChevronLeft, Plus, MessageCircle, PlayCircle, Youtube } from "lucide-react";
import { youtubeThumb, youtubeId } from "../lib/youtube";
import AppBottomNav from "../components/AppBottomNav";
import type { BoardPost } from "../lib/board";

export default function BoardClient({
  posts,
  currentUser,
  admin,
}: {
  posts: BoardPost[];
  currentUser: { kakaoId: string; name: string } | null;
  admin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title.trim() && youtubeId(url);

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, youtubeUrl: url, body }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "등록에 실패했습니다.");
      }
      setTitle(""); setUrl(""); setBody(""); setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-24 text-gray-900 dark:text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-200/70 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#101013]/90">
        <Link href="/" aria-label="홈으로" className="rounded-full p-1 active:opacity-60">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-1.5 text-lg font-black">
          <Youtube className="h-5 w-5 text-[#FF8FA3] dark:text-[#FFB6C1]" /> 전술게시판
        </h1>
        <span className="ml-auto text-xs font-bold text-gray-400">{posts.length}개</span>
      </header>

      <div className="px-4 pt-4">
        {/* 글쓰기 */}
        {currentUser ? (
          <div className="mb-4">
            {!open ? (
              <button
                onClick={() => setOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#FF8FA3] py-3 text-sm font-black text-white shadow-sm active:opacity-80 dark:bg-[#FFB6C1] dark:text-black"
              >
                <Plus className="h-4 w-4" /> 유튜브 영상 공유하기
              </button>
            ) : (
              <div className="space-y-2.5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#161618]">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
                />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="유튜브 링크 (youtu.be / shorts / watch)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
                />
                {url && !youtubeId(url) && (
                  <p className="text-[11px] font-bold text-red-500">유튜브 링크를 인식하지 못했어요.</p>
                )}
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="설명 (선택)"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
                />
                {error && <p className="text-[11px] font-bold text-red-500">{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setOpen(false); setError(""); }}
                    className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-black text-gray-600 active:opacity-70 dark:bg-white/5 dark:text-gray-300"
                  >
                    취소
                  </button>
                  <button
                    onClick={submit}
                    disabled={!canSubmit || submitting}
                    className="flex-1 rounded-xl bg-[#FF8FA3] py-2.5 text-sm font-black text-white active:opacity-80 disabled:opacity-40 dark:bg-[#FFB6C1] dark:text-black"
                  >
                    {submitting ? "등록 중…" : "등록"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => signIn("kakao")}
            className="mb-4 w-full rounded-2xl border border-dashed border-gray-300 py-3 text-sm font-bold text-gray-500 active:opacity-70 dark:border-white/15 dark:text-gray-400"
          >
            로그인하고 영상 공유하기
          </button>
        )}

        {/* 목록 */}
        {posts.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
            <Youtube className="h-12 w-12" strokeWidth={1.5} />
            <p className="text-sm font-semibold">아직 공유된 영상이 없어요</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => {
              const thumb = youtubeThumb(p.youtubeUrl);
              return (
                <li key={p.id}>
                  <Link
                    href={`/board/${p.id}`}
                    className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 active:opacity-80 dark:border-white/10 dark:bg-[#161618]"
                  >
                    <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-white/5">
                      {thumb ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Youtube className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <PlayCircle className="absolute inset-0 m-auto h-8 w-8 text-white/90 drop-shadow" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="line-clamp-2 text-sm font-black leading-snug">{p.title}</p>
                      <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">{p.author}</p>
                      <div className="mt-auto flex items-center gap-1 text-[11px] font-bold text-gray-400">
                        <MessageCircle className="h-3.5 w-3.5" /> {p.commentCount}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AppBottomNav active="board" currentUserName={currentUser?.name} />
    </div>
  );
}
