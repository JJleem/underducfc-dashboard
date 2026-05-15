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
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "../components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "../components/ui/drawer";

interface RosterClientProps {
  players: string[][];
}

export default function RosterClient({ players: initialPlayers }: RosterClientProps) {
  const { theme, setTheme } = useTheme();
  const [playerList, setPlayerList] = React.useState<string[][]>(initialPlayers);

  const [addModal, setAddModal] = React.useState(false);
  const [form, setForm] = React.useState({ no: "", name: "", pos: "MF", status: "활동" });
  const [adding, setAdding] = React.useState(false);

  const addPlayer = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("등록 실패");
      setPlayerList((prev) => [...prev, [form.no || "-", form.name, form.pos, form.status, "", ""]]);
      setAddModal(false);
      setForm({ no: "", name: "", pos: "MF", status: "활동" });
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setAdding(false);
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
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-[#F5F5DC] font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-300">
      {/* 📱 App Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
        <Link
          href="/"
          className="p-1 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </Link>
        <span className="font-black italic text-lg tracking-tighter text-gray-900 dark:text-white">
          SQUAD
        </span>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
        >
          <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
          <Sun className="hidden dark:block w-4 h-4 text-[#FFB6C1]" />
        </button>
      </header>

      <main className="p-5 pb-10">
        {/* 타이틀 영역 */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="relative w-10 h-10 rounded-full bg-white dark:bg-black border-[2px] border-[#FFB6C1] shadow-[0_0_15px_rgba(255,182,193,0.3)] flex items-center justify-center overflow-hidden">
            <Image src="/underducklogo.png" alt="Logo" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white italic">
              UNDERDUCK ROSTER
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              함께 뛰는 우리의 선수 명단입니다.
            </p>
          </div>
        </div>

        {/* 선수 리스트 카드 */}
        <div className="flex flex-col gap-3">
          {/* 선수 추가 버튼 */}
          <button
            onClick={() => setAddModal(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[#FFB6C1]/40 dark:border-[#FFB6C1]/20 text-[#FF8FA3] dark:text-[#FFB6C1] text-[13px] font-black hover:bg-[#FF8FA3]/5 dark:hover:bg-[#FFB6C1]/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            선수 추가하기
          </button>

          {playerList.map((player, index) => {
            const no = player[0] || "-";
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
                className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#1a1a1a] dark:to-[#111] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-xl hover:scale-[1.02] transition-transform duration-200"
              >
                {/* 유니폼 등번호 아바타 */}
                <div className="relative flex items-center justify-center w-14 h-16 rounded-xl overflow-hidden shadow-lg border border-[#FFB6C1]/30 shrink-0 bg-[#fff]">
                  <Image
                    src="/uniform.png"
                    alt="Uniform"
                    fill
                    className="object-cover object-center opacity-95 scale-125 translate-y-1"
                  />
                  <span
                    className="absolute z-10 text-[28px] font-black italic tracking-tighter top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pr-1.5 pb-1"
                    style={{
                      color: "#111111",
                      WebkitTextStroke: "2px #FFB6C1",
                      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8), 0px 0px 8px rgba(255, 182, 193, 0.3)",
                    }}
                  >
                    {no !== "-" ? no : "?"}
                  </span>
                </div>

                {/* 선수 정보 */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xl text-gray-800 dark:text-gray-100 flex items-center gap-2">
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
                      <Badge className="bg-[#FFB6C1]/20 dark:bg-white/5 text-[#FF8FA3] dark:text-[#FFB6C1] border-none px-2 py-0 text-[11px] font-black italic w-fit">
                        No.{no}
                      </Badge>
                    </div>
                    <Badge className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded ${getPosBadgeStyle(pos)}`}>
                      {pos}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isInjured || disabled ? "bg-red-500" : "bg-[#FF8FA3] dark:bg-[#FFB6C1] shadow-[0_0_5px_rgba(255,182,193,0.5)]"}`} />
                    <span className={`text-xs font-bold ${isInjured || disabled ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </main>

      {/* 선수 추가 Drawer */}
      <Drawer open={addModal} onOpenChange={setAddModal}>
        <DrawerContent className="bg-white dark:bg-[#1a1a1a] max-h-[85dvh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-[15px] font-black text-gray-900 dark:text-white">👤 선수 추가</DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 py-4 space-y-4">
            {/* 이름 */}
            <div>
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">이름 *</p>
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
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">등번호 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(미입력 시 -)</span></p>
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
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">포지션</p>
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
              <p className="text-[10px] font-black text-gray-400 mb-2 tracking-widest">상태</p>
              <div className="flex gap-2">
                {["활동", "부상", "비활동"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm((p) => ({ ...p, status: s }))}
                    className={`flex-1 py-2.5 rounded-xl text-[12px] font-black transition-colors ${
                      form.status === s
                        ? s === "활동"
                          ? "bg-[#FF8FA3] dark:bg-[#FFB6C1] text-white dark:text-black"
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
              onClick={addPlayer}
              disabled={adding || !form.name.trim()}
              className="w-full py-3 rounded-2xl bg-[#FF8FA3] dark:bg-[#FFB6C1] text-[13px] font-black text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "추가하기"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
