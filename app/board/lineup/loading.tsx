// 전술 라인업 이동 시 즉시 뜨는 스켈레톤 (헤더 클래스는 BoardLineupClient와 동일하게 유지)
export default function Loading() {
  return (
    <div>
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/70 bg-white/70 px-4 safe-header-py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#09090b]/70">
        <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10" />
      </header>
      <main className="animate-pulse space-y-4 p-4 pb-28">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-16 shrink-0 rounded-full bg-gray-100 dark:bg-white/5" />
          ))}
        </div>
        <div className="aspect-[3/4] w-full rounded-[22px] bg-gray-100 dark:bg-white/5" />
        <div className="h-16 w-full rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#161618]" />
      </main>
    </div>
  );
}
