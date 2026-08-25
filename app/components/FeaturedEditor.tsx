"use client";
// 대표 칭호 선택 (본인만). 라인업/순위에 보일 최대 3개를 순서대로 고른다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Pencil } from "lucide-react";
import { EarnedTitle } from "../lib/titles";
import { TitleBadge, titleMetal } from "./TitleBadges";

export default function FeaturedEditor({
  titles,
  current,
  open: openProp,
  onOpenChange,
}: {
  titles: EarnedTitle[];
  current: string[];
  /** 넘기면 제어 모드 — 자체 트리거 버튼을 그리지 않는다(하이라이트 줄의 ＋ 동그라미가 대신 연다). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = (next: boolean) => {
    if (controlled) onOpenChange?.(next);
    else setOpenState(next);
  };
  const earnedIds = new Set(titles.map((t) => t.id));
  const validCurrent = current.filter((id) => earnedIds.has(id)).slice(0, 3);
  const [sel, setSel] = useState<string[]>(validCurrent);
  const [saved, setSaved] = useState<string[]>(validCurrent);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!titles.length) return null;

  const toggle = (id: string) => {
    if (saving) return;
    setSuccess(false);
    setErr(null);
    setSel((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]
    );
  };

  const save = async () => {
    setSaving(true);
    setSuccess(false);
    setErr(null);
    try {
      const res = await fetch("/api/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleIds: sel }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `저장하지 못했습니다. (${res.status})`);
      setSaved([...sel]);
      setSuccess(true);
      // 서버 캐시는 /api/featured 가 무효화하지만, 이미 방문한 라인업·순위 화면은
      // 클라이언트 라우터 캐시에 남아 옛 뱃지를 그대로 보여준다. refresh 가 그걸 비운다.
      router.refresh();
      // 완료 상태를 사용자가 인지한 뒤 편집기를 닫는다.
      window.setTimeout(() => setOpen(false), 900);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    if (controlled) return null;
    return (
      // 섹션 제목 옆에 붙는 보조 동작이라 조용하게 — 예전엔 핑크 블록이라 너무 튀었다
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-gray-400 active:opacity-60 dark:text-white/40"
      >
        <Pencil className="h-3 w-3" />
        대표 고르기
      </button>
    );
  }

  return (
    <div className="mb-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-[11px] font-black text-gray-700 dark:text-gray-200">
          라인업에 보일 대표 칭호 <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{sel.length}/3</span>
          <span className="ml-1 font-bold text-gray-400">· 고른 순서대로 표시</span>
        </p>
        <Link
          href="/titles"
          className="flex shrink-0 items-center gap-0.5 rounded-lg bg-[#FF8FA3]/10 px-2 py-1.5 text-[9px] font-black text-[#E96882] active:opacity-60 dark:text-[#FFB6C1]"
        >
          칭호 상세보기
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
        {titles.map((t) => {
          const order = sel.indexOf(t.id);
          const on = order >= 0;
          const [, highlight, base] = titleMetal(t).ramp;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              disabled={saving}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all disabled:cursor-wait disabled:opacity-60 ${
                on
                  ? "text-gray-900 shadow-sm dark:text-white"
                  : "bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10"
              }`}
              style={on ? {
                borderColor: base,
                background: `linear-gradient(135deg, ${highlight}55, ${base}30)`,
                boxShadow: `0 0 0 1px ${base}20, 0 3px 10px ${base}22`,
              } : undefined}
            >
              <TitleBadge title={t} size={16} />
              {t.name}
              {t.tierLabel ? ` ${t.tierLabel}` : ""}
              {on && (
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                  style={{ backgroundColor: base }}
                >
                  {order + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div aria-live="polite" className="min-h-6">
        {saving && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> 대표 칭호를 저장하고 있습니다…
          </p>
        )}
        {success && !saving && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> 저장 완료! 라인업에 바로 반영됩니다.
          </p>
        )}
        {err && !saving && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold text-red-500">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>저장하지 못했습니다. {err}</span>
          </p>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setSel(saved);
            setErr(null);
            setSuccess(false);
          }}
          disabled={saving}
          className="flex-1 py-2 rounded-xl text-[12px] font-black bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
        >
          취소
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || success}
          className="app-action-primary flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-black disabled:opacity-60"
        >
          {saving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 저장 중…</>
          ) : success ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> 저장 완료</>
          ) : err ? "다시 시도" : "저장"
          }
        </button>
      </div>
    </div>
  );
}
