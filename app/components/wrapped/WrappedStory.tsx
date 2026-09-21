"use client";

// 시즌 래핑 — 한 장씩 넘겨 보는 돌아보기.
//
// 스포티파이 래핑 문법: 전체화면 카드, 상단 진행바, 탭/스와이프로 이동.
// 자동 재생은 안 한다 — 숫자를 읽는 화면이라 멋대로 넘어가면 놓친다.
// (스토리의 "자동"은 볼 게 사진일 때 성립한다)
//
// 내용이 없는 장은 아예 만들지 않는다([[wrapped]] 가 null 을 주는 것들). 빈 칸을
// "아직 없어요" 로 채우면 8장 중 5장이 사과문이 된다.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, CloudRain, Crown, Snowflake, Sun, X } from "lucide-react";
import { SEASONS } from "../../lib/seasons";
import type { SeasonWrapped, WrappedRank } from "../../lib/wrapped";
import { TitleBadge } from "../TitleBadges";
import { roleColor } from "../../lib/positions";
import PlayerSeasonCard from "./PlayerSeasonCard";
import BestElevenPitch from "./BestElevenPitch";
import PlayerFace from "../PlayerFace";
import { CountUp, Stagger } from "./motion";
import RolePitch from "./RolePitch";
import FramedPortrait from "./FramedPortrait";

/** 장마다 시즌색 글로우가 앉는 자리. 같은 배경이 반복되지 않게 돌려 쓴다. */
const GLOW_POS: Record<string, { top?: number; bottom?: number; left?: number; right?: number }> = {
  top: { top: -96, left: -40 },
  bottom: { bottom: -110, right: -50 },
  left: { top: 140, left: -130 },
  right: { top: 90, right: -130 },
  center: { top: 120, left: 20 },
};

/** "공동 2위 / 14명 중" 같은 꼬리표. */
function rankText(r: WrappedRank | null): string | null {
  if (!r) return null;
  return `${r.tied ? "공동 " : ""}${r.rank}위 · ${r.total}명 중`;
}

function Big({ children }: { children: ReactNode }) {
  return (
    <p className="text-[64px] font-black leading-[0.9] tracking-[-0.05em] tabular-nums text-white">
      {children}
    </p>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15px] font-bold leading-relaxed text-white/55">{children}</p>
  );
}

function Rank({ rank }: { rank: WrappedRank | null }) {
  const text = rankText(rank);
  if (!text) return null;
  return (
    <p className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/70">
      팀 내 {text}
    </p>
  );
}

export default function WrappedStory({
  data,
  no,
  /** 시즌 대표색(라이트 값). 래핑은 항상 다크 배경이라 밝은 쪽을 쓴다. */
  accent,
  /** 나갈 곳. 보통 그 선수 프로필. */
  exitHref,
  /** 운영진이 공개 전에 미리 보는 중인가 — 화면에 표시해 실수로 공유하지 않게 한다. */
  preview = false,
}: {
  data: SeasonWrapped;
  no?: string;
  accent: string;
  exitHref: string;
  preview?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  const d = data;
  // 마무리 인사에 쓸 "다음 시즌" 라벨. 마지막 시즌이면 없다.
  const nextLabel = (() => {
    const i = SEASONS.findIndex((x) => x.id === d.seasonId);
    return i >= 0 ? SEASONS[i + 1]?.label : undefined;
  })();

  // ── 카드 스탯: 실제 기록만. 종합 레이팅은 두지 않는다.
  const cardStats = [
    { label: "경기", value: d.apps },
    { label: "골", value: d.goals },
    { label: "도움", value: d.assists },
    { label: "MOM", value: d.mom },
    { label: "출전 Q", value: d.totalQuarters },
    { label: "승률", value: `${d.record.winRate}%` },
  ];

  // ── 장 구성. 내용이 없으면 그 장은 만들지 않는다.
  /**
   * 장마다 배경을 바꾼다. 열 장이 전부 같은 다크 배경이면 넘겨도 넘긴 것 같지가 않다.
   *   tint  = 시즌색 글로우 위치(각 장 다른 구석)
   *   photo = 전체 배경 사진(있으면 글로우 대신)
   */
  type Slide = {
    key: string;
    node: ReactNode;
    tint?: "top" | "bottom" | "left" | "right" | "center";
    photo?: string;
    center?: boolean;
  };
  const slides: Slide[] = [];

  slides.push({
    key: "intro",
    tint: "center",
    center: true,
    node: (
      <div className="text-center">
        {/* 마지막 장의 선수카드와 같은 프레임 — 처음과 끝이 이어진다 */}
        <div className="mb-5">
          <FramedPortrait name={d.name} accent={accent} width={168} />
        </div>
        <p className="text-[11px] font-black tracking-[0.3em] text-white/40">
          {d.seasonLabel} SEASON
        </p>
        <p className="mt-5 text-[30px] font-black leading-tight tracking-[-0.03em] text-white">
          {d.name}님의
          <br />한 시즌을 돌아볼게요
        </p>
        {/* 데스크톱에서도 넘길 방법을 알려준다 — "탭" 만 쓰면 키보드가 있는 줄 모른다. */}
        <p className="mt-6 text-[13px] font-bold text-white/40">
          화면을 누르거나 <span className="text-white/60">←</span>{" "}
          <span className="text-white/60">→</span> 키로 넘기기
        </p>
      </div>
    ),
  });

  slides.push({
    key: "apps",
    tint: "top",
    node: (
      <div>
        <Lead>이번 시즌</Lead>
        <div className="mt-3 flex items-end gap-2">
          <Big><CountUp value={d.apps} /></Big>
          <span className="pb-2 text-[22px] font-black text-white/70">경기</span>
          {d.totalQuarters > 0 && (
            <span className="pb-2.5 text-[15px] font-black" style={{ color: accent }}>
              · <CountUp value={d.totalQuarters} duration={1100} />쿼터
            </span>
          )}
        </div>
        <Lead>
          {d.attendance.rate !== null
            ? `팀이 치른 ${d.attendance.total}경기 중 ${d.attendance.rate}%를 함께했어요.`
            : "그라운드에 나섰어요."}
        </Lead>
        {d.attendance.maxStreak >= 2 && (
          <p className="mt-3 text-[13px] font-bold text-white/45">
            가장 길게는 <span style={{ color: accent }}>{d.attendance.maxStreak}경기</span> 연속으로
            빠지지 않았고요.
          </p>
        )}
        <Rank rank={d.appsRank} />
      </div>
    ),
  });

  if (d.myRoleShares.length > 0) {
    slides.push({
      key: "role",
      tint: "left",
      node: (
        <div>
          <Lead>어디서 뛰었나</Lead>
          <p
            className="mt-2 text-[52px] font-black leading-none tracking-[-0.04em]"
            style={{ color: accent }}
          >
            {d.myRoleShares[0].role}
          </p>
          <Lead>
            총 {d.totalQuarters}쿼터 중 {d.myRoleShares[0].quarters}쿼터(
            {d.myRoleShares[0].percent}%)
          </Lead>

          {/* 프로필 POSITION IDENTITY 와 같은 그림 — 좌표에 버블, 크기 = 비중 */}
          <div className="mx-auto mt-4 w-[62%]">
            <RolePitch roles={d.myRoleShares} />
          </div>

          {/* 4칸(GK/DF/MF/FW)으로 뭉치면 어느 자리였는지가 사라진다 — 세부 역할 그대로 */}
          <div className="mt-4 space-y-1.5">
            <Stagger delay={120}>
              {d.myRoleShares.slice(0, 5).map((r) => (
                <div key={r.role} className="flex items-center gap-2.5">
                  <span
                    className="w-9 shrink-0 text-[11px] font-black"
                    style={{ color: roleColor(r.role as never) }}
                  >
                    {r.role}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${r.percent}%`, background: roleColor(r.role as never) }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-[10.5px] font-black tabular-nums text-white/45">
                    {r.quarters}Q · {r.percent}%
                  </span>
                </div>
              ))}
            </Stagger>
          </div>
          {d.myRoleShares.length > 5 && (
            <p className="mt-2 text-[11px] font-bold text-white/25">
              외 {d.myRoleShares.length - 5}개 자리
            </p>
          )}
        </div>
      ),
    });
  }

  if (d.points > 0) {
    slides.push({
      key: "points",
      tint: "right",
      // 사진이 있으면 그 경기 사진을 전면 배경으로 깐다(54장이 놀고 있었다).
      photo: d.bestGameArt.photo,
      node: (
        <div>
          <Lead>공격 포인트</Lead>
          <div className="mt-3 flex items-end gap-2">
            <Big><CountUp value={d.points} /></Big>
            <span className="pb-2 text-[22px] font-black text-white/70">P</span>
          </div>
          <Lead>
            {d.goals}골 {d.assists}도움을 만들었어요.
          </Lead>
          {d.bestGame && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
              {d.bestGameArt.logo && (
                // eslint-disable-next-line @next/next/no-img-element -- 정적 로고, 최적화 불필요
                <img src={d.bestGameArt.logo} alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.18em] text-white/35">BEST MATCH</p>
                <p className="mt-1 truncate text-[15px] font-black text-white">
                  vs {d.bestGame.opponent}
                </p>
                <p className="mt-0.5 text-[12px] font-bold text-white/55">
                  {d.bestGame.goals}골 {d.bestGame.assists}도움
                  {d.bestGame.isMom ? " · MOM" : ""}
                </p>
              </div>
            </div>
          )}
          <Rank rank={d.pointsRank} />
        </div>
      ),
    });
  }

  // ── 그래서 이런 시즌이었어요
  // MOM 만 세우면 못 받은 사람은 볼 게 없다. 개인 최고 기록을 같이 세워 항상 채운다.
  {
    const bests = [
      { label: "한 경기 최다 골", v: d.personalBests.maxGoals, unit: "골" },
      { label: "한 경기 최다 공격P", v: d.personalBests.maxPoints, unit: "P" },
      { label: "공격P 연속", v: d.personalBests.maxPointStreak, unit: "경기" },
    ].filter((b) => b.v > 0);

    slides.push({
      key: "impact",
      tint: "bottom",
      node: (
        <div>
          <Lead>그래서 이런 시즌이었어요</Lead>

          {/* 승률은 누구에게나 있다 — 이 장이 비지 않게 받쳐 준다 */}
          <div className="mt-3 flex items-end gap-2">
            <p
              className="text-[52px] font-black leading-none tracking-[-0.04em] tabular-nums"
              style={{ color: accent }}
            >
              <CountUp value={d.record.winRate} />%
            </p>
            <span className="pb-2 text-[14px] font-black text-white/55">
              {d.record.wins}승 {d.record.draws}무 {d.record.losses}패
            </span>
          </div>

          {/* MOM — 몇 번인지에 더해 **언제** 받았는지까지 */}
          {d.mom > 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
              <div className="flex items-baseline gap-1.5">
                <Crown width={15} height={15} strokeWidth={2.4} style={{ color: accent }} />
                <span className="text-[20px] font-black leading-none tabular-nums text-white">
                  <CountUp value={d.mom} />
                </span>
                <span className="text-[12px] font-black text-white/55">번의 MOM</span>
              </div>
              {d.momMatches.length > 0 && (
                <div className="mt-2.5 space-y-1">
                  <Stagger delay={160} step={70}>
                    {d.momMatches.slice(0, 4).map((m) => (
                      <div key={`${m.date}-${m.opponent}`} className="flex items-center gap-2">
                        <span className="shrink-0 text-[10.5px] font-black tabular-nums" style={{ color: accent }}>
                          {m.date.slice(5).replace("-", ".")}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-white/65">
                          vs {m.opponent}
                        </span>
                      </div>
                    ))}
                  </Stagger>
                  {d.momMatches.length > 4 && (
                    <p className="pt-0.5 text-[10px] font-bold text-white/25">
                      외 {d.momMatches.length - 4}경기
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-[12.5px] font-bold text-white/35">
              아직 MOM 은 없어요. 다음 시즌에 한 번쯤은.
            </p>
          )}

          {/* 개인 최고 기록 — MOM 이 없어도 이 장이 비지 않는다 */}
          {bests.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {bests.map((b) => (
                <div
                  key={b.label}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-1 py-2.5 text-center"
                >
                  <p className="text-[18px] font-black leading-none tabular-nums text-white">
                    <CountUp value={b.v} />
                    <span className="ml-0.5 text-[9px] font-bold text-white/45">{b.unit}</span>
                  </p>
                  <p className="mt-1 truncate text-[8.5px] font-bold text-white/35">{b.label}</p>
                </div>
              ))}
            </div>
          )}

          {d.topOpponent && (
            <p className="mt-4 text-[12px] font-bold text-white/45">
              <span className="text-white/70">{d.topOpponent.name}</span> 상대로 가장 강했어요 —{" "}
              <span style={{ color: accent }}>{d.topOpponent.points}P</span>
            </p>
          )}
        </div>
      ),
    });
  }

  if (d.topPartners.length > 0) {
    slides.push({
      key: "partner",
      tint: "left",
      node: (
        <div>
          <Lead>함께 뛴 사람들</Lead>
          <p
            className="mt-2 text-[40px] font-black leading-none tracking-[-0.03em]"
            style={{ color: accent }}
          >
            {d.topPartners[0].name}
          </p>
          <Lead>
            {d.topPartners[0].sharedMatches}경기 {d.topPartners[0].sharedQuarters}쿼터를 같은
            피치에서 보냈어요.
          </Lead>
          <div className="mt-5 space-y-1.5">
            <Stagger delay={140}>
              {d.topPartners.map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5"
                  style={i === 0 ? { background: `${accent}1f` } : undefined}
                >
                  <span
                    className="w-4 shrink-0 text-center text-[11px] font-black tabular-nums"
                    style={{ color: i === 0 ? accent : "rgba(255,255,255,0.28)" }}
                  >
                    {i + 1}
                  </span>
                  <PlayerFace name={p.name} size={26} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-black text-white/85">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-[11px] font-black tabular-nums text-white/45">
                    {p.sharedQuarters}Q · {p.sharedMatches}경기
                  </span>
                </div>
              ))}
            </Stagger>
          </div>
          {d.topPartners[0].linkedGoals > 0 && (
            <p className="mt-3 text-[12px] font-bold text-white/40">
              1위와 합작한 골은{" "}
              <span style={{ color: accent }}>{d.topPartners[0].linkedGoals}개</span>.
            </p>
          )}
        </div>
      ),
    });
  }

  if (d.titles.length > 0) {
    slides.push({
      key: "titles",
      tint: "top",
      node: (
        <div>
          <Lead>이번 시즌에 딴 칭호</Lead>
          <p className="mt-3 text-[46px] font-black leading-none tabular-nums text-white">
            {d.titles.length}개
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {d.titles.slice(0, 12).map((t) => (
              <span key={t.id} className="flex flex-col items-center gap-1.5" style={{ width: 62 }}>
                <TitleBadge title={t} size={46} />
                <span className="w-full truncate text-center text-[9px] font-black text-white/55">
                  {t.name}
                </span>
              </span>
            ))}
          </div>
          {d.titles.length > 12 && (
            <p className="mt-4 text-[12px] font-bold text-white/35">
              외 {d.titles.length - 12}개
            </p>
          )}
        </div>
      ),
    });
  }

  // ── 월별 출석 + 날씨 (한 장에)
  if (d.monthly.length > 1) {
    const topAttended = Math.max(...d.monthly.map((m) => m.attended));
    // 동점이면 전부 적는다. 앞의 것만 뽑으면 "왜 3월이 아니라 5월이지" 가 된다.
    const peaks = d.monthly.filter((m) => m.attended === topAttended && m.attended > 0);
    const max = Math.max(...d.monthly.map((m) => m.teamMatches), 1);
    // 이모지는 다크 배경에서 검은 덩어리로 뭉개져 뭐가 뭔지 안 보였다.
    // lucide 아이콘 + 고유색 + 라벨로 셋을 확실히 가른다.
    const weatherRows = [
      { key: "rain", Icon: CloudRain, color: "#6FB4FF", label: "비 오는 날", n: d.weather.rain },
      { key: "heat", Icon: Sun, color: "#FFB258", label: "30℃ 넘는 날", n: d.weather.heat },
      { key: "cold", Icon: Snowflake, color: "#8FE3FF", label: "0℃ 아래", n: d.weather.cold },
    ].filter((r) => r.n > 0);

    slides.push({
      key: "monthly",
      tint: "bottom",
      node: (
        <div>
          <Lead>달마다 이렇게 나왔어요</Lead>
          {peaks.length > 0 && (
            <p className="mt-2 text-[21px] font-black leading-tight text-white">
              <span style={{ color: accent }}>
                {peaks.map((m) => `${Number(m.month.slice(5))}월`).join(" · ")}
              </span>
              에 가장 열심이었어요
            </p>
          )}

          <div className="mt-5 flex items-end justify-between gap-1.5">
            {d.monthly.map((m) => {
              const isPeak = m.attended === topAttended && m.attended > 0;
              return (
                <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <span
                    className="text-[9px] font-black tabular-nums"
                    style={{ color: isPeak ? accent : "rgba(255,255,255,0.4)" }}
                  >
                    {m.attended}
                  </span>
                  <span
                    className="relative w-full overflow-hidden rounded-t-md bg-white/[0.07]"
                    style={{ height: 84 }}
                  >
                    {/* 옅은 칸 = 팀 경기 수, 진한 칸 = 내 출석 */}
                    <span
                      className="absolute bottom-0 left-0 right-0 bg-white/[0.12]"
                      style={{ height: `${(m.teamMatches / max) * 100}%` }}
                    />
                    <span
                      className="absolute bottom-0 left-0 right-0 rounded-t-md"
                      style={{ height: `${(m.attended / max) * 100}%`, background: accent }}
                    />
                  </span>
                  <span className="text-[9px] font-bold tabular-nums text-white/30">
                    {Number(m.month.slice(5))}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[9.5px] font-bold text-white/25">
            진한 칸 = 내 출석 · 옅은 칸 = 팀 경기
          </p>

          {/* 날씨를 따로 한 장 쓰기엔 줄이 셋뿐이라 여기 붙인다 */}
          {weatherRows.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-2.5 text-[10px] font-black tracking-[0.16em] text-white/30">
                이런 날에도 나왔어요
              </p>
              <div className="flex gap-2">
                {weatherRows.map(({ key, Icon, color, label, n }) => (
                  <div
                    key={key}
                    className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-1 py-3"
                    style={{ borderColor: `${color}33` }}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ background: `${color}22`, color }}
                    >
                      <Icon width={17} height={17} strokeWidth={2.4} />
                    </span>
                    <span className="text-[17px] font-black leading-none tabular-nums" style={{ color }}>
                      <CountUp value={n} />
                      <span className="ml-0.5 text-[9.5px] font-bold text-white/45">경기</span>
                    </span>
                    <span className="w-full truncate text-center text-[9px] font-bold leading-none text-white/40">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    });
  }

  // ── 팀 시즌 요약 — 개인 기록 사이에 한 장 끼워 호흡을 준다
  if (d.team.played > 0) {
    slides.push({
      key: "team",
      tint: "center",
      center: true,
      node: (
        <div className="text-center">
          {/* 팀 이야기인데 팀 표식이 없으니 밋밋했다. 마크를 크게 세워 장의 주인을 밝힌다.
              underducklogo.png 는 알파 없는 네이비 사각형이라, 밝기를 알파로 바꾼
              underduck-mark.png 를 마스크로 써서 모양만 시즌색으로 찍는다. */}
          <span
            aria-hidden
            className="mx-auto mb-4 block h-16 w-16"
            style={{
              background: accent,
              WebkitMaskImage: "url(/underduck-mark.png)",
              maskImage: "url(/underduck-mark.png)",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              filter: `drop-shadow(0 0 18px ${accent}66)`,
            }}
          />
          <p className="text-[9px] font-black tracking-[0.3em] text-white/30">UNDERDUCK FC</p>
          <Lead>우리 팀은</Lead>
          <p className="mt-2 text-[34px] font-black leading-none tracking-[-0.04em] text-white">
            <CountUp value={d.team.played} />
            <span className="text-[20px] text-white/50">경기</span>
          </p>
          <p className="mt-4 text-[26px] font-black leading-none tracking-[-0.03em]">
            <span style={{ color: accent }}>{d.team.wins}</span>
            <span className="text-[16px] text-white/40">승 </span>
            <span className="text-white/80">{d.team.draws}</span>
            <span className="text-[16px] text-white/40">무 </span>
            <span className="text-white/80">{d.team.losses}</span>
            <span className="text-[16px] text-white/40">패</span>
          </p>
          <div className="mx-auto mt-6 grid max-w-[280px] grid-cols-3 gap-x-3 gap-y-3">
            {[
              ["득점", d.team.goalsFor],
              ["실점", d.team.goalsAgainst],
              ["득실", d.team.goalsFor - d.team.goalsAgainst],
            ].map(([label, v]) => (
              <div key={String(label)}>
                <p className="text-[22px] font-black leading-none tabular-nums text-white">
                  {label === "득실" && Number(v) > 0 ? "+" : ""}
                  <CountUp value={Number(v)} />
                </p>
                <p className="mt-1 text-[10px] font-bold text-white/35">{label}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    });
  }

  // ── 시즌 베스트 11 (포지션별 최다 출전 쿼터)
  if (d.bestEleven.length >= 7) {
    slides.push({
      key: "xi",
      tint: "top",
      node: (
        <div className="w-full">
          {/* 발표 그래픽처럼 — 제목은 작게 한 줄, 자리는 피치에 내준다 */}
          <p className="text-center text-[10px] font-black tracking-[0.28em] text-white/35">
            {d.seasonLabel} SEASON
          </p>
          <p className="mt-1 text-center text-[19px] font-black leading-none tracking-[-0.03em] text-white">
            가장 많이 뛴 <span style={{ color: accent }}>XI</span>
          </p>
          <p className="mt-1.5 text-center text-[10px] font-bold text-white/30">
            {d.formation} · 각 자리 최다 출전 · 숫자는 점유율
          </p>

          <div className="mt-3">
            <BestElevenPitch slots={d.bestEleven} accent={accent} formation={d.formation} />
          </div>

          {/* 벤치 — XI 만 보여 주면 아깝게 밀린 사람이 아예 안 보인다 */}
          {d.bench.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-center text-[9px] font-black tracking-[0.2em] text-white/25">
                BENCH
              </p>
              <div className="flex items-start justify-center gap-2">
                {d.bench.map((b) => (
                  <div key={b.name} className="flex w-[58px] flex-col items-center">
                    <span
                      className="inline-flex rounded-full"
                      style={{
                        padding: 2,
                        border: `1.5px solid ${b.isMe ? accent : "rgba(255,255,255,0.16)"}`,
                        boxShadow: b.isMe ? `0 0 12px ${accent}88` : undefined,
                      }}
                    >
                      <PlayerFace name={b.name} size={30} />
                    </span>
                    <span
                      className="mt-1 w-full truncate text-center text-[9px] font-black leading-none"
                      style={{ color: b.isMe ? accent : "rgba(255,255,255,0.7)" }}
                    >
                      {b.name}
                    </span>
                    <span className="mt-[2px] text-[8px] font-bold tabular-nums leading-none text-white/30">
                      {b.role} {b.quarters}Q
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.inBestEleven ? (
            <p className="mt-3 text-center text-[13px] font-black" style={{ color: accent }}>
              당신은 이 안에 있어요
            </p>
          ) : d.bench.some((b) => b.isMe) ? (
            <p className="mt-3 text-center text-[12.5px] font-black" style={{ color: accent }}>
              당신은 벤치에 있어요
            </p>
          ) : d.myPositionRank ? (
            <p className="mt-3 text-center text-[12px] font-bold text-white/45">
              당신은 {d.myPositionRank.group} 중{" "}
              <span style={{ color: accent }}>{d.myPositionRank.rank}번째</span>
              <span className="text-white/25"> / {d.myPositionRank.total}명 · {d.myPositionRank.quarters}쿼터</span>
            </p>
          ) : null}

          {d.lineupCoverage.total > 0 &&
            d.lineupCoverage.withLineup < d.lineupCoverage.total && (
              // 라인업 없는 경기는 포지션 집계에 안 들어간다. 근거를 밝혀야
              // "왜 쟤가 저기 있지" 가 안 된다.
              <p className="mt-1.5 text-center text-[9.5px] font-bold text-white/25">
                라인업이 기록된 {d.lineupCoverage.withLineup}경기 기준 (전체{" "}
                {d.lineupCoverage.total}경기)
              </p>
            )}
        </div>
      ),
    });
  }

  // ── 출전 쿼터 순위 — 포디움 + 압축 목록
  //
  // 처음엔 11~12줄을 한 장에 다 세웠더니 얼굴이 24px 로 쪼그라들고 밋밋했다.
  // 1~3위는 크게 세우고 나머지는 줄여서, 한 장 안에서 강약을 만든다.
  if (d.quarterRanking.length > 0) {
    const podium = d.quarterRanking.slice(0, 3);
    const rest = d.quarterRanking.slice(3, 8);
    const mine = d.quarterRanking.find((r) => r.isMe && r.rank > 8);
    // 2위 · 1위 · 3위 순으로 세워야 가운데가 가장 높아 보인다
    const order = [podium[1], podium[0], podium[2]].filter(Boolean);
    const faceSize = (rank: number) => (rank === 1 ? 74 : 58);

    slides.push({
      key: "ranking",
      tint: "left",
      node: (
        <div className="w-full">
          <Lead>가장 많이 뛴 사람</Lead>
          {d.myQuarterRank && (
            <p className="mb-5 mt-1 text-[12.5px] font-bold text-white/40">
              당신은 {d.myQuarterRank.total}명 중{" "}
              <span style={{ color: accent }}>{d.myQuarterRank.rank}번째</span>
              <span className="text-white/25"> · {d.myQuarterRank.quarters}쿼터</span>
            </p>
          )}

          {/* 포디움 */}
          <div className="flex items-end justify-center gap-3">
            {order.map((r) => {
              const size = faceSize(r.rank);
              return (
                <div key={r.name} className="flex min-w-0 flex-col items-center">
                  <span
                    className="relative inline-flex rounded-full p-[3px]"
                    style={{
                      border: `2px solid ${r.isMe ? accent : "rgba(255,255,255,0.18)"}`,
                      boxShadow: r.isMe ? `0 0 16px ${accent}88` : undefined,
                    }}
                  >
                    <PlayerFace name={r.name} size={size} />
                    <span
                      className="absolute -bottom-1 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full text-[10px] font-black text-black"
                      style={{ background: r.rank === 1 ? accent : "rgba(255,255,255,0.75)" }}
                    >
                      {r.rank}
                    </span>
                  </span>
                  <span
                    className="mt-3 max-w-[76px] truncate text-[12px] font-black"
                    style={{ color: r.isMe ? accent : "rgba(255,255,255,0.88)" }}
                  >
                    {r.name}
                  </span>
                  <span className="text-[10px] font-black tabular-nums text-white/40">
                    {r.quarters}Q
                  </span>
                  <span className="text-[9px] font-bold tabular-nums text-white/25">
                    {r.matches}경기
                  </span>
                </div>
              );
            })}
          </div>

          {/* 4위 이하 */}
          {rest.length > 0 && (
            <div className="mt-6 space-y-1">
              <Stagger delay={200} step={45}>
                {rest.map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5"
                    style={r.isMe ? { background: `${accent}24`, border: `1px solid ${accent}59` } : undefined}
                  >
                    <span
                      className="w-4 shrink-0 text-center text-[11px] font-black tabular-nums"
                      style={{ color: r.isMe ? accent : "rgba(255,255,255,0.28)" }}
                    >
                      {r.rank}
                    </span>
                    <PlayerFace name={r.name} size={26} />
                    <span
                      className="min-w-0 flex-1 truncate text-[12px] font-black"
                      style={{ color: r.isMe ? accent : "rgba(255,255,255,0.78)" }}
                    >
                      {r.name}
                    </span>
                    <span
                      className="shrink-0 text-right text-[11.5px] font-black tabular-nums"
                      style={{ color: r.isMe ? accent : "rgba(255,255,255,0.42)" }}
                    >
                      {r.quarters}Q
                      <span className="ml-1 text-[9.5px] font-bold text-white/25">
                        {r.matches}경기
                      </span>
                    </span>
                  </div>
                ))}
              </Stagger>
            </div>
          )}

          {/* 내가 8위 밖이면 끊고 내 줄만 */}
          {mine && (
            <>
              <p className="py-1 text-center text-[11px] font-black text-white/20">···</p>
              <div
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5"
                style={{ background: `${accent}24`, border: `1px solid ${accent}59` }}
              >
                <span
                  className="w-4 shrink-0 text-center text-[11px] font-black tabular-nums"
                  style={{ color: accent }}
                >
                  {mine.rank}
                </span>
                <PlayerFace name={mine.name} size={26} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-black" style={{ color: accent }}>
                  {mine.name}
                </span>
                <span className="shrink-0 text-right text-[11.5px] font-black tabular-nums" style={{ color: accent }}>
                  {mine.quarters}Q
                  <span className="ml-1 text-[9.5px] font-bold text-white/30">{mine.matches}경기</span>
                </span>
              </div>
            </>
          )}
        </div>
      ),
    });
  }

  slides.push({
    key: "card",
    tint: "center",
    center: true,
    node: (
      <div className="flex flex-col items-center">
        <PlayerSeasonCard
          ref={cardRef}
          name={d.name}
          no={no}
          positions={d.myRoleShares.slice(0, 2).map((r) => r.role)}
          seasonLabel={d.seasonLabel}
          stats={cardStats}
          accent={accent}
          width={286}
        />
        {/* 저장 버튼 대신 마무리 인사 — 래핑은 기능이 아니라 한 해를 닫는 장이다 */}
        <p className="mt-6 text-center text-[14px] font-black leading-snug text-white">
          {nextLabel ? (
            <>
              <span style={{ color: accent }}>{nextLabel}</span> 시즌도
              <br />더 열심히 활동해보아요
            </>
          ) : (
            <>
              다음 시즌도
              <br />더 열심히 활동해보아요
            </>
          )}
        </p>
        <p className="mt-2.5 text-[12px] font-black tracking-[0.1em]" style={{ color: accent }}>
          언더덕 화이팅!
        </p>
      </div>
    ),
  });

  const total = slides.length;
  const current = slides[Math.min(index, total - 1)];
  const go = useCallback(
    (delta: number) => setIndex((i) => Math.min(total - 1, Math.max(0, i + delta))),
    [total],
  );

  // 데스크톱 키보드
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <main
      className="relative flex min-h-dvh flex-col bg-[#060409]"
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {/* 배경 — 장마다 바뀐다. 열 장이 전부 같으면 넘겨도 넘긴 것 같지가 않다. */}
      {current.photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary 원본을 그대로 깐다 */}
          <img
            src={current.photo}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ opacity: 0.35 }}
          />
          {/* 글자가 읽히도록 위아래를 눌러 준다 */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#060409]/85 via-[#060409]/55 to-[#060409]/95" />
        </>
      ) : (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            background: accent,
            opacity: 0.18,
            filter: "blur(90px)",
            width: 300,
            height: 300,
            ...GLOW_POS[current.tint ?? "top"],
          }}
        />
      )}

      {/* 진행바 */}
      <div className="relative z-30 flex gap-1 px-4 pt-[max(12px,env(safe-area-inset-top))]">
        {slides.map((s, i) => (
          <span key={s.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
            <span
              className="block h-full rounded-full transition-[width] duration-300"
              style={{ width: i <= index ? "100%" : "0%", background: accent }}
            />
          </span>
        ))}
      </div>

      {/* 상단 바 */}
      <div className="relative z-30 flex items-center gap-2 px-4 pt-3">
        <p className="text-[10px] font-black tracking-[0.2em] text-white/40">
          {d.seasonLabel} WRAPPED
        </p>
        {preview && (
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-black"
            style={{ background: `${accent}2e`, color: accent }}
          >
            공개 전 · 운영진 미리보기
          </span>
        )}
        <Link
          href={exitHref}
          aria-label="닫기"
          className="ml-auto -mr-2 flex h-9 w-9 items-center justify-center text-white/45"
        >
          <X width={18} height={18} strokeWidth={2.4} />
        </Link>
      </div>

      {/* 본문 */}
      {/* 본문. 화면이 짧으면(가로 모드·작은 폰) 내용이 넘치므로 스크롤을 허용한다.
          넘치지 않을 땐 가운데 정렬이라 지금 보던 모습 그대로다. */}
      <div
        className={`pointer-events-none relative z-20 flex min-h-0 flex-1 items-center overflow-y-auto px-5 pb-20 sm:px-6 ${
          current.center ? "justify-center" : ""
        }`}
      >
        <motion.div
          key={current.key}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          // 글자 위를 눌러도 넘어가야 한다. 버튼(카드 저장)만 클릭을 되살린다.
          className="my-auto w-full [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
        >
          {current.node}
        </motion.div>
      </div>

      {/* 탭/클릭 영역 — 좌 35% 이전 / 우 65% 다음.
          본문보다 **위**에 둔다(z-10). 아래에 깔면 본문 div 가 덮어서 아무 데나 눌러도
          안 넘어간다 — 실제로 그렇게 깔았다가 데스크톱·모바일 둘 다 못 넘겼다.
          본문은 z-20 이지만 pointer-events-none 이라 클릭이 이 층까지 내려온다. */}
      <button
        type="button"
        aria-label="이전"
        onClick={() => go(-1)}
        className="absolute inset-y-0 left-0 z-10 w-[35%] cursor-w-resize"
      />
      <button
        type="button"
        aria-label="다음"
        onClick={() => go(1)}
        className="absolute inset-y-0 right-0 z-10 w-[65%] cursor-e-resize"
      />

      {/* 하단 네비 — 탭 영역만 있으면 넘길 수 있다는 걸 모른다 */}
      <div className="relative z-30 flex items-center justify-between px-6 pb-[max(20px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.07] text-white/60 disabled:opacity-25"
          aria-label="이전"
        >
          <ChevronLeft width={17} height={17} strokeWidth={2.6} />
        </button>
        <p className="text-[11px] font-black tabular-nums text-white/30">
          {index + 1} / {total}
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === total - 1}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white disabled:opacity-25"
          style={{ background: `${accent}33` }}
          aria-label="다음"
        >
          <ChevronRight width={17} height={17} strokeWidth={2.6} />
        </button>
      </div>
    </main>
  );
}
