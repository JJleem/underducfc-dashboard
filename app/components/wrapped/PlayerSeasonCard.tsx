"use client";

// 시즌 선수카드 — 래핑의 마지막 장이자 공유용 한 장.
//
// FIFA 카드 문법(등번호·포지션 / 인물 / 이름 / 스탯)을 빌리되 **종합 레이팅은 없다.**
// 동호회에서 사람마다 숫자 등급을 매기면 재미보다 서운함이 먼저 온다.
//
// 프레임은 CSS 로 흉내 내다가 `/card-frame.webp`(1024×1536 크리스탈 프레임, 알파 있음)로 바꿨다.
// CSS 로 만든 포일·각진 컷은 실물 프레임만큼 안 나왔다.
//
// 프레임 원본은 보라 계열인데 카드는 **시즌색을 따라야** 한다.
// 색 입히는 방법은 [[CrystalFrame]] 에 있다 — 명암은 원본, 색만 팀 색.

import { forwardRef } from "react";
import { playerFaceOnSrc } from "../../lib/player-faceons";
import CrystalFrame from "./CrystalFrame";

export interface SeasonCardStat {
  label: string;
  value: string | number;
}

const PlayerSeasonCard = forwardRef<
  HTMLDivElement,
  {
    name: string;
    no?: string;
    /** 많이 뛴 자리 최대 2개. 하나만 쓰면 멀티 포지션인 사람이 한 자리로 납작해진다. */
    positions?: string[];
    seasonLabel: string;
    stats: SeasonCardStat[];
    /** 시즌 대표색. 프레임 색상각과 가운데 글로우가 이 색을 따른다. */
    accent: string;
    width?: number;
  }
>(function PlayerSeasonCard(
  { name, no, positions = [], seasonLabel, stats, accent, width = 300 },
  ref,
) {
  const face = playerFaceOnSrc(name);
  const height = Math.round(width * 1.5); // 프레임이 2:3 이라 그대로 맞춘다
  // 시즌 라벨("25-26")은 뒷자리만 팀 색으로 — 헤더 시즌 표기와 같은 문법
  const [labelHead, labelTail] = seasonLabel.split("-");

  return (
    <div
      ref={ref}
      style={{ width, height, background: "#05030a" }}
      className="relative shrink-0 overflow-hidden rounded-[18px]"
    >
      {/* 가운데 글로우 — 선수가 빛 위에 서 있는 느낌.
          프레임 **아래**에 깔아야 테두리 크리스탈이 글로우에 먹히지 않는다. */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: "12%",
          right: "12%",
          top: "20%",
          bottom: "30%",
          background: `radial-gradient(60% 52% at 50% 62%, ${accent}b3 0%, ${accent}4d 38%, transparent 72%)`,
          filter: "blur(2px)",
        }}
      />

      {/* 인물 — 글로우 위, 프레임 아래.
          아래 글자 블록(이름·스탯)과 **겹치지 않는 띠** 안에 가둔다.
          예전엔 bottom-22% 라 스탯이 상반신을 덮었다. */}
      <div className="absolute inset-x-0 bottom-[37%] top-[19%] flex items-end justify-center">
        {face ? (
          // eslint-disable-next-line @next/next/no-img-element -- 공유 캡처 대상이라 최적화 경로를 타지 않게 둔다
          <img
            src={face}
            alt=""
            className="h-full w-auto max-w-[70%] object-contain object-bottom"
            style={{ filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.65))" }}
            draggable={false}
          />
        ) : (
          <span
            className="mb-4 flex h-24 w-24 items-center justify-center rounded-full text-[32px] font-black text-white/80"
            style={{ background: `${accent}2e`, border: `1.5px solid ${accent}66` }}
          >
            {name.slice(-2)}
          </span>
        )}
      </div>

      {/* 발밑 — 인물이 바닥에 서 있게 받쳐 준다 */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 h-[3.5%] w-[52%] -translate-x-1/2 rounded-[50%]"
        style={{ bottom: "36%", background: "rgba(0,0,0,0.5)", filter: "blur(7px)" }}
      />

      {/* 프레임 — 맨 위. 시즌색으로 물들인다 */}
      <CrystalFrame accent={accent} />

      {/* ── 글자는 프레임 안쪽 여백 안에 둔다 (좌우 13% · 위아래 8%) ── */}
      <div className="absolute inset-x-[16%] top-[11%] flex items-start justify-between">
        <div className="leading-none">
          {no && no !== "-" && (
            <p
              className="text-[26px] font-black leading-none tabular-nums text-white"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}
            >
              {no}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {positions.slice(0, 2).map((p) => (
              <span
                key={p}
                className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white"
                style={{ background: "rgba(0,0,0,0.45)", border: `1px solid ${accent}80` }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <p
          className="text-[9px] font-black tabular-nums tracking-[0.2em] text-white/55"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
        >
          {labelTail ? (
            <>
              {labelHead}-<span style={{ color: accent }}>{labelTail}</span>
            </>
          ) : (
            seasonLabel
          )}
        </p>
      </div>

      <div className="absolute inset-x-[15%] bottom-[11%]">
        <p
          className="text-center text-[19px] font-black leading-none tracking-[-0.02em] text-white"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.95)" }}
        >
          {name}
        </p>
        <div
          className="mx-auto mt-2 h-px w-14"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />

        {/* 스탯 3열 — 어두운 판 위에 올려야 프레임 광택 위에서도 읽힌다 */}
        <div
          className="mt-2 grid grid-cols-3 gap-y-2 rounded-xl py-2"
          style={{ background: "rgba(3,2,8,0.62)", border: `1px solid ${accent}33` }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="min-w-0 text-center"
              style={i % 3 !== 0 ? { borderLeft: "1px solid rgba(255,255,255,0.08)" } : undefined}
            >
              <p className="text-[14px] font-black leading-none tabular-nums text-white">
                {s.value}
              </p>
              <p className="mt-0.5 truncate px-1 text-[7.5px] font-bold text-white/45">{s.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-1.5 text-center text-[6.5px] font-black tracking-[0.3em] text-white/30">
          UNDERDUCK FC
        </p>
      </div>
    </div>
  );
});

export default PlayerSeasonCard;
