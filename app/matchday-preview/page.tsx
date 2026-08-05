// 예정 경기 배경 8장 위에 D-day 숫자가 어떻게 앉는지 한 번에 보는 확인용 페이지.
// 실제 카드(MatchFeed의 upcoming 분기)와 같은 마크업·같은 층 구성을 쓴다.
// 그림을 고르고 나면 지워도 되는 화면이다.

import {
  ART_SCRIM_DARK,
  ART_SCRIM_SOFT,
  ART_SCRIM_LIGHT,
  ART_VEIL,
  matchdayArt,
} from "../lib/matchday-art";

// hash 를 거치지 않고 전부 순서대로 보기 위해 matchId·dDay 를 훑어 중복 없이 모은다.
function everyArt() {
  const seen = new Map<string, ReturnType<typeof matchdayArt>>();
  for (let id = 0; id < 3000; id++) {
    const art = matchdayArt(id, id % 30);
    if (art && !seen.has(art.src)) seen.set(art.src, art);
  }
  return [...seen.values()].sort((a, b) => (a!.src < b!.src ? -1 : 1));
}

export default function MatchdayPreview() {
  const arts = everyArt();
  return (
    <main className="px-4 py-6">
      <h1 className="mb-1 text-[15px] font-black text-gray-900 dark:text-white">
        예정 경기 배경 {arts.length}장
      </h1>
      <p className="mb-5 text-[11px] font-bold text-gray-400 dark:text-white/35">
        실제 카드와 같은 마크업. D-day 숫자가 그림을 가리지 않는지 확인용.
      </p>

      <div className="space-y-6">
        {arts.map((art, i) => {
          if (!art) return null;
          const dDay = [7, 5, 3, 2, 1, 0, 12, 21][i % 8];
          return (
            <div key={art.src}>
              <p className="mb-1.5 text-[10px] font-black text-gray-400 dark:text-white/35">
                {art.src.split("/").pop()}
                {art.light ? " · 밝은 배경(글씨 반전)" : ""}
              </p>
              <div
                className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-xl"
                style={{ background: "linear-gradient(160deg,#FFD9E1 0%,#FF8FA3 100%)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={art.src}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {!art.light && !art.soft && (
                  <div aria-hidden className="absolute inset-0" style={{ background: ART_VEIL }} />
                )}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: art.light
                    ? ART_SCRIM_LIGHT
                    : art.soft
                      ? ART_SCRIM_SOFT
                      : ART_SCRIM_DARK }}
                />
                <div className="relative z-10 flex flex-col items-center">
                  <p
                    className={`text-[13px] font-black tracking-[0.24em] ${
                      art.light ? "text-[#0f1729]/60" : "text-white/70"
                    }`}
                  >
                    NEXT MATCH
                  </p>
                  <p
                    className={`mt-3 text-[64px] font-black leading-none tracking-[-0.05em] tabular-nums ${
                      art.light
                        ? "text-[#0f1729]"
                        : "text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]"
                    }`}
                  >
                    {dDay === 0 ? "D-DAY" : `D-${dDay}`}
                  </p>
                  <p
                    className={`mt-4 text-[13px] font-bold ${
                      art.light ? "text-[#0f1729]/70" : "text-white/80"
                    }`}
                  >
                    8월 8일 · 20:00
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
