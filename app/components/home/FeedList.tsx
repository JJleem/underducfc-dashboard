"use client";
// 피드 무한 스크롤.
//
// 경기는 25개뿐이라 데이터는 서버에서 한 번에 다 받아 둔다. 여기서 나눠 붙이는 건
// 네트워크가 아니라 렌더 비용 때문이다 — 경기 하나마다 1080px 사진과 라인업 뷰어가
// 딸려 있어서 전부 한 번에 그리면 첫 화면이 늦어진다.
//
// 바닥 감시자가 보이면 다음 묶음을 붙인다. 스크롤 위치를 건드리지 않으므로
// 사진이 늦게 로드돼도 보던 자리가 튀지 않는다.

import { useEffect, useRef, useState } from "react";

const PAGE = 4;

export default function FeedList({ children }: { children: React.ReactNode[] }) {
  const [shown, setShown] = useState(Math.min(PAGE, children.length));
  const sentinel = useRef<HTMLDivElement>(null);
  const done = shown >= children.length;

  useEffect(() => {
    if (done) return;
    const node = sentinel.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown((n) => Math.min(n + PAGE, children.length));
        }
      },
      // 바닥에 닿기 전에 미리 붙여야 끊긴 느낌이 안 난다.
      { rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [done, children.length]);

  return (
    <>
      {children.slice(0, shown)}
      {!done && (
        <div ref={sentinel} className="py-8 text-center">
          <span className="text-[11px] font-bold text-gray-300 dark:text-white/20">
            불러오는 중…
          </span>
        </div>
      )}
      {done && children.length > PAGE && (
        <p className="py-8 text-center text-[11px] font-bold text-gray-300 dark:text-white/20">
          경기 {children.length}개를 모두 봤어요
        </p>
      )}
    </>
  );
}
