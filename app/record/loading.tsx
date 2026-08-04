// 전적 스켈레톤.
//
// 없으면 상위(app/loading.tsx)의 홈 피드 스켈레톤이 뜬다.
// RecordArchive 의 실제 골격(세그먼트 스위치 + 38px 마크 목록)을 그대로 흉내낸다.

const SHIMMER = "skeleton-shimmer bg-gray-200 dark:bg-white/[0.08]";
const SOFT = "skeleton-shimmer bg-gray-100 dark:bg-white/[0.05]";

export default function Loading() {
  return (
    <div
      className="mx-auto min-h-dvh max-w-md bg-gray-50 dark:bg-[#09090b]"
      aria-label="전적을 불러오는 중"
      aria-busy="true"
    >
      {/* 상단 바 */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200/60 bg-gray-50/80 px-4 safe-header-py-3 backdrop-blur dark:border-white/[0.06] dark:bg-[#09090b]/80">
        <div className={`h-[18px] w-[18px] rounded ${SHIMMER}`} />
        <div className={`h-3 w-14 rounded ${SOFT}`} />
      </div>

      <main aria-hidden>
        {/* 상대팀 / 경기장 세그먼트 스위치 */}
        <div className="sticky top-[49px] z-[9] border-b border-gray-200/60 bg-gray-50/90 px-4 py-3 backdrop-blur dark:border-white/[0.06] dark:bg-[#09090b]/90">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-200/65 p-1 dark:bg-white/[0.07]">
            <div className={`h-8 rounded-lg ${SHIMMER}`} />
            <div className={`h-8 rounded-lg ${SOFT}`} />
          </div>
        </div>

        <section className="px-4 pb-24 pt-5">
          {/* 섹션 제목 + 정렬 안내 */}
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className={`h-2.5 w-14 rounded ${SOFT}`} />
              <div className={`mt-2 h-6 w-32 rounded-md ${SHIMMER}`} />
            </div>
            <div className={`mb-0.5 h-2.5 w-16 rounded ${SOFT}`} />
          </div>

          <div className="divide-y divide-gray-200/70 dark:divide-white/[0.07]">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-4">
                <div className={`h-[38px] w-[38px] shrink-0 rounded-full ${SHIMMER}`} />
                <div className="min-w-0 flex-1">
                  <div className={`h-3.5 w-28 rounded ${SHIMMER}`} />
                  <div className={`mt-1.5 h-2.5 w-44 rounded ${SOFT}`} />
                </div>
                {/* 최근 맞대결 결과 뱃지 */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {[0, 1, 2].map((b) => (
                    <div key={b} className={`h-6 w-6 rounded-full ${SOFT}`} />
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
