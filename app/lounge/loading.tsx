// 사랑방 목록 스켈레톤.
//
// 전술게시판 스켈레톤과 같은 원칙 — **지금 골격을 그대로 흉내낸다.**
// 어긋나면 로딩이 끝나는 순간 레이아웃이 갈아엎혀 더 느리게 느껴진다.
// (loading.tsx 가 없으면 홈 스켈레톤이 대신 뜨고, 목록에서 글로 넘어갈 때
//  Next 가 미리 받아둘 경계도 없어져 탭한 뒤 서버 렌더가 끝날 때까지 멎어 보인다)

const SHIMMER = "skeleton-shimmer bg-gray-200 dark:bg-white/[0.08]";
const SOFT = "skeleton-shimmer bg-gray-100 dark:bg-white/[0.05]";

export default function Loading() {
  return (
    <div
      className="pb-24"
      aria-label="사랑방을 불러오는 중"
      aria-busy="true"
    >
      <header className="app-header-surface sticky top-0 z-40 px-4 safe-header-py-3">
        <div className="flex items-center gap-2">
          <div className={`h-5 w-5 shrink-0 rounded-full ${SHIMMER}`} />
          <div className={`h-4 w-20 rounded ${SHIMMER}`} />
          <div className={`ml-auto h-8 w-8 rounded-full ${SHIMMER}`} />
        </div>
        {/* 전체 · 건의 · 잡담 */}
        <div className="mt-2.5 flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-9 w-16 shrink-0 rounded-full ${i === 0 ? SHIMMER : SOFT}`} />
          ))}
        </div>
      </header>

      {/* 익명 안내 줄 */}
      <div className={`mx-5 mt-4 h-9 rounded-xl ${SOFT}`} aria-hidden />

      <ul className="mt-1 divide-y divide-gray-100 px-5 dark:divide-white/[0.06]" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="flex items-start gap-3 py-4">
            <div className="min-w-0 flex-1">
              {/* 종류 · 상태 칩 */}
              <div className="flex items-center gap-1.5">
                <div className={`h-[22px] w-10 rounded-md ${SOFT}`} />
                <div className={`h-[22px] w-14 rounded-md ${SOFT}`} />
              </div>
              <div className={`mt-2 h-4 rounded ${SHIMMER}`} style={{ width: `${72 - (i % 3) * 14}%` }} />
              <div className={`mt-1.5 h-2.5 w-24 rounded ${SOFT}`} />
            </div>
            <div className={`mt-1 h-3 w-7 rounded ${SOFT}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
