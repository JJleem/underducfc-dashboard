"use client";
// 투표 명단의 이름 칩. 진행 중 투표와 지난 투표가 같이 쓴다.
//
// 꾹 누르면 "언제 이 응답을 했는지"가 뜬다. 참석 순서가 곧 엔트리 순서라
// "몇 번째로 손 들었나"를 확인할 일이 생기는데, 칩마다 시각을 늘 붙여 두면
// 명단이 훨씬 길어지고 이름을 훑기 어려워진다.

import { useRef, useState } from "react";
import Link from "next/link";

/** 이름 + 그 응답을 한 시각(ISO). */
export interface Voter {
  name: string;
  at: string;
}

const HOLD_MS = 350;

/**
 * 미투표 그룹은 응답이 없어 시각도 없다(문자열 이름만 온다). 그리는 쪽에서 두 모양을
 * 갈라 쓰지 않게 여기서 맞춘다 — 시각이 비면 칩이 꾹 누르기를 켜지 않는다.
 */
export function asVoters(names: readonly (string | Voter)[]): Voter[] {
  return names.map((n) => (typeof n === "string" ? { name: n, at: "" } : n));
}

/** "2026-08-31T14:57:00Z" → "8/31 14:57" (기기 현지 시각) */
function formatAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VoterChip({
  voter,
  chipTone,
}: {
  voter: Voter;
  chipTone: string;
}) {
  const [held, setHeld] = useState(false);
  const timer = useRef<number | null>(null);
  // 꾹 누른 뒤 손을 떼면 클릭이 이어져 프로필로 넘어간다. 그 이동만 막는다.
  const suppressClick = useRef(false);
  const at = formatAt(voter.at);

  const start = () => {
    if (!at) return;
    suppressClick.current = false;
    timer.current = window.setTimeout(() => {
      setHeld(true);
      suppressClick.current = true;
      navigator.vibrate?.(8);
    }, HOLD_MS);
  };

  const end = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setHeld(false);
  };

  return (
    <span className="relative inline-flex">
      {held && (
        <span
          role="status"
          className="animate-fade pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10.5px] font-black tabular-nums text-white shadow-lg dark:bg-white dark:text-gray-900"
        >
          {at}
        </span>
      )}
      <Link
        href={`/players/${encodeURIComponent(voter.name)}`}
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        /* 링크를 길게 누르면 브라우저가 미리보기·복사 메뉴를 띄운다. */
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            suppressClick.current = false;
          }
        }}
        className={`select-none rounded-full px-2.5 py-0.5 text-[12px] font-bold [-webkit-touch-callout:none] active:opacity-60 ${chipTone} ${
          held ? "opacity-70" : ""
        }`}
      >
        {voter.name}
      </Link>
    </span>
  );
}
