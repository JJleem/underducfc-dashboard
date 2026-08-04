const SHIMMER = "skeleton-shimmer bg-gray-200 dark:bg-white/[0.08]";
const SOFT = "skeleton-shimmer bg-gray-100 dark:bg-white/[0.05]";

export default function Loading() {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-gray-50 dark:bg-[#09090b]">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/60 bg-gray-50/80 px-4 safe-header-py-3 backdrop-blur dark:border-white/[0.06] dark:bg-[#09090b]/80">
        <div className="flex items-center gap-2">
          <div className={`h-[18px] w-[18px] rounded ${SHIMMER}`} />
          <div className={`h-3 w-14 rounded ${SOFT}`} />
        </div>
        <div className={`h-8 w-8 rounded-full ${SHIMMER}`} />
      </header>

      <main className="pb-28">
        <section className="relative overflow-hidden px-4 pb-5 pt-5">
          <div
            className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#FF8FA3]"
            style={{ opacity: 0.1, filter: "blur(46px)" }}
          />
          <div className="relative">
            <div className="h-2.5 w-24 rounded bg-[#FF8FA3]/15 skeleton-shimmer" />
            <div className={`mt-3 h-7 w-40 rounded-md ${SHIMMER}`} />
            <div className={`mt-2 h-3 w-32 rounded ${SOFT}`} />
            <div className="mt-4 flex gap-3">
              <div className="h-2.5 w-12 rounded bg-[#FF8FA3]/15 skeleton-shimmer" />
              <div className={`h-2.5 w-12 rounded ${SOFT}`} />
            </div>
          </div>
        </section>

        {[3, 6, 6].map((count, group) => (
          <section key={group} className="mb-7">
            <div className="mb-3 flex items-center gap-2 px-4">
              <div className={`h-3 w-6 rounded ${SHIMMER}`} />
              <div className={`h-3 w-14 rounded ${SOFT}`} />
              <div className={`ml-auto h-3 w-4 rounded ${SOFT}`} />
            </div>
            <div className="grid grid-cols-3 gap-0 bg-transparent">
              {Array.from({ length: count }, (_, item) => (
                <div key={item} className={`aspect-[3/4] ${item % 3 === 1 ? SOFT : SHIMMER}`}>
                  <div className="flex h-full flex-col justify-end p-2">
                    <div className="h-3 w-14 rounded bg-black/10 skeleton-shimmer dark:bg-white/10" />
                    <div className="mt-1.5 h-2 w-10 rounded bg-black/[0.06] skeleton-shimmer dark:bg-white/[0.06]" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
