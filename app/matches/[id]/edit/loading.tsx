const SHIMMER = "skeleton-shimmer bg-gray-200 dark:bg-white/[0.09]";
const SOFT_SHIMMER = "skeleton-shimmer bg-gray-100 dark:bg-white/[0.055]";

// 4-3-3 배치와 같은 골격. 단순한 회색 사각형보다 라인업 화면임을 바로 알아볼 수 있다.
const PLAYER_POINTS = [
  [50, 91],
  [18, 74], [39, 77], [61, 77], [82, 74],
  [25, 52], [50, 57], [75, 52],
  [20, 27], [50, 20], [80, 27],
] as const;

export default function Loading() {
  return (
    <div
      className="mx-auto min-h-dvh max-w-md overflow-hidden bg-gray-50 text-gray-900 shadow-2xl dark:bg-[#09090b] dark:text-zinc-100"
      aria-label="라인업 편집 화면을 불러오는 중"
      aria-busy="true"
    >
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/70 bg-white/70 px-5 safe-header-py-35 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#09090b]/70">
        <div className="flex h-11 items-center gap-2" aria-hidden>
          <span className={`h-4 w-4 rounded ${SHIMMER}`} />
          <span className={`h-3.5 w-[72px] rounded ${SHIMMER}`} />
        </div>
        <div className="flex items-center gap-2" aria-hidden>
          <span className={`h-8 w-8 rounded-full ${SOFT_SHIMMER}`} />
          <span className="h-[30px] w-[58px] rounded-xl bg-[#FF8FA3]/25 skeleton-shimmer dark:bg-[#FFB6C1]/15" />
        </div>
      </header>

      <main className="space-y-4 p-4 pb-10" aria-hidden>
        <section className="space-y-2 py-2 text-center">
          <div className={`mx-auto h-2.5 w-40 rounded ${SOFT_SHIMMER}`} />
          <div className={`mx-auto h-4 w-32 rounded ${SHIMMER}`} />
        </section>

        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <span
              key={item}
              className={`h-8 w-[54px] shrink-0 rounded-xl ${
                item === 0 ? "bg-[#FF8FA3]/25 skeleton-shimmer" : SOFT_SHIMMER
              }`}
            />
          ))}
        </div>

        <div className="h-7 w-[142px] rounded-xl border border-gray-200 bg-white skeleton-shimmer dark:border-white/10 dark:bg-white/[0.04]" />

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-12 rounded ${SOFT_SHIMMER}`} />
            <span className="h-6 w-14 rounded-lg bg-gray-900/85 skeleton-shimmer dark:bg-white/80" />
          </div>
          <div className="flex gap-1.5 overflow-hidden">
            {[48, 48, 58, 52, 48, 52].map((width, item) => (
              <span
                key={item}
                className={`h-6 shrink-0 rounded-lg ${SOFT_SHIMMER}`}
                style={{ width }}
              />
            ))}
          </div>
        </section>

        <div className="flex items-center gap-2 overflow-hidden">
          <span className={`h-2.5 w-7 shrink-0 rounded ${SOFT_SHIMMER}`} />
          {[58, 64, 54, 60].map((width, item) => (
            <span
              key={item}
              className={`h-6 shrink-0 rounded-lg ${SOFT_SHIMMER}`}
              style={{ width }}
            />
          ))}
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <span className={`h-2.5 w-44 rounded ${SOFT_SHIMMER}`} />
            <span className={`h-2.5 w-10 rounded ${SOFT_SHIMMER}`} />
          </div>

          <div
            className="relative w-full overflow-hidden rounded-2xl shadow-soft ring-1 ring-black/10 dark:ring-white/10"
            style={{
              paddingBottom: "138%",
              background: "linear-gradient(180deg,#1c6a36 0%,#185e2f 33%,#1c6a36 66%,#185e2f 100%)",
            }}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 138"
              preserveAspectRatio="none"
              fill="none"
            >
              <rect x="3" y="3" width="94" height="132" stroke="rgba(255,255,255,0.34)" strokeWidth="0.8" />
              <line x1="3" y1="69" x2="97" y2="69" stroke="rgba(255,255,255,0.34)" strokeWidth="0.6" />
              <circle cx="50" cy="69" r="12" stroke="rgba(255,255,255,0.34)" strokeWidth="0.6" />
              <rect x="22" y="3" width="56" height="20" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
              <rect x="22" y="115" width="56" height="20" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
            </svg>

            {PLAYER_POINTS.map(([left, top], index) => (
              <div
                key={index}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <div className="h-9 w-9 rounded-full border-2 border-white/65 bg-white/25 skeleton-shimmer shadow-md" />
                <div className="mx-auto mt-1 h-2 w-10 rounded-full bg-black/20 skeleton-shimmer" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className={`h-2.5 w-12 rounded ${SOFT_SHIMMER}`} />
          <div className="flex flex-wrap gap-2">
            {[52, 58, 54, 62, 54, 58].map((width, item) => (
              <span
                key={item}
                className="h-8 rounded-xl border border-dashed border-gray-200 bg-white/50 skeleton-shimmer dark:border-white/10 dark:bg-white/[0.025]"
                style={{ width }}
              />
            ))}
          </div>
        </section>

        <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className={`h-2.5 w-16 rounded ${SHIMMER}`} />
              <div className={`h-2.5 w-48 rounded ${SOFT_SHIMMER}`} />
            </div>
            <div className={`h-8 w-14 rounded-xl ${SHIMMER}`} />
          </div>
          <div className={`mt-3 h-12 w-full rounded-xl ${SOFT_SHIMMER}`} />
        </div>
      </main>
    </div>
  );
}
