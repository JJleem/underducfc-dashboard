// app/media/MediaClient.tsx
"use client";
import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sun,
  Moon,
  Lock,
  LockOpen,
  Upload,
  Film,
  Camera,
  Trash2,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "../components/ui/drawer";
import { MediaData } from "../components/DashboardClient";

interface MediaClientProps {
  media: MediaData[];
}

export default function MediaClient({ media }: MediaClientProps) {
  const { resolvedTheme, setTheme } = useTheme();

  // 미디어 콘텐츠
  const [mediaList, setMediaList] = React.useState<MediaData[]>(media);
  const [mediaUploadModal, setMediaUploadModal] = React.useState(false);
  const [mediaUploadFile, setMediaUploadFile] = React.useState<File | null>(null);
  const [mediaUploadTitle, setMediaUploadTitle] = React.useState("");
  const [mediaUploading, setMediaUploading] = React.useState(false);
  const mediaFileRef = React.useRef<HTMLInputElement>(null);

  // 어드민 PIN
  const [isMediaAdmin, setIsMediaAdmin] = React.useState(false);
  const [showPinInput, setShowPinInput] = React.useState(false);
  const [pinDraft, setPinDraft] = React.useState("");
  const [pinError, setPinError] = React.useState(false);
  const [verifyingPin, setVerifyingPin] = React.useState(false);
  const adminPinRef = React.useRef("");

  const verifyAdminPin = async () => {
    if (!pinDraft) return;
    setVerifyingPin(true);
    setPinError(false);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinDraft }),
      });
      if (res.ok) {
        adminPinRef.current = pinDraft;
        setIsMediaAdmin(true);
        setShowPinInput(false);
        setPinDraft("");
      } else {
        setPinError(true);
        setPinDraft("");
      }
    } finally {
      setVerifyingPin(false);
    }
  };

  const uploadMedia = async () => {
    if (!mediaUploadFile) return;
    setMediaUploading(true);
    try {
      const isVideo = mediaUploadFile.type.startsWith("video/");
      const resourceType = isVideo ? "video" : "image";
      const signRes = await fetch(`/api/media/sign?type=${resourceType}`, {
        headers: { "x-admin-pin": adminPinRef.current },
      });
      const { timestamp, signature, apiKey, cloudName, folder } = await signRes.json();
      const fd = new FormData();
      fd.append("file", mediaUploadFile);
      fd.append("api_key", apiKey);
      fd.append("timestamp", String(timestamp));
      fd.append("signature", signature);
      fd.append("folder", folder);
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        { method: "POST", body: fd }
      );
      const uploadData = await uploadRes.json();
      if (!uploadData.secure_url) throw new Error("업로드 실패");
      const saveRes = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": adminPinRef.current },
        body: JSON.stringify({ type: resourceType, url: uploadData.secure_url, title: mediaUploadTitle }),
      });
      if (!saveRes.ok) throw new Error("저장 실패");
      setMediaList((prev) => [
        { id: prev.length, type: resourceType as "video" | "image", url: uploadData.secure_url, title: mediaUploadTitle, uploadedAt: new Date().toISOString() },
        ...prev,
      ]);
      setMediaUploadFile(null);
      setMediaUploadTitle("");
      setMediaUploadModal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setMediaUploading(false);
    }
  };

  const deleteMediaItem = async (url: string) => {
    if (!confirm("삭제할까요?")) return;
    try {
      await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-pin": adminPinRef.current },
        body: JSON.stringify({ url }),
      });
      setMediaList((prev) => prev.filter((item) => item.url !== url));
    } catch {
      alert("삭제 실패");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-zinc-100 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-300">
      {/* 📱 App Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-xl border-b border-gray-200/70 dark:border-white/[0.06]">
        <Link
          href="/"
          className="p-1 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </Link>
        <span className="text-[15px] font-extrabold tracking-tight text-gray-900 dark:text-white uppercase">
          CONTENTS
        </span>
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
        >
          <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
          <Sun className="hidden dark:block w-4 h-4 text-[#FFB6C1]" />
        </button>
      </header>

      <main className="p-5 pb-10 animate-fade">
        {/* 타이틀 영역 */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FFB6C1]/15 dark:bg-white/5 shrink-0">
            <Film className="w-5 h-5 text-[#FF8FA3] dark:text-[#FFB6C1]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              팀 콘텐츠
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              경기 영상과 사진을 함께 보관해요.
            </p>
          </div>
        </div>

        {/* 어드민 잠금/해제 */}
        <div className="flex items-center justify-end mb-3">
          {isMediaAdmin ? (
            <button
              onClick={() => { setIsMediaAdmin(false); adminPinRef.current = ""; setShowPinInput(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 text-[11px] font-bold"
            >
              <LockOpen className="w-3 h-3" /> 관리자
            </button>
          ) : (
            <button
              onClick={() => { setShowPinInput((p) => !p); setPinError(false); setPinDraft(""); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-[11px] font-bold"
            >
              <Lock className="w-3 h-3" /> 관리자
            </button>
          )}
        </div>

        {/* PIN 입력 */}
        {showPinInput && !isMediaAdmin && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinDraft}
              onChange={(e) => { setPinDraft(e.target.value); setPinError(false); }}
              onKeyDown={(e) => e.key === "Enter" && verifyAdminPin()}
              placeholder="PIN 입력"
              autoFocus
              className={`flex-1 text-[13px] font-bold bg-white dark:bg-white/10 rounded-xl px-3 py-2 outline-none border ${pinError ? "border-red-400 text-red-500 placeholder:text-red-300" : "border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400"}`}
            />
            <button
              onClick={verifyAdminPin}
              disabled={verifyingPin || !pinDraft}
              className="px-3 py-2 rounded-xl bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-white dark:text-black text-[12px] font-black disabled:opacity-40"
            >
              {verifyingPin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "확인"}
            </button>
          </div>
        )}
        {pinError && <p className="text-[11px] text-red-500 font-bold -mt-2 mb-3 px-1">PIN이 올바르지 않습니다</p>}

        {/* 업로드 버튼 (어드민만) */}
        {isMediaAdmin && (
          <button
            onClick={() => setMediaUploadModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400 text-[13px] font-semibold hover:border-[#FFB6C1] hover:text-[#FF8FA3] dark:hover:text-[#FFB6C1] transition-colors mb-5"
          >
            <Upload className="w-4 h-4" /> 업로드
          </button>
        )}

        {mediaList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
            <Film className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-[13px] font-semibold">업로드된 콘텐츠가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 비디오 */}
            {mediaList.filter((m) => m.type === "video").map((item) => (
              <div key={item.url} className="animate-rise rounded-2xl overflow-hidden bg-white dark:bg-[#161618] border border-gray-200/70 dark:border-white/[0.06] shadow-soft">
                <video
                  src={item.url}
                  controls
                  className="w-full max-h-64 bg-black"
                  preload="metadata"
                  poster={item.url.replace("/video/upload/", "/video/upload/so_0/").replace(/\.[^.]+$/, ".jpg")}
                />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] font-bold text-gray-800 dark:text-gray-100 truncate flex-1">
                    {item.title || "제목 없음"}
                  </span>
                  {isMediaAdmin && (
                    <button
                      onClick={() => deleteMediaItem(item.url)}
                      className="ml-3 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* 이미지 */}
            {mediaList.filter((m) => m.type === "image").length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {mediaList.filter((m) => m.type === "image").map((item) => (
                  <div key={item.url} className="animate-rise rounded-2xl overflow-hidden bg-white dark:bg-[#161618] border border-gray-200/70 dark:border-white/[0.06] shadow-soft relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.title} className="w-full h-36 object-cover" />
                    <div className="px-3 py-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate flex-1">{item.title || "제목 없음"}</span>
                      {isMediaAdmin && (
                        <button
                          onClick={() => deleteMediaItem(item.url)}
                          className="ml-1 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 업로드 Drawer */}
      <Drawer open={mediaUploadModal} onOpenChange={setMediaUploadModal}>
        <DrawerContent className="bg-white dark:bg-[#161618] max-h-[80dvh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-[15px] font-bold text-gray-900 dark:text-white">콘텐츠 업로드</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 py-4 space-y-4">
            {/* 파일 선택 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">파일 선택 *</p>
              <input
                ref={mediaFileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => setMediaUploadFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={() => mediaFileRef.current?.click()}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 text-[13px] font-bold text-gray-500 dark:text-gray-400 hover:border-[#FFB6C1] hover:text-[#FF8FA3] dark:hover:text-[#FFB6C1] transition-colors"
              >
                {mediaUploadFile ? (
                  <span className="inline-flex items-center gap-1.5 text-[#FF8FA3] dark:text-[#FFB6C1]">
                    {mediaUploadFile.type.startsWith("video/") ? <Film className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />} {mediaUploadFile.name}
                  </span>
                ) : (
                  "사진 또는 동영상 선택"
                )}
              </button>
            </div>
            {/* 제목 */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 tracking-widest">제목 <span className="text-gray-300 dark:text-gray-600 font-medium normal-case tracking-normal">(선택)</span></p>
              <input
                type="text"
                value={mediaUploadTitle}
                onChange={(e) => setMediaUploadTitle(e.target.value)}
                placeholder="콘텐츠 제목"
                className="w-full text-[13px] font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>
          </div>
          <DrawerFooter className="pt-2">
            <button
              onClick={uploadMedia}
              disabled={mediaUploading || !mediaUploadFile}
              className="w-full py-3 rounded-2xl bg-gradient-to-b from-[#FF9FB0] to-[#FF8FA3] dark:from-[#FFC3CD] dark:to-[#FFB6C1] text-[13px] font-black text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {mediaUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 업로드 중...</>
              ) : "업로드"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
