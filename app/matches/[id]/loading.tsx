// 경기 상세 이동 시 즉시 뜨는 스켈레톤. 실제 화면과 같은 헤어라인 리듬을 유지한다.
export default function Loading() {
  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-gray-200/60 bg-gray-50/85 px-4 safe-header-py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#09090b]/85">
        <div className="h-5 w-5 rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-3 w-14 rounded bg-gray-200 dark:bg-white/10" />
        <div className="ml-auto h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10" />
      </header>
      <main className="animate-pulse pb-6">
        <section className="border-b border-gray-200/70 px-4 pb-5 pt-4 dark:border-white/[0.07]">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-3 w-28 rounded bg-gray-200 dark:bg-white/10" />
              <div className="h-2.5 w-40 rounded bg-gray-100 dark:bg-white/5" />
            </div>
            <div className="h-3 w-8 rounded bg-gray-200 dark:bg-white/10" />
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <div className="mx-auto h-14 w-14 rounded-full bg-gray-200 dark:bg-white/10" />
              <div className="mx-auto h-3 w-14 rounded bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="h-10 w-24 rounded bg-gray-200 dark:bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="mx-auto h-14 w-14 rounded-full bg-gray-200 dark:bg-white/10" />
              <div className="mx-auto h-3 w-14 rounded bg-gray-200 dark:bg-white/10" />
            </div>
          </div>
        </section>
        <section className="divide-y divide-gray-100 border-b border-gray-200/70 px-4 dark:divide-white/[0.06] dark:border-white/[0.07]">
          <div className="h-24 py-4"><div className="h-full rounded bg-gray-100 dark:bg-white/5" /></div>
          <div className="h-14 py-4"><div className="h-full rounded bg-gray-100 dark:bg-white/5" /></div>
          <div className="h-24 py-4"><div className="h-full rounded bg-gray-100 dark:bg-white/5" /></div>
        </section>
        <section className="px-4 pt-5">
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-white/10" />
          <div className="mt-4 h-64 w-full rounded-2xl bg-gray-100 dark:bg-white/5" />
        </section>
      </main>
    </div>
  );
}
