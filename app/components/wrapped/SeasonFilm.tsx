"use client";

// 시즌 필름 — 개인 래핑 앞에 붙는 팀 오프닝.
//
// 래핑 본편은 "한 장씩 읽는" 화면이라 자동으로 넘기지 않는다. 이건 반대로 **보는** 화면이다 —
// 사진·스코어·얼굴이 지나가는 40초짜리 모션그래픽이라 저절로 흐른다. 화면을 누르면 다음 장,
// 우상단 "건너뛰기" 로 바로 본편. 마지막 장은 멈춰서 "내 시즌 열기" 를 기다린다.
//
// 장마다 재료가 없으면 그 장은 건너뛴다(사진이 없는 시즌에 빈 몽타주를 틀지 않는다).
//
// 연출 메모
//   · 전체에 필름 그레인·비네팅을 깔고, 장이 바뀔 때마다 빛 줄기가 한 번 쓸고 지나간다.
//   · 무거운 효과(blur·3D)는 장 하나에 한두 개만. 폰에서 30fps 아래로 떨어지면 화려함이 아니라 버벅임이다.
//   · 무작위 배치는 전부 rnd(i) — 고정 시드라 서버·클라이언트 렌더가 같다(하이드레이션 불일치 방지).
//   · prefers-reduced-motion 이면 이동·확대·파티클 없이 나타나기만 한다.

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, CloudRain, Snowflake, Sun } from "lucide-react";
import PlayerFace from "../PlayerFace";
import { CountUp } from "./motion";
import { Burst, Confetti, EASE_OUT, GOLD, Rings, Shine, rnd } from "../fx/effects";

export interface FilmMatch {
  date: string;
  /** 화면에 찍을 상대 이름. 자체전류는 "자체전"·"풋살" 같은 이름. */
  opponent: string;
  logo: string | null;
  our: number | null;
  their: number | null;
  result: string;
  casual: boolean;
  photo?: string;
}

export interface FilmPhoto {
  src: string;
  date: string;
  opponent: string;
}

export interface FilmLeader {
  label: string;
  unit: string;
  names: string[];
  value: number;
}

export interface SeasonFilmData {
  seasonId: string;
  seasonLabel: string;
  /** 첫 시즌이면 "THE FIRST SEASON" 으로 연다. */
  isFirstSeason: boolean;
  /** 야유회를 뺀, 실제로 치른 경기 수(자체전 포함). */
  matchCount: number;
  team: { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
  matches: FilmMatch[];
  /** 몽타주용. 시즌 전체에서 고르게 뽑아 날짜순. */
  montage: FilmPhoto[];
  /** 마지막 장 콜라주용. */
  collage: string[];
  leaders: FilmLeader[];
  /** 한 경기라도 뛴 사람. 출전 많은 순. */
  squad: string[];
  biggestWin: FilmMatch | null;
  opponentCount: number;
  records: { winStreak: number; unbeaten: number; scorers: number; venues: number; photos: number };
  /** 달마다 치른 경기 수(YYYY-MM). */
  monthly: { month: string; count: number }[];
  duo: { a: string; b: string; count: number } | null;
  rival: {
    name: string;
    logo: string | null;
    played: number;
    w: number;
    d: number;
    l: number;
    games: { date: string; venue: string; our: number | null; their: number | null; result: string }[];
  } | null;
  weather: { rainy: number; coldest: { temp: number; date: string }; hottest: { temp: number; date: string } } | null;
}

const dot = (d: string) => d.replaceAll("-", ".");
const RESULT_COLOR: Record<string, string> = { 승: "#34d399", 무: "#cbd5e1", 패: "#94a3b8" };
/** 몽타주 컷 길이 — 느리게 시작해 점점 빨라지고, 마지막 컷은 길게 멈춘다. */
function montageDurations(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 1100 : Math.max(190, Math.round(680 * Math.pow(0.84, i)))));
}

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/** 필름 전용 키프레임. 컴포넌트와 같이 다니게 여기 둔다. */
const FILM_CSS = `
@keyframes film-grain{0%,100%{transform:translate(0,0)}20%{transform:translate(-6%,4%)}40%{transform:translate(5%,-7%)}60%{transform:translate(-4%,-3%)}80%{transform:translate(7%,6%)}}
@keyframes film-shimmer{from{background-position:220% 0}to{background-position:-220% 0}}
@keyframes film-spin{to{transform:rotate(360deg)}}
.film-grain{animation:film-grain .5s steps(4) infinite}
.film-shimmer{background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:film-shimmer 3.2s linear infinite}
.film-spin-fast{animation:film-spin 3s linear infinite}
.film-orbit{animation:film-spin 4.5s linear infinite}
.film-orbit-rev{animation:film-spin 7s linear infinite reverse}
@media (prefers-reduced-motion: reduce){.film-grain,.film-shimmer,.film-spin-fast,.film-orbit,.film-orbit-rev{animation:none}}
`;

/** full = 화면 전체를 덮는 장(몽타주). 본문 칸 안에 두면 패딩·전환 transform 에 갇힌다. */
type Scene = { key: string; ms: number; node: ReactNode; photo?: string; full?: ReactNode };

export default function SeasonFilm({
  data,
  accent,
  name,
  nextLabel,
  children,
}: {
  data: SeasonFilmData;
  accent: string;
  /** 다음에 열 래핑의 주인. 마지막 장 버튼에 이름을 건다. */
  name: string;
  nextLabel?: string;
  /** 필름이 끝나면 보여줄 본편. */
  children: ReactNode;
}) {
  const [done, setDone] = useState(false);
  if (done) return <>{children}</>;
  return (
    <Film data={data} accent={accent} name={name} nextLabel={nextLabel} onDone={() => setDone(true)} />
  );
}

function Film({
  data: d,
  accent,
  name,
  nextLabel,
  onDone,
}: {
  data: SeasonFilmData;
  accent: string;
  name: string;
  nextLabel?: string;
  onDone: () => void;
}) {
  const reduce = !!useReducedMotion();
  // 움직임을 줄인 사용자에겐 이동·확대 없이 나타나기만 한다.
  const from = <T extends object>(v: T): T | false => (reduce ? false : v);
  const shimmerAccent: CSSProperties = {
    backgroundImage: `linear-gradient(110deg, ${accent} 35%, #fff 47%, ${GOLD} 50%, #fff 53%, ${accent} 65%)`,
  };
  const shimmer: CSSProperties = {
    backgroundImage: `linear-gradient(110deg, #fff 30%, ${accent} 45%, ${GOLD} 50%, ${accent} 55%, #fff 70%)`,
  };

  // 여기까지 왔으면 본 것이다 — 홈의 자동 열기(WrappedAutoOpen)가 다시 끌고 오지 않게.
  useEffect(() => {
    try {
      localStorage.setItem(`wrapped_seen_${d.seasonId}`, "1");
    } catch {
      /* 저장이 막혀도 필름은 그대로 본다 */
    }
  }, [d.seasonId]);

  // 사진은 미리 받아 둔다 — 몽타주 컷이 0.2초까지 짧아져서 그때 받기 시작하면 빈 화면이 지나간다.
  useEffect(() => {
    [...d.montage.map((p) => p.src), ...d.collage].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [d.montage, d.collage]);

  const scenes: Scene[] = [];

  // ── 1. 오프닝: 커튼이 열리고 → 팀 모토 → 엠블럼 착지(궤도 링·충격파·불꽃·광택)
  //    첫 경기 날짜로 열지 않는다 — 기록된 첫 경기가 팀의 실제 시작일과 다를 수 있다.
  const motto = "NOT BECAUSE OF, BUT THANKS TO".split("");
  // 궤도 링: 가는 원 위를 빛 꼬리가 돈다. 방사형 빛줄기(햇살 무늬)는 쓰지 않는다.
  const ringMask = "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))";
  scenes.push({
    key: "open",
    ms: 5600,
    node: (
      <div className="flex flex-col items-center text-center">
        <div className="flex">
          {motto.map((ch, i) => (
            <motion.span
              key={i}
              initial={from({ opacity: 0, y: -6, filter: "blur(6px)" })}
              animate={{ opacity: 0.7, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.5 + i * 0.03, duration: 0.3 }}
              className="text-[10px] font-black tracking-[0.22em] text-white"
            >
              {ch === " " ? "\u00a0" : ch}
            </motion.span>
          ))}
        </div>

        <div className="relative my-12 flex h-40 w-40 items-center justify-center">
          {[
            { size: 184, cls: "film-orbit", alpha: "ff", delay: 2.0 },
            { size: 222, cls: "film-orbit-rev", alpha: "99", delay: 2.25 },
          ].map((o) => (
            <motion.div
              key={o.size}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: o.size, height: o.size }}
              initial={from({ opacity: 0, scale: 0.6 })}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: o.delay, duration: 1.0, ease: EASE_OUT }}
            >
              <div className="absolute inset-0 rounded-full border border-white/[0.07]" />
              <div
                className={`${o.cls} absolute inset-0 rounded-full`}
                style={{
                  background: `conic-gradient(from 0deg, transparent 0deg 230deg, ${accent}${o.alpha} 330deg, #fff 360deg)`,
                  maskImage: ringMask,
                  WebkitMaskImage: ringMask,
                  filter: `drop-shadow(0 0 6px ${accent})`,
                }}
              />
            </motion.div>
          ))}
          <motion.span
            className="absolute inset-4 rounded-full"
            style={{ background: accent, filter: "blur(44px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.35] }}
            transition={{ delay: 1.9, duration: 1.8 }}
          />
          {!reduce && <Rings delay={2.2} color={accent} />}
          {!reduce && <Burst delay={2.2} count={26} radius={150} colors={[accent, "#fff", GOLD]} />}
          <motion.div
            className="relative h-28 w-28"
            initial={from({ opacity: 0, scale: 2.6, filter: "blur(18px)" })}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 1.5, duration: 0.75, ease: [0.7, 0, 0.84, 0] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 정적 엠블럼 */}
            <img src="/underduck-mark.png" alt="" className="h-full w-full" />
            {/* 광택 — 엠블럼 선 모양으로만 비치게 엠블럼 자체를 마스크로 쓴다 */}
            {!reduce && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  maskImage: "url(/underduck-mark.png)",
                  WebkitMaskImage: "url(/underduck-mark.png)",
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                }}
              >
                <motion.div
                  className="absolute inset-y-0 w-1/2 -skew-x-12"
                  style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, #fff, transparent)` }}
                  initial={{ x: "-150%" }}
                  animate={{ x: "350%" }}
                  transition={{ delay: 2.6, duration: 1.1, ease: "easeInOut" }}
                />
              </div>
            )}
          </motion.div>
        </div>

        <div className="flex">
          {"UNDERDUCK FC".split("").map((ch, i) => (
            <motion.span
              key={i}
              initial={from({ opacity: 0, y: 26, rotateX: -90, filter: "blur(8px)" })}
              animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
              transition={{ delay: 2.5 + i * 0.05, duration: 0.55, ease: EASE_OUT }}
              className="inline-block text-[32px] font-black tracking-[-0.02em] text-white"
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </div>
        <motion.p
          initial={from({ opacity: 0, letterSpacing: "0.1em" })}
          animate={{ opacity: 1, letterSpacing: "0.38em" }}
          transition={{ delay: 3.3, duration: 1.2, ease: EASE_OUT }}
          className="mt-3 text-[11px] font-black"
          style={{ color: accent }}
        >
          {d.isFirstSeason ? "THE FIRST SEASON" : "SEASON"} · {d.seasonLabel}
        </motion.p>
      </div>
    ),
  });

  // ── 2. 몽타주: 점점 빨라지는 컷 + 글리치
  if (d.montage.length >= 4) {
    const durs = montageDurations(d.montage.length);
    scenes.push({
      key: "montage",
      ms: durs.reduce((a, b) => a + b, 0) + 300,
      node: null,
      full: (
        <Montage
          photos={d.montage}
          durs={durs}
          accent={accent}
          matchCount={d.matchCount}
          seasonLabel={d.seasonLabel}
          reduce={reduce}
        />
      ),
    });
  }

  // ── 3. 숫자: 경기 수(잔상) + 승률 링 + 승무패 막대
  const t = d.team;
  const bars = [
    { k: "승", v: t.wins, c: accent },
    { k: "무", v: t.draws, c: "#cbd5e1" },
    { k: "패", v: t.losses, c: "#64748b" },
  ];
  const maxBar = Math.max(1, ...bars.map((b) => b.v));
  const winRate = t.played > 0 ? Math.round((t.wins / t.played) * 100) : 0;
  scenes.push({
    key: "numbers",
    ms: 5800,
    node: (
      <div className="w-full">
        <motion.p
          initial={from({ opacity: 0, x: -12 })}
          animate={{ opacity: 1, x: 0 }}
          className="text-[13px] font-bold text-white/50"
        >
          {d.seasonLabel} 시즌 동안
        </motion.p>
        <div className="mt-2 flex items-end justify-between">
          <div className="flex items-end gap-2">
            <div className="relative">
              {/* 잔상 — 숫자가 다 오른 순간 바깥으로 퍼진다 */}
              {!reduce &&
                [0, 1, 2].map((k) => (
                  <motion.p
                    key={k}
                    aria-hidden
                    className="absolute inset-0 text-[108px] font-black leading-[0.85] tracking-[-0.06em] tabular-nums text-transparent"
                    style={{ WebkitTextStroke: `1.5px ${accent}` }}
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ opacity: [0, 0.7, 0], scale: [1, 1.5 + k * 0.25] }}
                    transition={{ delay: 1.25 + k * 0.12, duration: 0.9, ease: "easeOut" }}
                  >
                    {d.matchCount}
                  </motion.p>
                ))}
              <motion.p
                className="relative text-[108px] font-black leading-[0.85] tracking-[-0.06em] tabular-nums text-white"
                initial={from({ scale: 0.6, opacity: 0 })}
                animate={{ scale: [0.6, 1, 1, 1.12, 1], opacity: 1 }}
                transition={{ duration: 1.5, times: [0, 0.25, 0.8, 0.88, 1] }}
              >
                <CountUp value={d.matchCount} duration={1200} />
              </motion.p>
            </div>
            <p className="pb-2 text-[26px] font-black text-white/70">경기</p>
          </div>
          <WinRing rate={winRate} accent={accent} reduce={reduce} />
        </div>
        <div className="mt-8 flex h-[150px] items-end gap-3">
          {bars.map((b, i) => (
            <div key={b.k} className="flex flex-1 flex-col items-center justify-end gap-2">
              <motion.p
                initial={from({ opacity: 0, y: 8 })}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 + i * 0.15 }}
                className="text-[22px] font-black tabular-nums text-white"
              >
                {b.v}
              </motion.p>
              <motion.div
                className="relative w-full overflow-hidden rounded-t-xl"
                style={{
                  background: `linear-gradient(180deg, ${b.c}, ${b.c}99)`,
                  transformOrigin: "bottom",
                  boxShadow: i === 0 ? `0 0 30px ${accent}55` : undefined,
                }}
                initial={from({ scaleY: 0 })}
                animate={{ scaleY: 1 }}
                transition={{ delay: 1.4 + i * 0.15, duration: 0.8, ease: EASE_OUT }}
              >
                <div style={{ height: Math.max(6, (b.v / maxBar) * 96) }} />
                {!reduce && <Shine delay={2.3 + i * 0.12} />}
              </motion.div>
              <p className="text-[12px] font-black text-white/45">{b.k}</p>
            </div>
          ))}
        </div>
        <motion.p
          initial={from({ opacity: 0, y: 10, filter: "blur(6px)" })}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 2.7, duration: 0.6 }}
          className="mt-7 text-[19px] font-black leading-snug text-white"
        >
          <span style={{ color: accent }}>{t.goalsFor}골</span>을 넣고{" "}
          <span className="text-white/60">{t.goalsAgainst}골</span>을 내줬어요.
        </motion.p>
      </div>
    ),
  });

  // ── 3-2. 기록실: 숫자 타일 + 달력 막대
  {
    const r = d.records;
    const tiles = [
      { label: "최다 연승", value: r.winStreak, unit: "연승" },
      { label: "무패 행진", value: r.unbeaten, unit: "경기" },
      { label: "골맛 본 선수", value: r.scorers, unit: "명" },
      { label: "누빈 구장", value: r.venues, unit: "곳" },
      { label: "남긴 사진", value: r.photos, unit: "장" },
    ].filter((x) => x.value > 0);
    const peak = d.monthly.reduce((a, b) => (b.count > a.count ? b : a), d.monthly[0]);
    const maxM = Math.max(1, ...d.monthly.map((m) => m.count));
    if (tiles.length >= 3) {
      scenes.push({
        key: "records",
        ms: 6000,
        node: (
          <div className="w-full">
            <motion.p
              initial={from({ opacity: 0, y: 10 })}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] font-black tracking-[0.3em]"
              style={{ color: accent }}
            >
              SEASON RECORDS
            </motion.p>
            <motion.p
              initial={from({ opacity: 0, y: 10 })}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-1 text-[30px] font-black tracking-[-0.03em] text-white"
            >
              숫자로 본 시즌
            </motion.p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {tiles.map((x, i) => (
                <motion.div
                  key={x.label}
                  initial={from({ opacity: 0, scale: 0.6, y: 20 })}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.12, type: "spring", stiffness: 260, damping: 18 }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] px-2.5 py-3"
                >
                  <p className="text-[10px] font-black text-white/45">{x.label}</p>
                  <p className="mt-1 text-[26px] font-black leading-none tabular-nums text-white">
                    <CountUp value={x.value} duration={1000} />
                    <span className="ml-0.5 text-[11px] text-white/50">{x.unit}</span>
                  </p>
                  {!reduce && <Shine delay={1.4 + i * 0.1} />}
                </motion.div>
              ))}
            </div>
            {d.monthly.length >= 3 && (
              <div className="mt-7">
                <div className="flex h-[72px] items-end gap-1">
                  {d.monthly.map((m, i) => (
                    <motion.div
                      key={m.month}
                      className="flex-1 rounded-t-md"
                      style={{
                        height: `${(m.count / maxM) * 100}%`,
                        background: m === peak ? accent : "rgba(255,255,255,0.18)",
                        boxShadow: m === peak ? `0 0 18px ${accent}` : undefined,
                        transformOrigin: "bottom",
                      }}
                      initial={from({ scaleY: 0 })}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 1.6 + i * 0.05, duration: 0.5, ease: EASE_OUT }}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex gap-1">
                  {d.monthly.map((m) => (
                    <p key={m.month} className="flex-1 text-center text-[8.5px] font-bold tabular-nums text-white/35">
                      {Number(m.month.slice(5))}
                    </p>
                  ))}
                </div>
                <motion.p
                  initial={from({ opacity: 0 })}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.6 }}
                  className="mt-3 text-[13px] font-bold text-white/55"
                >
                  가장 바빴던 달은{" "}
                  <span style={{ color: accent }}>
                    {Number(peak.month.slice(5))}월 · {peak.count}경기
                  </span>
                </motion.p>
              </div>
            )}
          </div>
        ),
      });
    }
  }

  // ── 4. 전적 벽: 기울어진 3D 벽에 모든 경기가 흐른다
  if (d.matches.length >= 4) {
    const rowCount = d.matches.length >= 9 ? 3 : 2;
    const per = Math.ceil(d.matches.length / rowCount);
    const rows = Array.from({ length: rowCount }, (_, r) => d.matches.slice(r * per, (r + 1) * per));
    scenes.push({
      key: "results",
      ms: 5600,
      node: (
        <div className="relative w-full">
          <motion.p
            initial={from({ opacity: 0, scale: 1.3, filter: "blur(10px)" })}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.3, duration: 0.7, ease: EASE_OUT }}
            className="text-[32px] font-black leading-tight tracking-[-0.03em] text-white"
          >
            {d.opponentCount > 0 ? (
              <>
                <span style={{ color: accent }}>{d.opponentCount}팀</span>과 붙었고
              </>
            ) : (
              "매 경기가"
            )}
            <br />
            <span className="text-white/65">모든 경기가 기록이 됐어요</span>
          </motion.p>
          <div
            className="pointer-events-none relative -mx-24 mt-10"
            style={{
              perspective: 900,
              maskImage: "linear-gradient(90deg, transparent, #000 25%, #000 75%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, #000 25%, #000 75%, transparent)",
            }}
          >
            <motion.div
              className="space-y-3"
              initial={from({ opacity: 0, rotateX: 55, rotateZ: -14, scale: 1.3, y: 80 })}
              animate={{ opacity: 1, rotateX: 22, rotateZ: -8, scale: 1.05, y: 0 }}
              transition={{ delay: 0.6, duration: 1.4, ease: EASE_OUT }}
            >
              {rows.map((items, r) => (
                <Marquee key={r} items={items} dir={r % 2 ? 1 : -1} reduce={reduce} speed={1 + r * 0.25} />
              ))}
            </motion.div>
          </div>
        </div>
      ),
    });
  }

  // ── 4-2. 라이벌: 대각선으로 갈라진 VS 화면
  const rv = d.rival;
  if (rv) {
    scenes.push({
      key: "rival",
      ms: 5600 + rv.games.length * 300,
      node: (
        <div className="relative w-full text-center">
          <motion.p
            initial={from({ opacity: 0, y: 8 })}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-black tracking-[0.3em]"
            style={{ color: accent }}
          >
            RIVAL
          </motion.p>
          <p className="mt-1 text-[26px] font-black tracking-[-0.03em] text-white">가장 많이 붙은 상대</p>
          <div className="relative mx-auto mt-6 flex h-[150px] max-w-[340px] items-center justify-between">
            <motion.div
              className="absolute inset-y-0 left-0 w-[58%] rounded-l-3xl"
              style={{ background: `linear-gradient(135deg, ${accent}55, transparent)`, clipPath: "polygon(0 0, 100% 0, 72% 100%, 0 100%)" }}
              initial={from({ x: "-110%" })}
              animate={{ x: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: EASE_OUT }}
            />
            <motion.div
              className="absolute inset-y-0 right-0 w-[58%] rounded-r-3xl"
              style={{ background: "linear-gradient(315deg, rgba(255,255,255,0.22), transparent)", clipPath: "polygon(28% 0, 100% 0, 100% 100%, 0 100%)" }}
              initial={from({ x: "110%" })}
              animate={{ x: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: EASE_OUT }}
            />
            <motion.div
              className="relative z-10 ml-6"
              initial={from({ opacity: 0, scale: 0.5 })}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 16 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 정적 엠블럼 */}
              <img src="/underducklogo.png" alt="" className="h-20 w-20 rounded-full shadow-2xl" />
            </motion.div>
            <motion.p
              className="relative z-10 text-[44px] font-black italic tracking-[-0.04em] text-white"
              initial={from({ opacity: 0, scale: 3 })}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1, duration: 0.3, ease: [0.7, 0, 0.84, 0] }}
              style={{ textShadow: `0 0 30px ${accent}` }}
            >
              VS
            </motion.p>
            <motion.div
              className="relative z-10 mr-6"
              initial={from({ opacity: 0, scale: 0.5 })}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 16 }}
            >
              <Crest logo={rv.logo} name={rv.name} size={80} />
            </motion.div>
            {!reduce && <Rings delay={1.3} color={accent} />}
          </div>
          <motion.p
            initial={from({ opacity: 0, y: 10 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="mt-6 text-[22px] font-black text-white"
          >
            {rv.name}
          </motion.p>
          <motion.p
            initial={from({ opacity: 0, y: 10 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7 }}
            className="mt-1 text-[14px] font-bold tabular-nums text-white/60"
          >
            {rv.played}번 붙어 <span style={{ color: accent }}>{rv.w}승</span> {rv.d}무 {rv.l}패
          </motion.p>
          {rv.games.length > 0 && (
            <div className="mx-auto mt-5 max-w-[340px] space-y-1.5 text-left">
              {rv.games.map((g, i) => (
                <motion.div
                  key={g.date + i}
                  initial={from({ opacity: 0, x: i % 2 ? 40 : -40 })}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.9 + i * 0.15, duration: 0.5, ease: EASE_OUT }}
                  className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5"
                >
                  <span
                    className="h-7 w-1 shrink-0 rounded-full"
                    style={{ background: RESULT_COLOR[g.result] ?? "#fff", boxShadow: `0 0 8px ${RESULT_COLOR[g.result] ?? "#fff"}` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold tabular-nums text-white/45">{dot(g.date)}</p>
                    <p className="truncate text-[12.5px] font-black text-white/85">{g.venue || "장소 미정"}</p>
                  </div>
                  <p className="text-[20px] font-black tabular-nums text-white">
                    {g.our ?? "-"}
                    <span className="mx-1 text-white/35">:</span>
                    {g.their ?? "-"}
                  </p>
                  <span className="w-4 text-[12px] font-black" style={{ color: RESULT_COLOR[g.result] ?? "#fff" }}>
                    {g.result}
                  </span>
                  {!reduce && <Shine delay={2.4 + i * 0.15} />}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ),
    });
  }

  // ── 5. 리더: 카드가 하나씩 뒤집혀 들어온다. 부문마다 자기 색으로 테두리가 돌고 빛난다
  if (d.leaders.length > 0) {
    const LEADER_COLOR: Record<string, string> = {
      득점왕: GOLD,
      도움왕: "#7dd3fc",
      공포왕: accent,
      MOM: "#c4b5fd",
      클린시트왕: "#34d399",
      개근: "#fb923c",
    };
    const step = Math.min(0.32, 2.4 / d.leaders.length);
    scenes.push({
      key: "leaders",
      ms: 4000 + d.leaders.length * 450,
      node: (
        <div className="w-full">
          <motion.p
            initial={from({ opacity: 0, y: 10 })}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-black tracking-[0.3em]"
            style={{ color: accent }}
          >
            SEASON LEADERS
          </motion.p>
          <motion.p
            initial={from({ opacity: 0, y: 10 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="film-shimmer mt-1 text-[28px] font-black tracking-[-0.03em]"
            style={shimmer}
          >
            시즌을 이끈 이름들
          </motion.p>
          <div className="mt-5 grid grid-cols-2 gap-2.5" style={{ perspective: 800 }}>
            {d.leaders.map((l, i) => {
              const c = LEADER_COLOR[l.label] ?? accent;
              const landed = 0.5 + i * step + 0.7;
              return (
                <motion.div
                  key={l.label}
                  initial={from({ opacity: 0, rotateY: -95, y: 20 })}
                  animate={{ opacity: 1, rotateY: 0, y: 0 }}
                  transition={{ delay: 0.5 + i * step, duration: 0.7, ease: EASE_OUT }}
                  className="relative rounded-2xl"
                >
                  {/* 착지하면 자기 색으로 한 번 번쩍 */}
                  {!reduce && (
                    <motion.div
                      className="pointer-events-none absolute -inset-1 rounded-[20px]"
                      style={{ background: c, filter: "blur(14px)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.6, 0.18] }}
                      transition={{ delay: landed - 0.1, duration: 1.2 }}
                    />
                  )}
                  <div className="relative overflow-hidden rounded-2xl p-[1.5px]">
                    {/* 회전 테두리 — 카드마다 시작 각도를 달리해 한꺼번에 같은 박자로 돌지 않게 */}
                    <div
                      className="film-spin-fast absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2"
                      style={{
                        background: `conic-gradient(from ${i * 60}deg, transparent 0deg, ${c} 70deg, #fff 95deg, ${c} 120deg, transparent 190deg, transparent 360deg)`,
                        animationDelay: `-${i * 0.5}s`,
                      }}
                    />
                    <div
                      className="relative h-full overflow-hidden rounded-[14.5px] px-3 py-2.5"
                      style={{ background: `linear-gradient(160deg, ${c}26, #120c14 55%)` }}
                    >
                      <p className="text-[10px] font-black tracking-[0.18em]" style={{ color: c }}>
                        {l.label}
                      </p>
                      <div className="mt-2 flex -space-x-2">
                        {l.names.slice(0, 3).map((n, k) => (
                          <motion.span
                            key={n}
                            className="rounded-full"
                            style={{ boxShadow: `0 0 0 2px #120c14, 0 0 0 3.5px ${c}` }}
                            initial={from({ scale: 0, rotate: -30 })}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: landed - 0.3 + k * 0.08, type: "spring", stiffness: 380, damping: 16 }}
                          >
                            <PlayerFace name={n} size={38} />
                          </motion.span>
                        ))}
                      </div>
                      <p className="mt-1.5 truncate text-[13px] font-black text-white">{l.names.join(" · ")}</p>
                      <p className="text-[24px] font-black tabular-nums leading-tight text-white" style={{ textShadow: `0 0 18px ${c}88` }}>
                        <CountUp value={l.value} duration={900} />
                        <span className="ml-0.5 text-[12px] text-white/50">{l.unit}</span>
                      </p>
                      {!reduce && <Shine delay={landed} />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ),
    });
  }

  // ── 5-2. 최고의 콤비: 양쪽에서 달려와 부딪힌다
  const duoPair = d.duo;
  if (duoPair) {
    scenes.push({
      key: "duo",
      ms: 5000,
      node: (
        <div className="w-full text-center">
          <motion.p
            initial={from({ opacity: 0, y: 8 })}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-black tracking-[0.3em]"
            style={{ color: accent }}
          >
            BEST DUO
          </motion.p>
          <p className="mt-1 text-[28px] font-black tracking-[-0.03em] text-white">최고의 콤비</p>
          <div className="relative mt-10 flex items-center justify-center">
            <motion.div
              initial={from({ x: -220, opacity: 0, rotate: -20 })}
              animate={{ x: 10, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.7, 0, 0.84, 0] }}
              className="relative z-10 rounded-full p-1"
              style={{ background: accent }}
            >
              <PlayerFace name={duoPair.a} size={104} />
            </motion.div>
            <motion.div
              initial={from({ x: 220, opacity: 0, rotate: 20 })}
              animate={{ x: -10, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.7, 0, 0.84, 0] }}
              className="relative rounded-full p-1"
              style={{ background: GOLD }}
            >
              <PlayerFace name={duoPair.b} size={104} />
            </motion.div>
            {!reduce && <Rings delay={1.0} color={GOLD} />}
            {!reduce && <Burst delay={1.0} count={22} radius={160} colors={[GOLD, accent, "#fff"]} />}
          </div>
          <motion.p
            initial={from({ opacity: 0, y: 12 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="mt-8 text-[22px] font-black text-white"
          >
            {duoPair.a} <span className="text-white/40">×</span> {duoPair.b}
          </motion.p>
          <motion.p
            initial={from({ opacity: 0, scale: 0.6 })}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.6, type: "spring", stiffness: 300, damping: 14 }}
            className="film-shimmer mt-2 text-[44px] font-black tabular-nums"
            style={shimmer}
          >
            {duoPair.count}골 합작
          </motion.p>
        </div>
      ),
    });
  }

  // ── 6. 스쿼드: 사방에서 날아와 한 팀으로 모인다
  if (d.squad.length > 0) {
    const fly = 0.25 + d.squad.length * 0.035 + 0.6;
    scenes.push({
      key: "squad",
      ms: Math.min(6400, Math.round(fly * 1000) + 2800),
      node: (
        <div className="w-full text-center">
          <div className="relative mx-auto grid max-w-[340px] grid-cols-6 gap-2">
            {d.squad.map((n, i) => (
              <motion.div
                key={n}
                initial={from({
                  opacity: 0,
                  x: (rnd(i, 1) - 0.5) * 700,
                  y: (rnd(i, 2) - 0.5) * 1000,
                  scale: 0.2 + rnd(i, 3),
                  rotate: (rnd(i, 4) - 0.5) * 120,
                })}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
                transition={{ delay: 0.25 + i * 0.035, type: "spring", stiffness: 140, damping: 16 }}
                className="flex justify-center"
              >
                <PlayerFace name={n} size={46} />
              </motion.div>
            ))}
            {/* 다 모인 순간 파동 한 번 */}
            {!reduce && (
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{ boxShadow: `0 0 0 2px ${accent}` }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.9, 1.15] }}
                transition={{ delay: fly, duration: 0.8 }}
              />
            )}
          </div>
          <motion.p
            initial={from({ opacity: 0, y: 14, filter: "blur(8px)" })}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: fly, duration: 0.6 }}
            className="mt-9 text-[32px] font-black leading-tight tracking-[-0.03em] text-white"
          >
            <span style={{ color: accent }}>{d.squad.length}명</span>의 언더덕이
            <br />
            함께 뛰었어요
          </motion.p>
        </div>
      ),
    });
  }

  // ── 6-2. 날씨: 비가 내리고, 가장 춥고 더웠던 날
  const wx = d.weather;
  if (wx) {
    scenes.push({
      key: "weather",
      ms: 5000,
      node: (
        <div className="relative w-full">
          {!reduce && wx.rainy > 0 && <Rain />}
          <motion.p
            initial={from({ opacity: 0, y: 8 })}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-black tracking-[0.3em]"
            style={{ color: accent }}
          >
            ALL WEATHER
          </motion.p>
          <p className="mt-1 text-[28px] font-black leading-tight tracking-[-0.03em] text-white">
            어떤 날씨에도
            <br />
            공은 굴러갔어요
          </p>
          <div className="mt-7 space-y-3">
            {[
              wx.rainy > 0 && { k: "rain", icon: CloudRain, label: "비 맞으며 뛴 경기", value: `${wx.rainy}경기`, sub: "", color: "#7dd3fc" },
              { k: "cold", icon: Snowflake, label: "가장 추웠던 날", value: `${wx.coldest.temp}℃`, sub: dot(wx.coldest.date), color: "#93c5fd" },
              { k: "hot", icon: Sun, label: "가장 더웠던 날", value: `${wx.hottest.temp}℃`, sub: dot(wx.hottest.date), color: "#fbbf24" },
            ]
              .filter((x): x is { k: string; icon: typeof Sun; label: string; value: string; sub: string; color: string } => !!x)
              .map((x, i) => (
                <motion.div
                  key={x.k}
                  initial={from({ opacity: 0, x: 60 })}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.25, duration: 0.6, ease: EASE_OUT }}
                  className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3"
                >
                  <x.icon width={26} height={26} strokeWidth={2.4} color={x.color} style={{ filter: `drop-shadow(0 0 8px ${x.color})` }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-white/55">{x.label}</p>
                    {x.sub && <p className="text-[10.5px] font-bold tabular-nums text-white/35">{x.sub}</p>}
                  </div>
                  <p className="text-[26px] font-black tabular-nums" style={{ color: x.color }}>
                    {x.value}
                  </p>
                  {!reduce && <Shine delay={1.3 + i * 0.2} />}
                </motion.div>
              ))}
          </div>
        </div>
      ),
    });
  }

  // ── 7. 가장 짜릿했던 날: 스코어가 내리꽂히고 화면이 흔들린다
  const w = d.biggestWin;
  if (w && w.our !== null && w.their !== null) {
    const SLAM = 1.0;
    scenes.push({
      key: "best",
      ms: 5400,
      photo: w.photo,
      node: (
        <motion.div
          className="relative w-full text-center"
          animate={reduce ? undefined : { x: [0, -10, 9, -6, 4, -2, 0], y: [0, 6, -5, 3, -2, 0, 0] }}
          transition={{ delay: SLAM, duration: 0.45 }}
        >
          <motion.p
            initial={from({ opacity: 0, letterSpacing: "0.6em" })}
            animate={{ opacity: 1, letterSpacing: "0.3em" }}
            transition={{ duration: 0.8 }}
            className="text-[12px] font-black"
            style={{ color: GOLD }}
          >
            가장 짜릿했던 날
          </motion.p>
          <p className="mt-2 text-[13px] font-bold tabular-nums text-white/60">{dot(w.date)}</p>
          <div className="relative mt-8 flex items-center justify-center gap-4">
            {!reduce && <Rings delay={SLAM} color={GOLD} />}
            {!reduce && <Burst delay={SLAM} count={30} radius={190} colors={[GOLD, "#fff", accent]} />}
            <motion.div initial={from({ opacity: 0, x: -60 })} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, ease: EASE_OUT }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 정적 엠블럼 */}
              <img src="/underducklogo.png" alt="" className="h-16 w-16 rounded-full" />
            </motion.div>
            <motion.p
              initial={from({ opacity: 0, scale: 4, filter: "blur(12px)" })}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ delay: SLAM - 0.3, duration: 0.3, ease: [0.7, 0, 0.84, 0] }}
              className="text-[72px] font-black tabular-nums tracking-[-0.04em] text-white"
              style={{ textShadow: `0 0 40px ${GOLD}88` }}
            >
              {w.our}
              <span className="mx-2 text-white/35">:</span>
              {w.their}
            </motion.p>
            <motion.div initial={from({ opacity: 0, x: 60 })} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, ease: EASE_OUT }}>
              <Crest logo={w.logo} name={w.opponent} size={64} />
            </motion.div>
          </div>
          <motion.p
            initial={from({ opacity: 0, y: 10 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: SLAM + 0.5 }}
            className="mt-6 text-[18px] font-black text-white"
          >
            vs {w.opponent}
          </motion.p>
          {/* 착지 플래시 */}
          {!reduce && (
            <motion.div
              className="pointer-events-none fixed inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ delay: SLAM, duration: 0.35 }}
            />
          )}
        </motion.div>
      ),
    });
  }

  // ── 8. 피날레: 3D 사진 벽 + 컨페티. 여기서 멈춘다
  scenes.push({
    key: "finale",
    ms: 0,
    node: (
      <div className="relative w-full text-center">
        <motion.p
          initial={from({ opacity: 0, y: 10 })}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-[15px] font-bold text-white/60"
        >
          {d.isFirstSeason ? "첫 시즌은 여기까지." : `${d.seasonLabel} 시즌은 여기까지.`}
        </motion.p>
        <motion.p
          initial={from({ opacity: 0, scale: 1.25, filter: "blur(12px)" })}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ delay: 1.0, duration: 0.9, ease: EASE_OUT }}
          className="mt-3 text-[34px] font-black leading-tight tracking-[-0.03em] text-white"
        >
          그 안에
          <br />
          <span className="film-shimmer" style={shimmerAccent}>
            {name}
          </span>
          님이 있었어요
        </motion.p>
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDone();
          }}
          initial={from({ opacity: 0, y: 14, scale: 0.9 })}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 2.0, duration: 0.5, ease: EASE_OUT }}
          className="pointer-events-auto relative mt-10 inline-flex items-center gap-1.5 overflow-hidden rounded-full px-7 py-4 text-[15px] font-black text-[#060409]"
          style={{ background: `linear-gradient(135deg, #fff, ${accent})`, boxShadow: `0 10px 50px ${accent}88` }}
        >
          내 시즌 열어보기
          <ChevronRight width={18} height={18} strokeWidth={3} />
          {!reduce && <Shine delay={2.6} repeat />}
        </motion.button>
        {nextLabel && (
          <motion.p
            initial={from({ opacity: 0 })}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.6 }}
            className="mt-6 text-[11px] font-black tracking-[0.2em] text-white/35"
          >
            NEXT · {nextLabel} SEASON
          </motion.p>
        )}
        <motion.p
          initial={from({ opacity: 0 })}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.8 }}
          className="mt-3 text-[11px] font-bold text-white/40"
        >
          다시 보려면 <span className="text-white/65">MY → {d.seasonLabel} 시즌 돌아보기</span>
        </motion.p>
      </div>
    ),
  });

  const [index, setIndex] = useState(0);
  const scene = scenes[Math.min(index, scenes.length - 1)];
  const last = index >= scenes.length - 1;
  const next = useCallback(() => setIndex((i) => Math.min(scenes.length - 1, i + 1)), [scenes.length]);

  // 자동 재생. 마지막 장(ms=0)은 버튼을 기다린다.
  const sceneMs = scene.ms;
  useEffect(() => {
    if (!sceneMs) return;
    const timer = setTimeout(next, sceneMs);
    return () => clearTimeout(timer);
  }, [index, sceneMs, next]);

  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden bg-[#060409]"
      onClick={() => !last && next()}
    >
      <style>{FILM_CSS}</style>

      {/* 배경: 사진이 있는 장은 사진, 피날레는 3D 사진 벽, 나머지는 시즌색 글로우 */}
      <AnimatePresence>
        {scene.photo ? (
          <motion.div
            key={`bg-${scene.key}`}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary 변환본 */}
            <motion.img
              src={scene.photo}
              alt=""
              className="h-full w-full object-cover"
              initial={from({ scale: 1.25 })}
              animate={{ scale: 1.02 }}
              transition={{ duration: 6, ease: "linear" }}
              style={{ opacity: 0.42 }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#060409]/85 via-[#060409]/35 to-[#060409]/95" />
          </motion.div>
        ) : last && d.collage.length > 0 ? (
          <motion.div
            key="bg-wall"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4 }}
          >
            <PhotoWall photos={d.collage} reduce={reduce} />
            <div className="absolute inset-0 bg-[#060409]/65" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#060409_15%,transparent_72%)]" />
            {!reduce && <Confetti colors={[accent, "#fff", GOLD]} />}
          </motion.div>
        ) : (
          <motion.div
            key={`glow-${scene.key}`}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)`, filter: "blur(60px)" }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.28, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          />
        )}
      </AnimatePresence>

      {scene.full && (
        <div key={`full-${scene.key}`} className="pointer-events-none absolute inset-0 z-10">
          {scene.full}
        </div>
      )}

      {/* 레터박스 — 오프닝에서 커튼처럼 열리고, 몽타주부터 걷힌다 */}
      {!reduce &&
        (["top-0", "bottom-0"] as const).map((pos) => (
          <motion.div
            key={pos}
            className={`pointer-events-none absolute inset-x-0 ${pos} z-[25] bg-black`}
            initial={{ height: "50%" }}
            animate={{ height: scene.key === "open" ? "11%" : "0%" }}
            transition={{ duration: scene.key === "open" ? 1.3 : 0.8, ease: [0.65, 0, 0.35, 1], delay: scene.key === "open" ? 0.15 : 0 }}
          />
        ))}

      {/* 장 전환 빛 줄기 */}
      {!reduce && index > 0 && (
        <motion.div
          key={`sweep-${index}`}
          className="pointer-events-none absolute inset-y-0 z-[26] w-[60%] -skew-x-[20deg]"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}40, #ffffff66, ${accent}40, transparent)`,
            mixBlendMode: "screen",
          }}
          initial={{ x: "-120%" }}
          animate={{ x: "260%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      )}

      {/* 그레인 + 비네팅 — 화면 전체를 필름처럼 */}
      <div className="pointer-events-none absolute inset-0 z-[27] overflow-hidden">
        <div className="film-grain absolute -inset-[20%] opacity-[0.09] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,#000000b0_100%)]" />
      </div>

      {/* 진행 바 — 장마다 자기 길이만큼 찬다 */}
      <div className="relative z-30 flex gap-1 px-4 pt-[max(12px,env(safe-area-inset-top))]">
        {scenes.map((s, i) => (
          <span key={s.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
            {i < index || (i === index && last) ? (
              <span className="block h-full w-full rounded-full" style={{ background: accent }} />
            ) : i === index ? (
              <motion.span
                key={`fill-${s.key}`}
                className="block h-full rounded-full"
                style={{ background: accent }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: s.ms / 1000, ease: "linear" }}
              />
            ) : null}
          </span>
        ))}
      </div>

      <div className="relative z-30 flex items-center px-4 pt-3">
        <p className="text-[10px] font-black tracking-[0.2em] text-white/40">{d.seasonLabel} FILM</p>
        {!last && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDone();
            }}
            className="ml-auto rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/70 backdrop-blur"
          >
            건너뛰기
          </button>
        )}
      </div>

      <div className="pointer-events-none relative z-20 flex min-h-0 flex-1 items-center justify-center px-5 pb-16 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.key}
            className="w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06, filter: "blur(10px)" }}
            transition={{ duration: 0.35 }}
          >
            {scene.node}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

/** 사진 컷 몽타주. 컷마다 글리치(가로 조각이 어긋났다 맞춰짐) + 플래시. */
function Montage({
  photos,
  durs,
  accent,
  matchCount,
  seasonLabel,
  reduce,
}: {
  photos: FilmPhoto[];
  durs: number[];
  accent: string;
  matchCount: number;
  seasonLabel: string;
  reduce: boolean;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= photos.length - 1) return;
    const timer = setTimeout(() => setI(i + 1), durs[i]);
    return () => clearTimeout(timer);
  }, [i, photos.length, durs]);
  const p = photos[i];
  const total = durs.reduce((a, b) => a + b, 0) / 1000;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence>
        <motion.img
          key={p.src + i}
          src={p.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.22 }}
          animate={{ opacity: 1, scale: 1.04 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.1 }, scale: { duration: 1.2, ease: "easeOut" } }}
        />
      </AnimatePresence>
      {/* 글리치 조각 */}
      {!reduce &&
        [0, 1, 2].map((k) => {
          const top = Math.round(rnd(i * 3 + k, 7) * 80);
          const h = 4 + Math.round(rnd(i * 3 + k, 8) * 12);
          return (
            <motion.img
              key={`g-${i}-${k}`}
              src={p.src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ clipPath: `inset(${top}% 0 ${Math.max(0, 100 - top - h)}% 0)`, mixBlendMode: k === 1 ? "screen" : "normal" }}
              initial={{ x: (rnd(i * 3 + k, 9) - 0.5) * 60, opacity: 0.95 }}
              animate={{ x: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          );
        })}
      {!reduce && (
        <motion.div
          key={`flash-${i}`}
          className="absolute inset-0"
          style={{ background: i % 3 === 0 ? accent : "#fff", mixBlendMode: "overlay" }}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060409] via-[#060409]/15 to-[#060409]/70" />

      {/* 거대한 외곽선 글자가 천천히 흘러간다 */}
      <motion.p
        aria-hidden
        className="absolute top-[30%] whitespace-nowrap text-[42vw] font-black leading-none tracking-[-0.05em] text-transparent sm:text-[180px]"
        style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.28)" }}
        initial={{ x: "5%" }}
        animate={reduce ? undefined : { x: "-45%" }}
        transition={{ duration: total, ease: "linear" }}
      >
        {seasonLabel} {seasonLabel}
      </motion.p>

      {/* 프레임 카운터 — 필름 느낌 */}
      <p className="absolute right-5 top-[calc(max(12px,env(safe-area-inset-top))+44px)] font-mono text-[11px] font-bold tabular-nums text-white/60">
        {String(i + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
      </p>

      <div className="absolute inset-x-0 bottom-0 px-6 pb-[max(56px,env(safe-area-inset-bottom))]">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="text-[58px] font-black leading-[0.9] tracking-[-0.05em] text-white"
        >
          {matchCount}번의
          <br />
          <span style={{ color: accent }}>그라운드</span>
        </motion.p>
        <div className="mt-4 h-4 overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.p
              key={i}
              initial={reduce ? false : { y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[12px] font-black tabular-nums tracking-[0.12em] text-white/75"
            >
              {dot(p.date)} · vs {p.opponent}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/** 승률 링. */
function WinRing({ rate, accent, reduce }: { rate: number; accent: string; reduce: boolean }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mb-1 h-[88px] w-[88px] shrink-0">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
        <motion.circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - rate / 100) : c }}
          animate={{ strokeDashoffset: c * (1 - rate / 100) }}
          transition={{ delay: 1.4, duration: 1.3, ease: EASE_OUT }}
          style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[20px] font-black tabular-nums leading-none text-white">
          <CountUp value={rate} duration={1500} />%
        </p>
        <p className="mt-1 text-[9px] font-black tracking-[0.15em] text-white/45">승률</p>
      </div>
    </div>
  );
}

/** 경기 칩이 옆으로 흐르는 띠. 끊김 없이 돌도록 목록을 두 번 잇는다. */
function Marquee({ items, dir, reduce, speed = 1 }: { items: FilmMatch[]; dir: 1 | -1; reduce: boolean; speed?: number }) {
  const loop = [...items, ...items];
  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex w-max gap-2.5"
        initial={{ x: dir < 0 ? "0%" : "-50%" }}
        animate={reduce ? undefined : { x: dir < 0 ? "-50%" : "0%" }}
        transition={{ duration: Math.max(7, items.length * 1.0) / speed, ease: "linear", repeat: Infinity }}
      >
        {loop.map((m, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.07] py-2 pl-2 pr-3.5"
          >
            <Crest logo={m.logo} name={m.opponent} size={34} />
            <div>
              <p className="max-w-[96px] truncate text-[11px] font-bold text-white/55">{m.opponent}</p>
              <p className="text-[17px] font-black tabular-nums leading-tight text-white">
                {m.our !== null && m.their !== null ? `${m.our} : ${m.their}` : "—"}
                {!m.casual && (
                  <span className="ml-1.5 text-[11px]" style={{ color: RESULT_COLOR[m.result] ?? "#fff" }}>
                    {m.result}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/** 상대 엠블럼. 로고가 없으면 첫 글자. */
function Crest({ logo, name, size }: { logo: string | null; name: string; size: number }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element -- 정적 로고
    return <img src={logo} alt="" className="shrink-0 rounded-full bg-white object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-white/10 font-black text-white/70"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.trim().charAt(0)}
    </span>
  );
}

/** 빗줄기. 화면 밖까지 길게 떨어진다. */
function Rain() {
  return (
    <div className="pointer-events-none absolute -inset-x-8 -inset-y-[40vh] overflow-hidden">
      {Array.from({ length: 40 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block w-px"
          style={{
            left: `${rnd(i, 31) * 100}%`,
            height: 40 + rnd(i, 32) * 50,
            background: "linear-gradient(transparent, rgba(186,230,253,0.55))",
            rotate: "12deg",
          }}
          initial={{ y: "-15vh" }}
          animate={{ y: "115vh" }}
          transition={{ duration: 0.7 + rnd(i, 33) * 0.5, delay: rnd(i, 34) * 1.2, ease: "linear", repeat: Infinity }}
        />
      ))}
    </div>
  );
}

/** 피날레 배경 — 기울어진 3D 사진 벽이 천천히 흘러간다. */
function PhotoWall({ photos, reduce }: { photos: string[]; reduce: boolean }) {
  const cols = [0, 1, 2, 3].map((c) => photos.filter((_, i) => i % 4 === c));
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ perspective: 1000 }}>
      <div
        className="absolute -inset-x-[40%] -inset-y-[20%] grid grid-cols-4 gap-2"
        style={{ transform: "rotateX(28deg) rotateZ(-12deg) scale(1.15)" }}
      >
        {cols.map((col, c) => (
          <motion.div
            key={c}
            className="flex flex-col gap-2"
            initial={{ y: c % 2 ? "-20%" : "0%" }}
            animate={reduce ? undefined : { y: c % 2 ? "0%" : "-20%" }}
            transition={{ duration: 16, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
          >
            {[...col, ...col, ...col].map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary 변환본
              <img key={i} src={src} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
