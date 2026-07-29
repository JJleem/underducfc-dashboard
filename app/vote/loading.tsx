// 투표 이동 시 즉시 뜨는 스켈레톤 (헤더 클래스는 VoteClient와 동일하게 유지)
export default function Loading() {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-[#0B0B0D]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 px-4 safe-header-py-3">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-white/10" />
        <div className="mt-2 h-2.5 w-40 rounded bg-gray-100 dark:bg-white/5" />
      </div>
      <main className="animate-pulse space-y-4 p-4 pb-28">
        {[0, 1].map((i) => (
          <section key={i} className="rounded-[22px] border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#161618]">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-white/10" />
                <div className="h-2.5 w-24 rounded bg-gray-100 dark:bg-white/5" />
              </div>
            </div>
            <div className="mt-4 h-28 w-full rounded-2xl bg-gray-100 dark:bg-white/5" />
            <div className="mt-3 flex gap-2">
              <div className="h-10 flex-1 rounded-xl bg-gray-200 dark:bg-white/10" />
              <div className="h-10 flex-1 rounded-xl bg-gray-100 dark:bg-white/5" />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
