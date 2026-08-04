const SHIMMER = "skeleton-shimmer bg-gray-200 dark:bg-white/[0.08]";
const SOFT_SHIMMER = "skeleton-shimmer bg-gray-100 dark:bg-white/[0.055]";

function FeedSkeleton({ goals = false }: { goals?: boolean }) {
  return (
    <article className="pb-8" aria-hidden>
      {/* 실제 피드의 상대팀 헤더 */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span className={`h-8 w-8 shrink-0 rounded-full ${SHIMMER}`} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className={`h-3.5 w-28 rounded ${SHIMMER}`} />
          <div className={`h-2.5 w-36 rounded ${SOFT_SHIMMER}`} />
        </div>
      </div>

      {/* 사진 또는 사진 없는 결과 비주얼과 같은 정사각형 자리 */}
      <div className={`aspect-square w-full ${SHIMMER}`} />

      {/* 댓글 · 명단 · 라인업 · 사진 추가 · 공유 */}
      <div className="flex items-start gap-1 px-4 pt-3.5">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex w-11 flex-col items-center gap-1">
            <div className={`h-[18px] w-[18px] rounded-md ${SHIMMER}`} />
            <div className={`h-2 w-6 rounded ${SOFT_SHIMMER}`} />
          </div>
        ))}
        <div className="ml-auto flex w-11 flex-col items-center gap-1">
          <div className={`h-[18px] w-[18px] rounded-md ${SHIMMER}`} />
          <div className={`h-2 w-5 rounded ${SOFT_SHIMMER}`} />
        </div>
      </div>

      {/* 경기 결과와 득점 기록 */}
      <div className="px-4 pt-3">
        <div className="border-y border-gray-100 dark:border-white/[0.06]">
          <div className="flex min-h-10 items-center gap-2 py-2.5">
            <div className={`h-2.5 w-[68px] rounded ${SOFT_SHIMMER}`} />
            <div className={`h-4 w-14 rounded ${SHIMMER}`} />
            <div className={`ml-auto h-3 w-7 rounded ${SOFT_SHIMMER}`} />
          </div>
          {goals && (
            <div className="flex items-start gap-2 border-t border-gray-100 py-2.5 dark:border-white/[0.06]">
              <div className={`h-2.5 w-[68px] rounded ${SOFT_SHIMMER}`} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`h-3 w-20 rounded ${SHIMMER}`} />
                  <div className={`h-2.5 w-16 rounded ${SOFT_SHIMMER}`} />
                </div>
                <div className="flex items-center justify-between">
                  <div className={`h-3 w-16 rounded ${SHIMMER}`} />
                  <div className={`h-2.5 w-20 rounded ${SOFT_SHIMMER}`} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MOM · 주목 포인트의 옅은 핑크 후일담 영역 */}
        <div className="-mx-4 bg-gradient-to-r from-[#FF8FA3]/[0.07] via-[#FF8FA3]/[0.025] to-transparent px-4 dark:from-[#FFB6C1]/[0.12] dark:via-[#FFB6C1]/[0.045]">
          {[0, 1].map((item) => (
            <div
              key={item}
              className={`flex min-h-10 items-center gap-2 py-2.5 ${
                item ? "border-t border-[#FF8FA3]/15 dark:border-[#FFB6C1]/10" : ""
              }`}
            >
              <div className="h-2.5 w-[68px] rounded bg-[#FF8FA3]/15 skeleton-shimmer dark:bg-[#FFB6C1]/10" />
              <div className={`h-3 flex-1 rounded ${SOFT_SHIMMER}`} />
              <div className={`h-3 w-9 rounded ${SOFT_SHIMMER}`} />
            </div>
          ))}
        </div>

        {/* 댓글 미리보기 두 줄 */}
        <div className="mt-3 space-y-2.5">
          <div className={`h-3 w-24 rounded ${SOFT_SHIMMER}`} />
          {[0, 1].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className={`h-3 w-14 rounded ${SHIMMER}`} />
              <div className={`h-3 ${item ? "w-36" : "w-48"} rounded ${SOFT_SHIMMER}`} />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function Loading() {
  return (
    <div
      className="mx-auto min-h-dvh max-w-md bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-zinc-100"
      aria-label="홈을 불러오는 중"
      aria-busy="true"
    >
      {/* 앱 헤더는 실제 높이를 그대로 유지한다. */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/70 bg-white/70 px-5 safe-header-py-35 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#09090b]/70">
        <span className="flex items-center gap-2 text-[15px] font-extrabold uppercase tracking-tight text-gray-900 dark:text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF8FA3]" />
          UNDERDUCK
        </span>
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-[#FF8FA3]/10 skeleton-shimmer" />
          <span className={`h-8 w-[76px] rounded-full ${SHIMMER}`} />
          <span className={`h-8 w-8 rounded-full ${SHIMMER}`} />
        </div>
      </header>

      <main>
        {/* 카드로 감싸지 않는 현재 홈 히어로의 골격 */}
        <section className="relative overflow-hidden px-4 pb-4 pt-5" aria-hidden>
          <div
            className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#FF8FA3]"
            style={{ opacity: 0.12, filter: "blur(46px)" }}
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-24 rounded bg-[#FF8FA3]/15 skeleton-shimmer" />
              <div className={`h-2.5 w-20 rounded ${SOFT_SHIMMER}`} />
            </div>
            <div className="mt-3 space-y-2">
              <div className={`h-7 w-48 rounded-md ${SHIMMER}`} />
              <div className={`h-7 w-40 rounded-md ${SHIMMER}`} />
            </div>
            <div className={`mt-4 h-3.5 w-32 rounded ${SHIMMER}`} />
            <div className={`mt-2 h-2.5 w-44 rounded ${SOFT_SHIMMER}`} />
            <div className={`mt-4 h-[7px] w-full rounded-full ${SOFT_SHIMMER}`} />
            <div className="mt-2 flex gap-3">
              <div className="h-2.5 w-14 rounded bg-[#FF8FA3]/15 skeleton-shimmer" />
              <div className="h-2.5 w-14 rounded bg-amber-400/15 skeleton-shimmer" />
              <div className={`h-2.5 w-14 rounded ${SOFT_SHIMMER}`} />
            </div>
          </div>
        </section>

        {/* 한 줄 공지 */}
        <div className="mx-4 mt-3 flex items-center gap-2 border-y border-gray-200 py-3 dark:border-white/[0.08]" aria-hidden>
          <div className={`h-3.5 w-3.5 shrink-0 rounded ${SHIMMER}`} />
          <div className={`h-3 flex-1 rounded ${SHIMMER}`} />
          <div className={`h-2.5 w-14 rounded ${SOFT_SHIMMER}`} />
        </div>

        <section className="pb-24 pt-2">
          <FeedSkeleton goals />
          <FeedSkeleton />
        </section>
      </main>
    </div>
  );
}
