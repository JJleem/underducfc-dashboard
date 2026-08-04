// 투표 화면 스켈레톤.
//
// 홈·명단과 같은 방식이다: 실제 화면의 골격을 그대로 흉내내서 내용이 들어올 때 자리가
// 안 튀게 한다. 카드 상자를 그리지 않고, 히어로는 배경 위에 직접 올린다.
// (예전 스켈레톤은 카드 두 장을 그렸는데 실제 화면에 카드가 없어서 로딩 후 레이아웃이 바뀌었다)

const SHIMMER = "skeleton-shimmer bg-gray-200 dark:bg-white/[0.08]";
const SOFT = "skeleton-shimmer bg-gray-100 dark:bg-white/[0.05]";

/** 명단 한 줄 — 라벨(고정폭) + 이름 칩들 */
function RosterLine({ chips, tone }: { chips: number[]; tone: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className={`h-3 w-11 shrink-0 rounded ${tone}`} />
      <div className="flex flex-wrap gap-1">
        {chips.map((w, i) => (
          <div key={i} className={`h-5 rounded-full ${SOFT}`} style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div
      className="mx-auto min-h-dvh max-w-md bg-gray-50 dark:bg-[#09090b]"
      aria-label="출석 투표를 불러오는 중"
      aria-busy="true"
    >
      {/* 상단 바 — 실제와 같은 높이 */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200/60 bg-gray-50/80 px-4 safe-header-py-3 backdrop-blur dark:border-white/[0.06] dark:bg-[#09090b]/80">
        <div className={`h-[18px] w-[18px] rounded ${SHIMMER}`} />
        <div className={`h-3 w-12 rounded ${SOFT}`} />
      </div>

      <main className="pb-28" aria-hidden>
        {/* 진행 중 투표 — 히어로 */}
        <section className="relative overflow-hidden px-4 pb-6 pt-5">
          <div
            className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#FF8FA3]"
            style={{ opacity: 0.12, filter: "blur(46px)" }}
          />
          <div className="relative">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-2.5 w-16 rounded bg-[#FF8FA3]/15 skeleton-shimmer" />
                <div className={`mt-2.5 h-6 w-40 rounded-md ${SHIMMER}`} />
                <div className={`mt-3 h-3 w-32 rounded ${SOFT}`} />
                <div className={`mt-2 h-3 w-36 rounded ${SOFT}`} />
              </div>
              {/* D-day + 날씨 */}
              <div className="shrink-0 text-right">
                <div className="h-9 w-20 rounded-md bg-[#FF8FA3]/15 skeleton-shimmer" />
                <div className={`ml-auto mt-2.5 h-3 w-14 rounded ${SOFT}`} />
              </div>
            </div>

            {/* 참석 · 미정 · 불참 버튼 */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-[50px] rounded-2xl ${i === 0 ? SHIMMER : SOFT}`} />
              ))}
            </div>

            {/* 집계 막대 + 수치 */}
            <div className={`mt-4 h-[7px] w-full rounded-full ${SOFT}`} />
            <div className="mt-2.5 flex gap-3">
              <div className="h-2.5 w-12 rounded bg-[#FF8FA3]/15 skeleton-shimmer" />
              <div className="h-2.5 w-12 rounded bg-amber-400/15 skeleton-shimmer" />
              <div className={`h-2.5 w-12 rounded ${SOFT}`} />
            </div>

            {/* 명단 — 참석/미정/불참/미투표 */}
            <div className="mt-4 flex flex-col gap-2.5 border-t border-gray-200 pt-3.5 dark:border-white/[0.08]">
              <RosterLine tone="bg-[#FF8FA3]/20 skeleton-shimmer" chips={[46, 52, 46, 52, 46, 58]} />
              <RosterLine tone="bg-amber-400/20 skeleton-shimmer" chips={[46, 52, 46]} />
              <RosterLine tone={SOFT} chips={[52, 46, 52, 46]} />
              <RosterLine tone={SOFT} chips={[46, 52, 46, 58, 46]} />
            </div>

            {/* 댓글 */}
            <div className="mt-4 border-t border-gray-200 pt-3.5 dark:border-white/[0.08]">
              <div className={`h-2.5 w-14 rounded ${SOFT}`} />
              <div className="mt-3 flex flex-col gap-3">
                {[0, 1].map((i) => (
                  <div key={i}>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-3 w-14 rounded ${SHIMMER}`} />
                      <div className={`h-2.5 w-16 rounded ${SOFT}`} />
                    </div>
                    <div className={`mt-1.5 h-3 ${i ? "w-40" : "w-52"} rounded ${SOFT}`} />
                  </div>
                ))}
                {/* 입력 알약 */}
                <div className={`mt-1 h-9 w-full rounded-full ${SOFT}`} />
              </div>
            </div>
          </div>
        </section>

        {/* 지난 투표 — 커뮤니티 목록 */}
        <section className="px-4 pt-6">
          <div className={`mb-1 h-2.5 w-20 rounded ${SOFT}`} />
          <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-5 w-5 shrink-0 rounded-full ${SHIMMER}`} />
                    <div className={`h-3.5 w-24 rounded ${SHIMMER}`} />
                  </div>
                  <div className={`mt-1.5 h-2.5 w-40 rounded ${SOFT}`} />
                  <div className={`mt-2 h-[5px] w-full rounded-full ${SOFT}`} />
                  <div className="mt-1.5 flex gap-2.5">
                    <div className="h-2.5 w-11 rounded bg-[#FF8FA3]/15 skeleton-shimmer" />
                    <div className="h-2.5 w-11 rounded bg-amber-400/15 skeleton-shimmer" />
                    <div className={`h-2.5 w-11 rounded ${SOFT}`} />
                  </div>
                </div>
                <div className={`h-3.5 w-3.5 shrink-0 rounded ${SOFT}`} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
