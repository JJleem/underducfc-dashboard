"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";

// 선택 가능한 선호 포지션(축구 세부 포지션). 최대 3개.
const POSITIONS = ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"] as const;
const MAX = 3;

export default function PrefPosEditor({
  initial,
  canEdit,
}: {
  initial: string[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);

  function toggle(p: string) {
    setSel((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : prev.length < MAX ? [...prev, p] : prev,
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/roster/pref-pos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: sel }),
      });
      if (!res.ok) throw new Error();
      setEditing(false);
      router.refresh();
    } catch {
      alert("저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  // 비편집 상태 표시
  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {initial.length > 0 ? (
          initial.map((p) => (
            <span
              key={p}
              className="rounded-lg bg-[#FF8FA3]/10 px-2.5 py-1 text-[11px] font-black text-[#FF8FA3] dark:bg-[#FFB6C1]/10 dark:text-[#FFB6C1]"
            >
              {p}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-gray-400">{canEdit ? "선호 포지션을 설정해보세요" : "미설정"}</span>
        )}
        {canEdit && (
          <button
            onClick={() => { setSel(initial); setEditing(true); }}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-bold text-gray-500 active:opacity-60 dark:border-white/10 dark:text-gray-400"
          >
            <Pencil className="h-3 w-3" /> 편집
          </button>
        )}
      </div>
    );
  }

  // 편집 상태
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-[#161618]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">최대 {MAX}개 선택 ({sel.length}/{MAX})</p>
        <button onClick={() => setEditing(false)} className="p-1 text-gray-400 active:opacity-60" aria-label="닫기">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {POSITIONS.map((p) => {
          const on = sel.includes(p);
          const disabled = !on && sel.length >= MAX;
          return (
            <button
              key={p}
              onClick={() => toggle(p)}
              disabled={disabled}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black transition-colors ${
                on
                  ? "bg-[#FF8FA3] text-white dark:bg-[#FFB6C1] dark:text-black"
                  : disabled
                    ? "bg-gray-50 text-gray-300 dark:bg-white/5 dark:text-gray-600"
                    : "bg-gray-100 text-gray-600 active:opacity-70 dark:bg-white/5 dark:text-gray-300"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FF8FA3] py-2.5 text-sm font-black text-white active:opacity-80 disabled:opacity-40 dark:bg-[#FFB6C1] dark:text-black"
      >
        <Check className="h-4 w-4" /> {saving ? "저장 중…" : "저장"}
      </button>
    </div>
  );
}
