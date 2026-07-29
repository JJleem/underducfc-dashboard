// 미디어 이동 시 즉시 뜨는 스켈레톤 (헤더 클래스는 MediaClient와 동일하게 유지)
export default function Loading() {
  return (
    <div>
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 safe-header-py-35 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-xl border-b border-gray-200/70 dark:border-white/[0.06]">
        <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10" />
      </header>
      <main className="animate-pulse p-5 pb-28">
        <div className="h-4 w-28 rounded bg-gray-200 dark:bg-white/10" />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gray-100 dark:bg-white/5" />
          ))}
        </div>
      </main>
    </div>
  );
}
