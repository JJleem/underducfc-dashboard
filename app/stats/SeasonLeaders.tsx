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
      className="relative inline-flex h-[20px] w-[20px] items-center justify-center rounded-full text-white"
      style={{ background: "var(--ud-primary)" }}
    >
      <TitleIcon name={title.icon} width={11} height={11} strokeWidth={2.6} />
    </span>
  );
}

function Names({ holders, className }: { holders: string[]; className: string }) {
  return (
    <>
      {holders.length > 1 && (
        <span className="relative mt-1 whitespace-nowrap text-[11px] font-black" style={{ color: "var(--season)" }}>
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
      <p className="app-section-label relative text-[11px]">
        시즌 리더{final && <span className="ml-1.5 normal-case tracking-normal">· 최종</span>}
      </p>

      {/* 다섯 부문 모두 같은 크기, 한 줄. 390 미만에선 다섯 칸이 비좁아 가로로 넘긴다 —
          다음 칸이 반쯤 보이게 칸 폭을 고정한다. */}
      <div className="relative -mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-1 overflow-x-auto overflow-y-hidden px-4 pt-1 min-[390px]:mx-0 min-[390px]:grid min-[390px]:grid-cols-5 min-[390px]:gap-0.5 min-[390px]:overflow-visible min-[390px]:px-0">
        {leaders.map((l) => (
          <Link
            key={l.id}
            href={`/players/${encodeURIComponent(l.holders[0])}`}
            className="flex w-[76px] min-w-0 shrink-0 snap-start flex-col items-center transition-transform active:scale-[0.95] min-[390px]:w-auto"
          >
            {/* 공동 1위면 메달을 대각선으로 엇갈려 겹친다 — 둘 다 얼굴이 보여야 한다.
                앞사람(가나다순 첫째)이 왼쪽 아래·위층. 셋 이상은 같은 간격으로 이어 붙인다. */}
            <span className="relative flex h-[64px] w-full justify-center">
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
            <span className="relative mt-1 w-full truncate text-center text-[11px] font-black" style={{ color: "var(--season)" }}>
              {l.title.name}
            </span>
            <span className="relative mt-1 whitespace-nowrap text-[20px] font-black leading-none tracking-[-0.05em] tabular-nums text-gray-900 dark:text-white">
              {l.value}
              <span className="ml-0.5 text-[11px] font-bold tracking-normal text-gray-400 dark:text-white/55">{l.unit}</span>
            </span>
            <Names holders={l.holders} className="relative mt-1 text-[12px] leading-tight" />
          </Link>
        ))}
      </div>
    </section>
  );
}
