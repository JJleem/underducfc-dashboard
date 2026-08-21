// 스탯 스켈레톤.
//
// 없으면 상위(app/loading.tsx)의 홈 피드 스켈레톤이 뜬다 — 사진 정사각형과 댓글 자리가
// 깔렸다가 순위 목록으로 바뀌어서 화면이 통째로 갈아엎힌다.
// 홈·명단과 같은 방식으로 실제 골격을 그대로 흉내낸다.

const SHIMMER = "skeleton-shimmer bg-gray-200 dark:bg-white/[0.08]";
const SOFT = "skeleton-shimmer bg-gray-100 dark:bg-white/[0.05]";

export default function Loading() {
  return (
    <div
      className="mx-auto min-h-dvh max-w-md bg-gray-50 dark:bg-[#09090b]"
      aria-label="스탯을 불러오는 중"
      aria-busy="true"
    >
      {/* 상단 바 */}
      <div className="app-page-header safe-header-py-3">
        <div className={`h-[18px] w-[18px] rounded ${SHIMMER}`} />
        <div className={`h-3 w-12 rounded ${SOFT}`} />
      </div>

      <main aria-hidden>
        {/* 시즌 요약 — 히어로 */}
        <section className="relative overflow-hidden px-4 pt-5">
          <div
            className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#FF8FA3]"
            style={{ opacity: 0.12, filter: "blur(46px)" }}
          />
          <div className="relative">
            <div className="h-2.5 w-16 rounded bg-[#FF8FA3]/15 skeleton-shimmer" />
            <div className="mt-2.5 flex items-end justify-between gap-3">
              <div className={`h-6 w-52 rounded-md ${SHIMMER}`} />
              <div className="h-8 w-16 shrink-0 rounded-md bg-[#FF8FA3]/15 skeleton-shimmer" />
            </div>

            {/* 승/무/패 비율 막대 */}
            <div className={`mt-3.5 h-[7px] w-full rounded-full ${SOFT}`} />

            {/* 득점 · 실점 · 경기당 4칸 */}
            <div className="mt-4 grid grid-cols-4 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <div className={`h-5 w-10 rounded ${SHIMMER}`} />
                  <div className={`mt-1.5 h-2.5 w-14 rounded ${SOFT}`} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 전적 페이지 링크 한 줄 */}
        <div className="mx-4 mt-5 flex items-center gap-2 border-y border-gray-200 py-3 dark:border-white/[0.08]">
          <div className={`h-3 flex-1 rounded ${SHIMMER}`} />
          <div className={`h-3.5 w-3.5 shrink-0 rounded ${SOFT}`} />
        </div>

        {/* 최고의 듀오 */}
        <section className="px-4 pt-5">
          <div className={`mb-2.5 h-2.5 w-20 rounded ${SOFT}`} />
          <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className={`h-3.5 w-5 shrink-0 rounded ${SOFT}`} />
                <div className="flex shrink-0 items-center -space-x-2">
                  <div className={`h-7 w-7 rounded-full ${SHIMMER}`} />
                  <div className={`h-7 w-7 rounded-full ${SOFT}`} />
                </div>
                <div className={`h-3.5 flex-1 rounded ${SHIMMER}`} />
                <div className={`h-3.5 w-8 shrink-0 rounded ${SOFT}`} />
              </div>
            ))}
          </div>
        </section>

        {/* 선수 순위 */}
        <section className="px-4 pb-24 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <div className={`h-2.5 w-16 rounded ${SOFT}`} />
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-6 w-10 rounded-full ${i === 0 ? SHIMMER : SOFT}`} />
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5 py-3">
                <div className={`h-8 w-8 shrink-0 rounded-full ${SHIMMER}`} />
                <div className="min-w-0 flex-1">
                  <div className={`h-3.5 w-20 rounded ${SHIMMER}`} />
                  <div className={`mt-1.5 h-2.5 w-12 rounded ${SOFT}`} />
                </div>
                <div className="grid w-[146px] shrink-0 grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((c) => (
                    <div key={c} className={`h-3.5 rounded ${SOFT}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
