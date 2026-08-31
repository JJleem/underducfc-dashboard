"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageCircle, MessageSquareHeart, Plus, Smile, X } from "lucide-react";
import type { LoungeCategory, LoungePost } from "../lib/lounge";
import { ANON_NOTICE, CATEGORY_LABEL, STATUS_META, relativeTime } from "./meta";
import ModalPortal from "../components/ModalPortal";
import AppToast from "../components/AppToast";
import useAppOverlay from "../components/useAppOverlay";
import Emoticon from "./Emoticon";
import EmoticonPicker from "./EmoticonPicker";

type Filter = "all" | LoungeCategory;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "suggestion", label: "건의" },
  { key: "chat", label: "잡담" },
];

export default function LoungeClient({
  posts,
  admin,
  preview,
}: {
  posts: LoungePost[];
  admin: boolean;
  preview: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<string | null>(null);

  const [composing, setComposing] = useState(false);
  const [category, setCategory] = useState<LoungeCategory>("suggestion");
  const [icon, setIcon] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dismissComposer = useAppOverlay(composing, () => setComposing(false));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(
    () => (filter === "all" ? posts : posts.filter((p) => p.category === filter)),
    [posts, filter],
  );

  async function submit() {
    if (!title.trim() || !body.trim() || submitting) return;
    // 미리보기에는 백엔드가 없다 — 여기서 진짜 글이 써지면 안 된다(상세와 같은 규칙).
    if (preview) {
      setToast("미리보기에서는 저장되지 않아요");
      setComposing(false);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/lounge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, icon, title, body }),
      });
      const saved = (await res.json()) as { id?: number; error?: string };
      if (!res.ok) throw new Error(saved.error || "등록 실패");
      setComposing(false);
      setTitle("");
      setBody("");
      setCategory("suggestion");
      setIcon(null);
      setIconOpen(false);
      setToast("올렸어요. 이름은 공개되지 않아요");
      // 목록이 다시 그려지기를 기다리면 방금 쓴 글이 한참 안 보여 실패한 줄 안다.
      // 바로 내 글로 보낸다. 뒤로 가면 갱신된 목록이 있도록 refresh 도 같이.
      router.refresh();
      if (saved.id !== undefined) router.push(`/lounge/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-24 text-gray-900 dark:text-white">
      {/* 헤더 — /board·/vote·/stats 와 같은 문법: 뒤로가기 + 영문 라벨. */}
      <header className="app-header-surface sticky top-0 z-40 px-4 safe-header-py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="뒤로"
            className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 dark:text-gray-300"
          >
            <ArrowLeft width={18} height={18} strokeWidth={2.4} />
          </Link>
          <span className="app-header-label">LOUNGE</span>
          <button
            onClick={() => setComposing(true)}
            aria-label="글쓰기"
            className="press-icon -my-1.5 ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:opacity-80"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF8FA3] text-white">
              <Plus width={14} height={14} strokeWidth={2.6} />
            </span>
          </button>
        </div>

        <div className="mt-2.5 flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`min-h-9 shrink-0 rounded-full px-3.5 text-[11px] font-black transition-colors ${
                filter === f.key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "text-gray-400 active:opacity-70 dark:text-white/35"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* 익명이라는 걸 모르면 아무도 안 쓴다. 목록 맨 위에 한 줄로 계속 붙여 둔다. */}
      <p className="mx-5 mt-4 flex items-center gap-2 rounded-xl bg-[#FF8FA3]/[0.07] px-3.5 py-2.5 text-[11px] font-bold text-[#e9758b] dark:bg-[#FFB6C1]/[0.07] dark:text-[#FFB6C1]">
        <MessageSquareHeart className="h-3.5 w-3.5 shrink-0" />
        {ANON_NOTICE}
      </p>

      {visible.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 px-8 text-center text-gray-400 dark:text-gray-500">
          <MessageSquareHeart className="h-12 w-12" strokeWidth={1.5} />
          <p className="text-sm font-semibold">아직 올라온 얘기가 없어요</p>
          <p className="text-[11px] font-bold leading-relaxed text-gray-300 dark:text-white/25">
            불편한 점이든 그냥 하고 싶은 말이든,
            <br />
            먼저 한 줄 남겨 보세요.
          </p>
        </div>
      ) : (
        <ul className="mt-1 divide-y divide-gray-100 px-5 dark:divide-white/[0.06]">
          {visible.map((post) => {
            const status = STATUS_META[post.status];
            return (
              <li key={post.id}>
                <Link
                  href={preview ? `/lounge/${post.id}?preview=1` : `/lounge/${post.id}`}
                  className="flex items-start gap-3 py-4 active:opacity-70"
                >
                  {post.icon && (
                    <span className="mt-0.5 shrink-0">
                      <Emoticon id={post.icon} size={34} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-black text-gray-500 dark:bg-white/10 dark:text-white/45">
                        {CATEGORY_LABEL[post.category]}
                      </span>
                      {/* 상태는 건의에만. 잡담엔 처리할 게 없다. */}
                      {post.category === "suggestion" && (
                        <span
                          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black ${status.chip}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      )}
                      {post.mine && (
                        <span className="rounded-md bg-[#FF8FA3]/12 px-2 py-1 text-[10px] font-black text-[#e9758b] dark:bg-[#FFB6C1]/12 dark:text-[#FFB6C1]">
                          내 글
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-[14px] font-black leading-snug">{post.title}</p>
                    <p className="mt-1.5 text-[10.5px] font-bold text-gray-400 dark:text-white/30">
                      {post.authorLabel} · {relativeTime(post.createdAt)}
                      {post.adminReply && (
                        <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">
                          · 운영진 답변
                        </span>
                      )}
                    </p>
                  </div>
                  {post.commentCount > 0 && (
                    <span className="mt-1 flex shrink-0 items-center gap-1 text-[10.5px] font-black text-gray-400 dark:text-white/30">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {post.commentCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {admin && visible.length > 0 && (
        <p className="mt-4 px-4 text-[10px] font-bold text-gray-300 dark:text-white/20">
          운영진은 글을 열면 작성자와 상태를 볼 수 있어요.
        </p>
      )}

      {/* 글쓰기 — body 로 포털해야 "지금 보고 있는 화면" 기준으로 뜬다 */}
      {composing && (
        <ModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
            onClick={dismissComposer}
          >
            <div
              className="app-modal-surface animate-rise max-h-[92dvh] w-full max-w-md space-y-2.5 overflow-y-auto overscroll-contain rounded-t-3xl border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-base font-black">사랑방에 남기기</h2>
                <button
                  onClick={() => setComposing(false)}
                  aria-label="닫기"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 active:bg-gray-100 dark:active:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex gap-1.5">
                {(["suggestion", "chat"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={`min-h-10 flex-1 rounded-xl text-[12px] font-black transition-colors ${
                      category === c
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                        : "border border-gray-200 text-gray-400 dark:border-white/10 dark:text-white/35"
                    }`}
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
              <p className="!mt-1.5 text-[10px] font-bold text-gray-400 dark:text-white/30">
                {category === "suggestion"
                  ? "운영진이 확인하고 답변을 답니다."
                  : "그냥 하고 싶은 얘기. 답변은 붙지 않아요."}
              </p>

              {/* 노션의 페이지 아이콘처럼 제목 바로 위에 둔다. 선택 사항이다. */}
              <div className="!mt-3">
                <button
                  type="button"
                  onClick={() => setIconOpen((open) => !open)}
                  aria-expanded={iconOpen}
                  className={`flex h-12 items-center gap-2 rounded-xl px-2.5 text-[11px] font-black transition-colors ${
                    icon
                      ? "text-gray-400 dark:text-white/30"
                      : "border border-dashed border-gray-300 text-gray-400 dark:border-white/15 dark:text-white/30"
                  }`}
                >
                  {icon ? (
                    <Emoticon id={icon} size={38} />
                  ) : (
                    <>
                      <Smile width={17} height={17} strokeWidth={2.1} />
                      아이콘 추가
                    </>
                  )}
                </button>
              </div>
              {iconOpen && (
                <EmoticonPicker
                  selected={icon}
                  onPick={(id) => {
                    setIcon(id === icon ? null : id);
                    setIconOpen(false);
                  }}
                  onClear={() => {
                    setIcon(null);
                    setIconOpen(false);
                  }}
                />
              )}

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="한 줄로 요약하면?"
                className="app-field-surface app-control-md w-full rounded-xl border border-gray-200 px-3.5 py-3 dark:border-white/10"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="편하게 적어 주세요."
                rows={7}
                className="app-field-surface app-control-md w-full resize-none rounded-xl border border-gray-200 px-3.5 py-3 leading-relaxed dark:border-white/10"
              />

              {/* 숨기면 안 쓰고, 완전 익명인 줄 알면 막 쓴다. 그대로 보여준다. */}
              <p className="!mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-[10.5px] font-bold leading-relaxed text-gray-500 dark:bg-white/[0.04] dark:text-white/40">
                작성자 이름은 화면에 공개되지 않습니다.
                <br />
                다만 운영진은 누가 썼는지 확인할 수 있어요.
              </p>

              {error && <p className="text-[11px] font-bold text-red-500">{error}</p>}
              <button
                onClick={submit}
                disabled={!title.trim() || !body.trim() || submitting}
                className="app-action-primary app-cta-md mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 font-black active:opacity-80 disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> 올리는 중…
                  </>
                ) : (
                  "남기기"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      <AppToast message={toast} />
    </div>
  );
}
