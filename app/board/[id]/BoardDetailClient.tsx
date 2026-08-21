"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ChevronLeft, ChevronUp, ChevronDown, Trash2, Send, Heart, MessageCircle, Eye, Pencil, Instagram, Pin } from "lucide-react";
import { youtubeEmbed } from "../../lib/youtube";
import { instagramEmbed } from "../../lib/instagram";
import SwipeNav from "./SwipeNav";
import AppConfirmDialog from "../../components/AppConfirmDialog";
import AppToast from "../../components/AppToast";

export interface NeighborPost {
  id: number;
  title: string;
  author: string;
}

/**
 * 글 아래 이전·다음 링크.
 * 스와이프는 눈에 안 보여서 있는 줄 모르면 아무도 안 쓴다. 링크로 한 번 눌러보면
 * "위아래로 넘어가는 화면"이라는 걸 알게 되고, 데스크톱(마우스)에서도 동작한다.
 */
function NeighborLinks({ prev, next }: { prev: NeighborPost | null; next: NeighborPost | null }) {
  if (!prev && !next) return null;
  return (
    <nav className="mt-8 border-t border-gray-100 dark:border-white/[0.06]">
      {[
        { post: prev, label: "이전 글", Icon: ChevronUp },
        { post: next, label: "다음 글", Icon: ChevronDown },
      ].map(({ post, label, Icon }) =>
        post ? (
          <Link
            key={label}
            href={`/board/${post.id}`}
            className="flex items-center gap-3 border-b border-gray-100 py-3.5 active:opacity-60 dark:border-white/[0.06]"
          >
            <Icon
              width={15}
              height={15}
              strokeWidth={2.4}
              className="shrink-0 text-gray-300 dark:text-white/25"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black tracking-[0.14em] text-gray-400 dark:text-white/35">
                {label}
              </span>
              <span className="mt-0.5 block truncate text-[13px] font-black text-gray-900 dark:text-white">
                {post.title}
              </span>
            </span>
            <span className="shrink-0 text-[11px] font-bold text-gray-400 dark:text-white/35">
              {post.author}
            </span>
          </Link>
        ) : null,
      )}
    </nav>
  );
}
import { FormationField, type SeasonStat } from "../../components/FormationField";
import type { EarnedTitle } from "../../lib/titles";
import type { BoardPost, BoardComment } from "../../lib/board";

// 한국시간(KST) 기준 날짜 + 시:분:초
function fmt(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function BoardDetailClient({
  post,
  comments: initialComments,
  currentUser,
  admin,
  rosterMap,
  captainRoles = {},
  playerStats,
  playerTitles = {},
  prev = null,
  next = null,
}: {
  post: BoardPost;
  comments: BoardComment[];
  currentUser: { kakaoId: string; name: string } | null;
  admin: boolean;
  rosterMap: Record<string, string>;
  captainRoles?: Record<string, string>;
  playerStats?: Record<string, SeasonStat>;
  playerTitles?: Record<string, EarnedTitle[]>;
  /** 위아래로 넘어갈 이웃 글. 스와이프와 하단 링크가 같은 값을 쓴다. */
  prev?: NeighborPost | null;
  next?: NeighborPost | null;
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const likeBusy = useRef(false);
  const [viewCount, setViewCount] = useState(post.viewCount);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "post" }
    | { kind: "comment"; id: number; message: string }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [pinned, setPinned] = useState(post.pinned);
  const [pinBusy, setPinBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const embed = youtubeEmbed(post.youtubeUrl);
  const instaEmbed = embed ? null : instagramEmbed(post.youtubeUrl);
  // 내 전술 글이면 수정 버튼을 노출 (전술 글은 1인 1개라 항상 /board/lineup으로 간다)
  const isMyLineup = !!post.lineup && !!currentUser && post.kakaoId === currentUser.kakaoId;
  // 전술 글은 쿼터별 안을 가질 수 있다 (최대 4개)
  const [quarterIdx, setQuarterIdx] = useState(0);
  const shownQuarter = post.lineup?.quarters[quarterIdx] ?? post.lineup?.quarters[0] ?? null;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const key = `ud:board:viewed:${post.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // 저장소 접근이 막혀도 상세 보기는 정상 동작한다.
    }
    fetch(`/api/board/${post.id}/view`, { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.viewCount === "number") setViewCount(data.viewCount);
      })
      .catch(() => {});
  }, [post.id]);

  async function toggleLike() {
    if (!currentUser) { signIn("kakao"); return; }
    if (likeBusy.current) return;
    likeBusy.current = true;
    const before = { liked, likeCount };
    setLiked((v) => !v);
    setLikeCount((n) => n + (liked ? -1 : 1));
    try {
      const res = await fetch(`/api/board/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh(); // 목록 탭의 캐시된 좋아요 수에도 반영되게
      const j = await res.json();
      setLiked(j.liked);
      setLikeCount(j.likeCount);
    } catch {
      setLiked(before.liked);
      setLikeCount(before.likeCount);
      setToast({ message: "좋아요를 반영하지 못했어요.", tone: "error" });
    } finally {
      likeBusy.current = false;
    }
  }

  async function togglePin() {
    if (pinBusy) return;
    setPinBusy(true);
    try {
      const res = await fetch(`/api/board/${post.id}/pin`, { method: "POST" });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setPinned(j.pinned);
      router.refresh();
      setToast({ message: j.pinned ? "게시글을 고정했어요." : "고정을 해제했어요.", tone: "success" });
    } catch {
      setToast({ message: "고정 상태를 변경하지 못했어요.", tone: "error" });
    } finally {
      setPinBusy(false);
    }
  }

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
      router.refresh();
      setComments((prev) => [...prev, created]);
      setMessage("");
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "댓글을 등록하지 못했어요.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(cid: number) {
    const res = await fetch(`/api/board/${post.id}/comments/${cid}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      setComments((prev) => prev.filter((c) => c.id !== cid));
      setToast({ message: "댓글을 삭제했어요.", tone: "success" });
      return;
    }
    throw new Error("댓글을 삭제하지 못했어요.");
  }

  async function removePost() {
    const res = await fetch(`/api/board/${post.id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      router.push("/board");
      return;
    }
    throw new Error("게시글을 삭제하지 못했어요.");
  }

  return (
    <div data-pull-to-refresh-ignore className="pb-24 text-gray-900 dark:text-white">
      <SwipeNav prevId={prev?.id ?? null} nextId={next?.id ?? null} />
      <header className="app-page-header safe-header-py-3">
        <Link href="/board" aria-label="목록으로" className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 active:opacity-60 dark:text-gray-300">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="app-header-label truncate">BOARD</h1>
        <div className="ml-auto flex items-center">
          {admin && (
            <button onClick={togglePin} disabled={pinBusy} className={`-my-2.5 flex h-11 w-11 items-center justify-center rounded-full active:opacity-60 ${pinned ? "text-[#FF8FA3] dark:text-[#FFB6C1]" : "text-gray-400"}`} aria-label={pinned ? "고정 해제" : "글 고정"}>
              <Pin className={`h-4 w-4 ${pinned ? "fill-current" : ""}`} />
            </button>
          )}
          {canDeletePost && (
            <button onClick={() => setDeleteTarget({ kind: "post" })} className="-my-2.5 flex h-11 w-11 items-center justify-center rounded-full text-gray-400 active:bg-red-50 active:text-red-500 dark:active:bg-red-500/10" aria-label="글 삭제">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="px-4 pt-4">
        {/* 전술 글이면 라인업, 아니면 영상 */}
        {post.lineup ? (
          <div className="-mx-4 space-y-2">
            {/* 쿼터가 2개 이상이면 탭으로 전환 */}
            {post.lineup.quarters.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto px-4 pb-0.5">
                {post.lineup.quarters.map((q, i) => (
                  <button
                    key={q.quarter}
                    onClick={() => setQuarterIdx(i)}
                    className={`min-h-9 shrink-0 rounded-xl px-3 text-[11px] font-black transition-colors ${
                      quarterIdx === i
                        ? "bg-[#FF8FA3] text-white dark:bg-[#FFB6C1] dark:text-black"
                        : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                    }`}
                  >
                    {q.quarter} · {q.formation}
                  </button>
                ))}
              </div>
            )}
            {shownQuarter && (
              <FormationField
                lineup={{
                  formation: shownQuarter.formation,
                  players: shownQuarter.players,
                  positions: shownQuarter.positions,
                  tactic: shownQuarter.tactic,
                  instructions: shownQuarter.instructions,
                }}
                rosterMap={rosterMap}
                captainRoles={captainRoles}
                playerStats={playerStats}
                playerTitles={playerTitles}
                mode="faceon"
              />
            )}
          </div>
        ) : post.youtubeUrl ? (
          embed ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={embed}
                title={post.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : instaEmbed ? (
            // 인스타그램 공개 임베드. 릴스는 세로(9:16)라 유튜브와 다른 비율을 쓴다.
            // 인스타 정책상 임베드에서 바로 재생이 막힐 수 있어 아래에 원본 링크를 같이 둔다.
            <div className="space-y-2">
              <div className="relative mx-auto aspect-[9/16] max-h-[76vh] w-full max-w-[400px] overflow-hidden rounded-2xl bg-black">
                <iframe
                  src={instaEmbed}
                  title={post.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  scrolling="no"
                  className="h-full w-full"
                />
              </div>
              <a
                href={post.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-[12px] font-black text-gray-500 active:opacity-70 dark:border-white/10 dark:text-gray-400"
              >
                <Instagram className="h-3.5 w-3.5" /> 인스타그램에서 보기
              </a>
            </div>
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <a href={post.youtubeUrl} target="_blank" rel="noreferrer" className="flex h-full items-center justify-center text-sm text-white/80 underline">
                원본 링크로 열기
              </a>
            </div>
          )
        ) : (
          // 라인업도 영상도 없는 글 (예전 구조로 저장돼 내용이 비어버린 경우)
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-gray-200 text-[12px] font-bold text-gray-400 dark:border-white/10">
            내용을 불러올 수 없어요
          </div>
        )}

        {/* 제목/작성자/본문 */}
        {pinned && (
          <div className="mt-3 flex items-center gap-1 text-[11px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">
            <Pin className="h-3 w-3 fill-current" />
            고정된 게시글
          </div>
        )}
        <h2 className={`${pinned ? "mt-1" : "mt-3"} text-lg font-black leading-snug`}>{post.title}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{post.author} · {fmt(post.createdAt)}</span>
          {post.updatedAt && (
            <span className="font-bold text-[#FF8FA3] dark:text-[#FFB6C1]">
              · {fmt(post.updatedAt)} 수정됨
            </span>
          )}
          {isMyLineup && (
            <Link href="/board/lineup" className="ml-auto flex min-h-9 items-center gap-1 rounded-lg bg-gray-100 px-3 font-black text-gray-600 dark:bg-white/10 dark:text-gray-200">
              <Pencil className="h-3 w-3" /> 수정
            </Link>
          )}
        </p>
        {post.body && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{post.body}</p>
        )}

        {/* 좋아요 / 댓글 수 */}
        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-2.5 dark:border-white/5">
          <button
            onClick={toggleLike}
            className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-black transition-colors ${
              liked
                ? "bg-[#FF8FA3]/10 text-[#FF8FA3] dark:bg-[#FFB6C1]/10 dark:text-[#FFB6C1]"
                : "bg-gray-100 text-gray-500 active:opacity-70 dark:bg-white/5 dark:text-gray-400"
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likeCount}
          </button>
          <span className="flex items-center gap-1.5 px-1 text-[13px] font-bold text-gray-400">
            <MessageCircle className="h-4 w-4" /> {comments.length}
          </span>
          <span className="flex items-center gap-1.5 px-1 text-[13px] font-bold text-gray-400">
            <Eye className="h-4 w-4" /> {viewCount}
          </span>
        </div>

        {/* 댓글 */}
        <div className="mt-6 border-t border-gray-100 pt-4 dark:border-white/5">
          <p className="mb-3 text-sm font-black">댓글 {comments.length}</p>
          <ul className="space-y-3">
            {comments.map((c) => {
              return (
              <li key={c.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <Link href={`/players/${encodeURIComponent(c.author)}`} className="truncate text-[12.5px] font-black text-gray-900 active:opacity-60 dark:text-white">
                      {c.author}
                    </Link>
                    <span className="shrink-0 text-[10px] font-bold text-gray-300 tabular-nums dark:text-white/25">{fmt(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-[1.55] text-gray-700 [overflow-wrap:anywhere] dark:text-white/70">{c.message}</p>
                </div>
                {canDeleteComment(c) && (
                  <button onClick={() => setDeleteTarget({ kind: "comment", id: c.id, message: c.message })} className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-gray-300 active:text-red-500 dark:text-white/25" aria-label="댓글 삭제">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
              );
            })}
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
                // 한글 조합 중(isComposing)에는 보내지 않는다 — 조합 확정용 Enter가
                // 전송으로 새면 "안 눌렀는데 댓글이 올라간다".
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && !e.repeat) {
                    e.preventDefault();
                    addComment();
                  }
                }}
                enterKeyHint="send"
                placeholder="댓글 달기…"
                className="app-field-surface app-control-md flex-1 rounded-full border border-gray-200 px-4 py-2.5 dark:border-white/10"
              />
              <button
                onClick={addComment}
                disabled={!message.trim() || busy}
                className="app-action-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:opacity-80 disabled:opacity-40"
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

        <NeighborLinks prev={prev} next={next} />
      </div>
      <AppConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.kind === "post" ? "게시글을 삭제할까요?" : "댓글을 삭제할까요?"}
        description={deleteTarget?.kind === "post" ? "삭제한 게시글은 다시 복구할 수 없어요." : deleteTarget?.message}
        confirmLabel="삭제"
        destructive
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            if (deleteTarget.kind === "post") await removePost();
            else await removeComment(deleteTarget.id);
            setDeleteTarget(null);
          } catch (error) {
            setToast({
              message: error instanceof Error ? error.message : "삭제하지 못했어요.",
              tone: "error",
            });
          } finally {
            setDeleting(false);
          }
        }}
      />
      <AppToast message={toast?.message ?? null} tone={toast?.tone} />
    </div>
  );
}
