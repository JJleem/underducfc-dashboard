"use client";
// 경기 댓글 — 읽기만 되던 걸 실제로 쓰고 지울 수 있게.
//
// 인스타 댓글 문법을 따른다: 이름 굵게, 바로 이어서 본문, 아래 시간.
// 얼굴(아바타)은 붙이지 않는다 — 붙여봤더니 이름이 묻히고 목록이 무거워졌다.
//
// 삭제는 서버가 본인·관리자만 허용한다(app/api/feedback DELETE). 화면에서도 같은
// 기준으로 버튼을 감춘다. 화면만 감추면 우회되고, 서버만 막으면 눌러보고 실패한다.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import AppConfirmDialog from "../AppConfirmDialog";

export interface Feedback {
  name: string;
  message: string;
  timestamp: string;
}

/**
 * "2026-08-02T23:48:30Z" → "8/3 08:48:30" (브라우저 현지 시각)
 */
export function feedbackTimestamp(raw: string): string {
  const date = new Date(raw);
  if (isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

export default function FeedbackThread({
  matchId,
  initial,
  userName,
  isAdmin = false,
  collapsedCount = 1,
  sheetLayout = false,
  keyboardOpen = false,
}: {
  matchId: number;
  initial: Feedback[];
  /** 로그인한 사람 이름. 없으면 쓰기·삭제가 안 뜬다. */
  userName?: string;
  isAdmin?: boolean;
  /** 접힌 상태에서 보여줄 개수. 0 이면 처음부터 전부. */
  collapsedCount?: number;
  /** 댓글 전용 드로어: 목록만 스크롤하고 입력창은 하단에 고정한다. */
  sheetLayout?: boolean;
  /** 키보드가 올라와 있으면 홈 인디케이터 여백을 걷어 입력창을 키보드에 붙인다. */
  keyboardOpen?: boolean;
}) {
  const router = useRouter();
  // 서버가 준 목록으로 시작하고, 쓰거나 지우면 그 자리에서 반영한다.
  // (router.refresh() 만 기다리면 눌러도 한참 아무 일도 안 일어난 것처럼 보인다)
  const [items, setItems] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null);
  const [deleting, setDeleting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const shown = expanded || collapsedCount === 0 ? items : items.slice(-collapsedCount);
  const hidden = items.length - shown.length;

  const canDelete = (fb: Feedback) => isAdmin || (!!userName && fb.name === userName);

  useEffect(() => {
    if (!sheetLayout) return;
    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      if (list) list.scrollTop = list.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
    // 키보드로 시트 높이가 바뀔 때도 최신 댓글에 붙어 있게 한다.
  }, [sheetLayout, shown.length, keyboardOpen]);

  const submit = async () => {
    const message = text.trim();
    if (!message || !userName || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, name: userName, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "등록 실패");
      // 서버가 돌려준 행을 그대로 쓴다. 화면에서 만든 timestamp 를 들고 있으면
      // 나중에 그 댓글을 지울 때 서버가 행을 못 찾는다(삭제가 조용히 실패).
      setItems((prev) => [...prev, data.feedback]);
      setText("");
      setExpanded(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setSending(false);
    }
  };

  const remove = async (fb: Feedback) => {
    setError(null);
    const before = items;
    setItems((prev) => prev.filter((x) => x !== fb));
    try {
      const res = await fetch("/api/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, ...fb }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "삭제 실패");
      router.refresh();
      return true;
    } catch (e) {
      setItems(before); // 실패하면 되돌린다
      setError(e instanceof Error ? e.message : "삭제 실패");
      return false;
    }
  };

  const comments = (
    <>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start text-[13px] font-bold text-gray-400 active:opacity-60 dark:text-white/35"
        >
          댓글 {items.length}개 모두 보기
        </button>
      )}

      {shown.map((fb, i) => (
        <div key={`${fb.timestamp}-${i}`} className="group flex items-start">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/players/${encodeURIComponent(fb.name)}`}
                className="truncate text-[12.5px] font-black text-gray-900 active:opacity-60 dark:text-white"
              >
                {fb.name}
              </Link>
              <span className="shrink-0 text-[10px] font-bold text-gray-300 dark:text-white/25">
                {feedbackTimestamp(fb.timestamp)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-[1.55] text-gray-700 [overflow-wrap:anywhere] dark:text-white/70">
              {fb.message}
            </p>
          </div>
          {canDelete(fb) && (
            <button
              type="button"
              onClick={() => setDeleteTarget(fb)}
              aria-label="댓글 삭제"
              className="shrink-0 p-1 text-gray-300 active:opacity-60 dark:text-white/25"
            >
              <Trash2 width={14} height={14} strokeWidth={2.2} />
            </button>
          )}
        </div>
      ))}

      {error && <p className="text-[12px] font-bold text-red-500">{error}</p>}

      {shown.length === 0 && (
        <p className="py-8 text-center text-[12px] font-bold text-gray-400 dark:text-white/30">
          아직 댓글이 없어요.
        </p>
      )}
    </>
  );

  const composer = (
    <>
      {userName ? (
        <div
          className={`flex items-center gap-2 ${
            sheetLayout
              ? "rounded-full bg-gray-100 px-4 py-2 dark:bg-white/[0.07]"
              : "mt-1"
          }`}
          data-vaul-no-drag={sheetLayout ? "" : undefined}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPointerDown={(e) => {
              if (sheetLayout && document.activeElement !== e.currentTarget) {
                e.preventDefault();
                e.currentTarget.focus({ preventScroll: true });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
            }}
            placeholder="댓글 달기…"
            maxLength={300}
            className={`min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-300 dark:text-white dark:placeholder:text-white/25 ${
              sheetLayout ? "text-[16px]" : "text-[13px]"
            }`}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || sending}
            aria-label="댓글 등록"
            className="shrink-0 text-[#FF8FA3] disabled:opacity-30 dark:text-[#FFB6C1]"
          >
            {sending ? (
              <Loader2 width={16} height={16} className="animate-spin" />
            ) : (
              <Send width={16} height={16} strokeWidth={2.2} />
            )}
          </button>
        </div>
      ) : (
        <p className="mt-1 text-[12px] font-bold text-gray-300 dark:text-white/25">
          로그인하면 댓글을 달 수 있어요.
        </p>
      )}
    </>
  );

  const confirmDialog = (
    <AppConfirmDialog
      open={!!deleteTarget}
      title="댓글을 삭제할까요?"
      description={deleteTarget?.message}
      confirmLabel="삭제"
      destructive
      busy={deleting}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const removed = await remove(deleteTarget);
        setDeleting(false);
        if (removed) setDeleteTarget(null);
      }}
    />
  );

  if (sheetLayout) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
          data-vaul-no-drag
        >
          <div className="flex flex-col gap-3">{comments}</div>
        </div>
        <div
          className={`shrink-0 border-t border-gray-100 bg-white px-4 pt-3 dark:border-white/[0.06] dark:bg-[#161618] ${
            keyboardOpen ? "pb-3" : "pb-[max(12px,env(safe-area-inset-bottom))]"
          }`}
        >
          {composer}
        </div>
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {comments}
      {composer}
      {confirmDialog}
    </div>
  );
}
