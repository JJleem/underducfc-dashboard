"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageCircle, ShieldCheck, Smile, Trash2, X } from "lucide-react";
import type { LoungePostDetail, LoungeStatus } from "../../lib/lounge";
import { CATEGORY_LABEL, STATUS_META, STATUS_ORDER, relativeTime } from "../meta";
import AppToast from "../../components/AppToast";
import AppConfirmDialog from "../../components/AppConfirmDialog";
import Emoticon from "../Emoticon";
import { EMOTICONS } from "../emoticons";

export default function LoungeDetailClient({
  post,
  admin,
  preview,
}: {
  post: LoungePostDetail;
  admin: boolean;
  preview: boolean;
}) {
  const router = useRouter();
  const status = STATUS_META[post.status];
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [comment, setComment] = useState("");
  const [emoticon, setEmoticon] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "post" } | { kind: "comment"; id: number } | null>(
    null,
  );
  const [reply, setReply] = useState(post.adminReply ?? "");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  /** 미리보기에서는 백엔드가 없으니 쓰기 동작을 막고 이유를 알린다. */
  function blockedInPreview(): boolean {
    if (!preview) return false;
    setToast("미리보기에서는 저장되지 않아요");
    return true;
  }

  async function send(path: string, init: RequestInit, done: string) {
    if (blockedInPreview()) return false;
    setBusy(true);
    try {
      const res = await fetch(path, init);
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "실패했어요");
      setToast(done);
      router.refresh();
      return true;
    } catch (e) {
      setToast(e instanceof Error ? e.message : "실패했어요");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const json = (body: unknown): RequestInit => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  async function addComment() {
    // 이모티콘만 보내는 것도 댓글이다.
    if (!comment.trim() && !emoticon) return;
    const done = await send(
      `/api/lounge/${post.id}/comments`,
      json({ message: comment, emoticon }),
      "댓글을 남겼어요",
    );
    if (done) {
      setComment("");
      setEmoticon(null);
      setPickerOpen(false);
    }
  }

  async function patch(body: Record<string, unknown>, done: string) {
    await send(`/api/lounge/${post.id}`, { ...json(body), method: "PATCH" }, done);
  }

  async function remove() {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    if (target.kind === "post") {
      if (await send(`/api/lounge/${post.id}`, { method: "DELETE" }, "글을 지웠어요")) {
        router.push("/lounge");
      }
    } else {
      await send(`/api/lounge/${post.id}/comments/${target.id}`, { method: "DELETE" }, "댓글을 지웠어요");
    }
  }

  return (
    <div className="pb-28 text-gray-900 dark:text-white">
      <header className="app-header-surface sticky top-0 z-40 px-4 safe-header-py-3">
        <div className="flex items-center gap-2">
          <Link
            href={preview ? "/lounge?preview=1" : "/lounge"}
            aria-label="뒤로"
            className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 dark:text-gray-300"
          >
            <ArrowLeft width={18} height={18} strokeWidth={2.4} />
          </Link>
          <span className="app-header-label">LOUNGE</span>
          {(post.mine || admin) && (
            <button
              onClick={() => setConfirm({ kind: "post" })}
              aria-label="글 삭제"
              className="press-icon -my-1.5 ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 active:opacity-70"
            >
              <Trash2 width={16} height={16} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </header>

      <article className="px-4 pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9.5px] font-black text-gray-500 dark:bg-white/10 dark:text-white/45">
            {CATEGORY_LABEL[post.category]}
          </span>
          {post.category === "suggestion" && (
            <span className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-black ${status.chip}`}>
              <span className={`h-1 w-1 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          )}
        </div>

        <h1 className="mt-2.5 text-[17px] font-black leading-snug">{post.title}</h1>
        <p className="mt-1.5 text-[10.5px] font-bold text-gray-400 dark:text-white/30">
          익명 · {relativeTime(post.createdAt)}
        </p>

        <p className="mt-4 whitespace-pre-line text-[13px] font-semibold leading-[1.75] text-gray-700 dark:text-white/70">
          {post.body}
        </p>

        {/* 운영진에게만 보이는 작성자. 이 값은 백엔드가 운영진 요청일 때만 내려준다. */}
        {admin && post.author && (
          <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2 text-[10.5px] font-bold text-gray-500 dark:bg-white/[0.04] dark:text-white/40">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            운영진만 보임 — 작성자 {post.author}
          </p>
        )}
      </article>

      {/* 운영진 답변 — 본문 바로 아래. 답이 달린다는 게 보여야 다음 사람이 쓴다. */}
      {post.adminReply && (
        <section className="mx-4 mt-5 rounded-2xl border border-[#FF8FA3]/25 bg-[#FF8FA3]/[0.06] p-4 dark:border-[#FFB6C1]/20 dark:bg-[#FFB6C1]/[0.06]">
          <p className="flex items-center gap-1.5 text-[10px] font-black text-[#e9758b] dark:text-[#FFB6C1]">
            <ShieldCheck className="h-3.5 w-3.5" />
            운영진 답변
            {post.adminReplyAuthor && <span className="opacity-70">· {post.adminReplyAuthor}</span>}
            <span className="opacity-70">· {relativeTime(post.adminReplyAt)}</span>
          </p>
          <p className="mt-2 whitespace-pre-line text-[12.5px] font-semibold leading-[1.75] text-gray-700 dark:text-white/70">
            {post.adminReply}
          </p>
        </section>
      )}

      {/* 운영진 조작 — 상태 변경과 답변 작성 */}
      {admin && post.category === "suggestion" && (
        <section className="mx-4 mt-5 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
          <p className="text-[10px] font-black tracking-[0.1em] text-gray-400">운영진</p>

          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {STATUS_ORDER.map((s: LoungeStatus) => (
              <button
                key={s}
                disabled={busy}
                onClick={() => patch({ status: s }, "상태를 바꿨어요")}
                aria-pressed={post.status === s}
                className={`min-h-9 rounded-lg text-[11px] font-black transition-colors disabled:opacity-40 ${
                  post.status === s
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "border border-gray-200 text-gray-400 dark:border-white/10 dark:text-white/35"
                }`}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>

          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="답변을 적어 주세요."
            rows={4}
            className="app-field-surface app-control-md mt-2.5 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 dark:border-white/10"
          />
          <button
            disabled={busy || !reply.trim() || reply.trim() === (post.adminReply ?? "")}
            onClick={() => patch({ adminReply: reply }, "답변을 남겼어요")}
            className="app-action-primary app-cta-md mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 font-black active:opacity-80 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : post.adminReply ? "답변 수정" : "답변 등록"}
          </button>
        </section>
      )}

      {/* 댓글 */}
      <section className="mt-6 border-t border-gray-100 px-4 pt-4 dark:border-white/[0.06]">
        <p className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-white/45">
          <MessageCircle className="h-3.5 w-3.5" />
          댓글 {post.comments.length}
        </p>

        <ul className="mt-2 divide-y divide-gray-100 dark:divide-white/[0.06]">
          {post.comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[10.5px] font-black text-gray-500 dark:text-white/45">
                  {/* 라벨은 백엔드가 글 단위로 매긴다 — 글이 달라지면 번호도 새로 매겨진다. */}
                  {c.authorLabel}
                  <span className="font-bold text-gray-300 dark:text-white/20">
                    {relativeTime(c.createdAt)}
                  </span>
                  {admin && c.author && (
                    <span className="font-bold text-gray-300 dark:text-white/20">· {c.author}</span>
                  )}
                </p>
                {c.emoticon && (
                  <div className="mt-1.5">
                    <Emoticon id={c.emoticon} size={60} />
                  </div>
                )}
                {c.message && (
                  <p className="mt-1 whitespace-pre-line text-[12.5px] font-semibold leading-relaxed text-gray-700 dark:text-white/70">
                    {c.message}
                  </p>
                )}
              </div>
              {(c.mine || admin) && (
                <button
                  onClick={() => setConfirm({ kind: "comment", id: c.id })}
                  aria-label="댓글 삭제"
                  className="shrink-0 p-1 text-gray-300 active:opacity-60 dark:text-white/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* 고른 이모티콘은 입력칸 위에 미리 보여준다 — 뭘 보내는지 모르고 누르면 안 된다. */}
        {emoticon && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/[0.04]">
            <Emoticon id={emoticon} size={36} />
            <span className="flex-1 text-[10.5px] font-bold text-gray-400 dark:text-white/30">
              이 이모티콘과 함께 올라가요
            </span>
            <button
              onClick={() => setEmoticon(null)}
              aria-label="이모티콘 빼기"
              className="p-1 text-gray-400 active:opacity-60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {pickerOpen && (
          <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-2xl border border-gray-200 p-2.5 dark:border-white/10">
            {EMOTICONS.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setEmoticon(e.id);
                  setPickerOpen(false);
                }}
                aria-label={e.label}
                className="flex flex-col items-center gap-1 rounded-xl py-2 active:bg-gray-100 dark:active:bg-white/10"
              >
                <Emoticon id={e.id} size={34} />
                <span className="text-[9px] font-black text-gray-400 dark:text-white/30">
                  {e.label}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-end gap-2">
          <button
            onClick={() => setPickerOpen((open) => !open)}
            aria-label="이모티콘"
            aria-expanded={pickerOpen}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              pickerOpen
                ? "border-[#FF8FA3] text-[#FF8FA3] dark:border-[#FFB6C1] dark:text-[#FFB6C1]"
                : "border-gray-200 text-gray-400 dark:border-white/10 dark:text-white/35"
            }`}
          >
            <Smile className="h-[18px] w-[18px]" />
          </button>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="댓글도 익명으로 달려요"
            rows={2}
            className="app-field-surface app-control-md min-w-0 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 dark:border-white/10"
          />
          <button
            onClick={addComment}
            disabled={busy || (!comment.trim() && !emoticon)}
            className="app-action-primary app-cta-md flex h-11 shrink-0 items-center justify-center rounded-xl px-4 font-black active:opacity-80 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "등록"}
          </button>
        </div>
      </section>

      <AppConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "comment" ? "댓글을 지울까요?" : "글을 지울까요?"}
        description="지우면 되돌릴 수 없어요."
        confirmLabel="삭제"
        destructive
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
      <AppToast message={toast} />
    </div>
  );
}
