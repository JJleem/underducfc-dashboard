"use client";
// 대표 칭호 선택 (본인만). 라인업/순위에 보일 최대 3개를 순서대로 고른다.

import { createElement, useState } from "react";
import { Pencil } from "lucide-react";
import { EarnedTitle } from "../lib/titles";
import { titleIcon } from "../lib/title-icons";

export default function FeaturedEditor({
  titles,
  current,
}: {
  titles: EarnedTitle[];
  current: string[];
}) {
  const [open, setOpen] = useState(false);
  const earnedIds = new Set(titles.map((t) => t.id));
  const validCurrent = current.filter((id) => earnedIds.has(id)).slice(0, 3);
  const [sel, setSel] = useState<string[]>(validCurrent);
  const [saved, setSaved] = useState<string[]>(validCurrent);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!titles.length) return null;

  const toggle = (id: string) =>
    setSel((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]
    );

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleIds: sel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setSaved(sel);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-black bg-[#FF8FA3]/15 text-[#FF8FA3] dark:text-[#FFB6C1] border border-[#FF8FA3]/30 active:scale-95 transition-transform"
      >
        <Pencil className="w-3.5 h-3.5" />
        대표 칭호 고르기
      </button>
    );
  }

  return (
    <div className="mb-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3">
      <p className="text-[11px] font-black text-gray-700 dark:text-gray-200 mb-2.5">
        라인업에 보일 대표 칭호 <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{sel.length}/3</span>
        <span className="text-gray-400 font-bold ml-1">· 고른 순서대로 표시</span>
      </p>
      <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
        {titles.map((t) => {
          const order = sel.indexOf(t.id);
          const on = order >= 0;
          const icon = createElement(titleIcon(t.icon), { size: 13, strokeWidth: 2.4 });
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                on
                  ? "bg-[#FF8FA3] text-white border-[#FF8FA3]"
                  : "bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10"
              }`}
            >
              {icon}
              {t.name}
              {t.tierLabel ? ` ${t.tierLabel}` : ""}
              {on && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/30 text-[9px] font-black">
                  {order + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {err && <p className="text-[11px] font-bold text-red-500 mt-2">{err}</p>}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setSel(saved);
            setErr(null);
          }}
          className="flex-1 py-2 rounded-xl text-[12px] font-black bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
        >
          취소
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 py-2 rounded-xl text-[12px] font-black bg-[#FF8FA3] text-white disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}
