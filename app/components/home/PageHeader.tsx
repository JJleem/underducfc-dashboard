// 스탯·전적처럼 홈에서 갈라져 나온 페이지의 상단 바.
// 프로필(app/players/[name])의 상단 바와 같은 문법이다 — 뒤로가기 + 라벨 하나.
// 하단 탭으로 들어오는 최상위 화면(back={null})은 뒤로가기 없이 제목만 둔다.

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
  back?: string | null;
  right?: ReactNode;
}) {
  return (
    <div className="app-page-header safe-header-py-3">
      {back !== null && (
        <Link href={back} aria-label="뒤로" className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 dark:text-gray-300">
          <ArrowLeft width={20} height={20} strokeWidth={2.2} />
        </Link>
      )}
      <span className={`${back === null ? "app-header-title" : "app-header-label"} min-w-0 truncate`}>{label}</span>
      {right && <span className="ml-auto flex shrink-0 items-center">{right}</span>}
    </div>
  );
}
