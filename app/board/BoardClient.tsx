"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ChevronLeft, Plus, MessageCircle, PlayCircle, Youtube, Instagram, Search, Heart, Eye, X, Loader2, Check, ClipboardList, Pencil } from "lucide-react";
import { youtubeThumb, youtubeId } from "../lib/youtube";
import { instagramMedia, isInstagramUrl } from "../lib/instagram";
import type { BoardPost } from "../lib/board";
import LineupMini from "../components/LineupMini";
import ModalPortal from "../components/ModalPortal";

type Sort = "latest" | "popular" | "views" | "likes" | "comments";
const SORTS: { key: Sort; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "popular", label: "인기순" },
  { key: "views", label: "조회순" },
  { key: "likes", label: "좋아요순" },
  { key: "comments", label: "댓글순" },
];

export default function BoardClient({
  posts: initial,
  currentUser,
}: {
  posts: BoardPost[];
  currentUser: { kakaoId: string; name: string } | null;
  admin: boolean;
}) {
  const [posts, setPosts] = useState(initial);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  // 글쓰기: 먼저 종류를 고르고(영상/전술), 영상이면 모달을 연다
  const [choosing, setChoosing] = useState(false);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // 유튜브(watch·youtu.be·shorts) 또는 인스타그램(릴스·게시물) 링크면 등록 가능
  const linkOk = !!youtubeId(url) || isInstagramUrl(url);
  const canSubmit = title.trim() && linkOk;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const myLineupPost = currentUser
    ? posts.find((p) => p.lineup && p.kakaoId === currentUser.kakaoId) ?? null
    : null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? posts.filter((p) =>
          [p.title, p.author, p.body ?? ""].some((f) => f.toLowerCase().includes(q)),
        )
      : posts;
    // 최신순은 수정 시각 우선 (백엔드 정렬과 동일) — 수정한 전술 글이 위로 올라온다
    const freshness = (p: BoardPost) =>
      new Date(p.updatedAt ?? p.createdAt ?? 0).getTime();
    if (sort === "latest")
      return [...filtered].sort((a, b) => freshness(b) - freshness(a) || b.id - a.id);
    const score = (p: BoardPost) =>
      sort === "views"
        ? p.viewCount
        : sort === "likes"
          ? p.likeCount
          : sort === "comments"
            ? p.commentCount
            : p.likeCount + p.commentCount + p.viewCount;
    return [...filtered].sort((a, b) => score(b) - score(a) || b.id - a.id);
  }, [posts, query, sort]);

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
      const created: BoardPost = await res.json();
      router.refresh(); // 다른 탭의 캐시된 화면에도 반영되게
      // 낙관적 반영: 서버 재요청 없이 목록에 즉시 추가
      setPosts((prev) => [created, ...prev]);
      setTitle(""); setUrl(""); setBody(""); setWriting(false);
      setToast("게시글이 등록되었어요");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(e: React.MouseEvent, post: BoardPost) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) { signIn("kakao"); return; }
    const before = { likedByMe: post.likedByMe, likeCount: post.likeCount };
    // 낙관적 업데이트
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p,
      ),
    );
    try {
      const res = await fetch(`/api/board/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { liked, likeCount } = await res.json();
      router.refresh();
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likedByMe: liked, likeCount } : p)),
      );
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...before } : p)));
    }
  }

  return (
    <div className="pb-24 text-gray-900 dark:text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/90 px-4 safe-header-py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#101013]/90">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="홈으로" className="rounded-full p-1 active:opacity-60">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-1.5 text-lg font-black">
            <Youtube className="h-5 w-5 text-[#FF8FA3] dark:text-[#FFB6C1]" /> 전술게시판
          </h1>
          <span className="ml-auto text-xs font-bold text-gray-400">{posts.length}개</span>
        </div>

        {/* 검색 + 글쓰기 */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목·작성자·내용 검색"
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <button
            onClick={() => (currentUser ? setChoosing(true) : signIn("kakao"))}
            aria-label="글쓰기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF8FA3] text-white shadow-sm active:opacity-80 dark:bg-[#FFB6C1] dark:text-black"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* 정렬 필터 */}
        <div className="mt-2.5 flex gap-1.5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-full px-3 py-1 text-[11px] font-black transition-colors ${
                sort === s.key
                  ? "bg-[#FF8FA3] text-white dark:bg-[#FFB6C1] dark:text-black"
                  : "bg-gray-100 text-gray-500 active:opacity-70 dark:bg-white/5 dark:text-gray-400"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      {/* 목록 */}
      <div className="px-4 pt-4">
        {visible.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
            <Youtube className="h-12 w-12" strokeWidth={1.5} />
            <p className="text-sm font-semibold">{query ? "검색 결과가 없어요" : "아직 공유된 영상이 없어요"}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((p) => {
              const thumb = youtubeThumb(p.youtubeUrl);
              // 인스타는 API 토큰 없이 썸네일을 못 가져온다 → 인스타 느낌의 placeholder
              const insta = p.lineup ? null : instagramMedia(p.youtubeUrl);
              return (
                <li key={p.id}>
                  <Link
                    href={`/board/${p.id}`}
                    className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 active:opacity-80 dark:border-white/10 dark:bg-[#161618]"
                  >
                    <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-white/5">
                      {p.lineup ? (
                        <>
                          <LineupMini
                            formation={p.lineup.quarters[0]?.formation ?? ""}
                            positions={p.lineup.quarters[0]?.positions}
                          />
                          <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[9px] font-black text-white">
                            {p.lineup.quarters[0]?.formation}
                          </span>
                          {p.lineup.quarters.length > 1 && (
                            <span className="absolute right-1 top-1 rounded bg-[#FF8FA3] px-1 text-[9px] font-black text-white">
                              {p.lineup.quarters.length}쿼터
                            </span>
                          )}
                        </>
                      ) : thumb ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                          <PlayCircle className="absolute inset-0 m-auto h-8 w-8 text-white/90 drop-shadow" />
                        </>
                      ) : insta ? (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]">
                          <Instagram className="h-7 w-7 text-white/95" strokeWidth={2} />
                          <span className="absolute bottom-1 left-1 rounded bg-black/45 px-1 text-[9px] font-black text-white">
                            {insta.kind === "reel" ? "릴스" : "인스타"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Youtube className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p
                        className="truncate text-[13px] font-black leading-snug"
                        title={p.title}
                      >
                        {p.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-500 dark:text-gray-400">
                        {p.author}
                        {p.updatedAt && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#FF8FA3] dark:text-[#FFB6C1]">
                            <Pencil className="h-2.5 w-2.5" /> 수정됨
                          </span>
                        )}
                      </p>
                      {p.body && (
                        <p className="mt-1 line-clamp-1 text-[11px] text-gray-400 dark:text-gray-500">{p.body}</p>
                      )}
                      <div className="mt-auto flex items-center gap-3 pt-1 text-[11px] font-bold text-gray-400">
                        <button
                          onClick={(e) => toggleLike(e, p)}
                          className="flex items-center gap-1 active:opacity-60"
                          aria-label="좋아요"
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${p.likedByMe ? "fill-[#FF8FA3] text-[#FF8FA3] dark:fill-[#FFB6C1] dark:text-[#FFB6C1]" : ""}`}
                          />
                          <span className={p.likedByMe ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : ""}>{p.likeCount}</span>
                        </button>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" /> {p.commentCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" /> {p.viewCount}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 글 종류 선택 — body 로 포털해야 "지금 보고 있는 화면" 기준으로 뜬다 */}
      {choosing && (
        <ModalPortal>
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setChoosing(false)}
        >
          <div
            className="w-full max-w-md space-y-2.5 rounded-t-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#161618] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-black">무엇을 올릴까요?</h2>
              <button onClick={() => setChoosing(false)} className="p-1 text-gray-400 active:opacity-60" aria-label="닫기">
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => { setChoosing(false); setWriting(true); }}
              className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 p-3.5 text-left active:opacity-70 dark:border-white/10"
            >
              <div className="flex shrink-0 items-center gap-1 text-[#FF8FA3] dark:text-[#FFB6C1]">
                <Youtube className="h-6 w-6" />
                <Instagram className="h-5 w-5" />
              </div>
              <span>
                <span className="block text-sm font-black">영상 공유</span>
                <span className="block text-[11px] text-gray-400">유튜브 · 인스타그램 릴스</span>
              </span>
            </button>
            <Link
              href="/board/lineup"
              className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 p-3.5 text-left active:opacity-70 dark:border-white/10"
            >
              <ClipboardList className="h-6 w-6 shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1]" />
              <span>
                <span className="block text-sm font-black">전술 짜기</span>
                <span className="block text-[11px] text-gray-400">
                  {myLineupPost ? "이미 올린 전술을 수정합니다" : "선발 11명·포메이션·개인 전술"}
                </span>
              </span>
            </Link>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* 글쓰기 모달 — body 로 포털해야 "지금 보고 있는 화면" 기준으로 뜬다 */}
      {writing && (
        <ModalPortal>
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setWriting(false)}>
          <div
            className="w-full max-w-md space-y-2.5 rounded-t-3xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#161618] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-black">영상 공유</h2>
              <button onClick={() => setWriting(false)} className="p-1 text-gray-400 active:opacity-60" aria-label="닫기">
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="유튜브 또는 인스타그램 릴스 링크"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
            />
            {url && !linkOk && (
              <p className="text-[11px] font-bold text-red-500">
                링크를 인식하지 못했어요. 유튜브(watch·youtu.be·shorts) 또는 인스타그램(릴스·게시물) 주소를 넣어주세요.
              </p>
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="설명 (선택)"
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#FF8FA3] dark:border-white/10 dark:bg-white/5"
            />
            {error && <p className="text-[11px] font-bold text-red-500">{error}</p>}
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FF8FA3] py-3 text-sm font-black text-white active:opacity-80 disabled:opacity-40 dark:bg-[#FFB6C1] dark:text-black"
            >
              {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> 올리는 중…</>) : "등록"}
            </button>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* 토스트 — 모달과 같은 이유로 포털이 필요하다 */}
      {toast && (
        <ModalPortal>
        <div className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gray-900/90 px-4 py-2 text-xs font-bold text-white shadow-lg dark:bg-white/90 dark:text-black">
          <Check className="h-3.5 w-3.5" /> {toast}
        </div>
        </ModalPortal>
      )}

    </div>
  );
}
