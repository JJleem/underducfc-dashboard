"use client";

// 내 프로필 — 선수 사진을 하계/동계 중 어느 유니폼으로 쓸지. 누르면 바로 저장한다.
// 사진이 두 장 다 있는 본인에게만 뜬다(프로필 페이지에서 거른다).

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Kit } from "../lib/player-faceons";

const OPTIONS: { kit: Kit; label: string }[] = [
  { kit: "summer", label: "하계" },
  { kit: "winter", label: "동계" },
];

export default function KitPicker({ initial }: { initial: Kit }) {
  const router = useRouter();
  const [kit, setKit] = useState<Kit>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: Kit) {
    if (next === kit || saving) return;
    const prev = kit;
    setKit(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/roster/kit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kit: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setKit(prev);
      setError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-white/5">
        {OPTIONS.map((o) => (
          <button
            key={o.kit}
            onClick={() => choose(o.kit)}
            disabled={saving}
            aria-pressed={kit === o.kit}
            className={`min-h-8 whitespace-nowrap rounded-md px-3 text-[12px] font-black transition-colors disabled:opacity-60 ${
              kit === o.kit
                ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
                : "text-gray-500 active:opacity-70 dark:text-white/50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-[12px] font-bold text-red-500">{error}</p>}
    </div>
  );
}
