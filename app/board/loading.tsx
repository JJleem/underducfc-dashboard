// 전술게시판 목록 이동 시 즉시 뜨는 스켈레톤
export default function Loading() {
  return (
    <div className="pb-24">
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#101013]/90">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-white/10" />
          <div className="h-5 w-28 rounded bg-gray-200 dark:bg-white/10" />
        </div>
        <div className="mt-2.5 h-9 w-full rounded-full bg-gray-100 dark:bg-white/5" />
      </header>
      <ul className="animate-pulse space-y-3 px-4 pt-4">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-[#161618]">
            <div className="aspect-video w-32 shrink-0 rounded-xl bg-gray-200 dark:bg-white/10" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-4/5 rounded bg-gray-200 dark:bg-white/10" />
              <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-white/10" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
