"use client";

// 시즌 XI 피치 — 래핑 전용. [[FormationField]] 를 쓰지 않는다:
// 거기엔 탭하면 열리는 스탯 패널·전술·지시·주장 완장이 딸려 있고 여기선 전부 방해다.
//
// 처음엔 작은 피치에 34px 얼굴을 찍었는데 밋밋했다. 발표 그래픽(월드 베스트 11)이
// 강해 보이는 건 세 가지다:
//   1. 피치가 화면을 꽉 채운다 — 작으면 발표가 아니라 도표다
//   2. 위에서 조명이 떨어진다 — 잔디에 명암이 있어야 무대처럼 보인다
//   3. 이름이 명패에 박힌다 — 잔디 위 맨글자는 읽히지도 않고 발표처럼 보이지도 않는다
//
// 좌표는 [[positions]] 프리셋 그대로라 라인업 화면과 같은 자리에 선다.

import PlayerFace from "../PlayerFace";
import { positionsFor } from "../../lib/positions";
import type { BestElevenSlot } from "../../lib/wrapped";

export default function BestElevenPitch({
  slots,
  accent,
  formation,
}: {
  slots: BestElevenSlot[];
  /** 시즌 대표색. 내 자리 링·명패에만 쓴다. */
  accent: string;
  /** 그 시즌 최다 사용 포메이션. 좌표를 여기서 가져온다. */
  formation: string;
}) {
  const points = positionsFor(formation);

  return (
    <div
      className="relative w-full overflow-hidden rounded-[20px]"
      style={{
        aspectRatio: "0.74",
        // 위쪽이 밝은 잔디 — 조명이 상대 골대 쪽에서 떨어지는 무대처럼
        background: `
          radial-gradient(90% 55% at 50% -8%, rgba(255,255,255,0.14) 0%, transparent 62%),
          radial-gradient(70% 40% at 50% 6%, ${accent}30 0%, transparent 70%),
          linear-gradient(180deg, #14472c 0%, #0d3220 45%, #071c12 100%)`,
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: `inset 0 0 70px rgba(0,0,0,0.5), 0 20px 50px -28px ${accent}80`,
      }}
    >
      {/* 잔디 줄무늬 — 아주 옅게. 진하면 얼굴이 안 읽힌다 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0 8.4%, transparent 8.4% 16.8%)",
        }}
      />

      {/* 라인 */}
      <div className="pointer-events-none absolute inset-[5%] rounded-[3px] border border-white/20" />
      <div className="pointer-events-none absolute left-[5%] right-[5%] top-1/2 border-t border-white/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30" />
      {/* 페널티 박스 · 골 에어리어 (위=상대 골대, 아래=우리 골대) */}
      <div className="pointer-events-none absolute inset-x-[26%] top-[5%] h-[12%] border-x border-b border-white/20" />
      <div className="pointer-events-none absolute inset-x-[38%] top-[5%] h-[5%] border-x border-b border-white/20" />
      <div className="pointer-events-none absolute inset-x-[26%] bottom-[5%] h-[12%] border-x border-t border-white/20" />
      <div className="pointer-events-none absolute inset-x-[38%] bottom-[5%] h-[5%] border-x border-t border-white/20" />

      {slots.map((s) => {
        const p = points[s.slot] ?? { x: 50, y: 50 };
        const size = s.isMe ? 50 : 44;
        return (
          <div
            key={s.slot}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: 70 }}
          >
            <span
              className="inline-flex rounded-full"
              style={{
                padding: 2,
                border: `2px solid ${s.isMe ? accent : "rgba(255,255,255,0.35)"}`,
                background: "rgba(5,10,8,0.5)",
                boxShadow: s.isMe
                  ? `0 0 14px ${accent}, 0 0 32px ${accent}66`
                  : "0 4px 12px rgba(0,0,0,0.5)",
              }}
            >
              <PlayerFace name={s.name} size={size} />
            </span>

            {/* 이름 명패 — 잔디 위 맨글자는 안 읽힌다 */}
            <span
              className="mt-1 w-full truncate rounded-[5px] px-1 py-[3px] text-center text-[9.5px] font-black leading-none"
              style={{
                background: s.isMe ? accent : "rgba(4,10,8,0.82)",
                color: s.isMe ? "#0a0a0a" : "rgba(255,255,255,0.92)",
                border: s.isMe ? "none" : "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {s.name}
            </span>
            <span className="mt-[3px] text-[8px] font-bold tabular-nums leading-none text-white/45">
              {s.role} {s.quarters}Q
              {s.share > 0 && ` · ${Math.round(s.share * 100)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
