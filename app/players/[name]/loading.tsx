const SHIMMER = "skeleton-shimmer bg-gray-200 dark:bg-white/[0.08]";
const SOFT = "skeleton-shimmer bg-gray-100 dark:bg-white/[0.05]";

export default function Loading() {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-gray-50 pb-28 dark:bg-[#09090b]">
      <div className="app-page-header safe-header-py-3">
        <div className={`h-[18px] w-[18px] rounded ${SHIMMER}`} />
        <div className={`h-3 w-16 rounded ${SOFT}`} />
      </div>

      <section className="relative overflow-hidden px-4 pt-5">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#FF8FA3]"
          style={{ opacity: 0.1, filter: "blur(48px)" }}
        />
        <div className="relative flex items-center gap-4">
          <div className={`h-[92px] w-[92px] shrink-0 rounded-full ${SHIMMER}`} />
          <div className="min-w-0 flex-1">
            <div className={`h-5 w-24 rounded ${SHIMMER}`} />
            <div className="mt-4 grid grid-cols-4 gap-1">
              {[0, 1, 2, 3].map((item) => (
                <div key={item}>
                  <div className={`h-4 w-7 rounded ${SHIMMER}`} />
                  <div className={`mt-1.5 h-2 w-7 rounded ${SOFT}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className={`h-3 w-8 rounded ${SOFT}`} />
          <div className={`h-6 w-40 rounded-full ${SOFT}`} />
        </div>
      </section>

      <section className="mt-4 flex gap-3 overflow-hidden px-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex shrink-0 flex-col items-center gap-2">
            <div className={`h-14 w-14 rounded-full ${SHIMMER}`} />
            <div className={`h-2.5 w-12 rounded ${SOFT}`} />
          </div>
        ))}
      </section>

      <div className="mt-5 grid min-h-14 grid-cols-3 border-y border-gray-200/70 dark:border-white/[0.08]">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex flex-col items-center justify-center gap-1">
            <div className={`h-[19px] w-[19px] rounded ${SHIMMER}`} />
            <div className={`h-2 w-6 rounded ${SOFT}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-[2px]">
        {Array.from({ length: 9 }, (_, item) => (
          <div key={item} className={`aspect-square ${item % 2 ? SOFT : SHIMMER}`} />
        ))}
      </div>
    </div>
  );
}
