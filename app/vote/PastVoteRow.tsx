"use client";
// 지난 투표 한 줄 — 커뮤니티 목록 문법.
//
// 카드로 감싸지 않는다. 헤어라인으로만 나뉘고, 닫혀 있을 땐 두 줄(상대·날짜, 집계 막대)로 끝난다.
// 누르면 그 자리에서 펼쳐져 누가 뭘 찍었는지와 투표 댓글이 나온다.
// (홈 피드는 드로어로 통일했지만 여긴 "목록을 훑는" 화면이라 인라인 펼침이 맞다 —
//  지난 투표는 여러 개를 빠르게 비교하며 보는 자리다)

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { casualKind, isCasualMatch, matchLogo } from "../components/home/match-result";
import Emoticon from "../components/Emoticon";

export interface VoteTally {
  attending: string[];
  maybe: string[];
  absent: string[];
  noReply: string[];
}

export interface PastVoteComment {
  nickname: string;
  message: string;
  timestamp: string;
  /** 더덕티콘 id. 이모티콘만 단 댓글은 message 가 비어 있다. */
  emoticon?: string | null;
}

/** 진행 중 투표(VoteClient)의 명단과 같은 모양. 한 페이지에서 두 가지로 보이면 안 된다. */
const GROUPS = [
  {
    key: "attending",
    label: "참석",
    labelTone: "text-[#FF8FA3] dark:text-[#FFB6C1]",
    chipTone: "bg-[#FF8FA3]/10 text-[#FF8FA3] dark:bg-[#FFB6C1]/15 dark:text-[#FFB6C1]",
  },
  {
    key: "maybe",
    label: "미정",
    labelTone: "text-amber-500 dark:text-amber-400",
    chipTone: "bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400",
  },
  {
    key: "absent",
    label: "불참",
    labelTone: "text-gray-400 dark:text-white/35",
    chipTone: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/45",
  },
  {
    key: "noReply",
    label: "미투표",
    labelTone: "text-gray-300 dark:text-white/25",
    chipTone: "bg-gray-50 text-gray-300 dark:bg-white/5 dark:text-white/25",
  },
] as const;

function shortDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const day = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} (${day})`;
}

export default function PastVoteRow({
  opponent,
  result,
  type,
  date,
  location,
  closed,
  tally,
  comments,
}: {
  opponent: string;
  /** 로고 판단용. 자체전엔 상대가 없어서 우리 로고를 쓴다(match-result.matchLogo). */
  result: string;
  type?: string;
  date: string;
  location: string;
  closed: boolean;
  tally: VoteTally;
  comments: PastVoteComment[];
}) {
  const [open, setOpen] = useState(false);
  const logo = matchLogo({ opponent, result, type });
  const opponentLabel = isCasualMatch(result, type, opponent)
    ? casualKind(result, type).ko
    : opponent;
  const total = tally.attending.length + tally.maybe.length + tally.absent.length;
  const pct = (n: number) => (total > 0 ? `${(n / total) * 100}%` : "0%");

  return (
    <article>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:active:bg-white/[0.03]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                width={20}
                height={20}
                className="shrink-0 rounded-full bg-white object-cover ring-1 ring-black/[0.06] dark:ring-white/10"
              />
            )}
            <span className="truncate text-[14px] font-black tracking-[-0.02em] text-gray-900 dark:text-white">
              {opponentLabel}
            </span>
            {closed && (
              <span className="shrink-0 text-[10px] font-black text-gray-300 dark:text-white/25">
                마감
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[11px] font-bold text-gray-400 dark:text-white/35">
            {shortDate(date)} · {location}
          </p>

          {total > 0 ? (
            <>
              <div className="mt-2 flex h-[5px] overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                {tally.attending.length > 0 && (
                  <div className="bg-[#FF8FA3]" style={{ width: pct(tally.attending.length) }} />
                )}
                {tally.maybe.length > 0 && (
                  <div className="bg-amber-400" style={{ width: pct(tally.maybe.length) }} />
                )}
                {tally.absent.length > 0 && (
                  <div
                    className="bg-gray-400 dark:bg-white/25"
                    style={{ width: pct(tally.absent.length) }}
                  />
                )}
              </div>
              <p className="mt-1.5 flex gap-2.5 text-[11px] font-bold">
                <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">
                  참석 <span className="tabular-nums">{tally.attending.length}</span>
                </span>
                <span className="text-amber-500 dark:text-amber-400">
                  미정 <span className="tabular-nums">{tally.maybe.length}</span>
                </span>
                <span className="text-gray-400 dark:text-white/35">
                  불참 <span className="tabular-nums">{tally.absent.length}</span>
                </span>
                {comments.length > 0 && (
                  <span className="text-gray-300 dark:text-white/25">
                    댓글 <span className="tabular-nums">{comments.length}</span>
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-[11px] font-bold text-gray-300 dark:text-white/25">
              투표 기록이 없어요.
            </p>
          )}
        </div>

        <ChevronDown
          width={15}
          height={15}
          strokeWidth={2.4}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-gray-500 dark:text-white/50" : "text-gray-300 dark:text-white/25"
          }`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-4 pb-5">
          <div className="flex flex-col gap-2.5">
            {GROUPS.map(({ key, label, labelTone, chipTone }) => {
              const names = tally[key];
              if (names.length === 0) return null;
              return (
                <div key={key} className="flex items-start gap-2">
                  <span className={`w-11 shrink-0 pt-0.5 text-[12px] font-black ${labelTone}`}>
                    {label}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {names.map((name) => (
                      <Link
                        key={name}
                        href={`/players/${encodeURIComponent(name)}`}
                        className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold active:opacity-60 ${chipTone}`}
                      >
                        {name}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {comments.length > 0 && (
            <section>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
                댓글 <span className="tabular-nums">{comments.length}</span>
              </p>
              <div className="flex flex-col gap-2.5">
                {comments.map((c, i) => (
                  <div key={`${c.timestamp}-${i}`}>
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.7] text-gray-700 [overflow-wrap:anywhere] dark:text-white/70">
                      <Link
                        href={`/players/${encodeURIComponent(c.nickname)}`}
                        className="font-black text-gray-900 active:opacity-60 dark:text-white"
                      >
                        {c.nickname}
                      </Link>{" "}
                      {c.message}
                    </p>
                    {c.emoticon && (
                      <div className="mt-1">
                        <Emoticon id={c.emoticon} size={56} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
