// 칭호 도감 이동 시 즉시 뜨는 스켈레톤 (헤더 클래스는 page.tsx와 동일하게 유지)
export default function Loading() {
  return (
    <div>
      <header className="app-header-surface sticky top-0 z-40 flex safe-header-h-14 items-center gap-3 px-4">
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="space-y-1.5">
          <div className="h-2 w-24 rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-white/10" />
        </div>
        <div className="ml-auto h-5 w-16 rounded-full bg-gray-100 dark:bg-white/5" />
      </header>
      <div className="animate-pulse space-y-6 px-4 pb-10 pt-4">
        <section className="rounded-[22px] border border-gray-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-[#10182f]">
          <div className="h-2.5 w-28 rounded bg-gray-200 dark:bg-white/10" />
          <div className="mt-2 h-5 w-56 rounded bg-gray-200 dark:bg-white/10" />
          <div className="mt-3 space-y-1.5">
            <div className="h-2.5 w-full rounded bg-gray-100 dark:bg-white/5" />
            <div className="h-2.5 w-4/5 rounded bg-gray-100 dark:bg-white/5" />
          </div>
        </section>
        {[0, 1, 2].map((s) => (
          <section key={s} className="space-y-3">
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/10" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-[#161618]">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-200 dark:bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-2.5 w-2/3 rounded bg-gray-100 dark:bg-white/5" />
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
