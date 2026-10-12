// /uniform — 팀 유니폼 · 사이즈표.
//
// 한 번 공지하고 끝나는 정보가 아니라 신입이 계속 찾아보는 정보라 게시글이 아니라 고정 페이지로 둔다.
// 진입은 명단 탭 상단 버튼.
//
// 사이즈표는 업체가 준 이미지를 그대로 붙이지 않고 표로 옮겨 적었다 — 폰에서 확대 없이 읽히고
// 다크 모드에서도 흰 이미지가 튀지 않는다. 업체 표가 바뀌면 아래 배열만 고친다.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "유니폼 · 사이즈 | UNDERDUCK FC",
  description: "언더덕 FC 하계·동계 유니폼과 사이즈표",
};

type SizeTable = { head: string[]; rows: (string | number)[][] };

const SUMMER: SizeTable = {
  head: ["사이즈", "어깨 단면", "가슴 단면", "상의 총장", "허리 단면", "하의 총장"],
  rows: [
    ["XS (85)", 39, 43.5, 61, 30, 45],
    ["S (90)", 40.5, 46, 64, 31.5, 46],
    ["M (95)", 42, 48.5, 67, 33, 47],
    ["L (100)", 43.5, 51, 70, 34.5, 48],
    ["XL (105)", 45, 53.5, 73, 36, 49],
    ["2XL (110)", 46.5, 56, 76, 37.5, 50],
    ["3XL (115)", 48, 58.5, 79, 39, 51],
    ["4XL (120)", 49.5, 61, 82, 40.5, 52],
    ["5XL (125)", 51, 63.5, 85, 42, 53],
  ],
};

const WINTER: SizeTable = {
  head: ["사이즈", "어깨", "가슴 단면", "소매", "총장"],
  rows: [
    ["S (90)", 43, 52, 62, 68],
    ["M (95)", 44.5, 54, 63.5, 70],
    ["L (100)", 46, 56, 65, 72],
    ["XL (105)", 47.5, 58, 66.5, 74],
    ["2XL (110)", 49, 60, 68, 76],
    ["3XL (115)", 50.5, 62, 69.5, 78],
    ["4XL (120)", 52, 64, 71, 80],
  ],
};

const KITS = [
  {
    key: "summer",
    season: "SUMMER",
    title: "하계 유니폼",
    sub: "반팔 상의 + 반바지 세트",
    photo: "/uniform/summer.webp",
    table: SUMMER,
  },
  {
    key: "winter",
    season: "WINTER",
    title: "동계 유니폼",
    sub: "하프집업 바람막이",
    photo: "/uniform/winter.webp",
    table: WINTER,
  },
];

function Table({ table }: { table: SizeTable }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
      <table className="w-full text-center text-[11px] tabular-nums">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.04]">
            {table.head.map((h) => (
              <th key={h} className="whitespace-nowrap px-2 py-2.5 text-[10px] font-black text-gray-500 dark:text-white/50">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={String(row[0])} className="border-b border-gray-100 last:border-0 dark:border-white/[0.05]">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={
                    i === 0
                      ? "whitespace-nowrap px-2 py-2 font-black text-gray-900 dark:text-white"
                      : "px-2 py-2 font-semibold text-gray-600 dark:text-white/65"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UniformPage() {
  return (
    <div className="relative mx-auto min-h-[100dvh] max-w-md bg-gray-50 text-gray-900 dark:bg-background dark:text-zinc-100">
      <header className="app-workspace-header safe-header-py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/roster"
            aria-label="뒤로"
            className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 dark:text-gray-300"
          >
            <ArrowLeft width={18} height={18} strokeWidth={2.4} />
          </Link>
          <span className="app-header-label">UNIFORM</span>
        </div>
      </header>

      <main className="space-y-10 px-4 pb-28 pt-5">
        <section>
          <p className="text-[10px] font-black tracking-[0.18em] text-[var(--ud-primary)]">UNDERDUCK FC</p>
          <h1 className="mt-2 text-[25px] font-black leading-tight tracking-[-0.04em] text-gray-900 dark:text-white">
            유니폼 · 사이즈표
          </h1>
          <p className="mt-2 text-[11px] font-bold text-gray-500 dark:text-white/45">
            단위 cm · 완성품 실측이라 1~2cm 오차가 있을 수 있어요
          </p>
        </section>

        {KITS.map((kit) => (
          <section key={kit.key}>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-[11px] font-black tracking-[0.18em] text-[var(--ud-primary)]">{kit.season}</h2>
              <span className="text-[13px] font-black text-gray-900 dark:text-white">{kit.title}</span>
              <span className="text-[10.5px] font-bold text-gray-400 dark:text-white/35">{kit.sub}</span>
            </div>
            {/* 누르면 원본 크기로 연다 — 등번호·스폰서 로고를 자세히 보려는 사람이 있다 */}
            <a href={kit.photo} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- public 정적 이미지 */}
              <img src={kit.photo} alt={`${kit.title} 사진`} loading="lazy" className="w-full bg-gray-100 dark:bg-white/5" />
            </a>
            <div className="mt-3">
              <Table table={kit.table} />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
