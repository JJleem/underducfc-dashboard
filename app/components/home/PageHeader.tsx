// 스탯·전적처럼 홈에서 갈라져 나온 페이지의 상단 바.
// 프로필(app/players/[name])의 상단 바와 같은 문법이다 — 뒤로가기 + 영문 라벨 하나.

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export default function PageHeader({
  label,
  back = "/",
  /** 오른쪽 끝에 붙일 것. 시즌 셀렉터가 여기 들어간다. */
  right,
}: {
  label: string;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <div className="app-page-header safe-header-py-3">
      <Link href={back} aria-label="뒤로" className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 dark:text-gray-300">
        <ArrowLeft width={18} height={18} strokeWidth={2.4} />
      </Link>
      <span className="app-header-label">{label}</span>
      {right && <span className="ml-auto flex items-center">{right}</span>}
    </div>
  );
}
