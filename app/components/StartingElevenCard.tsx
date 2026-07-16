"use client";

// 라인업 "발표 포스터" (STARTING XI) — 참고 이미지(대표팀 발표 그래픽)를 언더덕 색상(핑크)으로.
// 선수마다 블랙·핑크 체커 타일 + 발밑 섀도, 상단 스큐 STARTING XI, 우측 SUBS.
// 번호 오름차순 4열. 발표 그래픽이라 테마 무관 항상 다크.

import { forwardRef, useState } from "react";
import Link from "next/link";
import { playerFaceOnSrc } from "../lib/player-faceons";

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const COLS = 4;

// 언더덕 블랙·핑크 체커보드 — 홀/짝 칸의 명도 차이를 크게 둔다.
const TILE_LIGHT =
  "radial-gradient(115% 90% at 48% 8%, #b83d6a 0%, #7a2149 48%, #3a1025 100%)";
const TILE_DARK =
  "radial-gradient(115% 90% at 48% 8%, #30202a 0%, #171016 52%, #070609 100%)";

function formatDate(date?: string): string {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day} (${DOW[d.getDay()]})`;
}

/** 등번호 오름차순 정렬(번호 없는 선수는 뒤로). */
function sortByNo(
  names: string[],
  rosterMap: Record<string, string>
): string[] {
  return [...names]
    .map((p) => p.trim())
    .filter((p) => p && p !== "미정")
    .sort((a, b) => {
      const na = parseInt(rosterMap[a] ?? "", 10);
      const nb = parseInt(rosterMap[b] ?? "", 10);
      return (isNaN(na) ? 999 : na) - (isNaN(nb) ? 999 : nb);
    });
}

/** 그리드 인덱스 → 바둑판 홀짝. (4열 기준) */
const isDarkCell = (idx: number) =>
  ((Math.floor(idx / COLS) + (idx % COLS)) % 2) === 1;

function PlayerCell({
  name,
  no,
  isCaptain,
  dark,
  interactive,
}: {
  name: string;
  no?: string;
  isCaptain: boolean;
  dark: boolean;
  interactive: boolean;
}) {
  const display = name.trim();
  const src = playerFaceOnSrc(display);
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;

  // 박스(타일)는 skew 파라렐로그램, 사진·이름은 역skew로 정면 유지
  const body = (
    <span
      className="relative block aspect-[3/4] w-full overflow-hidden"
      style={{ background: dark ? TILE_DARK : TILE_LIGHT, transform: "skewX(-5deg)" }}
    >
        {/* 레퍼런스의 붉은 조명 면 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{
          background:
            "linear-gradient(150deg, rgba(255,182,193,0.24), transparent 54%)",
        }}
      />
      {/* 정면 콘텐츠: 박스 skew 상쇄 */}
      <span className="absolute inset-0" style={{ transform: "skewX(5deg)" }}>
        {/* 누끼 없는 선수: 큰 번호 폴백 */}
        {!showImg && (
          <span className="flex h-full w-full items-center justify-center pb-4 text-4xl font-black italic text-white/25">
            {no || "G"}
          </span>
        )}
        {showImg && (
          <img
            src={src!}
            alt=""
            loading="eager"
            onError={() => setFailed(true)}
            className="relative z-10 block h-full w-full scale-[0.94] object-cover object-top"
            style={{
              transformOrigin: "50% 100%",
              filter:
                "saturate(0.78) contrast(1.1) brightness(0.95) drop-shadow(0 2px 3px rgba(0,0,0,0.32))",
            }}
          />
        )}
        {/* 사진마다 다른 누끼 경계·조명을 타일 색으로 자연스럽게 흡수 */}
        {showImg && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[15]"
            style={{
              background:
                "linear-gradient(90deg, rgba(9,5,9,0.3) 0%, transparent 12%, transparent 88%, rgba(9,5,9,0.3) 100%), linear-gradient(180deg, rgba(255,143,163,0.04) 35%, rgba(113,22,58,0.24) 78%, rgba(0,0,0,0.48) 100%)",
            }}
          />
        )}
        {/* 레퍼런스처럼 사진 위에 얹는 검정 이름 띠 */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[21px] border-t border-white/10 bg-black/90"
          style={{
            boxShadow: "0 -8px 12px rgba(0,0,0,0.22)",
          }}
        />
        {/* 이름·번호 (사진 밑단에 통합) */}
        <span className="absolute inset-x-0 bottom-0 z-30 flex h-[21px] items-center gap-0.5 px-1">
          <span className="text-[8px] font-black leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] min-[390px]:text-[9px]">
            {no || "G"}
          </span>
          <span className="truncate text-[8px] font-black leading-none tracking-normal text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] min-[390px]:text-[9px]">
            {display}
          </span>
          {isCaptain && (
            <span className="flex h-[10px] w-[10px] shrink-0 items-center justify-center rounded-full bg-[#FF8FA3] text-[6px] font-black leading-none text-black min-[390px]:h-[12px] min-[390px]:w-[12px] min-[390px]:text-[7px]">
              C
            </span>
          )}
        </span>
      </span>
    </span>
  );

  if (!interactive) {
    return <div className="block min-w-0">{body}</div>;
  }
  return (
    <Link
      href={`/players/${encodeURIComponent(display)}`}
      className="block min-w-0 transition-transform active:scale-95"
    >
      {body}
    </Link>
  );
}

/** 마지막 그리드 칸: 선수 카드와 동일 박스 안에 SUBS 목록. */
function SubsCell({
  subs,
  rosterMap,
  dark,
}: {
  subs: string[];
  rosterMap: Record<string, string>;
  dark: boolean;
}) {
  const compact = subs.length > 8;

  return (
    <div className="block min-w-0">
      <span
        className="relative block aspect-[3/4] w-full overflow-hidden"
        style={{
          background: dark ? TILE_DARK : TILE_LIGHT,
          transform: "skewX(-5deg)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
          style={{
            background:
            "linear-gradient(150deg, rgba(255,182,193,0.22), transparent 54%)",
          }}
        />
        {/* 정면 콘텐츠: 박스 skew 상쇄 */}
        <span
          className="absolute inset-0 flex flex-col pb-1.5 pl-2.5 pr-1.5 pt-1.5"
          style={{ transform: "skewX(5deg)" }}
        >
          <span className="mb-1 text-[8px] font-black italic tracking-[0.08em] text-[#FF8FA3] min-[390px]:text-[9px]">
            SUBS
          </span>
          <span
            className={`grid min-h-0 flex-1 content-start overflow-hidden ${
              compact ? "grid-cols-2 gap-x-1" : "grid-cols-1"
            }`}
          >
            {subs.map((name) => (
              <span key={name} className="flex min-w-0 items-center gap-0.5 leading-[1.25]">
                {!compact && (
                  <span className="shrink-0 text-[7px] font-black text-[#FFB6C1]">
                    {rosterMap[name] || "-"}
                  </span>
                )}
                <span className={`${compact ? "text-[6px]" : "text-[7px]"} whitespace-nowrap font-bold text-white/90`}>
                  {name}
                </span>
              </span>
            ))}
          </span>
        </span>
      </span>
    </div>
  );
}

const StartingElevenCard = forwardRef<
  HTMLDivElement,
  {
    formation: string;
    players: string[];
    rosterMap: Record<string, string>;
    captainRoles?: Record<string, string>;
    opponent?: string;
    date?: string;
    time?: string;
    location?: string;
    subs?: string[];
    interactive?: boolean;
  }
>(function StartingElevenCard(
  {
    players,
    rosterMap,
    captainRoles = {},
    opponent,
    date,
    time,
    location,
    subs = [],
    interactive = true,
  },
  ref
) {
  const starters = sortByNo(players, rosterMap);
  const cleanSubs = sortByNo(subs, rosterMap);

  return (
    <div
      ref={ref}
      className="relative min-w-0 w-full max-w-full overflow-hidden bg-[#07050A] px-3.5 pb-1.5 pt-2.5"
      style={{
        background:
          "radial-gradient(120% 65% at 52% -8%, #52172f 0%, #1c0c16 50%, #0b070c 82%, #050407 100%)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {/* 레퍼런스의 헤더를 가로지르는 붉은 빛 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-6 right-[-20%] top-[84px] z-0 h-10 -rotate-[4deg]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,79,123,0.66) 32%, rgba(255,143,163,0.22) 72%, transparent 100%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-16"
        style={{
          background:
            "radial-gradient(100% 100% at 50% 100%, rgba(255,143,163,0.22), transparent 70%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-50"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,182,193,0.18)",
        }}
      />

      {/* ── 헤더 ── */}
      <div className="relative z-10 h-[104px]">
        <span className="absolute left-0 top-0 flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/underducklogo.png" alt="" className="h-[18px] w-[18px] object-contain" />
          <span className="text-[7px] font-black italic tracking-[-0.04em] text-white/80">
            UNDERDUCK
          </span>
        </span>

        {/* 좌상단: 팀 / vs.상대 / 날짜 (레퍼런스 순서) */}
        <p className="absolute left-0 top-[28px] text-[9px] font-black tracking-[-0.02em] text-white">
          UNDERDUCK FC
        </p>
        <p className="absolute left-0 top-[42px] max-w-[56%] truncate text-[8px] font-black text-white/90">
          vs. {opponent || "상대 미정"}
        </p>
        {(date || time || location) && (
          <p className="absolute left-0 top-[55px] max-w-[62%] truncate whitespace-nowrap text-[7px] font-bold tracking-[0.02em] text-white/65">
            {formatDate(date)}
            {time ? ` ${time}` : ""}
            {location && location !== "미정" ? ` · ${location}` : ""}
          </p>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between">
          <h1
            className="text-[32px] font-black italic leading-[0.78] tracking-[-0.065em] text-white min-[390px]:text-[35px]"
            style={{ transform: "skewX(-9deg) rotate(-1deg) scaleX(1.05)", transformOrigin: "left bottom", textShadow: "0 3px 12px rgba(0,0,0,0.5)" }}
          >
            STARTING
          </h1>
          <span
            aria-hidden
            className="select-none pr-1 text-[72px] font-black italic leading-[0.62] tracking-[-0.04em] text-[#FF8FA3] min-[390px]:text-[80px]"
            style={{ transform: "skewX(-9deg)", textShadow: "0 4px 16px rgba(0,0,0,0.5)" }}
          >
            XI
          </span>
        </div>
      </div>

      {/* ── 4열 그리드 (번호순, gap 없이). 마지막 칸 = SUBS 카드 ── */}
      <div className="relative z-10 grid min-w-0 grid-cols-4 gap-0 overflow-hidden">
        {starters.map((name, idx) => (
          <PlayerCell
            key={name + idx}
            name={name}
            no={rosterMap[name]}
            isCaptain={captainRoles[name] === "C"}
            dark={isDarkCell(idx)}
            interactive={interactive}
          />
        ))}
        {cleanSubs.length > 0 && (
          <SubsCell
            subs={cleanSubs}
            rosterMap={rosterMap}
            dark={isDarkCell(starters.length)}
          />
        )}
      </div>

      {/* ── 푸터 로고 ── */}
      <div className="relative z-10 flex h-[18px] items-center justify-end gap-1.5 border-t border-white/10 pt-0.5">
        <span className="text-[6px] font-black tracking-[0.12em] text-white/55">
          UNDERDUCK FC
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/underducklogo.png" alt="" className="h-3.5 w-3.5 object-contain" />
      </div>
    </div>
  );
});

export default StartingElevenCard;
