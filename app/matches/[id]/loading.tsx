// 경기 상세 이동 시 즉시 뜨는 스켈레톤 (헤더 클래스는 MatchDetailClient와 동일하게 유지)
export default function Loading() {
  return (
    <div>
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 safe-header-py-35 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-xl border-b border-gray-200/70 dark:border-white/[0.06]">
        <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10" />
      </header>
      <main className="animate-pulse space-y-4 p-5 pb-28">
        <section className="rounded-[22px] border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#161618]">
          <div className="mx-auto h-2.5 w-24 rounded bg-gray-100 dark:bg-white/5" />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-gray-200 dark:bg-white/10" />
              <div className="mx-auto h-3 w-14 rounded bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="h-9 w-20 rounded bg-gray-200 dark:bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-gray-200 dark:bg-white/10" />
              <div className="mx-auto h-3 w-14 rounded bg-gray-200 dark:bg-white/10" />
            </div>
          </div>
        </section>
        <div className="h-64 w-full rounded-[22px] bg-gray-100 dark:bg-white/5" />
        {[0, 1].map((i) => (
          <div key={i} className="h-20 w-full rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#161618]" />
        ))}
      </main>
    </div>
  );
}
