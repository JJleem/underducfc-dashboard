"use client";
// 경기 사진 올리기 (관리자).
//
// 흐름은 기존 홈과 같다: 서버에서 Cloudinary 서명을 받고 → 브라우저에서 직접 병렬 업로드 →
// 받은 URL 만 서버에 저장. 파일이 서버를 거치지 않아 큰 사진도 빠르다.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import AppToast from "../AppToast";

// 요즘 폰은 한 장에 5~8MB(4284×5712)를 찍는다. 다섯 장이면 30MB 를 셀룰러로 올리게 된다.
// 화면에 가장 크게 쓰는 곳이 1600px(lib/cloudinary.ts)이라 3000 이면 두 배 여유가 있다.
// 원본을 작게 만드는 게 목적이 아니라 "쓸데없이 큰 것만" 깎는 거라 상한을 넉넉히 뒀다.
const MAX_EDGE = 3000;
const SKIP_UNDER = 3 * 1024 * 1024;

/**
 * 너무 큰 사진만 줄여서 올린다. 이미 작거나 줄이다 실패하면 원본을 그대로 쓴다 —
 * 사진을 못 올리는 것보다 크게 올리는 편이 낫다.
 */
async function shrink(file: File): Promise<Blob> {
  if (file.size <= SKIP_UNDER) return file;
  try {
    // from-image: 아이폰 세로 사진의 EXIF 회전을 캔버스에 그리기 전에 반영한다.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    // 상한보다 작으면 크기는 그대로 두고 다시 인코딩만 한다. 2048px 인데 8.5MB 인
    // PNG 같은 게 실제로 올라와 있어서, 크기만 보고 넘기면 그런 건 안 잡힌다.
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;   // HEIC 등 브라우저가 못 여는 형식. Cloudinary 가 알아서 받는다.
  }
}

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
          fd.append("file", await shrink(file), file.name);
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
