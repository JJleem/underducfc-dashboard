"use client";
// 서비스워커가 저장해 둔 지난 홈 화면을 먼저 띄웠을 때, 뜨자마자 최신 데이터로 바꾼다.
//
// 서버가 렌더한 시각(renderedAt)이 지금보다 한참 전이면 저장본이라는 뜻이다.
// 한 번만 한다 — 폰 시계가 서버보다 빠르면 새로 받은 화면도 "오래됨"으로 보여 무한 반복된다.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const STALE_MS = 15_000;

export default function HomeFreshness({ renderedAt }: { renderedAt: number }) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || Date.now() - renderedAt < STALE_MS) return;
    done.current = true;
    router.refresh();
  }, [renderedAt, router]);

  return null;
}
