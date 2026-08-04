"use client";
// 경기 사진 올리기 (관리자).
//
// 흐름은 기존 홈과 같다: 서버에서 Cloudinary 서명을 받고 → 브라우저에서 직접 병렬 업로드 →
// 받은 URL 만 서버에 저장. 파일이 서버를 거치지 않아 큰 사진도 빠르다.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import AppToast from "../AppToast";

export default function PhotoUploader({
  matchId,
  count,
}: {
  matchId: number;
  /** 이미 올라간 장수. 버튼 문구를 바꾸는 데만 쓴다. */
  count: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 2400);
    return () => window.clearTimeout(timer);
  }, [error]);

  const upload = async (files: FileList | null) => {
    const list = files ? Array.from(files) : [];
    if (list.length === 0 || busy) return;
    setBusy(true);
    try {
      const signRes = await fetch("/api/photos/sign");
      if (!signRes.ok) throw new Error((await signRes.json()).error || "서명 발급 실패");
      const { timestamp, signature, apiKey, cloudName, folder } = await signRes.json();

      const urls = await Promise.all(
        list.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("api_key", apiKey);
          fd.append("timestamp", String(timestamp));
          fd.append("signature", signature);
          fd.append("folder", folder);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (!data.secure_url) throw new Error("업로드 실패");
          return data.secure_url as string;
        }),
      );

      const saveRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, urls }),
      });
      if (!saveRes.ok) throw new Error((await saveRes.json()).error || "저장 실패");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진을 올리지 못했어요.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      {/* 액션 줄(댓글·참석·공유)과 같은 자리에 같은 크기로 둔다.
          본문에 글자 버튼으로 있으면 "이게 왜 여기 있지" 가 된다. */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={count > 0 ? "사진 더 올리기" : "사진 올리기"}
        title={count > 0 ? "사진 더 올리기" : "사진 올리기"}
        className="flex w-11 flex-col items-center gap-1 text-gray-700 active:opacity-60 disabled:opacity-40 dark:text-white/70"
      >
        <span className="flex h-[18px] items-center">
          {busy ? (
            <Loader2 width={17} height={17} className="animate-spin" />
          ) : (
            <ImagePlus width={17} height={17} strokeWidth={2} />
          )}
        </span>
        <span className="whitespace-nowrap text-[9px] font-bold leading-none text-gray-400 dark:text-white/35">
          사진 추가
        </span>
      </button>
      <AppToast message={error} tone="error" />
    </>
  );
}
