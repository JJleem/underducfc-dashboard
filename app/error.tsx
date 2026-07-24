"use client";

import Image from "next/image";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-7 px-8 text-center">
      <Image
        src="/underducklogo.png"
        alt="언더덕"
        width={100}
        height={100}
        className="rounded-3xl opacity-90 shadow-soft"
        priority
      />

      <div className="space-y-2">
        <h1 className="text-lg font-black text-gray-900 dark:text-white">앗, 문제가 생겼어요</h1>
        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          일시적인 오류가 발생했어요.
          <br />
          앱을 다시 껐다 켜거나 아래 버튼을 눌러주세요.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="rounded-full bg-[#FF8FA3] px-6 py-3 text-sm font-black text-white shadow-sm active:opacity-80 dark:bg-[#FFB6C1] dark:text-black"
        >
          다시 시도
        </button>
        <a
          href="/"
          className="rounded-full bg-gray-100 px-6 py-3 text-sm font-black text-gray-600 active:opacity-70 dark:bg-white/5 dark:text-gray-300"
        >
          홈으로
        </a>
      </div>
    </div>
  );
}
