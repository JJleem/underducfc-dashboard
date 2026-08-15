"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Plus, Youtube, Instagram, Search, X, Loader2, ClipboardList } from "lucide-react";
import { youtubeId } from "../lib/youtube";
import { isInstagramUrl } from "../lib/instagram";
import type { BoardPost } from "../lib/board";
import BoardGrid from "./BoardGrid";
import ModalPortal from "../components/ModalPortal";
import AppToast from "../components/AppToast";
import useAppOverlay from "../components/useAppOverlay";

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
  const [composer, setComposer] = useState<"choose" | "video" | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // 유튜브(watch·youtu.be·shorts) 또는 인스타그램(릴스·게시물) 링크면 등록 가능
  const linkOk = !!youtubeId(url) || isInstagramUrl(url);
  const canSubmit = title.trim() && linkOk;
  const dismissComposer = useAppOverlay(composer !== null, () => setComposer(null));

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
    const pinFirst = (a: BoardPost, b: BoardPost) =>
      (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    // 최신순은 수정 시각 우선 (백엔드 정렬과 동일) — 수정한 전술 글이 위로 올라온다
    const freshness = (p: BoardPost) =>
      new Date(p.updatedAt ?? p.createdAt ?? 0).getTime();
    if (sort === "latest")
      return [...filtered].sort((a, b) => pinFirst(a, b) || freshness(b) - freshness(a) || b.id - a.id);
    const score = (p: BoardPost) =>
      sort === "views"
        ? p.viewCount
        : sort === "likes"
          ? p.likeCount
          : sort === "comments"
            ? p.commentCount
            : p.likeCount + p.commentCount + p.viewCount;
    return [...filtered].sort((a, b) => pinFirst(a, b) || score(b) - score(a) || b.id - a.id);
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
      setTitle(""); setUrl(""); setBody(""); setComposer(null);
      setToast("게시글이 등록되었어요");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div className="pb-24 text-gray-900 dark:text-white">
      {/* 헤더 — /vote·/stats·/record 와 같은 문법: 뒤로가기 + 영문 라벨.
          페이지마다 상단 바가 다르면 같은 앱으로 안 읽힌다. */}
      <header className="sticky top-0 z-30 border-b border-gray-200/60 bg-gray-50/80 px-4 safe-header-py-3 backdrop-blur dark:border-white/[0.06] dark:bg-[#09090b]/80">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="뒤로"
            className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 dark:text-gray-300"
          >
            <ArrowLeft width={18} height={18} strokeWidth={2.4} />
          </Link>
          <span className="text-[12px] font-black tracking-widest text-gray-400">BOARD</span>
          <button
            onClick={() => (currentUser ? setComposer("choose") : signIn("kakao"))}
            aria-label="글쓰기"
            className="press-icon -my-1.5 ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:opacity-80"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF8FA3] text-white">
              <Plus width={14} height={14} strokeWidth={2.6} />
            </span>
          </button>
        </div>

        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·작성자·내용 검색"
            className="w-full rounded-full bg-gray-100 py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-gray-400 dark:bg-white/[0.07] dark:placeholder:text-white/25"
          />
        </div>

        <div className="mt-2.5 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              aria-pressed={sort === s.key}
              className={`min-h-9 shrink-0 rounded-full px-3 text-[11px] font-black transition-colors ${
                sort === s.key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "text-gray-400 active:opacity-70 dark:text-white/35"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      {/* 목록 */}
      {/* 그리드는 화면 폭을 그대로 쓴다. 릴스 탭이 그렇고, 홈 피드의 사진도 풀블리드다.
          좌우 패딩은 빈 상태 문구에만 필요해서 여기서 갈라 준다. */}
      <div className="pt-4">
        {visible.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 px-4 text-gray-400 dark:text-gray-500">
            <Youtube className="h-12 w-12" strokeWidth={1.5} />
            <p className="text-sm font-semibold">{query ? "검색 결과가 없어요" : "아직 공유된 글이 없어요"}</p>
          </div>
        ) : (
          <BoardGrid key={`${sort}:${query.trim().toLowerCase()}`} posts={visible} />
        )}
      </div>

      {/* 글 종류 선택 — body 로 포털해야 "지금 보고 있는 화면" 기준으로 뜬다 */}
      {composer === "choose" && (
        <ModalPortal>
        <div
          role="dialog"
          aria-modal="true"
          className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={dismissComposer}
        >
          <div
            className="animate-rise max-h-[92dvh] w-full max-w-md space-y-2.5 overflow-y-auto overscroll-contain rounded-t-3xl border border-gray-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-[#161618] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-black">무엇을 올릴까요?</h2>
              <button onClick={dismissComposer} className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 active:bg-gray-100 dark:active:bg-white/10" aria-label="닫기">
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setComposer("video")}
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
      {composer === "video" && (
        <ModalPortal>
        <div role="dialog" aria-modal="true" className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={dismissComposer}>
          <div
            className="animate-rise max-h-[92dvh] w-full max-w-md space-y-2.5 overflow-y-auto overscroll-contain rounded-t-3xl border border-gray-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-[#161618] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-black">영상 공유</h2>
              <button onClick={dismissComposer} className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 active:bg-gray-100 dark:active:bg-white/10" aria-label="닫기">
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

      <AppToast message={toast} />

    </div>
  );
}
