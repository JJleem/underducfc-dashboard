"use client";

// 크리스탈 프레임에 넣은 인물 — 래핑 인트로용.
//
// 처음엔 동그란 썸네일이었는데, 마지막 장의 선수카드와 문법이 따로 놀았다.
// 같은 프레임(/card-frame.webp)을 쓰면 "이 카드 이야기를 시작한다 → 카드로 끝난다"
// 가 되어 처음과 끝이 이어진다.
//
// 프레임 안쪽 여백은 알파 채널 실측값이다: 좌우 12% · 상 7.2% · 하 10.4%.
// 모서리 크리스탈은 그보다 두꺼워서 인물은 조금 더 안쪽에 둔다.

import { playerFaceOnSrc } from "../../lib/player-faceons";
import CrystalFrame from "./CrystalFrame";

export default function FramedPortrait({
  name,
  accent,
  width = 172,
}: {
  name: string;
  accent: string;
  width?: number;
}) {
  const face = playerFaceOnSrc(name);
  const height = Math.round(width * 1.5); // 프레임 2:3

  return (
    <div className="relative mx-auto shrink-0" style={{ width, height }}>
      {/* 가운데 글로우 — 인물이 빛 위에 선 느낌 */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: "12%",
          right: "12%",
          top: "16%",
          bottom: "12%",
          background: `radial-gradient(62% 54% at 50% 60%, ${accent}bf 0%, ${accent}4d 40%, transparent 74%)`,
        }}
      />
      <div className="absolute inset-x-0 bottom-[12%] top-[14%] flex items-end justify-center">
        {face ? (
          // eslint-disable-next-line @next/next/no-img-element -- 캡처 대상과 같은 경로를 쓴다
          <img
            src={face}
            alt=""
            className="h-full w-auto max-w-[72%] object-contain object-bottom"
            style={{ filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.6))" }}
            draggable={false}
          />
        ) : (
          <span
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full text-[22px] font-black text-white/80"
            style={{ background: `${accent}2e`, border: `1.5px solid ${accent}66` }}
          >
            {name.slice(-2)}
          </span>
        )}
      </div>
      <CrystalFrame accent={accent} />
    </div>
  );
}
