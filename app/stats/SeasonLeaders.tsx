// 스탯 상단 — 시즌 리더(득점왕·최다 출전·도움왕·공격포인트왕·클린시트왕).
//
// 새로 세지 않는다. 칭호의 리더 칭호(titles.LEADER_TITLES)를 그대로 옮겨 온다 —
// 여기서 따로 세면 프로필 왕관과 이 화면이 다른 사람을 1위라고 할 수 있다.
// 메달은 라인업·프로필과 같은 톱니 메달(TitleBadge)이고, 에나멜 자리에 1위 얼굴을 박는다.
// 다섯 부문 모두 같은 크기다 — 어느 하나만 크게 세우지 않는다.

import Link from "next/link";
import { TitleBadge } from "../components/TitleBadges";
import { TitleIcon } from "../lib/title-icons";
import { playerFaceOnSrc } from "../lib/player-faceons";
import type { EarnedTitle } from "../lib/titles";

export interface SeasonLeader {
  id: string;
  title: EarnedTitle;
  unit: string;
  value: number;
  /** 동률이면 여러 명(가나다순). 전부 이름을 적는다 — "외 N명" 으로 뭉개지 않는다. */
  holders: string[];
}

/** 메달 아래에 걸리는 부문 표식(아이콘). 한 칸이 좁아 이름은 아래 글자로 적는다. */
function Plate({ title }: { title: EarnedTitle }) {
  return (
    <span
      className="relative inline-flex h-[20px] w-[20px] items-center justify-center rounded-full text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
      style={{ background: "linear-gradient(180deg, #FFB6C1 0%, #E0607A 100%)" }}
    >
      <TitleIcon name={title.icon} width={11} height={11} strokeWidth={2.6} />
    </span>
  );
}

function Names({ holders, className }: { holders: string[]; className: string }) {
  return (
    <>
      {holders.length > 1 && (
        <span className="relative mt-1 text-[9px] font-black tracking-wide" style={{ color: "var(--season)" }}>
          공동 1위
        </span>
      )}
      {holders.map((n) => (
        <span key={n} className={`w-full truncate text-center font-black text-gray-900 dark:text-white ${className}`}>
          {n}
        </span>
      ))}
    </>
  );
}

export default function SeasonLeaders({ leaders, final }: { leaders: SeasonLeader[]; final: boolean }) {
  if (!leaders.length) return null;

  return (
    <section className="relative overflow-hidden px-4 pt-5">
      {/* 배경 — 은은한 시즌색 구름 몇 덩이. 움직이지 않는다. */}
      <span aria-hidden className="pointer-events-none absolute inset-0">
        {[
          { left: "-8%", top: "10%", size: 190, opacity: 0.2 },
          { left: "32%", top: "-18%", size: 230, opacity: 0.16 },
          { left: "68%", top: "18%", size: 200, opacity: 0.18 },
          { left: "20%", top: "55%", size: 170, opacity: 0.1 },
        ].map((c, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: c.left,
              top: c.top,
              width: c.size,
              height: c.size * 0.7,
              background: "radial-gradient(closest-side, var(--season), transparent)",
              opacity: c.opacity,
              filter: "blur(24px)",
            }}
          />
        ))}
      </span>

      <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
        시즌 리더{final && <span className="ml-1.5 normal-case tracking-normal">· 최종</span>}
      </p>

      {/* 다섯 부문 모두 같은 크기, 한 줄. */}
      <div className="relative mt-4 grid grid-cols-5 gap-0.5">
        {leaders.map((l) => (
          <Link
            key={l.id}
            href={`/players/${encodeURIComponent(l.holders[0])}`}
            className="flex min-w-0 flex-col items-center transition-transform active:scale-[0.95]"
          >
            {/* 공동 1위면 메달을 대각선으로 엇갈려 겹친다 — 둘 다 얼굴이 보여야 한다.
                앞사람(가나다순 첫째)이 왼쪽 아래·위층. 셋 이상은 같은 간격으로 이어 붙인다. */}
            <span className="relative flex h-[66px] w-full justify-center">
              {l.holders.length === 1 ? (
                <TitleBadge title={l.title} size={66} photo={playerFaceOnSrc(l.holders[0])} />
              ) : (
                l.holders.map((n, i) => {
                  const step = 32 / (l.holders.length - 1);
                  return (
                    <span
                      key={n}
                      className="absolute"
                      style={{
                        left: `calc(50% - 40px + ${i * step}px)`,
                        bottom: i * (14 / (l.holders.length - 1)),
                        zIndex: l.holders.length - i,
                      }}
                    >
                      <TitleBadge title={l.title} size={48} photo={playerFaceOnSrc(n)} />
                    </span>
                  );
                })
              )}
            </span>
            <span className="relative -mt-2.5">
              <Plate title={l.title} />
            </span>
            <span className="relative mt-1 w-full truncate text-center text-[9.5px] font-black" style={{ color: "var(--season)" }}>
              {l.title.name}
            </span>
            <span className="relative mt-1 text-[20px] font-black leading-none tracking-[-0.05em] tabular-nums text-gray-900 dark:text-white">
              {l.value}
              <span className="ml-0.5 text-[9px] font-bold tracking-normal text-gray-400 dark:text-white/40">{l.unit}</span>
            </span>
            <Names holders={l.holders} className="relative mt-1 text-[12px] leading-tight tracking-[-0.02em]" />
          </Link>
        ))}
      </div>
    </section>
  );
}
