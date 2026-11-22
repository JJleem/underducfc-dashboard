"use client";
// 26-27 결과 카드(피드). 25-26 경기는 MatchFeed 의 예전 카드를 그대로 쓴다.
//
// 바이에른식 나이트 — 어두운 바탕에 그 경기 깃발을 옅게 깔고, Anton 스코어,
// 득점자 옆 공 아이콘(골 하나 = 공 하나) + ASSIST, 아래에 MOM 얼굴 칸.
// 공유 이미지(draw-result-card-2627)와 같은 뼈대다 — 하나를 고치면 다른 쪽도.
//
// 크기는 전부 카드 폭 기준(cqw, 540 폭 시안을 그대로 옮김). 작은 글씨는 11px 아래로 안 내린다.

import { useState, type ReactNode } from "react";
import type { MatchData } from "../../lib/match-types";
import type { MatchdayArt } from "../../lib/matchday-art";
import { playerFaceOnSrc } from "../../lib/player-faceons";
import { seasonAccent, seasonLabel, seasonOf } from "../../lib/seasons";
import { BALL_PATHS, RESULT_TAG, momSlots, scorerLines } from "../../lib/result-card";
import { matchLogo } from "./match-result";
import { anton } from "../../lib/fonts";


const ACCENT = seasonAccent("2627").light;
const INK = "#1B1A22";
const DIM = "rgba(255,255,255,.5)";
const u = (px: number) => `${(px / 5.4).toFixed(3)}cqw`;
const small = (px: number) => `max(11px, ${u(px)})`;
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function fmtDate(date: string, time: string): string {
  const t = new Date(`${date}T00:00:00`);
  if (Number.isNaN(t.getTime())) return date;
  return `${t.getMonth() + 1}월 ${t.getDate()}일 (${DOW[t.getDay()]})${time && time !== "미정" ? ` ${time}` : ""}`;
}

function Ball({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {BALL_PATHS.map((d) => <path key={d} d={d} />)}
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function Assist({ names }: { names: string }) {
  return (
    <>
      <span className={anton.className} style={{ color: ACCENT, letterSpacing: "0.08em", fontSize: "0.9em", marginRight: "0.35em" }}>
        ASSIST
      </span>
      {names}
    </>
  );
}

function Crest({ src, fallback, size }: { src: string | null; fallback: string; size: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" onError={() => setFailed(true)} className="rounded-full object-contain" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex items-center justify-center rounded-full bg-white font-black" style={{ width: size, height: size, color: INK, fontSize: `calc(${size} * .38)` }}>
      {fallback}
    </span>
  );
}

function MomFace({ name }: { name: string }) {
  const src = playerFaceOnSrc(name);
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="absolute object-cover object-top"
        style={{ left: "5%", bottom: "1%", width: "90%", height: "126%" }}
      />
    );
  }
  return (
    <span
      className="absolute flex items-center justify-center rounded-full bg-white font-black"
      style={{ left: "19%", bottom: "14%", width: "62%", aspectRatio: "1", color: INK, fontSize: u(18) }}
    >
      {name.trim().charAt(0)}
    </span>
  );
}

export default function ResultCard2627({
  match,
  art,
  scored,
  score,
}: {
  match: MatchData;
  art: MatchdayArt | null;
  scored: boolean;
  /** 스코어 숫자 줄. MatchFeed 가 ResultReplay 로 감싸서 넘긴다. */
  score: (children: ReactNode, className: string) => ReactNode;
}) {
  const lines = scorerLines(match.goals ?? "", match.assists ?? "");
  const moms = momSlots(match.mom ?? "").slice(0, 4);
  const two = lines.length > 2;
  const dense = lines.length > 4;
  const hi = match.result === "승" ? "us" : match.result === "패" ? "them" : null;
  const tag = RESULT_TAG[match.result];
  const meta = [seasonLabel(seasonOf(match.date) ?? ""), fmtDate(match.date, match.time), match.location !== "미정" ? match.location : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative aspect-square w-full overflow-hidden text-white" style={{ background: "#121019", containerType: "inline-size" }}>
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.src} alt="" aria-hidden loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover opacity-20" />
      )}
      <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(135deg,transparent 0 40%,rgba(255,255,255,.05) 40% 63%,transparent 63%)" }} />

      <div className="relative flex h-full flex-col" style={{ padding: `${u(26)} ${u(30)}` }}>
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`${anton.className} leading-none`} style={{ fontSize: u(34) }}>FULL-TIME</p>
            <p className="mt-[1.3cqw] truncate font-bold" style={{ fontSize: small(12), color: "rgba(255,255,255,.55)" }}>{meta}</p>
          </div>
          {tag && (
            <span
              className={`${anton.className} shrink-0 leading-none`}
              style={{
                fontSize: u(20),
                padding: `${u(6)} ${u(11)} ${u(5)}`,
                background: match.result === "승" ? ACCENT : match.result === "패" ? "#fff" : "#8B8794",
                color: match.result === "패" ? INK : "#fff",
              }}
            >
              {tag}
            </span>
          )}
        </div>

        {/* 크레스트 · 스코어 */}
        <div className="grid items-center" style={{ marginTop: u(22), gridTemplateColumns: `${u(96)} 1fr ${u(96)}` }}>
          <div className="flex flex-col items-center" style={{ gap: u(6) }}>
            <Crest src="/underducklogo.png" fallback="U" size={u(78)} />
            <span className="whitespace-nowrap font-black" style={{ fontSize: small(11) }}>UNDERDUCK</span>
          </div>
          {scored ? (
            score(
              <>
                <span style={hi === "us" ? { color: ACCENT } : undefined}>{match.ourScore}</span>
                <span style={{ fontSize: ".45em", opacity: 0.7 }}>–</span>
                <span style={hi === "them" ? { color: "#8B8794" } : undefined}>{match.theirScore}</span>
              </>,
              `${anton.className} flex items-center justify-center gap-[2.2cqw] leading-[.9] text-[23.7cqw]`,
            )
          ) : (
            <p className="text-center font-black" style={{ fontSize: u(30) }}>기록 없음</p>
          )}
          <div className="flex min-w-0 flex-col items-center" style={{ gap: u(6) }}>
            <Crest src={matchLogo(match)} fallback={match.opponent.trim().charAt(0) || "?"} size={u(78)} />
            <span className="max-w-full truncate font-black" style={{ fontSize: small(11) }}>{match.opponent}</span>
          </div>
        </div>

        {/* 득점 — 득점자 옆 공 하나 = 골 하나. 5명 이상이면 ASSIST 를 같은 줄에 */}
        <div className="min-h-0 flex-1 overflow-hidden" style={{ paddingTop: u(dense ? 14 : 20) }}>
          <div
            className="mx-auto grid text-left"
            style={{
              gridTemplateColumns: two ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)",
              columnGap: u(26),
              rowGap: u(dense ? 4 : 7),
              maxWidth: u(two ? 440 : 240),
            }}
          >
            {lines.map((g) => {
              const helpers = g.assists.join(dense ? "·" : " · ");
              return (
                <div key={g.name} className="min-w-0" style={g.muted ? { color: DIM } : undefined}>
                  <div className="flex min-w-0 items-center" style={{ gap: u(8) }}>
                    <span className="shrink-0 whitespace-nowrap" style={{ fontSize: small(14), fontWeight: g.muted ? 700 : 900 }}>{g.name}</span>
                    <span className="flex shrink-0" style={{ gap: u(2), fontSize: small(13) }}>
                      {Array.from({ length: g.goals }, (_, i) => <Ball key={i} color={g.muted ? "rgba(255,255,255,.45)" : ACCENT} />)}
                    </span>
                    {dense && helpers && (
                      <span className="min-w-0 truncate font-bold" style={{ fontSize: small(11), color: DIM }}><Assist names={helpers} /></span>
                    )}
                  </div>
                  {!dense && helpers && (
                    <p className="truncate font-bold" style={{ fontSize: small(11.5), color: DIM, marginTop: u(1) }}><Assist names={helpers} /></p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MOM — 칸 크기 고정, 인원만 늘어난다(2~4) */}
        {moms.length > 0 && (
          <div className="flex items-end justify-between border-t" style={{ borderColor: "rgba(255,255,255,.16)", paddingTop: u(14), gap: u(10) }}>
            <p className={`${anton.className} self-start leading-tight`} style={{ fontSize: u(13), letterSpacing: "0.09em", color: "rgba(255,255,255,.55)" }}>
              MAN OF<br />THE MATCH
            </p>
            <div className="flex items-end" style={{ gap: u(moms.length >= 4 ? 8 : 12) }}>
              {moms.map(({ name, role }) => (
                <div key={name} className="flex flex-col items-start" style={{ width: u(78) }}>
                  <div className="relative w-full" style={{ height: u(74) }}>
                    <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 78 74" preserveAspectRatio="none" aria-hidden>
                      <path d="M1 0 V58 L16 73 H77 V0" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
                    </svg>
                    <MomFace name={name} />
                  </div>
                  {role && (
                    <span className={anton.className} style={{ marginTop: u(7), fontSize: small(11), letterSpacing: "0.09em", color: ACCENT, lineHeight: 1 }}>
                      {role}
                    </span>
                  )}
                  <span className="max-w-full truncate font-black leading-tight" style={{ fontSize: small(13), marginTop: role ? u(3) : u(7) }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
