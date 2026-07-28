"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function PlayerProfileBackButton() {
  const router = useRouter();

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace("/");
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="이전 화면으로"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white active:opacity-60 dark:border-white/10 dark:bg-white/5"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  );
}
