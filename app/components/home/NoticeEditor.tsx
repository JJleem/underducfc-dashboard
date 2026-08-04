"use client";
// 관리자 — 공지 수정. 시트에 한 줄만 두는 구조라 "추가"가 아니라 항상 덮어쓴다.
// 장소를 적으면 홈 공지에 지도가 따라 붙는다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";

export default function NoticeEditor({
  initial,
}: {
  initial: { date: string; title: string; content: string; important: boolean; location: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initial);

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("제목과 내용은 필수입니다.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/notice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "저장 실패");
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full rounded-xl bg-gray-100 px-3.5 py-2.5 text-[13px] font-medium text-gray-900 outline-none placeholder:text-gray-400 dark:bg-white/10 dark:text-white dark:placeholder:text-white/25";
  const label = "mb-1.5 block text-[10px] font-black tracking-[0.14em] text-gray-400 dark:text-white/35";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="공지 수정"
        title="공지 수정"
        className="flex w-9 shrink-0 flex-col items-center gap-0.5 py-0.5 text-gray-400 active:opacity-60 dark:text-white/40"
      >
        <Pencil width={17} height={17} strokeWidth={2.2} />
        <span className="text-[8px] font-black leading-none">편집</span>
      </button>

      <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
        <DrawerContent className="max-h-[88dvh] bg-white dark:bg-[#161618]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-[15px] font-bold text-gray-900 dark:text-white">
              공지사항 수정
            </DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
            <div className="flex flex-col gap-3.5">
                <div>
                  <span className={label}>날짜</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className={field}
                  />
                </div>
                <div>
                  <span className={label}>제목 *</span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="공지 제목"
                    className={field}
                  />
                </div>
                <div>
                  <span className={label}>내용 *</span>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    rows={5}
                    placeholder="공지 내용"
                    className={`${field} resize-none leading-[1.7]`}
                  />
                </div>
                <div>
                  <span className={label}>
                    장소{" "}
                    <span className="font-medium normal-case tracking-normal text-gray-300 dark:text-gray-600">
                      (선택 — 구장 안내 시 지도 표시)
                    </span>
                  </span>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="예: 서울 월드컵 풋살파크"
                    className={field}
                  />
                </div>

                <label className="flex items-center gap-2 text-[13px] font-bold text-gray-700 dark:text-white/70">
                  <input
                    type="checkbox"
                    checked={form.important}
                    onChange={(e) => setForm((p) => ({ ...p, important: e.target.checked }))}
                    className="h-4 w-4 accent-[#FF8FA3]"
                  />
                  중요 공지로 표시
                </label>

                {error && <p className="text-[12px] font-bold text-red-500">{error}</p>}

                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-2xl bg-[#FF8FA3] py-3 text-[13px] font-black text-white disabled:opacity-40"
                >
                  {saving && <Loader2 width={15} height={15} className="animate-spin" />}
                  저장하기
                </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
