"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";

// 선택 가능한 선호 포지션(축구 세부 포지션). 최대 3개.
const POSITIONS = ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"] as const;
const MAX = 3;

// 포지션 카테고리별 색(앱 posColor와 동일): GK 주황 / 수비 파랑 / 미드 초록 / 공격 핑크.
const POS_COLOR: Record<string, string> = {
  GK: "#F59E0B",
  LB: "#3B82F6", CB: "#3B82F6", RB: "#3B82F6",
  CDM: "#10B981", CM: "#10B981", CAM: "#10B981",
  LW: "#FF8FA3", RW: "#FF8FA3", ST: "#FF8FA3",
};
const posColor = (p: string) => POS_COLOR[p] ?? "#94A3B8";

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
  const [saved, setSaved] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(p: string) {
    setSel((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : prev.length < MAX ? [...prev, p] : prev,
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/roster/pref-pos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: sel }),
      });
      if (!res.ok) throw new Error();
      setSaved([...sel]);
      setEditing(false);
      router.refresh();
    } catch {
      setError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  // 비편집 상태 표시
  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {saved.length > 0 ? (
          saved.map((p) => (
            <span
              key={p}
              style={{ color: posColor(p), backgroundColor: `${posColor(p)}1a` }}
              className="rounded-lg px-2.5 py-1 text-[11px] font-black"
            >
              {p}
            </span>
          ))
        ) : (
          // 칩과 같은 py-1·text-[11px] 이라야 옆에 놓였을 때 높낮이가 안 어긋난다
          <span className="py-1 text-[11px] text-gray-400">
            {canEdit ? "선호 포지션을 설정해보세요" : "미설정"}
          </span>
        )}
        {canEdit && (
          // 보조 동작이라 테두리 없이 조용하게
          <button
            onClick={() => { setSel(saved); setEditing(true); }}
            className="flex items-center gap-1 py-1 text-[10px] font-bold text-gray-400 active:opacity-60 dark:text-white/40"
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
              style={on ? { backgroundColor: posColor(p), color: "#fff" } : undefined}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black transition-colors ${
                on
                  ? ""
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
      {error && <p className="mt-2 text-[11px] font-bold text-red-500">{error}</p>}
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
