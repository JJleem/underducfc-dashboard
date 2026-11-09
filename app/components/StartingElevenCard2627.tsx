"use client";

// 라인업 발표 포스터 — 26-27 시즌판. 바이에른 뮌헨 선발 발표 그래픽의 문법을 그대로 따른다.
//
// 25-26 판(StartingElevenCard.tsx)은 어두운 체커 타일이었고 그대로 둔다(그 시즌 경기는 계속 그 포스터).
//
// 바이에른 그래픽의 구성(lineup-reference/munhen.jpg 를 확대해 뜯어본 것):
//   · 3열 × 4줄 = 12칸. 첫 칸은 선수가 아니라 엠블럼 2개(상대 위·우리 아래) + 거대 "XI"
//   · 칸 = 칠한 판이 아니라 얇은 회색 선 액자 하나. 윗선이 없고 왼쪽 아래 모서리만 45° 로 깎였다
//   · 누끼 상반신의 머리가 액자 위로 튀어나온다 → 윗줄 액자 아래에 다음 줄 머리가 겹친다
//   · 좁고 길쭉한(condensed) 거대 등번호가 선수 오른쪽 뒤에 서고, 머리·어깨가 그 가운데를 가린다.
//     번호 윗부분은 액자 밖까지 솟는다
//   · 이름은 칸 안이 아니라 깎인 사선 바깥에, 사선 각도로 기울여 작게
//   · 배경 전체에 45° 로 지나가는 큰 빛·그림자 띠 — 칸마다 그린 그림자가 아니다
//   · 교체는 칸이 아니라 맨 아래 가운데 한 줄 글자
//
// 바이에른과 일부러 다르게 한 것(우리 쓰임새에 맞춰):
//   · 첫 칸 엠블럼은 언더덕이 항상 위, 가운데 "VS", 상대가 아래(바이에른은 상대가 위)
//   · 이름을 더 크고 진하게 + 흰 테두리 — 사진·선 위에서도 읽히게
//   · 맨 아래 날짜·시간·경기장 한 줄 — 저장해서 카톡으로 돌리는 그림이라 언제·어디가 있어야 한다
//
// 칸 안의 크기는 전부 칸 폭 기준(cqw)이라 폰 폭이 달라도 비율이 같다.
// 발표 그래픽이라 테마와 무관하게 항상 이 모양이다(저장 이미지와 화면이 같아야 한다).

import { forwardRef, useState } from "react";
import Link from "next/link";
import { Anton } from "next/font/google";
import { playerFaceOnSrc } from "../lib/player-faceons";
import { getOpponentLogo } from "../lib/opponent-logos";
import { seasonAccent } from "../lib/seasons";

// 번호·XI 전용 좁은 글꼴. 한글이 없어서 이름은 기본 글꼴(Pretendard)로 쓴다.
const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });

const ACCENT = seasonAccent("2627").light; // #FF6FB5 — 거대 번호·XI
const ACCENT_DEEP = "#B8296F"; // 작은 글자(이름)용 — 밝은 바탕·사진 위에서 읽히게 진하게
const INK = "#1B1A22";
const PAPER = "#F3F2F4";
const FRAME = "rgba(27,26,34,0.32)";
/** 저장 이미지 바탕색 — LineupViewer 가 캡처할 때 쓴다. */
export const CARD_2627_BG = PAPER;

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function formatDate(date?: string): string {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`;
}

/**
 * 로고가 없는 상대팀의 엠블럼 글자. "fc"·"FC" 같은 붙임말은 떼고,
 * 영문이면 앞 두 글자 대문자("fc us" → "US"), 한글이면 첫 글자("구사fc" → "구"). 상대 미정이면 "?".
 */
function crestInitials(opponent?: string): string {
  const raw = (opponent || "").trim();
  if (!raw || raw === "미정") return "?";
  const core = raw.replace(/(^|\s)f\.?c\.?(\s|$)/gi, " ").replace(/fc$/i, "").replace(/^fc/i, "").trim() || raw;
  return /^[A-Za-z]/.test(core) ? core.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() : core.charAt(0);
}

/** 등번호 오름차순(번호 없는 선수는 뒤로). 25-26 판과 같은 규칙. */
function sortByNo(names: string[], rosterMap: Record<string, string>): string[] {
  return [...names]
    .map((p) => p.trim())
    .filter((p) => p && p !== "미정")
    .sort((a, b) => {
      const na = parseInt(rosterMap[a] ?? "", 10);
      const nb = parseInt(rosterMap[b] ?? "", 10);
      return (isNaN(na) ? 999 : na) - (isNaN(nb) ? 999 : nb);
    });
}

// ── 칸 좌표(전부 칸 폭 = 100cqw 기준) ──
// 칸 높이 106. 액자는 위 34% 지점부터 바닥까지, 사진은 칸 바닥에 서서 머리가 액자 위로 나온다.
// 왼쪽 아래 깎인 모서리는 이름 전용 자리다. 액자와 사진을 **같은 사선**으로 잘라서
// 그 바깥 삼각형엔 사진이 안 들어오고, 이름이 사선 바로 바깥에 사선을 따라 앉는다(바이에른 방식).
const CELL_H = 106;
const FRAME_X = 5; // 액자 왼쪽 위치
const FRAME_W = 92;
const FRAME_Y = 36; // 액자 윗변 높이 (= 106 × 0.34)
const FRAME_H = CELL_H - FRAME_Y; // 70
const CUT_X = 34; // 깎인 모서리 가로 길이(cqw)
const CUT_Y = CUT_X; // 세로도 같게 → 정확히 45°
const CHAMFER_Y = CELL_H - CUT_Y; // 사선이 액자 왼쪽 선과 만나는 높이
const PHOTO_H = 102; // 사진 상자 높이(칸 바닥 기준)
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;
/** 액자·사진 공통 사선. 상자(x0, 상단 y0, 폭 w, 높이 h)의 좌표계로 바꿔 clip-path 로 쓴다. */
const chamferClip = (y0: number, h: number) =>
  `polygon(0 0, 100% 0, 100% 100%, ${pct(CUT_X, FRAME_W)} 100%, 0 ${pct(CHAMFER_Y - y0, h)})`;

function PlayerCell({
  name,
  no,
  isCaptain,
  interactive,
}: {
  name: string;
  no?: string;
  isCaptain: boolean;
  interactive: boolean;
}) {
  const display = name.trim();
  const src = playerFaceOnSrc(display);
  const [failed, setFailed] = useState(false);
  const showImg = !!src && !failed;
  const numeral = no || "G";

  const body = (
    // container-type — 안쪽 크기를 이 칸 폭(cqw) 기준으로 잡는다
    <span className="relative block w-full" style={{ containerType: "inline-size", aspectRatio: `100 / ${CELL_H}` }}>
      {/* ① 거대 등번호 — 선수 오른쪽 뒤. 윗부분은 액자 위로 솟는다 */}
      <span
        aria-hidden
        className={`${anton.className} pointer-events-none absolute select-none leading-[0.82]`}
        style={{ right: "1.5cqw", top: "8cqw", fontSize: numeral.length > 1 ? "64cqw" : "70cqw", color: ACCENT, letterSpacing: "-1cqw" }}
      >
        {numeral}
      </span>

      {/* ② 액자 — 얇은 선. 윗선 없음, 왼쪽 아래 45° 깎임 */}
      <svg
        aria-hidden
        className="pointer-events-none absolute z-20 overflow-visible"
        style={{ left: `${FRAME_X}cqw`, top: `${FRAME_Y}cqw`, width: `${FRAME_W}cqw`, height: `${FRAME_H}cqw` }}
        viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
        preserveAspectRatio="none"
      >
        <polyline
          points={`0,0 0,${CHAMFER_Y - FRAME_Y} ${CUT_X},${FRAME_H} ${FRAME_W},${FRAME_H} ${FRAME_W},-8`}
          fill="none"
          stroke={FRAME}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* ③ 사진 — 액자 바닥에 서고 머리는 위로 튀어나온다. 아랫부분은 액자의 깎인 모서리를 따라 잘린다 */}
      {showImg ? (
        // 페이스온은 정적 webp 누끼라 next/image 없이 쓴다(html-to-image 캡처와도 단순).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          loading="eager"
          onError={() => setFailed(true)}
          // 선수는 칸 왼쪽, 큰 번호는 오른쪽 끝 — 가운데 두면 두 자리 번호가 머리에 통째로 가렸다(바이에른도 이 배치)
          className="absolute bottom-0 z-10 block object-contain object-left-bottom"
          style={{
            left: `${FRAME_X}cqw`,
            width: `${FRAME_W}cqw`,
            height: `${PHOTO_H}cqw`,
            clipPath: chamferClip(CELL_H - PHOTO_H, PHOTO_H),
          }}
        />
      ) : (
        <span
          aria-hidden
          className="absolute bottom-0 z-10 flex items-end justify-center"
          style={{ left: `${FRAME_X}cqw`, width: `${FRAME_W}cqw`, height: `${FRAME_H}cqw`, clipPath: chamferClip(FRAME_Y, FRAME_H) }}
        >
          {/* 사진 없는 게스트 — 실루엣 */}
          <svg viewBox="0 0 100 100" className="h-[86%] w-[70%]" preserveAspectRatio="xMidYMax meet">
            <circle cx="50" cy="34" r="20" fill="rgba(27,26,34,0.14)" />
            <path d="M10 100 C10 70 28 58 50 58 C72 58 90 70 90 100 Z" fill="rgba(27,26,34,0.14)" />
          </svg>
        </span>
      )}

      {/* ④ 이름 — 깎인 사선 바로 바깥, 사선을 따라 45°. 글자의 윗변을 사선에 붙여서
          글자 몸이 바깥(왼쪽 아래) 삼각형에 들어간다 → 사진과 안 겹친다.
          사선 길이 ≈ 48cqw — 네 글자까지는 그대로, 더 길면(게스트 이름) 글자를 줄인다. */}
      <span
        className="absolute z-40 flex items-center gap-[1.5cqw] whitespace-nowrap font-black leading-none"
        style={{
          left: `${FRAME_X + 1.5}cqw`,
          top: `${CHAMFER_Y + 2.5}cqw`,
          // 사선 길이 ≈ 48cqw. 세 글자 + 번호까지는 그대로, 네 글자 + 번호부터는 줄인다
          fontSize: display.length > 4 || (display.length === 4 && no) ? "8cqw" : "10.5cqw",
          color: ACCENT_DEEP,
          transform: "rotate(45deg)",
          transformOrigin: "0 0",
          letterSpacing: "-0.03em",
        }}
      >
        {/* 작은 번호 — 큰 번호가 머리에 가려도 몇 번인지 항상 읽히게 */}
        {no && (
          <span className={anton.className} style={{ fontWeight: 400, letterSpacing: "0" }}>
            {no}
          </span>
        )}
        {display}
        {isCaptain && (
          <span
            className="inline-flex items-center justify-center rounded-full font-black text-white"
            style={{ width: "9cqw", height: "9cqw", fontSize: "6cqw", background: INK, transform: "rotate(-45deg)" }}
          >
            C
          </span>
        )}
      </span>
    </span>
  );

  if (!interactive) return <div className="block min-w-0">{body}</div>;
  return (
    <Link href={`/players/${encodeURIComponent(display)}`} className="block min-w-0 transition-transform active:scale-[0.97]">
      {body}
    </Link>
  );
}

/** 첫 칸 — 엠블럼 2개(상대 위, 우리 아래) + 거대 XI. 바이에른 그래픽과 같은 자리. */
function TitleCell({ opponent }: { opponent?: string }) {
  const opponentLogo = getOpponentLogo(opponent);
  return (
    <span className="relative block aspect-[1/1.06] w-full" style={{ containerType: "inline-size" }}>
      {/* 엠블럼 — 언더덕은 항상 위, 가운데 VS, 상대가 아래 */}
      <span className="absolute flex flex-col items-center justify-between" style={{ left: "2cqw", top: "10cqw", bottom: "6cqw", width: "30cqw" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/underducklogo.png" alt="" className="aspect-square w-full rounded-full" />
        <span className={`${anton.className} leading-none`} style={{ fontSize: "11cqw", color: INK, letterSpacing: "0.04em" }}>
          VS
        </span>
        {opponentLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={opponentLogo} alt="" className="aspect-square w-full rounded-full bg-white object-cover" />
        ) : (
          // 로고 없는 상대 — 대부분의 경기가 이렇다. 빈 흰 원 대신 먹색 원에 머리글자로 엠블럼처럼.
          <span
            className="flex aspect-square w-full items-center justify-center rounded-full font-black text-white"
            style={{ background: INK, fontSize: crestInitials(opponent).length > 1 ? "10cqw" : "13cqw", letterSpacing: "-0.02em" }}
          >
            {crestInitials(opponent)}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={`${anton.className} absolute select-none leading-[0.8]`}
        style={{ left: "38cqw", top: "10cqw", fontSize: "84cqw", color: ACCENT, letterSpacing: "-1cqw" }}
      >
        XI
      </span>
    </span>
  );
}

const StartingElevenCard2627 = forwardRef<
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
>(function StartingElevenCard2627(
  { players, rosterMap, captainRoles = {}, opponent, date, time, location, subs = [], interactive = true },
  ref,
) {
  const starters = sortByNo(players, rosterMap);
  const cleanSubs = sortByNo(subs, rosterMap);
  const when = [formatDate(date), time && time !== "미정" ? time : ""].filter(Boolean).join(" ");
  const where = location && location !== "미정" ? location : "";

  return (
    <div
      ref={ref}
      data-lineup-card="2627"
      className="relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl px-3 pb-4 pt-3"
      style={{ background: PAPER, color: INK }}
    >
      {/* 배경 전체에 45° 로 지나가는 큰 빛·그림자 띠 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "linear-gradient(45deg, transparent 0 18%, rgba(255,255,255,0.95) 18% 30%, transparent 30%)",
            "linear-gradient(45deg, transparent 0 46%, rgba(27,26,34,0.045) 46% 50%, rgba(255,255,255,0.9) 50% 63%, transparent 63%)",
            "linear-gradient(45deg, transparent 0 78%, rgba(27,26,34,0.04) 78% 81%, rgba(255,255,255,0.85) 81% 92%, transparent 92%)",
          ].join(", "),
        }}
      />

      {/* 3열 × 4줄. 줄끼리 살짝 겹쳐 — 아랫줄 머리가 윗줄 액자 아래로 올라온다(뒤에 그려진 줄이 위) */}
      <div className="relative grid min-w-0 grid-cols-3 gap-x-1.5">
        <TitleCell opponent={opponent} />
        {starters.map((name, idx) => (
          <div key={name + idx} className="min-w-0" style={{ marginTop: idx >= 2 ? "-9%" : undefined }}>
            <PlayerCell name={name} no={rosterMap[name]} isCaptain={captainRoles[name] === "C"} interactive={interactive} />
          </div>
        ))}
      </div>

      {/* 교체 — 칸이 아니라 맨 아래 한 줄 */}
      {cleanSubs.length > 0 && (
        <p className="relative mt-3 text-center text-[11px] font-black leading-snug" style={{ color: INK }}>
          <span style={{ color: ACCENT_DEEP }}>교체</span>{" "}
          {cleanSubs.map((n) => (rosterMap[n] ? `${rosterMap[n]} ${n}` : n)).join(", ")}
        </p>
      )}

      {/* 누구와·언제·어디 — 저장해서 돌리는 그림이라 꼭 있어야 한다 */}
      <div className="relative mt-2.5 border-t pt-2" style={{ borderColor: "rgba(27,26,34,0.12)" }}>
        <p className="truncate text-[14px] font-black leading-tight" style={{ color: INK }}>
          vs {opponent && opponent !== "미정" ? opponent : "상대 미정"}
        </p>
        {(when || where) && (
          <p className="mt-0.5 truncate text-[11px] font-bold tabular-nums" style={{ color: "rgba(27,26,34,0.6)" }}>
            {[when, where].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
});

export default StartingElevenCard2627;
