"use client";
import React from "react";
import UnderduckSpinner from "./components/UnderduckSpinner";
import "./globals.css";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function Loading() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-[#F5F5DC] font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-300">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
        <span className="font-black italic text-lg tracking-tighter text-gray-900 dark:text-white">
          UNDERDUCK
        </span>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
        >
          <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
          <Sun className="hidden dark:block w-4 h-4 text-[#FFB6C1]" />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <UnderduckSpinner iconWidth={24} iconHeight={24} />
        <p className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 animate-pulse italic">
          LOADING DATA...
        </p>
      </div>
    </div>
  );
}
