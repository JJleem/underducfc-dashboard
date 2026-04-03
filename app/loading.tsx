"use client";
import React from "react";
import "./globals.css";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

function SkeletonCard({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`${height} rounded-3xl bg-gray-100 dark:bg-white/5 animate-pulse mb-4`} />
  );
}

export default function Loading() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0a0a0a] font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-300">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
        <span className="font-black italic text-lg tracking-tighter text-gray-900 dark:text-white">
          UNDERDUCK
        </span>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10"
        >
          <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
          <Sun className="hidden dark:block w-4 h-4 text-[#FFB6C1]" />
        </button>
      </header>

      <div className="p-4">
        {/* 공지 스켈레톤 */}
        <SkeletonCard height="h-16" />

        {/* 탭 스켈레톤 */}
        <div className="flex gap-2 mb-4">
          <div className="h-9 w-24 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
        </div>

        {/* D-Day 스켈레톤 */}
        <SkeletonCard height="h-20" />

        {/* 경기 카드 스켈레톤 */}
        <SkeletonCard height="h-56" />
        <SkeletonCard height="h-56" />
        <SkeletonCard height="h-56" />
      </div>
    </div>
  );
}
