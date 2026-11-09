"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Swords } from "lucide-react";
import DetailSheet from "../components/home/DetailSheet";

export interface RecordMatch {
  id: number;
  date: string;
  opponent: string;
  location: string;
  ourScore: number;
  theirScore: number;
}

export interface RecordGroup {
  key: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  latestDate: string;
  matches: RecordMatch[];
  logo?: string | null;
}

type View = "opponents" | "venues";

function matchResult(match: RecordMatch): "승" | "무" | "패" {
  if (match.ourScore > match.theirScore) return "승";
  if (match.ourScore === match.theirScore) return "무";
  return "패";
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year.slice(2)}.${Number(month)}.${Number(day)}`;
}

function ResultMark({ match, className = "" }: { match: RecordMatch; className?: string }) {
  const result = matchResult(match);
  const style =
    result === "승"
      ? "bg-[var(--ud-primary)] text-white dark:bg-[var(--ud-primary)] dark:text-[#251116]"
      : result === "무"
        ? "bg-amber-400 text-white dark:bg-amber-300 dark:text-amber-950"
        : "bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/45";

  return (
    <span
      title={`${formatDate(match.date)} ${match.ourScore}:${match.theirScore} ${result}`}
      className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-black tabular-nums ${style} ${className}`}
    >
      {result}
    </span>
  );
}

function MatchHistory({ group, view }: { group: RecordGroup; view: View }) {
  return (
    <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
      {group.matches.map((match) => {
        const result = matchResult(match);
        const context = view === "opponents" ? match.location : match.opponent;
        return (
          <Link
            key={match.id}
            href={`/matches/${match.id}`}
            className="flex items-center gap-3 py-3 active:opacity-60"
          >
            <div className="w-12 shrink-0">
              <p className="whitespace-nowrap text-[11px] font-black tabular-nums text-gray-500 dark:text-white/45">
                {formatDate(match.date)}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-black text-gray-900 dark:text-white">
                {view === "opponents" ? context || "장소 미정" : `vs ${context || "상대 미정"}`}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-gray-400 dark:text-white/50">
                일반 매칭
              </p>
            </div>
            <p className="shrink-0 whitespace-nowrap text-[15px] font-black tabular-nums text-gray-900 dark:text-white">
              {match.ourScore}
              <span className="px-1 text-gray-400 dark:text-white/40">:</span>
              {match.theirScore}
            </p>
            <span
              className={`w-5 shrink-0 text-center text-[11px] font-black ${
                result === "승"
                  ? "text-[var(--ud-primary)]"
                  : result === "무"
                    ? "text-amber-500"
                    : "text-gray-400 dark:text-white/50"
              }`}
            >
              {result}
            </span>
            <ChevronRight width={16} height={16} strokeWidth={2.2} className="shrink-0 text-gray-400 dark:text-white/40" />
          </Link>
        );
      })}
    </div>
  );
}

function GroupRow({ group, view }: { group: RecordGroup; view: View }) {
  const isOpponent = view === "opponents";

  return (
    <DetailSheet
      title={group.key}
      subtitle={`${group.played}경기 · ${group.wins}승 ${group.draws}무 ${group.losses}패`}
      className="w-full text-left"
      trigger={
        <div className="flex items-center gap-3 py-4">
          {isOpponent ? (
            group.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={group.logo}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="h-[40px] w-[40px] shrink-0 rounded-full bg-white object-cover ring-1 ring-black/[0.06] dark:ring-white/10"
              />
            ) : (
              <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-gray-100 text-[13px] font-black text-gray-400 dark:bg-white/[0.07] dark:text-white/50">
                {group.key.trim().charAt(0) || "?"}
              </span>
            )
          ) : (
            <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/[0.07] dark:text-white/50">
              <MapPin width={20} height={20} strokeWidth={2.2} />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-black tracking-[-0.015em] text-gray-900 dark:text-white">
              {group.key}
            </p>
            {/* 줄이 넘치면 "6득 / 점" 처럼 숫자·단위가 갈리지 않게 덩어리째 넘긴다. */}
            <p className="mt-1 flex flex-wrap gap-x-1 text-[11px] font-bold text-gray-400 dark:text-white/50">
              <span className="whitespace-nowrap">
                {group.played}경기 · {group.wins}승 {group.draws}무 {group.losses}패
              </span>
              <span className="whitespace-nowrap">
                <span className="text-gray-400 dark:text-white/40">· </span>
                {group.goalsFor}득점 {group.goalsAgainst}실점
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5" aria-label="최근 맞대결 결과">
            {/* 390 미만에선 최근 3경기만 — 다섯 개를 세우면 상대 이름 칸이 사라진다. */}
            {group.matches.slice(0, 5).map((match, i) => (
              <ResultMark key={match.id} match={match} className={i >= 3 ? "hidden min-[390px]:flex" : ""} />
            ))}
          </div>
          <ChevronRight width={16} height={16} strokeWidth={2.2} className="shrink-0 text-gray-400 dark:text-white/40" />
        </div>
      }
    >
      <MatchHistory group={group} view={view} />
    </DetailSheet>
  );
}

export default function RecordArchive({
  opponents,
  venues,
}: {
  opponents: RecordGroup[];
  venues: RecordGroup[];
}) {
  const [view, setView] = useState<View>("opponents");
  const groups = view === "opponents" ? opponents : venues;

  return (
    <>
      <div className="sticky top-[calc(49px+var(--safe-header-extra)+env(safe-area-inset-top))] z-[9] border-b border-gray-200/60 bg-gray-50 px-4 py-3 dark:border-white/[0.06] dark:bg-background">
        <div className="grid grid-cols-2 rounded-xl bg-gray-200/65 p-1 dark:bg-white/[0.07]">
          <button
            type="button"
            onClick={() => setView("opponents")}
            aria-pressed={view === "opponents"}
            className={`flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[12px] font-black transition-colors ${
              view === "opponents"
                ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-gray-400 dark:text-white/50"
            }`}
          >
            <Swords width={16} height={16} strokeWidth={2.2} />
            상대팀 <span className="tabular-nums opacity-55">{opponents.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setView("venues")}
            aria-pressed={view === "venues"}
            className={`flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[12px] font-black transition-colors ${
              view === "venues"
                ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-gray-400 dark:text-white/50"
            }`}
          >
            <MapPin width={16} height={16} strokeWidth={2.2} />
            경기장 <span className="tabular-nums opacity-55">{venues.length}</span>
          </button>
        </div>
      </div>

      <section className="px-4 pb-24 pt-5">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="app-section-label text-[11px]">
              {view === "opponents" ? "상대 전적" : "경기장"}
            </p>
            <h1 className="mt-1 text-[20px] font-black tracking-[-0.04em] text-gray-900 dark:text-white">
              {view === "opponents" ? "우리의 맞대결" : "우리가 뛴 곳"}
            </h1>
          </div>
          <p className="shrink-0 whitespace-nowrap pb-0.5 text-[11px] font-bold text-gray-400 dark:text-white/50">최근 경기순</p>
        </div>

        {groups.length > 0 ? (
          <div className="divide-y divide-gray-200/70 dark:divide-white/[0.07]">
            {groups.map((group) => (
              <GroupRow key={group.key} group={group} view={view} />
            ))}
          </div>
        ) : (
          <p className="py-14 text-center text-[12px] font-bold text-gray-400 dark:text-white/50">
            아직 모아볼 경기 기록이 없어요.
          </p>
        )}
      </section>
    </>
  );
}
