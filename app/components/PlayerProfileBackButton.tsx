"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
      className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 active:opacity-60 dark:text-gray-300"
    >
      <ArrowLeft width={18} height={18} strokeWidth={2.4} />
    </button>
  );
}
