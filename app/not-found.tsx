import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
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
        <p className="text-6xl font-black tracking-tight text-[#FF8FA3] dark:text-[#FFB6C1]">404</p>
        <h1 className="text-lg font-black text-gray-900 dark:text-white">페이지를 찾을 수 없어요</h1>
        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          주소가 바뀌었거나 삭제된 페이지일 수 있어요.
        </p>
      </div>

      <Link
        href="/"
        className="rounded-full bg-[#FF8FA3] px-6 py-3 text-sm font-black text-white shadow-sm active:opacity-80 dark:bg-[#FFB6C1] dark:text-black"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
