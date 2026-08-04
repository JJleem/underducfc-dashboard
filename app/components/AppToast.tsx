"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import ModalPortal from "./ModalPortal";

export default function AppToast({
  message,
  tone = "success",
}: {
  message: string | null;
  tone?: "success" | "error";
}) {
  const reduceMotion = useReducedMotion();
  return (
    <ModalPortal>
      <AnimatePresence>
        {message && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-[120] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-bold shadow-xl backdrop-blur-xl ${
              tone === "error"
                ? "bg-red-600/95 text-white"
                : "bg-gray-900/92 text-white dark:bg-white/92 dark:text-gray-950"
            }`}
          >
            {tone === "error" ? (
              <CircleAlert className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
