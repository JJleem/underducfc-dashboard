// 게시글 상세 이동 시 즉시 뜨는 스켈레톤 (서버 fetch 동안 빈 화면 방지)
export default function Loading() {
  return (
    <div className="pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-200/70 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#101013]/90">
        <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-white/10" />
      </header>
      <div className="animate-pulse px-4 pt-4">
        <div className="aspect-video w-full rounded-2xl bg-gray-200 dark:bg-white/10" />
        <div className="mt-3 h-5 w-3/4 rounded bg-gray-200 dark:bg-white/10" />
        <div className="mt-2 h-3 w-1/3 rounded bg-gray-200 dark:bg-white/10" />
        <div className="mt-4 h-9 w-full rounded bg-gray-100 dark:bg-white/5" />
      </div>
    </div>
  );
}
