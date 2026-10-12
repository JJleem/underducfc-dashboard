"use client";

// 스코어를 누르면 경기 결과 공개 화면을 다시 띄우는 감싸개. 홈 피드·히어로의 스코어가 쓴다.
// (경기 상세는 서버가 만든 재료를 받아 MatchDetailClient 안에서 직접 연다)
//
// 정식 경기 + 승·무·패 + 스코어가 숫자일 때만 버튼이 된다. 아니면 그냥 감싼 내용만 그린다 —
// 자체전처럼 결과 화면 대상이 아닌 경기의 스코어를 눌러도 아무 일도 없어야 한다.

import { useState, type ReactNode } from "react";
import { getOpponentLogo } from "../../lib/opponent-logos";
import { isCasualMatch } from "../home/match-result";
import { ResultRevealView, type ResultRevealData } from "./ResultReveal";
import { pageAccent } from "./effects";

export interface ReplayableMatch {
  id: number;
  opponent: string;
  ourScore: string | number;
  theirScore: string | number;
  result: string;
  type?: string;
  goals?: string;
  mom?: string;
}

export function resultRevealData(m: ReplayableMatch): ResultRevealData | null {
  const our = Number(m.ourScore);
  const their = Number(m.theirScore);
  if (!["승", "무", "패"].includes(m.result)) return null;
  if (isCasualMatch(m.result, m.type, m.opponent)) return null;
  if (String(m.ourScore).trim() === "" || String(m.theirScore).trim() === "") return null;
  if (!Number.isFinite(our) || !Number.isFinite(their)) return null;
  return {
    matchId: m.id,
    our,
    their,
    result: m.result,
    opponent: m.opponent,
    logo: getOpponentLogo(m.opponent),
    goals: m.goals ?? "",
    mom: m.mom ?? "",
  };
}

export default function ResultReplay({
  match,
  className,
  children,
}: {
  match: ReplayableMatch;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const data = resultRevealData(match);
  if (!data) return <span className={className}>{children}</span>;
  return (
    <>
      <button
        type="button"
        aria-label="경기 결과 다시 보기"
        onClick={(e) => {
          // 카드·캐러셀이 같이 눌리지 않게 여기서 끊는다.
          e.stopPropagation();
          setOpen(true);
        }}
        className={className}
      >
        {children}
      </button>
      {open && <ResultRevealView data={data} accent={pageAccent()} onClose={() => setOpen(false)} />}
    </>
  );
}
