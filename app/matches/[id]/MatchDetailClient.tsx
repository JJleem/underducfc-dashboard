"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  Crown,
  MapPin,
  Moon,
  Pencil,
  Sun,
  Target,
  Users,
} from "lucide-react";
import type { MatchData, LineupData } from "../../lib/match-types";
import LineupViewer from "../../components/LineupViewer";
import ModalPortal from "../../components/ModalPortal";
import OpponentLogo from "../../components/OpponentLogo";
import PinchZoomImage from "../../components/PinchZoomImage";
import { cldFit, cldThumb } from "../../lib/cloudinary";
import useAppOverlay from "../../components/useAppOverlay";
import { parseWeather, weatherEmoji } from "../../lib/weather";
import type { EarnedTitle } from "../../lib/titles";
import {
  casualKind,
  hasScore,
  isCasualMatch,
  resultTextTone,
  resultWord,
} from "../../components/home/match-result";

interface MatchDetailClientProps {
  match: MatchData;
  lineups: LineupData[];
  rosterMap: Record<string, string>;
  captainRoles?: Record<string, string>;
  playerStats?: Record<
    string,
    { apps: number; goals: number; assists: number; mom: number; pos?: string }
  >;
  playerTitles?: Record<string, EarnedTitle[]>;
}

function SoccerBall({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm200-500 54-18 16-54q-32-48-77-82.5T574-786l-54 38v56l160 112Zm-400 0 160-112v-56l-54-38q-54 17-99 51.5T210-652l16 54 54 18Zm-42 308 46-4 30-54-58-174-56-20-40 30q0 65 18 118.5T238-272Zm293 108q25-4 49-12l28-60-26-44H378l-26 44 28 60q24 8 49 12t51 4q26 0 51-4ZM390-360h180l56-160-146-102-144 102 54 160Zm332 88q42-50 60-103.5T800-494l-40-28-56 18-58 174 30 54 46 4Z" />
    </svg>
  );
}

function Cleats({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M222-79q-32 0-61.5-12T108-127l-7-7q-9-8-11.5-20t2.5-23l194-495q8-20 27.5-30.5T354-708l58 11q17 4 32.5-2.5T471-717q14-15 18.5-31.5T489-782l-5-15q-5-16-1.5-32.5T498-858l43-43q17-18 42.5-18t42.5 17l181 184q22 23 22.5 54.5T809-609l19 19q6 7 10.5 14.5T843-560q0 7-3 14t-11 15q-12 11-28.5 11.5T772-531l-18-19-28 29 18 18q11 11 11 28t-11 28q-12 11-28.5 11.5T687-447l-18-17-112 114 17 16q12 12 12 28.5T574-277q-12 11-28.5 11.5T517-277l-16-17-28 29 16 16q11 11 11 28t-11 28q-12 11-28.5 11.5T432-193l-16-15-28 28 16 15q11 12 11 28.5T404-108q-12 11-28.5 11.5T347-108l-16-16q-23 23-50.5 34T222-79Zm0-81q17 0 31.5-6t25.5-18l471-478-166-169-20 20q12 40 4.5 78T528-662q-26 26-60 38.5t-71 4.5l-41-8-159 401q10 7 21.5 10.5T222-160Z" />
    </svg>
  );
}

const sectionLabel =
  "text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-white/35";

export default function MatchDetailClient({
  match,
  lineups,
  rosterMap,
  captainRoles,
  playerStats,
  playerTitles = {},
}: MatchDetailClientProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);
  const closeLightbox = useAppOverlay(!!lightbox, () => setLightbox(null));
  const weather = parseWeather(match.weather || "");
  const photos = (match.photos || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const goals = (match.goals || "").split(",").map((name) => name.trim()).filter(Boolean);
  const assists = (match.assists || "").split(",").map((name) => name.trim());
  const attendees = (match.attendees || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const casual = isCasualMatch(match.result, match.type, match.opponent);
  const kind = casualKind(match.result, match.type);
  const scored = hasScore(match.ourScore, match.theirScore);
  const upcoming = match.result === "예정";

  return (
    <main className="min-h-dvh bg-gray-50 pb-6 text-gray-900 dark:bg-[#09090b] dark:text-zinc-100">
      <header className="app-page-header safe-header-py-3">
        <Link
          href="/"
          aria-label="홈으로"
          className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 dark:text-gray-300"
        >
          <ArrowLeft width={18} height={18} strokeWidth={2.4} />
        </Link>
        <span className="app-header-label">MATCH</span>
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="테마 전환"
          className="press-icon -my-2 ml-auto flex h-11 w-11 items-center justify-center rounded-full text-gray-500 active:bg-gray-100 dark:text-gray-400 dark:active:bg-white/10"
        >
          <Moon className="h-[17px] w-[17px] dark:hidden" />
          <Sun className="hidden h-[17px] w-[17px] text-[#FFB6C1] dark:block" />
        </button>
      </header>

      {/* 이 화면의 주인공은 카드가 아니라 경기 자체다. 스코어를 넓게 두고 나머지는 헤어라인으로 잇는다. */}
      <section className="border-b border-gray-200/70 px-4 pb-5 pt-4 dark:border-white/[0.07]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-black tabular-nums text-gray-900 dark:text-white">
              {match.date}
              {match.time && match.time !== "미정" ? ` · ${match.time}` : ""}
            </p>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-gray-400 dark:text-white/35">
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1]" />
                <span className="truncate">{match.location}</span>
              </span>
              {match.type && (
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-gray-300 dark:text-white/25" />
                  {match.type}
                </span>
              )}
            </div>
          </div>
          <span className={`shrink-0 pt-0.5 text-[12px] font-black ${resultTextTone(match.result)}`}>
            {resultWord(match.result)}
          </span>
        </div>

        {/* 자체전은 상대가 없다. "언더덕 A vs 언더덕 B"는 어디에도 저장하지 않는
            대진이라(A/B 명단이 없다) 오리 로고만 두 번 찍힌다. 종목과 인원으로 바꾼다. */}
        {casual ? (
          <div className="mt-6 flex flex-col items-center">
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white ring-1 ring-black/[0.06] dark:bg-black dark:ring-white/10">
              <Image src="/icons/icon-192.png" alt="언더덕" fill sizes="56px" className="object-cover" />
            </div>
            <span className="mt-2.5 text-[22px] font-black leading-none tracking-[-0.04em] text-violet-500 dark:text-violet-300">
              {kind.ko}
            </span>
            {attendees.length > 0 && (
              <span className="mt-2 text-[12px] font-bold text-gray-400 dark:text-white/40">
                {attendees.length}명이 함께 뛰었어요
              </span>
            )}
          </div>
        ) : (
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex min-w-0 flex-col items-center">
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white ring-1 ring-black/[0.06] dark:bg-black dark:ring-white/10">
              <Image src="/icons/icon-192.png" alt="언더덕" fill sizes="56px" className="object-cover" />
            </div>
            <span className="mt-2 max-w-full truncate text-[13px] font-black">
              언더덕
            </span>
          </div>

          <div className="min-w-[104px] text-center">
            {upcoming || !scored ? (
              <span className="text-[25px] font-black tracking-[0.08em] text-gray-300 dark:text-white/20">
                VS
              </span>
            ) : (
              <div className="flex items-baseline justify-center gap-3 font-black tabular-nums">
                <span className="text-[40px] leading-none tracking-[-0.05em] text-[#FF8FA3] dark:text-[#FFB6C1]">
                  {match.ourScore}
                </span>
                <span className="text-[16px] text-gray-300 dark:text-white/20">:</span>
                <span className="text-[40px] leading-none tracking-[-0.05em] text-gray-700 dark:text-white/75">
                  {match.theirScore}
                </span>
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col items-center">
            <OpponentLogo name={match.opponent} />
            <span className="mt-2 max-w-full truncate text-center text-[13px] font-black">
              {match.opponent}
            </span>
          </div>
        </div>
        )}

        {weather.available && (
          <p className="mt-5 text-center text-[10.5px] font-bold text-gray-400 dark:text-white/35">
            {weatherEmoji(weather.icon)} {weather.temp}°C · {weather.description}
            <span className="ml-2 text-blue-400">강수 {weather.pop}%</span>
          </p>
        )}
      </section>

      {(goals.length > 0 || match.mom || attendees.length > 0) && (
        <section className="divide-y divide-gray-100 border-b border-gray-200/70 px-4 dark:divide-white/[0.06] dark:border-white/[0.07]">
          {goals.length > 0 && (
            <div className="py-4">
              <p className={sectionLabel}>득점 기록</p>
              <div className="mt-3 space-y-2.5">
                {goals.map((scorer, index) => (
                  <div key={`${scorer}-${index}`} className="flex min-w-0 items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <SoccerBall className="h-3.5 w-3.5 shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1]" />
                      <b className="truncate text-[13px] font-black">{scorer}</b>
                    </span>
                    {assists[index] && (
                      <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-bold text-gray-400 dark:text-white/35">
                        <Cleats className="h-3.5 w-3.5" />
                        <b className="font-black text-gray-600 dark:text-white/60">{assists[index]}</b> 도움
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {match.mom && (
            <div className="flex items-center gap-3 py-4">
              <Crown className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-black tracking-[0.1em] text-gray-400 dark:text-white/35">MOM</span>
              <span className="min-w-0 flex-1 truncate text-right text-[13px] font-black">{match.mom}</span>
            </div>
          )}

          {attendees.length > 0 && (
            <div className="py-4">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-gray-300 dark:text-white/25" />
                <p className={sectionLabel}>참석 {attendees.length}명</p>
              </div>
              <p className="mt-2.5 flex flex-wrap gap-x-2.5 gap-y-1.5">
                {attendees.map((name) => (
                  <Link
                    key={name}
                    href={`/players/${encodeURIComponent(name)}`}
                    className="text-[12px] font-bold text-gray-600 active:text-[#FF8FA3] dark:text-white/60 dark:active:text-[#FFB6C1]"
                  >
                    {name}
                  </Link>
                ))}
              </p>
            </div>
          )}
        </section>
      )}

      {photos.length > 0 && (
        <section className="border-b border-gray-200/70 py-4 dark:border-white/[0.07]">
          <div className="mb-3 flex items-center gap-1.5 px-4">
            <Camera className="h-3.5 w-3.5 text-gray-300 dark:text-white/25" />
            <p className={sectionLabel}>사진 {photos.length}</p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-gray-100 dark:bg-white/[0.06]">
            {photos.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setLightbox({ urls: photos, index })}
                aria-label={`경기 사진 ${index + 1} 크게 보기`}
                className="aspect-square overflow-hidden bg-gray-100 dark:bg-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cldThumb(url, 360)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-opacity active:opacity-75"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="pt-5">
        <div className="mb-3 flex items-center justify-between px-4">
          <div>
            <p className={sectionLabel}>라인업</p>
            <p className="mt-1 text-[12px] font-bold text-gray-500 dark:text-white/45">
              {lineups.length > 0 ? `${lineups.length}개 쿼터` : "아직 등록되지 않았어요"}
            </p>
          </div>
          <Link
            href={`/matches/${match.id}/edit`}
            className="flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-[11px] font-black text-[#FF8FA3] active:bg-[#FF8FA3]/10 dark:text-[#FFB6C1] dark:active:bg-[#FFB6C1]/10"
          >
            <Pencil className="h-3.5 w-3.5" /> {lineups.length > 0 ? "편집" : "추가"}
          </Link>
        </div>

        {lineups.length > 0 ? (
          <LineupViewer
            match={match}
            lineups={lineups}
            rosterMap={rosterMap}
            captainRoles={captainRoles}
            playerStats={playerStats}
            playerTitles={playerTitles}
            editHref={`/matches/${match.id}/edit`}
          />
        ) : (
          <div className="mx-4 border-y border-gray-100 py-8 text-center dark:border-white/[0.06]">
            <p className="text-[12px] font-bold text-gray-400 dark:text-white/30">
              라인업을 추가하면 쿼터별 배치를 여기서 볼 수 있어요.
            </p>
          </div>
        )}
      </section>

      {lightbox && (
        <ModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="경기 사진 크게 보기"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            onClick={closeLightbox}
          >
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="닫기"
              className="absolute right-3 z-20 flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[12px] font-black text-white/80 active:bg-white/10"
              style={{ top: "max(0.5rem, env(safe-area-inset-top))" }}
            >
              닫기
            </button>
            {lightbox.index > 0 && (
              <button
                type="button"
                aria-label="이전 사진"
                className="absolute left-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white/80 active:bg-white/10"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightbox({ ...lightbox, index: lightbox.index - 1 });
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {lightbox.index < lightbox.urls.length - 1 && (
              <button
                type="button"
                aria-label="다음 사진"
                className="absolute right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white/80 active:bg-white/10"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightbox({ ...lightbox, index: lightbox.index + 1 });
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            <PinchZoomImage
              src={cldFit(lightbox.urls[lightbox.index])}
              alt={`경기 사진 ${lightbox.index + 1}`}
              className="p-[5vw]"
              imageClassName="max-h-[85vh] max-w-[90vw]"
            />
            {lightbox.urls.length > 1 && (
              <span className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] text-[11px] font-black tabular-nums text-white/60">
                {lightbox.index + 1} / {lightbox.urls.length}
              </span>
            )}
          </div>
        </ModalPortal>
      )}
    </main>
  );
}
