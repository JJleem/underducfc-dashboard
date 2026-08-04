"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import ModalPortal from "./ModalPortal";
import useAppOverlay from "./useAppOverlay";

export default function AppConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  busy = false,
  destructive = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dismiss = useAppOverlay(open, onCancel);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => cancelRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;
  return (
    <ModalPortal>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-confirm-title"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm"
        onClick={dismiss}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-xs rounded-[26px] bg-white p-5 shadow-2xl dark:bg-[#161618]"
        >
          <h2 id="app-confirm-title" className="text-[15px] font-black text-gray-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-gray-500 dark:text-white/45">
              {description}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={dismiss}
              disabled={busy}
              className="min-h-11 rounded-2xl bg-gray-100 px-3 text-[12px] font-black text-gray-600 disabled:opacity-40 dark:bg-white/10 dark:text-gray-300"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`min-h-11 rounded-2xl px-3 text-[12px] font-black text-white disabled:opacity-50 ${
                destructive ? "bg-red-500" : "bg-[#FF8FA3]"
              }`}
            >
              {busy ? "처리 중…" : confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
}
