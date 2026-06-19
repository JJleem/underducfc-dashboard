"use client";
// 임시 스토리 카드 시각 검증 페이지 — 커밋 전 삭제
import { useEffect, useState } from "react";
import { drawStoryCanvas } from "../lib/draw-story-card";

export default function DevStoryPage() {
  const [src, setSrc] = useState("");
  useEffect(() => {
    drawStoryCanvas({
      id: 0,
      date: "2026-05-10",
      time: "08:00",
      location: "월드컵 풋살장",
      opponent: "어미새FC",
      ourScore: "3",
      theirScore: "1",
      result: "승",
      type: "일반 매칭",
      goals: "문승환,최동권,문승환",
      assists: "최동권,이정훈,",
      mom: "문승환",
    }).then((c) => setSrc(c.toDataURL()));
  }, []);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img id="story-img" src={src} style={{ width: 430 }} alt="story" />
  ) : (
    <p>drawing…</p>
  );
}
