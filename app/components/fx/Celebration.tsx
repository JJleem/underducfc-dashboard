"use client";

// 전체화면 축하 오버레이 틀 — MOM 발표 · 경기 결과 · 칭호 획득이 같이 쓴다.
//
// 어디를 눌러도 닫힌다(ESC 도). 닫을 때 짧게 사라진 뒤 onClose 를 부른다.
// "한 번만" 보여 주는 판단은 쓰는 쪽 몫이다([[seen]]).
//
// 닫기가 어떤 환경에서도 먹히게 세 겹으로 둔다(실사용에서 "눌러도 안 닫힌다" 가 나왔다):
//   · 우상단 X 버튼 — 화면 아무 데나 누르기만으로는 닫는 법을 모를 수 있다.
//   · pointer-events:auto + cursor:pointer — Radix 다이얼로그가 열려 있으면 body 에
//     pointer-events:none 이 걸리고, iOS Safari 는 cursor:pointer 가 없는 div 의 탭을 클릭으로 안 넘긴다.
//   · 닫힘은 애니메이션 완료 이벤트가 아니라 타이머로 확정한다.
//
// ⚠️ document.body 로 포털을 띄운다. 페이지는 PageTransition·PullToRefresh 의 transform 안에서
//    그려지는데, transform 이 있는 조상 아래에선 position:fixed 가 화면이 아니라 그 조상에 붙는다
//    — 실제로 높이 0 짜리 오버레이가 돼 아무것도 안 보였다.

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { Confetti, GOLD } from "./effects";

/** 축하 화면 공용 키프레임. */
const FX_CSS = `
@keyframes fx-shimmer{from{background-position:220% 0}to{background-position:-220% 0}}
.fx-shimmer{background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:fx-shimmer 3.2s linear infinite}
@media (prefers-reduced-motion: reduce){.fx-shimmer{animation:none}}
`;

/** 글자에 금빛 광택이 흐르게 하는 배경. className="fx-shimmer" 와 같이 쓴다. */
export function shimmerStyle(color: string) {
  return {
    backgroundImage: `linear-gradient(110deg, ${color} 35%, #fff 47%, ${GOLD} 50%, #fff 53%, ${color} 65%)`,
  };
}

export default function Celebration({
  color,
  confetti = true,
  onClose,
  children,
}: {
  /** 글로우·컨페티의 주색. */
  color: string;
  confetti?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const reduce = !!useReducedMotion();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => setClosing(true), []);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onClose, 250);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!isClient) return null;
  return createPortal(
    <motion.div
      role="dialog"
      aria-modal
      className="pointer-events-auto fixed inset-0 z-[200] flex cursor-pointer items-center justify-center overflow-hidden bg-[#060409]/90 px-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: closing ? 0.22 : 0.35 }}
      onClick={close}
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
        className="absolute right-3 top-[max(12px,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70"
      >
        <X width={18} height={18} strokeWidth={2.4} />
      </button>
      <style>{FX_CSS}</style>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)`, opacity: 0.3, filter: "blur(60px)" }}
      />
      {confetti && !reduce && <Confetti colors={[color, "#fff", GOLD]} />}
      <div className="relative w-full max-w-sm text-center">{children}</div>
      <motion.p
        className="absolute inset-x-0 bottom-[max(28px,env(safe-area-inset-bottom))] text-center text-[11px] font-bold text-white/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
      >
        화면을 누르면 닫혀요
      </motion.p>
    </motion.div>,
    document.body,
  );
}
