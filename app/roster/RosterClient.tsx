// app/roster/RosterClient.tsx
"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  UserCircle,
  Sun,
  Moon,
  ArrowLeft,
  ShieldCheck,
  Star,
  Plus,
  Pencil,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "../components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "../components/ui/drawer";
import AppBottomNav from "../components/AppBottomNav";

interface RosterClientProps {
  players: string[][];
  isAdmin?: boolean;
  currentUserName?: string | null;
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

  const getPosBadgeStyle = (pos: string) => {
    const p = pos.toUpperCase().trim();
    if (p === "GK")
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/70 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800";
    if (p === "DF")
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200 border border-blue-200 dark:border-blue-800";
    if (p === "MF")
      return "bg-green-100 text-green-800 dark:bg-green-950/70 dark:text-green-200 border border-green-200 dark:border-green-800";
    if (p === "FW")
      return "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200 border border-red-200 dark:border-red-800";
    return "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10";
  };

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

        {/* 선수 리스트 카드 */}
        <div className="flex flex-col gap-3">
          {/* 선수 추가 버튼 (관리자 전용) */}
          {isAdmin && (
            <button
              onClick={openAdd}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400 text-[13px] font-semibold hover:border-[#FFB6C1] hover:text-[#FF8FA3] dark:hover:text-[#FFB6C1] transition-colors"
            >
              <Plus className="w-4 h-4" />
              선수 추가하기
            </button>
          )}

          {[...playerList].sort((a, b) => {
            const nA = parseInt(a[0]);
            const nB = parseInt(b[0]);
            const hasA = !isNaN(nA) && a[0]?.trim() !== "" && a[0] !== "-";
            const hasB = !isNaN(nB) && b[0]?.trim() !== "" && b[0] !== "-";
            if (hasA && hasB) return nA - nB;
            if (hasA) return -1;
            if (hasB) return 1;
            return 0;
          }).map((player, index) => {
            const rawNo = player[0]?.trim();
            const hasNo = rawNo && rawNo !== "-" && !isNaN(parseInt(rawNo));
            const no = hasNo ? rawNo : "미정";
            const name = player[1] || "무명";
            const pos = player[2] || "SUB";
            const status = player[3] || "활동";
            const etc = player[5]?.toLowerCase().trim() || "";

            const isC = etc === "c";
            const isVC = etc === "vc";
            const isInjured = status === "부상";
            const disabled = status === "비활동";

            return (
              <div
                key={index}
                style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
                className="animate-rise flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#161618] border border-gray-200/70 dark:border-white/[0.06] shadow-soft hover:border-gray-300 dark:hover:border-white/15 transition-colors"
              >
                {/* 유니폼 등번호 아바타 */}
                <div className="relative flex items-center justify-center w-14 h-16 rounded-xl overflow-hidden shadow-sm ring-1 ring-gray-200 dark:ring-white/10 shrink-0 bg-white">
                  <Image
                    src="/uniform.png"
                    alt="Uniform"
                    fill
                    className="object-cover object-center opacity-95 scale-125 translate-y-1"
                  />
                  <span
                    className="absolute z-10 font-extrabold tracking-tight top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pr-1.5 pb-1"
                    style={{
                      fontSize: hasNo ? "26px" : "16px",
                      color: "#FF8FA3",
                      textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                    }}
                  >
                    {hasNo ? rawNo : "?"}
                  </span>
                </div>

                {/* 선수 정보 */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xl text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {name}
                          {isC && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-950/70 dark:text-green-200 border-none px-1.5 py-0 rounded text-[9px] font-black h-4">
                              C
                            </Badge>
                          )}
                          {isVC && (
                            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-200 border-none px-1.5 py-0 rounded text-[9px] font-black h-4">
                              VC
                            </Badge>
                          )}
                        </span>
                      </div>
                      <Badge className="bg-[#FFB6C1]/15 dark:bg-white/5 text-[#FF8FA3] dark:text-[#FFB6C1] border-none px-2 py-0 text-[11px] font-bold tabular-nums w-fit">
                        {hasNo ? `No.${rawNo}` : "미정"}
                      </Badge>
                    </div>
                    <Badge className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded ${getPosBadgeStyle(pos)}`}>
                      {pos}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isInjured || disabled ? "bg-red-500" : "bg-emerald-500"}`} />
                    <span className={`text-xs font-bold ${isInjured || disabled ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                      {status}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => openEdit(player)}
                    className="self-start shrink-0 p-2 -mr-1 -mt-1 rounded-full text-gray-400 hover:text-[#FF8FA3] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    aria-label="선수 수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
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
