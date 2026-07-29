"use client";

import { usePathname } from "next/navigation";

/**
 * 라우트 전환 시 화면이 딱 바뀌는 대신 짧게 페이드+살짝 올라오게 한다.
 *
 * 원래 app/template.tsx 로 구현했는데, template 이 있으면 Next 내부
 * OuterLayoutRouter 가 자식 배열을 key 없이 렌더해서 dev 콘솔에
 * "Each child in a list should have a unique key prop" 경고가 뜬다.
 * (동작에는 영향 없지만 콘솔 노이즈라 방식만 바꿨다.)
 *
 * pathname 을 key 로 주면 라우트가 바뀔 때 이 래퍼가 다시 마운트되면서
 * template 과 동일하게 CSS 애니메이션이 매번 재생된다.
 *
 * - 하단 탭바는 이 래퍼 밖(레이아웃)에 있어 영향받지 않는다(계속 고정).
 * - 180ms로 짧게. 전환이 길면 부드러움이 아니라 지연으로 느껴진다.
 * - prefers-reduced-motion 이면 globals.css 에서 animation: none 으로 꺼진다.
 */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page">
      {children}
    </div>
  );
}
