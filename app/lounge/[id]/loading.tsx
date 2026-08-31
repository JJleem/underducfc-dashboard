// 사랑방 글 스켈레톤. 상세 화면(LoungeDetailClient)의 골격을 그대로 흉내낸다.

const SHIMMER = "skeleton-shimmer bg-gray-200 dark:bg-white/[0.08]";
const SOFT = "skeleton-shimmer bg-gray-100 dark:bg-white/[0.05]";

export default function Loading() {
  return (
    <div className="pb-28" aria-label="글을 불러오는 중" aria-busy="true">
      <header className="app-header-surface sticky top-0 z-40 px-4 safe-header-py-3">
        <div className="flex items-center gap-2">
          <div className={`h-5 w-5 shrink-0 rounded-full ${SHIMMER}`} />
          <div className={`h-4 w-20 rounded ${SHIMMER}`} />
        </div>
      </header>

      <article className="px-5 pt-5" aria-hidden>
        <div className="flex items-center gap-1.5">
          <div className={`h-[22px] w-10 rounded-md ${SOFT}`} />
          <div className={`h-[22px] w-14 rounded-md ${SOFT}`} />
        </div>
        {/* 제목 — 두 줄까지 */}
        <div className={`mt-3 h-5 w-4/5 rounded ${SHIMMER}`} />
        <div className={`mt-2 h-5 w-2/5 rounded ${SHIMMER}`} />
        <div className={`mt-2.5 h-2.5 w-24 rounded ${SOFT}`} />

        {/* 본문 */}
        <div className="mt-5 space-y-2.5">
          {["100%", "94%", "88%", "62%"].map((w) => (
            <div key={w} className={`h-3 rounded ${SOFT}`} style={{ width: w }} />
          ))}
        </div>
      </article>

      <section className="mt-8 border-t border-gray-100 px-5 pt-5 dark:border-white/[0.06]" aria-hidden>
        <div className={`h-3 w-14 rounded ${SOFT}`} />
        <ul className="mt-3 space-y-5">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <div className="flex items-center gap-1.5">
                <div className={`h-3 w-12 rounded ${SHIMMER}`} />
                <div className={`h-2.5 w-10 rounded ${SOFT}`} />
              </div>
              <div className={`mt-1.5 h-3 rounded ${SOFT}`} style={{ width: `${84 - i * 18}%` }} />
            </li>
          ))}
        </ul>
        {/* 입력 알약 */}
        <div className={`mt-4 h-11 rounded-full ${SOFT}`} />
      </section>
    </div>
  );
}
