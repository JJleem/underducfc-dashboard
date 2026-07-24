import UnderduckSpinner from "./components/UnderduckSpinner";

export default function Loading() {
  return (
    <div
      className="min-h-dvh bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-zinc-100"
      aria-label="화면을 불러오는 중"
      aria-busy="true"
    >
      <header className="sticky top-0 z-50 flex h-[61px] items-center justify-between border-b border-gray-200/70 bg-white/70 px-5 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#09090b]/70">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF8FA3]" />
          <span className="h-3.5 w-24 rounded-md bg-gray-200 skeleton-shimmer dark:bg-white/10" />
        </div>
        <div className="flex gap-2">
          <span className="h-8 w-8 rounded-full bg-gray-200 skeleton-shimmer dark:bg-white/10" />
          <span className="h-8 w-8 rounded-full bg-gray-200 skeleton-shimmer dark:bg-white/10" />
        </div>
      </header>

      <main className="space-y-5 p-5 pb-28">
        <div className="flex items-center justify-center gap-2.5 py-1" role="status">
          <UnderduckSpinner iconWidth={22} iconHeight={22} />
          <span className="text-[10px] font-extrabold tracking-[0.14em] text-gray-400 dark:text-gray-500">
            LOADING DATA
          </span>
        </div>

        <section className="rounded-[24px] border border-gray-200/70 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-[#141416]">
          <div className="flex items-center gap-3.5">
            <div className="h-16 w-16 shrink-0 rounded-[20px] bg-gray-200 skeleton-shimmer dark:bg-white/[0.07]" />
            <div className="flex-1 space-y-2.5">
              <div className="h-5 w-36 rounded-md bg-gray-200 skeleton-shimmer dark:bg-white/[0.07]" />
              <div className="h-2.5 w-44 rounded bg-gray-100 skeleton-shimmer dark:bg-white/[0.05]" />
              <div className="h-2.5 w-32 rounded bg-gray-100 skeleton-shimmer dark:bg-white/[0.05]" />
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-gray-200/70 bg-white p-4 shadow-soft dark:border-white/[0.07] dark:bg-[#10182f]">
          <div className="flex justify-between">
            <div className="space-y-3">
              <div className="h-2.5 w-20 rounded bg-[#FF8FA3]/15 skeleton-shimmer" />
              <div className="h-6 w-40 rounded-md bg-gray-200 skeleton-shimmer dark:bg-white/10" />
              <div className="h-3 w-32 rounded bg-gray-100 skeleton-shimmer dark:bg-white/[0.07]" />
            </div>
            <div className="h-8 w-16 rounded-md bg-[#FF8FA3]/15 skeleton-shimmer" />
          </div>
          <div className="mt-5 h-20 rounded-2xl bg-gray-100 skeleton-shimmer dark:bg-white/[0.06]" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-[#FF8FA3]/18 skeleton-shimmer" />
            <div className="h-10 rounded-xl bg-gray-100 skeleton-shimmer dark:bg-white/[0.07]" />
          </div>
        </section>

        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-gray-200/70 bg-gray-100 p-1 dark:border-white/[0.06] dark:bg-white/[0.04]">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-10 rounded-xl bg-white skeleton-shimmer dark:bg-white/[0.07]" />
          ))}
        </div>

        {[0, 1].map((item) => (
          <div key={item} className="h-32 rounded-3xl border border-gray-200/70 bg-white skeleton-shimmer dark:border-white/[0.07] dark:bg-[#161618]" />
        ))}
      </main>
    </div>
  );
}
