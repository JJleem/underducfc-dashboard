"use client";
// app/components/ModalPortal.tsx
import { createPortal } from "react-dom";

/**
 * 모달·오버레이를 document.body 에 그린다.
 *
 * 왜 필요한가: 조상 요소에 transform 이 걸려 있으면(그리고 `animation: ... both` 처럼
 * transform 애니메이션이 계속 적용 상태로 남아 있으면) 그 요소가 position: fixed
 * 자손의 컨테이닝 블록이 된다. 그러면 `fixed inset-0` 오버레이가 화면(viewport)이 아니라
 * "페이지 전체 높이" 기준으로 잡혀서, 스크롤을 내려도 모달이 페이지 한가운데에 뜬다.
 *
 * 이 앱의 본문은 PageTransition(.animate-page) → PullToRefresh 래퍼 안에 있어서
 * 조상 transform 을 완전히 없애기가 쉽지 않다. body 로 포털하면 조상에 무엇이
 * 걸려 있든 항상 "지금 보고 있는 화면" 기준이 된다.
 *
 * 오버레이는 모두 사용자 상호작용 이후(상태가 켜질 때)에만 마운트되므로
 * 첫 렌더(하이드레이션)에는 존재하지 않는다 → 별도 mounted 상태가 필요 없다.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
