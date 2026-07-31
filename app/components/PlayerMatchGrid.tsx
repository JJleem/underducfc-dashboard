"use client";
// 선수 프로필 하단 "경기" 그리드 — 인스타 프로필 피드 구조.
//
// 타일 하나 = 경기 하나(사진 하나가 아니다). 한 경기에 사진이 여러 장이어도
// 대표 1장만 걸고 우상단에 겹친 네모로 "더 있다"를 알린다. 그러지 않으면
// 사진 많은 경기 하나가 그리드 한 줄을 다 먹어서 "내 경기들"로 안 읽힌다.
// 사진이 없으면 상대팀 로고, 로고도 없으면 스코어를 넣어 리듬을 유지한다.
//
// 탭하면 /matches/[id] 로 "이동"하지 않고 오버레이를 연다. 그 페이지는
// dynamic route + loading.tsx 라 이동하면 반드시 스켈레톤을 거치는데,
// 프로필 페이지는 이미 사진 URL·스코어·기록을 전부 들고 있어서 오버레이는
// 네트워크 왕복이 0이다. 그래야 인스타처럼 사진이 그 자리에서 커진다.

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { ChevronRight, Copy, Crown, MapPin, Spline, Volleyball, X } from "lucide-react";
import ModalPortal from "./ModalPortal";

export type GridMatch = {
  id: number;
  date: string;
  opponent: string;
  location: string;
  result: string;
  ourScore: string;
  theirScore: string;
  photos: string[];
  logo: string | null;
  goals: number;
  assists: number;
  isMom: boolean;
};

/** 한 화면에 처음 그릴 타일 수 · 이후 추가분. 200경기가 쌓여도 초기 렌더는 이만큼만 한다. */
const FIRST_PAGE = 36;
const PAGE_STEP = 36;

/** 전환 이름은 한 번에 한 요소에만 붙어야 한다(타일 ↔ 오버레이 중 하나). */
const VT_NAME = "ud-match-visual";

/** 그리드용 썸네일. 타일은 최대 150px 안팎이라 320이면 2x 까지 충분하고, eco 로 용량을 줄인다. */
const thumb = (url: string) =>
  url.includes("/upload/")
    ? url.replace("/upload/", "/upload/c_fill,g_auto,w_320,h_320,q_auto:eco,f_auto/")
    : url;

/** 오버레이용 원본. 썸네일이 이미 캐시돼 있어서 이게 도착하기 전에도 화면은 차 있다. */
const full = (url: string) =>
  url.includes("/upload/") ? url.replace("/upload/", "/upload/w_1080,q_auto,f_auto/") : url;

const resultTone = (result: string) =>
  result === "승"
    ? "text-[#FF8FA3]"
    : result === "패"
      ? "text-gray-400 dark:text-gray-500"
      : "text-amber-500";

/** 골·도움 표기. page.tsx 의 ScorePips 와 같은 모양이지만 그쪽은 서버 파일이라 옮겨올 수 없다. */
function Pips({ goals, assists, size = 11 }: { goals: number; assists: number; size?: number }) {
  if (goals === 0 && assists === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {goals > 0 && (
        <span className="inline-flex items-center gap-0.5 font-black">
          <Volleyball width={size} height={size} strokeWidth={2.4} />
          {goals > 1 && <span className="tabular-nums">×{goals}</span>}
        </span>
      )}
      {assists > 0 && (
        <span className="inline-flex items-center gap-0.5 font-black text-emerald-500">
          <Spline width={size} height={size} strokeWidth={2.4} />
          {assists > 1 && <span className="tabular-nums">×{assists}</span>}
        </span>
      )}
    </span>
  );
}

export default function PlayerMatchGrid({ matches }: { matches: GridMatch[] }) {
  const [shown, setShown] = useState(() => Math.min(FIRST_PAGE, matches.length));
  const [active, setActive] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // 스크롤이 바닥에 닿으면 다음 묶음을 그린다. 200경기여도 초기 렌더는 36장이라
  // 첫 진입이 무겁지 않고, 이미지는 loading="lazy" 라 보이는 것만 받는다.
  useEffect(() => {
    if (shown >= matches.length) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown((n) => Math.min(n + PAGE_STEP, matches.length));
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, matches.length]);

  /** View Transitions 가 있으면 사진이 커지는 전환, 없으면(카톡 인앱 등) 그냥 상태만 바꾼다. */
  const withTransition = useCallback((fn: () => void) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) {
      fn();
      return;
    }
    doc.startViewTransition(() => flushSync(fn));
  }, []);

  const openAt = (i: number) => {
    // 전환 이름을 먼저 타일에 붙여 커밋해야(flushSync) 브라우저가 "출발 모양"을 잡는다.
    flushSync(() => {
      setActive(i);
      setPhotoIdx(0);
    });
    withTransition(() => setOpen(true));
  };

  const close = useCallback(() => {
    withTransition(() => setOpen(false));
  }, [withTransition]);

  // 뒤로가기로 오버레이만 닫는다. 이게 없으면 사진 보다가 뒤로 눌렀을 때
  // 오버레이가 아니라 프로필 페이지를 떠나버린다(안드로이드·카톡 인앱에서 특히).
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ udMatchOverlay: true }, "");
    const onPop = () => setOpen(false);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // 닫기 버튼으로 닫혔다면 우리가 넣은 항목이 아직 남아 있으니 되돌린다.
      if (window.history.state?.udMatchOverlay) window.history.back();
    };
  }, [open]);

  // 오버레이가 떠 있는 동안 뒤 페이지가 같이 스크롤되면 안 된다.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (matches.length === 0) return null;

  const current = active !== null ? matches[active] : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-[2px]">
        {matches.slice(0, shown).map((m, i) => {
          const cover = m.photos[0];
          const vt = active === i && !open ? VT_NAME : undefined;
          const hasFoot = m.goals > 0 || m.assists > 0 || !!m.location;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => openAt(i)}
              aria-label={`${m.date} vs ${m.opponent} 경기 보기`}
              className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-white/[0.04] active:opacity-80 transition-opacity"
            >
              {cover ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={thumb(cover)}
                  alt=""
                  loading={i < 6 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ viewTransitionName: vt }}
                />
              ) : m.logo ? (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-white p-[22%] dark:bg-white/[0.06]"
                  style={{ viewTransitionName: vt }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.logo}
                    alt=""
                    loading={i < 6 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                </span>
              ) : (
                <span
                  className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1"
                  style={{ viewTransitionName: vt }}
                >
                  <span className={`text-[17px] font-black tabular-nums leading-none ${resultTone(m.result)}`}>
                    {m.ourScore}-{m.theirScore}
                  </span>
                  <span className="max-w-full truncate text-[8.5px] font-bold text-gray-400 dark:text-gray-500">
                    {m.opponent}
                  </span>
                </span>
              )}

              {m.isMom && (
                <span className="absolute left-1.5 top-1.5 text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                  <Crown width={12} height={12} strokeWidth={2.8} />
                </span>
              )}
              {m.photos.length > 1 && (
                <span className="absolute right-1.5 top-1.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                  <Copy width={11} height={11} strokeWidth={2.6} />
                </span>
              )}

              {hasFoot && (
                <span
                  className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 px-1.5 pb-1 pt-4 text-[8px] font-bold ${
                    cover
                      ? "bg-gradient-to-t from-black/75 to-transparent text-white/90"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <span className="min-w-0 truncate">{m.location}</span>
                  <span className={`shrink-0 ${cover ? "text-white" : "text-gray-600 dark:text-gray-300"}`}>
                    <Pips goals={m.goals} assists={m.assists} size={9} />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {shown < matches.length && <div ref={sentinel} className="h-8" />}

      {open && current && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={close}
          >
            <div
              className="flex shrink-0 items-center justify-between gap-2 px-4 safe-header-py-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-black text-white">vs {current.opponent}</p>
                <p className="truncate text-[10px] font-bold text-white/45">{current.date}</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="-mr-1 shrink-0 rounded-full p-2 text-white/70 active:bg-white/10"
              >
                <X width={19} height={19} strokeWidth={2.4} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col" onClick={(e) => e.stopPropagation()}>
              {current.photos.length > 0 ? (
                <div
                  className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (!el.clientWidth) return;
                    const i = Math.round(el.scrollLeft / el.clientWidth);
                    if (i !== photoIdx) setPhotoIdx(i);
                  }}
                >
                  {current.photos.map((p, i) => (
                    <div key={`${p}-${i}`} className="h-full w-full shrink-0 snap-center p-3">
                      {/* 이 박스는 항상 셀 크기다. <img> 는 로드 전 0×0 이라 여기에 크기를 맡기면
                          박스가 접혀서 전환 출발점도 썸네일 배경도 무너진다.
                          배경에 깔린 썸네일은 이미 그리드에서 받아둔 것이라 즉시 그려진다. */}
                      <div
                        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl"
                        style={{ viewTransitionName: i === photoIdx ? VT_NAME : undefined }}
                      >
                        <div
                          aria-hidden
                          className="absolute inset-0 scale-110 bg-cover bg-center opacity-60 blur-lg"
                          style={{ backgroundImage: `url(${thumb(p)})` }}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={full(p)}
                          alt={`${current.opponent} 경기 사진 ${i + 1}`}
                          loading={i === 0 ? "eager" : "lazy"}
                          decoding="async"
                          className="relative max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-8">
                  <div
                    className="flex h-36 w-36 items-center justify-center rounded-full bg-white/[0.06] p-7"
                    style={{ viewTransitionName: VT_NAME }}
                  >
                    {current.logo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={current.logo} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[34px] font-black tabular-nums text-white">
                        {current.ourScore}-{current.theirScore}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-white/40">등록된 사진이 없는 경기</p>
                </div>
              )}

              {current.photos.length > 1 && (
                <div className="flex shrink-0 items-center justify-center gap-1.5 pt-3">
                  {current.photos.map((p, i) => (
                    <span
                      key={`${p}-${i}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === photoIdx ? "w-4 bg-white" : "w-1.5 bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div
              className="shrink-0 border-t border-white/10 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`text-[15px] font-black tabular-nums ${resultTone(current.result)}`}>
                    {current.ourScore}-{current.theirScore}
                  </span>
                  <span className="text-[11px] font-black text-white/50">{current.result}</span>
                  {current.location && (
                    <span className="flex min-w-0 items-center gap-0.5 text-[10px] font-bold text-white/40">
                      <MapPin width={10} height={10} strokeWidth={2.4} className="shrink-0" />
                      <span className="truncate">{current.location}</span>
                    </span>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-2 text-[12px] text-white">
                  <Pips goals={current.goals} assists={current.assists} size={13} />
                  {current.isMom && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-gradient-to-br from-amber-200 to-amber-500 px-1.5 py-0.5 text-[9px] font-black text-amber-950">
                      <Crown width={10} height={10} strokeWidth={2.8} /> MOM
                    </span>
                  )}
                </span>
              </div>

              <Link
                href={`/matches/${current.id}`}
                className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-white/[0.08] py-2.5 text-[12px] font-black text-white active:bg-white/[0.14]"
              >
                경기 상세 보기
                <ChevronRight width={14} height={14} strokeWidth={2.6} />
              </Link>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
