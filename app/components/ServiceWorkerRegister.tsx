"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // 앱이 떴다는 표시. 이후의 스켈레톤은 지연 없이 바로 보인다(globals.css 의 .boot-skeleton).
    document.documentElement.dataset.booted = "1";
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
