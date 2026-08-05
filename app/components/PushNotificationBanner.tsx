"use client";

import React from "react";
import { Bell, X } from "lucide-react";

const STORAGE_KEY = "push_banner_dismissed";

/** 지금 이 브라우저에 알림을 물어봐야 하는가. 브라우저 API만 보는 순수 판정. */
function shouldAsk(): boolean {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    if (sessionStorage.getItem(STORAGE_KEY)) return false;   // 이번 세션에 이미 닫음
    return Notification.permission === "default";            // granted·denied 면 물을 게 없다
  } catch {
    return false;
  }
}

export default function PushNotificationBanner() {
  // effect 안에서 setState 하면 마운트마다 렌더가 한 번 더 돈다. 이건 "지금 브라우저가
  // 어떤 상태인가"를 읽는 일이라 외부 저장소를 읽는 것과 같다 — useUnseen 과 같은 방식.
  // 서버 스냅샷은 false 라 SSR 에서는 배너가 아예 없고, 하이드레이션 후에 판정된다.
  const ask = React.useSyncExternalStore(
    () => () => {},   // 구독할 이벤트가 없다. 마운트 시 한 번 읽으면 된다.
    shouldAsk,
    () => false,
  );
  const [dismissed, setDismissed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const show = ask && !dismissed;
  const setShow = (v: boolean) => setDismissed(!v);

  const handleAllow = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShow(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      setShow(false);
    } catch (e) {
      console.error("Push 구독 실패", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* 사파리 프라이빗 모드 등. 저장이 막혀도 이번 화면에서는 닫힌다. */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-[60] animate-rise">
      <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#FF8FA3]/15 dark:bg-[#FFB6C1]/15 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-[#FF8FA3] dark:text-[#FFB6C1]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-black text-gray-900 dark:text-white">경기 알림 받기</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            새 경기 일정·결과가 등록되면 알려드릴게요.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-[12px] font-black text-gray-500 dark:text-gray-400"
            >
              나중에
            </button>
            <button
              onClick={handleAllow}
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-[12px] font-black text-white dark:text-black disabled:opacity-50"
            >
              {loading ? "처리중..." : "알림 허용"}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}
