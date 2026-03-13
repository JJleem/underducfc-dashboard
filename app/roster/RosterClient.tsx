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
} from "lucide-react"; // 아이콘 추가
import { useTheme } from "next-themes";
import { Badge } from "../components/ui/badge";

interface RosterClientProps {
  players: string[][];
}

export default function RosterClient({ players }: RosterClientProps) {
  const { theme, setTheme } = useTheme();

  // 💡 포지션별 뱃지 컬러 스타일을 반환하는 함수
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
      {/* 📱 App Header (뒤로 가기 버튼 포함) */}
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
          {/* 💡 수정된 부분: next/image를 사용하여 동그랗고 꽉 차게 렌더링 */}
          <div className="relative w-10 h-10 rounded-full bg-white dark:bg-black border-[2px] border-[#FFB6C1] shadow-[0_0_15px_rgba(255,182,193,0.3)] flex items-center justify-center overflow-hidden">
            <Image
              src="/underducklogo.png"
              alt="Logo"
              fill
              className="object-contain "
            />
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
          {players.map((player: string[], index: number) => {
            // 🚨 데이터 추출 순서 점검 (A:No, B:Name, C:Pos, D:Status, F:etc 가정)
            const no = player[0] || "-";
            const name = player[1] || "무명";
            const pos = player[2] || "SUB";
            const status = player[3] || "활동";
            // safe access를 위해 optional chaining 및 소문자 변환
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
                {/* 왼쪽: 커스텀 유니폼 등번호 아바타 */}
                <div className="relative flex items-center justify-center w-14 h-16 rounded-xl overflow-hidden shadow-lg border border-[#FFB6C1]/30 shrink-0 bg-[#fff]">
                  {/* 1. 바탕에 깔리는 유니폼 이미지 (CSS로 크기 확대) */}
                  <Image
                    src="/uniform.png"
                    alt="Uniform"
                    fill
                    // 💡 scale-125: 이미지를 25% 줌인해서 유니폼이 꽉 차게 만듭니다.
                    // 💡 translate-y-1: 이미지를 살짝 아래로 내려서 비율을 맞춥니다.
                    className="object-cover object-center opacity-95 scale-125 translate-y-1"
                  />

                  {/* 2. 그 위에 올라가는 CSS 등번호 (위치 완벽 고정) */}
                  <span
                    className="absolute z-10 text-[28px] font-black italic tracking-tighter top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pr-1.5 pb-1"
                    style={{
                      // 💡 1. 투명을 빼고 유니폼 바탕과 같은 진한 검은색으로 속을 꽉 채웁니다! (배경 비침 완벽 차단)
                      color: "#111111",

                      // 💡 2. 테두리를 살짝 더 굵게 줘서 가독성을 확 끌어올립니다.
                      WebkitTextStroke: "2px #FFB6C1",

                      // 💡 3. drop-shadow 대신 textShadow를 찐하게 넣어서 글자가 배경에서 튀어나오게 만듭니다.
                      textShadow:
                        "2px 2px 4px rgba(0, 0, 0, 0.8), 0px 0px 8px rgba(255, 182, 193, 0.3)",
                    }}
                  >
                    {no !== "-" ? no : "?"}
                  </span>
                </div>
                {/* 오른쪽: 선수 정보 */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {/* 이름 크기 키움 */}
                        <span className="font-black text-xl text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          {name}
                          {/* 💡 역할 배지 (주장/부주장) */}
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

                      {/* 💡 등번호 크기 키우고 위치 조정 */}
                      <Badge className="bg-[#FFB6C1]/20 dark:bg-white/5 text-[#FF8FA3] dark:text-[#FFB6C1] border-none px-2 py-0 text-[11px] font-black italic w-fit">
                        No.{no}
                      </Badge>
                    </div>

                    {/* 💡 포지션별 컬러 배지 적용 */}
                    <Badge
                      className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded ${getPosBadgeStyle(pos)}`}
                    >
                      {pos}
                    </Badge>
                  </div>

                  {/* 상태 표시 */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isInjured || disabled ? "bg-red-500" : "bg-[#FF8FA3] dark:bg-[#FFB6C1] shadow-[0_0_5px_rgba(255,182,193,0.5)]"}`}
                    />
                    <span
                      className={`text-xs font-bold ${isInjured || disabled ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
