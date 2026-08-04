// 전술게시판 스켈레톤.
//
// 예전엔 카드 리스트(가로 썸네일 + 오른쪽 텍스트)를 그렸는데 실제 화면이 릴스 그리드로
// 바뀌면서 로딩이 끝나는 순간 레이아웃이 통째로 갈아엎혔다. 지금 골격을 그대로 흉내낸다.
// 홈·명단·투표와 같은 skeleton-shimmer 를 쓴다.

const SHIMMER = "skeleton-shimmer bg-gray-200 dark:bg-white/[0.08]";
const SOFT = "skeleton-shimmer bg-gray-100 dark:bg-white/[0.05]";

export default function Loading() {
  return (
    <div
      className="mx-auto min-h-dvh max-w-md bg-gray-50 pb-24 dark:bg-[#09090b]"
      aria-label="전술게시판을 불러오는 중"
      aria-busy="true"
    >
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/90 px-4 safe-header-py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#101013]/90">
        <div className="flex items-center gap-2">
          <div className={`h-5 w-5 shrink-0 rounded-full ${SHIMMER}`} />
          <div className={`h-4 w-24 rounded ${SHIMMER}`} />
          <div className={`ml-auto h-7 w-7 rounded-full ${SHIMMER}`} />
        </div>
        {/* 검색창 */}
        <div className={`mt-2.5 h-9 w-full rounded-full ${SOFT}`} />
        {/* 정렬 칩 */}
        <div className="mt-2.5 flex gap-1.5 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-6 w-14 shrink-0 rounded-full ${i === 0 ? SHIMMER : SOFT}`} />
          ))}
        </div>
      </header>

      {/* 릴스 그리드 — 화면 폭 그대로, 3열 9:16 */}
      <div className="grid grid-cols-3 gap-px bg-gray-100 pt-4 dark:bg-white/[0.06]" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className={`aspect-[9/16] ${i % 3 === 1 ? SOFT : SHIMMER}`}>
            <div className="flex h-full flex-col justify-end p-1.5">
              <div className="h-2.5 w-4/5 rounded bg-black/10 skeleton-shimmer dark:bg-white/10" />
              <div className="mt-1 h-2 w-1/2 rounded bg-black/[0.06] skeleton-shimmer dark:bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
