// app/roster/RosterClient.tsx
"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sun,
  Moon,
  ArrowLeft,
  Plus,
  Pencil,
  Loader2,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "../components/ui/drawer";
import AppBottomNav from "../components/AppBottomNav";
import { playerFaceOnSrc } from "../lib/player-faceons";

interface RosterClientProps {
  players: string[][];
  isAdmin?: boolean;
  currentUserName?: string | null;
}

// 포지션 그룹 메타 (앱 포지션 색 체계와 동일). 골키퍼 주황 / 수비 파랑 / 미드 초록 / 공격 핑크.
const POS_META: Record<string, { label: string; en: string; color: string }> = {
  GK: { label: "골키퍼", en: "GOALKEEPERS", color: "#F59E0B" },
  DF: { label: "수비수", en: "DEFENDERS", color: "#3B82F6" },
  MF: { label: "미드필더", en: "MIDFIELDERS", color: "#10B981" },
  FW: { label: "공격수", en: "FORWARDS", color: "#FF8FA3" },
  ETC: { label: "기타", en: "OTHERS", color: "#94A3B8" },
};
const POS_ORDER = ["GK", "DF", "MF", "FW", "ETC"];

// 스쿼드 카드 페이스온: 파일이 있으면 사진, 없거나 실패하면 실루엣.
function SquadPhoto({ name, accent }: { name: string; accent: string }) {
  const src = playerFaceOnSrc(name);
  const [failed, setFailed] = React.useState(false);
  const showPhoto = src && !failed;
  return (
    <>
      {!showPhoto && (
        <User
          className="absolute bottom-4 left-1/2 -translate-x-1/2"
          style={{ width: "48%", height: "48%", color: accent }}
          strokeWidth={1.3}
        />
      )}
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-contain object-bottom drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]"
        />
      )}
    </>
  );
}

export default function RosterClient({ players: initialPlayers, isAdmin = false, currentUserName }: RosterClientProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [playerList, setPlayerList] = React.useState<string[][]>(initialPlayers);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ no: "", name: "", pos: "MF", status: "활동" });
  const [saving, setSaving] = React.useState(false);

  const openAdd = () => {
    setMode("add");
    setEditId(null);
    setForm({ no: "", name: "", pos: "MF", status: "활동" });
    setModalOpen(true);
  };

  const openEdit = (player: string[]) => {
    setMode("edit");
    setEditId(player[6] || null);
    setForm({
      no: player[0] === "-" ? "" : player[0] || "",
      name: player[1] || "",
      pos: (player[2] || "MF").toUpperCase(),
      status: player[3] || "활동",
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (mode === "add") {
        const res = await fetch("/api/roster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("등록 실패");
        const data = await res.json().catch(() => ({}));
        const newId = data?.id != null ? String(data.id) : "";
        setPlayerList((prev) => [...prev, [form.no || "-", form.name, form.pos, form.status, "", "", newId]]);
      } else {
        if (!editId) throw new Error("수정할 선수를 찾을 수 없습니다.");
        const res = await fetch(`/api/roster/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("수정 실패");
        setPlayerList((prev) =>
          prev.map((p) =>
            p[6] === editId
              ? [form.no || "-", form.name, form.pos, form.status, p[4] || "", p[5] || "", p[6]]
              : p
          )
        );
      }
      setModalOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const byNumber = (a: string[], b: string[]) => {
    const nA = parseInt(a[0]);
    const nB = parseInt(b[0]);
    const hasA = !isNaN(nA) && a[0]?.trim() !== "" && a[0] !== "-";
    const hasB = !isNaN(nB) && b[0]?.trim() !== "" && b[0] !== "-";
    if (hasA && hasB) return nA - nB;
    if (hasA) return -1;
    if (hasB) return 1;
    return 0;
  };

  // 포지션별로 묶고 각 그룹은 등번호순 정렬
  const grouped = React.useMemo(() => {
    const g: Record<string, string[][]> = {};
    for (const p of playerList) {
      const raw = (p[2] || "").toUpperCase().trim();
      const key = ["GK", "DF", "MF", "FW"].includes(raw) ? raw : "ETC";
      (g[key] ||= []).push(p);
    }
    for (const k of Object.keys(g)) g[k].sort(byNumber);
    return g;
  }, [playerList]);

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-zinc-100 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-300">
      {/* 📱 App Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-xl border-b border-gray-200/70 dark:border-white/[0.06]">
        <Link
          href="/"
          className="p-1 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </Link>
        <span className="text-[15px] font-extrabold tracking-tight text-gray-900 dark:text-white uppercase">
          SQUAD
        </span>
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
        >
          <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
          <Sun className="hidden dark:block w-4 h-4 text-[#FFB6C1]" />
        </button>
      </header>

      <main className="p-5 pb-28">
        {/* 타이틀 영역 */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="relative w-10 h-10 rounded-full bg-white dark:bg-[#161618] ring-1 ring-gray-200 dark:ring-white/10 shadow-sm flex items-center justify-center overflow-hidden">
            <Image src="/underducklogo.png" alt="Logo" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              UNDERDUCK ROSTER
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              함께 뛰는 우리의 선수 명단입니다.
            </p>
          </div>
        </div>

        {/* 관리자: 선수 추가 */}
        {isAdmin && (
          <button
            onClick={openAdd}
            className="mb-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400 text-[13px] font-semibold hover:border-[#FFB6C1] hover:text-[#FF8FA3] dark:hover:text-[#FFB6C1] transition-colors"
          >
            <Plus className="w-4 h-4" />
            선수 추가하기
          </button>
        )}

        {/* 포지션별 스쿼드 그리드 */}
        <div className="space-y-7">
          {POS_ORDER.map((key) => {
            const group = grouped[key];
            if (!group || group.length === 0) return null;
            const meta = POS_META[key];
            return (
              <section key={key}>
                {/* 그룹 헤더 */}
                <div className="mb-3 flex items-baseline gap-2 px-0.5">
                  <span className="h-3.5 w-1 self-center rounded-full" style={{ background: meta.color }} />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-800 dark:text-gray-100">{meta.en}</h2>
                  <span className="text-[11px] font-bold text-gray-400">{meta.label}</span>
                  <span className="ml-auto text-[12px] font-black tabular-nums" style={{ color: meta.color }}>{group.length}</span>
                </div>

                {/* 카드 그리드 */}
                <div className="grid grid-cols-3 gap-2">
                  {group.map((player, index) => {
                    const rawNo = (player[0] || "").trim();
                    const hasNo = !!rawNo && rawNo !== "-" && !isNaN(parseInt(rawNo));
                    const name = player[1] || "무명";
                    const status = player[3] || "활동";
                    const etc = (player[5] || "").toLowerCase().trim();
                    const isC = etc === "c";
                    const isVC = etc === "vc";
                    const isInjured = status === "부상";
                    const isInactive = status === "비활동";
                    const color = meta.color;

                    return (
                      <div
                        key={player[6] || index}
                        style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                        className="animate-rise relative"
                      >
                        <Link
                          href={`/players/${encodeURIComponent(name.trim())}`}
                          className={`group relative block aspect-[3/4] overflow-hidden rounded-2xl border border-gray-200/70 dark:border-white/[0.06] shadow-soft transition-transform active:scale-[0.98] ${isInactive ? "opacity-55" : ""}`}
                          style={{ background: `linear-gradient(155deg, ${color}26 0%, ${color}0d 42%, transparent 72%)` }}
                        >
                          {/* 큰 등번호 (시그니처) */}
                          {hasNo && (
                            <span
                              className="pointer-events-none absolute -top-1 right-0.5 select-none font-black leading-none tabular-nums"
                              style={{ fontSize: "58px", color: `${color}33` }}
                            >
                              {rawNo}
                            </span>
                          )}

                          {/* 페이스온 */}
                          <SquadPhoto name={name} accent={color} />

                          {/* 하단 그라데이션 + 텍스트 */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-2 pb-2 pt-8">
                            <div className="flex items-center gap-1">
                              <span className="truncate text-[12px] font-black leading-tight text-white">{name}</span>
                              {isC && <span className="shrink-0 rounded bg-emerald-400 px-1 py-px text-[7px] font-black text-black">C</span>}
                              {isVC && <span className="shrink-0 rounded bg-amber-400 px-1 py-px text-[7px] font-black text-black">VC</span>}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <span className="rounded px-1 py-0.5 text-[8px] font-black text-white" style={{ background: color }}>{player[2] || "-"}</span>
                              {isInjured && <span className="text-[9px] font-black text-red-300">부상</span>}
                              {isInactive && <span className="text-[9px] font-black text-white/50">비활동</span>}
                            </div>
                          </div>
                        </Link>

                        {/* 관리자 편집 (링크와 분리) */}
                        {isAdmin && (
                          <button
                            onClick={() => openEdit(player)}
                            className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm active:opacity-70"
                            aria-label="선수 수정"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <AppBottomNav active="home" currentUserName={currentUserName} />

      {/* 선수 추가/수정 Drawer */}
      <Drawer open={modalOpen} onOpenChange={setModalOpen} repositionInputs={false}>
        <DrawerContent className="bg-white dark:bg-[#161618] max-h-[85dvh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-[15px] font-bold text-gray-900 dark:text-white">
              {mode === "add" ? "선수 추가" : "선수 수정"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 py-4 space-y-4">
            {/* 이름 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">이름 *</p>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="선수 이름"
                className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            {/* 등번호 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">등번호 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(미입력 시 -)</span></p>
              <input
                type="number"
                value={form.no}
                onChange={(e) => setForm((p) => ({ ...p, no: e.target.value }))}
                placeholder="등번호"
                min={0}
                max={99}
                className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            {/* 포지션 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">포지션</p>
              <div className="grid grid-cols-4 gap-2">
                {["GK", "DF", "MF", "FW"].map((p) => {
                  const styles: Record<string, string> = {
                    GK: "bg-yellow-400 text-white",
                    DF: "bg-blue-500 text-white",
                    MF: "bg-green-500 text-white",
                    FW: "bg-red-500 text-white",
                  };
                  const inactiveStyles: Record<string, string> = {
                    GK: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400",
                    DF: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
                    MF: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400",
                    FW: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
                  };
                  return (
                    <button
                      key={p}
                      onClick={() => setForm((prev) => ({ ...prev, pos: p }))}
                      className={`py-2.5 rounded-xl text-[12px] font-black transition-colors ${form.pos === p ? styles[p] : inactiveStyles[p]}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 상태 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">상태</p>
              <div className="flex gap-2">
                {["활동", "부상", "비활동"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm((p) => ({ ...p, status: s }))}
                    className={`flex-1 py-2.5 rounded-xl text-[12px] font-black transition-colors ${
                      form.status === s
                        ? s === "활동"
                          ? "bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black"
                          : "bg-red-500 text-white"
                        : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DrawerFooter className="pt-2">
            <button
              onClick={submit}
              disabled={saving || !form.name.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-[13px] font-black text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "add" ? "추가하기" : "수정하기"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
