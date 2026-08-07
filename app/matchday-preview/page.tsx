import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Heart, ImagePlus, MessageCircle, Share2, Users } from "lucide-react";
import {
  ART_SCRIM_DARK,
  ART_SCRIM_LIGHT,
  ART_SCRIM_SOFT,
  ART_VEIL,
} from "../lib/matchday-art";

export const dynamic = "force-dynamic";

type Overlay = "standard" | "soft" | "light";
type Countdown = "0" | "1" | "7";

const IMAGE_EXT = /\.(?:avif|jpe?g|png|webp)$/i;
// test2.png처럼 숫자를 바로 붙여도, test-2/candidate_2처럼 구분자를 써도 잡는다.
const CANDIDATE_NAME = /^(?:test|candidate)(?:\d+|[-_.].*)?$/i;

function candidates(): string[] {
  const dir = path.join(process.cwd(), "public", "matchday");
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => IMAGE_EXT.test(file))
      .filter((file) => CANDIDATE_NAME.test(file.replace(IMAGE_EXT, "")))
      .sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));
  } catch {
    return [];
  }
}

function href(overlay: Overlay, countdown: Countdown) {
  return `/matchday-preview?overlay=${overlay}&d=${countdown}`;
}

function PreviewCard({
  file,
  overlay,
  countdown,
}: {
  file: string;
  overlay: Overlay;
  countdown: Countdown;
}) {
  const light = overlay === "light";
  const soft = overlay === "soft";
  const dDay = Number(countdown);

  return (
    <article className="overflow-hidden border-y border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#09090b]">
      <header className="flex items-center gap-2.5 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={34}
          height={34}
          className="h-[34px] w-[34px] rounded-full bg-white object-cover ring-1 ring-black/[0.06] dark:ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black text-gray-900 dark:text-white">언더덕 FC</p>
          <p className="mt-0.5 truncate text-[11px] font-bold text-gray-400 dark:text-white/35">
            8월 8일 · 매치데이 후보
          </p>
        </div>
        <span className="max-w-28 truncate rounded-full bg-gray-100 px-2 py-1 text-[9px] font-black text-gray-400 dark:bg-white/[0.07] dark:text-white/35">
          {file}
        </span>
      </header>

      <div
        className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(160deg,#FFD9E1 0%,#FF8FA3 100%)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/matchday/${encodeURIComponent(file)}`}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {!light && !soft && (
          <div aria-hidden className="absolute inset-0" style={{ background: ART_VEIL }} />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: light ? ART_SCRIM_LIGHT : soft ? ART_SCRIM_SOFT : ART_SCRIM_DARK,
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          <p
            className={`text-[13px] font-black tracking-[0.24em] ${
              light ? "text-[#0f1729]/60" : "text-white/70"
            }`}
          >
            NEXT MATCH
          </p>
          <p
            className={`mt-3 text-[64px] font-black leading-none tracking-[-0.05em] tabular-nums ${
              light
                ? "text-[#0f1729]"
                : "text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]"
            }`}
          >
            {dDay === 0 ? "D-DAY" : `D-${dDay}`}
          </p>
          <p
            className={`mt-4 text-[13px] font-bold ${
              light ? "text-[#0f1729]/70" : "text-white/80"
            }`}
          >
            8월 8일 · 20:00
          </p>
        </div>
      </div>

      <div className="flex items-start gap-1 px-4 py-3.5 text-gray-700 dark:text-white/70">
        {[
          [Heart, "좋아요"],
          [MessageCircle, "댓글"],
          [Users, "참석"],
          [ImagePlus, "사진 추가"],
          [Share2, "공유"],
        ].map(([Icon, label]) => (
          <span key={label as string} className="flex w-11 flex-col items-center gap-1">
            <Icon width={17} height={17} strokeWidth={2} />
            <span className="whitespace-nowrap text-[9px] font-bold leading-none text-gray-400 dark:text-white/35">
              {label as string}
            </span>
          </span>
        ))}
      </div>
    </article>
  );
}

export default async function MatchdayPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ overlay?: string; d?: string }>;
}) {
  const params = await searchParams;
  const overlay: Overlay = ["standard", "soft", "light"].includes(params.overlay || "")
    ? (params.overlay as Overlay)
    : "standard";
  const countdown: Countdown = ["0", "1", "7"].includes(params.d || "")
    ? (params.d as Countdown)
    : "1";
  const files = candidates();

  return (
    <main className="min-h-dvh bg-[#f6f6f7] pb-16 text-gray-900 dark:bg-[#09090b] dark:text-white">
      <div className="sticky top-0 z-20 border-b border-black/[0.06] bg-[#f6f6f7]/90 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#09090b]/90">
        <div className="mx-auto max-w-[430px]">
          <p className="text-[9px] font-black tracking-[0.18em] text-[#FF8FA3] dark:text-[#FFB6C1]">
            MATCHDAY LAB
          </p>
          <h1 className="mt-1 text-[18px] font-black tracking-[-0.04em]">피드 이미지 미리보기</h1>
          <p className="mt-1 text-[10px] font-bold text-gray-400 dark:text-white/35">
            test·candidate 이름의 이미지를 실제 피드 크롭으로 확인합니다.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["standard", "soft", "light"] as Overlay[]).map((value) => (
              <Link
                key={value}
                href={href(value, countdown)}
                className={`rounded-full px-2.5 py-1.5 text-[9px] font-black ${
                  overlay === value
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-950"
                    : "bg-white text-gray-400 dark:bg-white/[0.07] dark:text-white/40"
                }`}
              >
                {value === "standard" ? "기본 막" : value === "soft" ? "소프트 막" : "밝은 이미지"}
              </Link>
            ))}
            <span className="mx-0.5 h-6 w-px bg-black/10 dark:bg-white/10" />
            {(["1", "0", "7"] as Countdown[]).map((value) => (
              <Link
                key={value}
                href={href(overlay, value)}
                className={`rounded-full px-2.5 py-1.5 text-[9px] font-black ${
                  countdown === value
                    ? "bg-[#FF8FA3] text-white"
                    : "bg-white text-gray-400 dark:bg-white/[0.07] dark:text-white/40"
                }`}
              >
                {value === "0" ? "D-DAY" : `D-${value}`}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[430px] space-y-4 pt-4">
        {files.length ? (
          files.map((file) => (
            <PreviewCard key={file} file={file} overlay={overlay} countdown={countdown} />
          ))
        ) : (
          <div className="mx-4 rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center dark:border-white/15">
            <p className="text-[12px] font-black">후보 이미지가 없어요</p>
            <p className="mt-1.5 text-[10px] font-bold leading-relaxed text-gray-400 dark:text-white/35">
              public/matchday에 test.png, test-2.webp 또는 candidate-1.jpg처럼 넣어주세요.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
