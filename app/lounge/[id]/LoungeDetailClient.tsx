"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CornerDownRight, Loader2, Send, ShieldCheck, Smile, Trash2, X } from "lucide-react";
import type { LoungeComment, LoungePostDetail, LoungeStatus } from "../../lib/lounge";
import { CATEGORY_LABEL, STATUS_META, STATUS_ORDER, relativeTime } from "../meta";
import AppToast from "../../components/AppToast";
import AppConfirmDialog from "../../components/AppConfirmDialog";
import Emoticon from "../Emoticon";
import EmoticonPicker from "../EmoticonPicker";

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
  const [toast, setToast] = useState<string | null>(null);

  // 서버가 준 목록으로 시작하고, 쓰거나 지우면 그 자리에서 반영한다.
  // (FeedbackThread 와 같은 규칙 — 서버 왕복을 기다리면 눌러도 멈춘 것처럼 보인다)
  const [comments, setComments] = useState<LoungeComment[]>(post.comments);
  const [pending, setPending] = useState<LoungeComment | null>(null);

  // 상태·답변도 화면에서 먼저 바꾼다. 운영진이 누를 때마다 페이지가 멎으면 안 된다.
  const [status, setStatus] = useState(post.status);
  const [savedReply, setSavedReply] = useState(post.adminReply);
  const [replyAuthor, setReplyAuthor] = useState(post.adminReplyAuthor);
  const [replyAt, setReplyAt] = useState(post.adminReplyAt);

  const [text, setText] = useState("");
  const [emoticon, setEmoticon] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<LoungeComment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [reply, setReply] = useState(post.adminReply ?? "");

  // 진행 표시는 누른 것에만 건다. 하나로 묶으면 화면 전체가 얼어붙는다.
  const [sending, setSending] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState<
    { kind: "post" } | { kind: "comment"; item: LoungeComment } | null
  >(null);

  const meta = STATUS_META[status];

  /** 원댓글 아래에 그 답글들을 붙인다. 깊이는 1단까지라 재귀가 필요 없다. */
  const threads = useMemo(() => {
    const roots = comments.filter((c) => c.parentId === null);
    return roots.map((root) => ({
      root,
      replies: comments.filter((c) => c.parentId === root.id),
    }));
  }, [comments]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  /** 미리보기에는 백엔드가 없다. 쓰기를 막고 이유를 알린다. */
  function blockedInPreview(): boolean {
    if (!preview) return false;
    setToast("미리보기에서는 저장되지 않아요");
    return true;
  }

  async function request(path: string, init: RequestInit): Promise<unknown> {
    const res = await fetch(path, init);
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new Error((data as { error?: string })?.error || "실패했어요");
    return data;
  }

  const json = (body: unknown, method = "POST"): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  async function addComment() {
    const message = text.trim();
    if ((!message && !emoticon) || sending) return;
    if (blockedInPreview()) return;

    // 낙관적 반영 — 누르는 즉시 목록에 올리고 입력창을 비운다.
    // 라벨은 서버가 글 단위로 매기므로, 응답이 오면 그걸로 갈아끼운다.
    const parent = replyTo;
    const optimistic: LoungeComment = {
      id: -Date.now(),
      parentId: parent ? parent.parentId ?? parent.id : null,
      authorLabel: post.mine ? "글쓴이" : "나",
      author: null,
      mine: true,
      message,
      emoticon,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimistic]);
    setPending(optimistic);
    setText("");
    setEmoticon(null);
    setPickerOpen(false);
    setReplyTo(null);
    setSending(true);
    try {
      const saved = (await request(
        `/api/lounge/${post.id}/comments`,
        json({ message, emoticon, parentId: optimistic.parentId }),
      )) as LoungeComment;
      setComments((prev) => prev.map((c) => (c === optimistic ? saved : c)));
      router.refresh(); // 목록 화면의 댓글 수까지 맞춘다(화면은 이미 갱신됐다)
    } catch (e) {
      // 그 사이 다른 댓글이 왔을 수 있어 스냅샷 복원 대신 이 항목만 걷어낸다.
      setComments((prev) => prev.filter((c) => c !== optimistic));
      setText(message);
      setEmoticon(optimistic.emoticon);
      setReplyTo(parent);
      setToast(e instanceof Error ? e.message : "등록에 실패했어요");
    } finally {
      setPending(null);
      setSending(false);
    }
  }

  async function removeComment(item: LoungeComment) {
    if (blockedInPreview()) return;
    const before = comments;
    setComments((prev) =>
      prev.filter((c) => c !== item && c.parentId !== item.id),
    );
    try {
      await request(`/api/lounge/${post.id}/comments/${item.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setComments(before);
      setToast(e instanceof Error ? e.message : "삭제에 실패했어요");
    }
  }

  async function patch(body: Record<string, unknown>, done: string) {
    if (blockedInPreview()) return;
    setAdminBusy(true);
    const before = { status, savedReply, replyAuthor, replyAt };
    // 화면 먼저 — 상태 칩이 즉시 바뀐다.
    if (typeof body.status === "string") setStatus(body.status as LoungeStatus);
    try {
      const saved = (await request(`/api/lounge/${post.id}`, json(body, "PATCH"))) as {
        status: LoungeStatus;
        adminReply: string | null;
        adminReplyAuthor: string | null;
        adminReplyAt: string | null;
      };
      setStatus(saved.status);
      setSavedReply(saved.adminReply);
      setReplyAuthor(saved.adminReplyAuthor);
      setReplyAt(saved.adminReplyAt);
      setToast(done);
      router.refresh();
    } catch (e) {
      setStatus(before.status);
      setSavedReply(before.savedReply);
      setReplyAuthor(before.replyAuthor);
      setReplyAt(before.replyAt);
      setToast(e instanceof Error ? e.message : "실패했어요");
    } finally {
      setAdminBusy(false);
    }
  }

  async function confirmDelete() {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    if (target.kind === "comment") {
      await removeComment(target.item);
      return;
    }
    if (blockedInPreview()) return;
    setDeleting(true);
    try {
      await request(`/api/lounge/${post.id}`, { method: "DELETE" });
      router.push("/lounge");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "삭제에 실패했어요");
      setDeleting(false);
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

      <article className="px-5 pt-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-black text-gray-500 dark:bg-white/10 dark:text-white/45">
            {CATEGORY_LABEL[post.category]}
          </span>
          {post.category === "suggestion" && (
            <span className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black ${meta.chip}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          )}
        </div>

        {/* 노션의 페이지 아이콘 — 제목 위에 크게. */}
        {post.icon && (
          <div className="mt-3">
            <Emoticon id={post.icon} size={56} />
          </div>
        )}
        <h1 className="mt-3 text-[19px] font-black leading-[1.4] tracking-[-0.01em]">
          {post.title}
        </h1>
        <p className="mt-2 text-[11px] font-bold text-gray-400 dark:text-white/30">
          {/* 라벨은 백엔드가 준 걸 쓴다. 여기 "익명"을 박아두면 규칙이 두 군데로 갈린다. */}
          {post.authorLabel} · {relativeTime(post.createdAt)}
        </p>

        <p className="mt-5 whitespace-pre-wrap break-words text-[14px] leading-[1.85] text-gray-700 [overflow-wrap:anywhere] dark:text-white/70">
          {post.body}
        </p>

        {/* 운영진에게만 보이는 작성자. 백엔드가 운영진 요청일 때만 내려준다. */}
        {admin && post.author && (
          <p className="mt-5 flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2.5 text-[11px] font-bold text-gray-500 dark:bg-white/[0.04] dark:text-white/40">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            운영진만 보임 — 작성자 {post.author}
          </p>
        )}
      </article>

      {/* 운영진 답변 — 본문 바로 아래. 답이 달린다는 게 보여야 다음 사람이 쓴다. */}
      {savedReply && (
        <section className="mx-5 mt-6 rounded-2xl border border-[#FF8FA3]/25 bg-[#FF8FA3]/[0.06] p-4 dark:border-[#FFB6C1]/20 dark:bg-[#FFB6C1]/[0.06]">
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-black text-[#e9758b] dark:text-[#FFB6C1]">
            <ShieldCheck className="h-3.5 w-3.5" />
            운영진 답변
            {replyAuthor && <span className="opacity-70">· {replyAuthor}</span>}
            <span className="opacity-70">· {relativeTime(replyAt)}</span>
          </p>
          <p className="mt-2.5 whitespace-pre-wrap break-words text-[13.5px] leading-[1.8] text-gray-700 dark:text-white/70">
            {savedReply}
          </p>
        </section>
      )}

      {/* 운영진 조작 */}
      {admin && post.category === "suggestion" && (
        <section className="mx-5 mt-6 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
          <p className="text-[10px] font-black tracking-[0.12em] text-gray-400">운영진</p>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {STATUS_ORDER.map((s: LoungeStatus) => (
              <button
                key={s}
                disabled={adminBusy}
                onClick={() => patch({ status: s }, "상태를 바꿨어요")}
                aria-pressed={status === s}
                className={`min-h-10 rounded-lg text-[11.5px] font-black transition-colors disabled:opacity-40 ${
                  status === s
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
            className="app-field-surface app-control-md mt-3 w-full resize-none rounded-xl border border-gray-200 px-3.5 py-3 leading-relaxed dark:border-white/10"
          />
          <button
            disabled={adminBusy || !reply.trim() || reply.trim() === (savedReply ?? "")}
            onClick={() => patch({ adminReply: reply }, "답변을 남겼어요")}
            className="app-action-primary app-cta-md mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 font-black active:opacity-80 disabled:opacity-40"
          >
            {adminBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : savedReply ? "답변 수정" : "답변 등록"}
          </button>
        </section>
      )}

      {/* 댓글 */}
      <section className="mt-8 border-t border-gray-100 px-5 pt-5 dark:border-white/[0.06]">
        <p className="text-[11px] font-black tracking-[0.1em] text-gray-400">
          댓글 {comments.length}
        </p>

        {comments.length === 0 ? (
          <p className="py-10 text-center text-[12.5px] font-bold text-gray-400 dark:text-white/30">
            첫 댓글을 남겨 보세요.
          </p>
        ) : (
          <ul className="mt-3 space-y-5">
            {threads.map(({ root, replies }) => (
              <li key={root.id}>
                <CommentRow
                  comment={root}
                  admin={admin}
                  pending={root === pending}
                  onReply={() => {
                    setReplyTo(root);
                    inputRef.current?.focus();
                  }}
                  onDelete={() => setConfirm({ kind: "comment", item: root })}
                />
                {replies.length > 0 && (
                  /* 답글은 한 단만 들여쓴다. 왼쪽 선이 "어디에 딸린 말"인지 알려준다. */
                  <ul className="mt-4 space-y-4 border-l border-gray-100 pl-3.5 dark:border-white/[0.08]">
                    {replies.map((r) => (
                      <li key={r.id}>
                        <CommentRow
                          comment={r}
                          admin={admin}
                          pending={r === pending}
                          onReply={() => {
                            setReplyTo(root);
                            inputRef.current?.focus();
                          }}
                          onDelete={() => setConfirm({ kind: "comment", item: r })}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        {pickerOpen && (
          <div className="mt-5">
            <EmoticonPicker
              selected={emoticon}
              onPick={(id) => {
                setEmoticon(id === emoticon ? null : id);
                setPickerOpen(false);
              }}
            />
          </div>
        )}

        {/* 고른 이모티콘은 입력줄 위에 미리 보여준다 — 뭘 보내는지 모르고 누르면 안 된다. */}
        {emoticon && (
          <div className="mt-4 flex items-center gap-2.5">
            <Emoticon id={emoticon} size={40} />
            <span className="flex-1 text-[11px] font-bold text-gray-400 dark:text-white/30">
              이 이모티콘과 함께 올라가요
            </span>
            <button
              onClick={() => setEmoticon(null)}
              aria-label="이모티콘 빼기"
              className="p-1.5 text-gray-400 active:opacity-60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {replyTo && (
          <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-white/30">
            <CornerDownRight width={13} height={13} strokeWidth={2.2} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              <b className="font-black text-gray-600 dark:text-white/60">{replyTo.authorLabel}</b>
              님에게 답글
            </span>
            <button onClick={() => setReplyTo(null)} aria-label="답글 취소" className="p-1 active:opacity-60">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 입력줄 — 경기 댓글(FeedbackThread)과 같은 알약 하나. 칸을 세 개로 쪼개면
            좁은 화면에서 입력칸이 손톱만해진다. */}
        <div className="mt-4 flex items-center gap-2.5 rounded-full bg-gray-100 py-2.5 pl-4 pr-3.5 dark:bg-white/[0.07]">
          <button
            onClick={() => setPickerOpen((open) => !open)}
            aria-label="이모티콘"
            aria-expanded={pickerOpen}
            className={`shrink-0 transition-colors ${
              pickerOpen
                ? "text-[#FF8FA3] dark:text-[#FFB6C1]"
                : "text-gray-400 dark:text-white/30"
            }`}
          >
            <Smile width={19} height={19} strokeWidth={2.1} />
          </button>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) addComment();
            }}
            placeholder={replyTo ? "답글 남기기…" : "댓글도 익명으로 달려요"}
            maxLength={300}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-white/25"
          />
          <button
            onClick={addComment}
            disabled={sending || (!text.trim() && !emoticon)}
            aria-label="댓글 등록"
            className="shrink-0 text-[#FF8FA3] disabled:opacity-30 dark:text-[#FFB6C1]"
          >
            {sending ? (
              <Loader2 width={18} height={18} className="animate-spin" />
            ) : (
              <Send width={18} height={18} strokeWidth={2.2} />
            )}
          </button>
        </div>
      </section>

      <AppConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "comment" ? "댓글을 지울까요?" : "글을 지울까요?"}
        description="지우면 되돌릴 수 없어요."
        confirmLabel="삭제"
        destructive
        busy={deleting}
        onCancel={() => setConfirm(null)}
        onConfirm={confirmDelete}
      />
      <AppToast message={toast} />
    </div>
  );
}

/**
 * 댓글 한 줄. 원댓글과 답글이 같은 모양을 쓴다 — 답글은 감싸는 쪽에서 들여쓴다.
 * 답글 버튼은 언제나 원댓글을 가리킨다(깊이 1단).
 */
function CommentRow({
  comment: c,
  admin,
  pending,
  onReply,
  onDelete,
}: {
  comment: LoungeComment;
  admin: boolean;
  pending: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex items-start gap-3 ${pending ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* 이름은 백엔드가 글 단위로 매긴다 — 글이 달라지면 이름도 새로 매겨진다. */}
          <span className="text-[12.5px] font-black text-gray-900 dark:text-white">
            {c.authorLabel}
          </span>
          <span className="text-[10px] font-bold text-gray-300 dark:text-white/25">
            {relativeTime(c.createdAt)}
          </span>
          {admin && c.author && (
            <span className="text-[10px] font-bold text-gray-300 dark:text-white/25">
              · {c.author}
            </span>
          )}
        </div>
        {c.emoticon && (
          <div className="mt-2">
            <Emoticon id={c.emoticon} size={64} />
          </div>
        )}
        {c.message && (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-[1.65] text-gray-700 [overflow-wrap:anywhere] dark:text-white/70">
            {c.message}
          </p>
        )}
        {!pending && (
          <button
            onClick={onReply}
            className="mt-1.5 text-[10.5px] font-black text-gray-400 active:opacity-60 dark:text-white/30"
          >
            답글
          </button>
        )}
      </div>
      {!pending && (c.mine || admin) && (
        <button
          onClick={onDelete}
          aria-label="댓글 삭제"
          className="shrink-0 p-1 text-gray-300 active:opacity-60 dark:text-white/25"
        >
          <Trash2 width={14} height={14} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
