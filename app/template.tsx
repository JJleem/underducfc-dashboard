// app/template.tsx
//
// template은 layout과 달리 라우트가 바뀔 때마다 다시 마운트된다.
// 그 특성을 이용해 화면이 딱 바뀌는 대신 짧게 페이드+살짝 올라오게 한다.
//
// - 하단 탭바는 layout에 있어 이 애니메이션의 영향을 받지 않는다(계속 고정).
// - 180ms로 짧게 잡았다. 전환이 길면 부드러움이 아니라 지연으로 느껴진다.
// - prefers-reduced-motion 이면 globals.css에서 animation: none 으로 꺼진다.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
