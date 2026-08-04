// 스탯·전적처럼 홈에서 갈라져 나온 페이지의 상단 바.
// 프로필(app/players/[name])의 상단 바와 같은 문법이다 — 뒤로가기 + 영문 라벨 하나.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PageHeader({ label, back = "/" }: { label: string; back?: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200/60 bg-gray-50/80 px-4 safe-header-py-3 backdrop-blur dark:border-white/[0.06] dark:bg-[#09090b]/80">
      <Link href={back} aria-label="뒤로" className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 dark:text-gray-300">
        <ArrowLeft width={18} height={18} strokeWidth={2.4} />
      </Link>
      <span className="text-[12px] font-black tracking-widest text-gray-400">{label}</span>
    </div>
  );
}
