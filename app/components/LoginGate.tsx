"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import {
  ChevronDown,
  Instagram,
  Loader2,
  MoreVertical,
  Share,
  Smartphone,
} from "lucide-react";

function KakaoMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-[18px] w-[18px]">
      <path d="M12 3C6.48 3 2 6.55 2 10.93c0 2.82 1.86 5.29 4.65 6.7l-.95 3.5c-.08.3.26.54.52.37l4.14-2.74c.53.07 1.08.1 1.64.1 5.52 0 10-3.55 10-7.93S17.52 3 12 3Z" />
    </svg>
  );
}

export default function LoginGate() {
  const [signingIn, setSigningIn] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-gray-50 px-5 text-gray-900 dark:bg-[#09090b] dark:text-white">
      {/* 언더덕 마크를 종이의 워터마크처럼 아주 옅게 깐다. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[18%] top-[7%] h-[58vw] max-h-[280px] w-[58vw] max-w-[280px] rotate-[-9deg] bg-[#FF8FA3]/[0.055] dark:bg-[#FFB6C1]/[0.055]"
        style={{
          WebkitMaskImage: "url(/underduck-mark.png)",
          maskImage: "url(/underduck-mark.png)",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />

      <div className="relative flex items-center gap-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="relative h-8 w-8 overflow-hidden rounded-[10px] ring-1 ring-black/[0.06] dark:ring-white/10">
          <Image src="/icons/icon-192.png" alt="" fill sizes="32px" className="object-cover" priority />
        </div>
        <span className="text-[11px] font-black tracking-[0.18em] text-gray-500 dark:text-white/45">
          UNDERDUCK FC
        </span>
      </div>

      <section className="relative my-auto py-12">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF8FA3] dark:text-[#FFB6C1]">
          MEMBERS ONLY
        </p>
        <h1 className="mt-4 text-[34px] font-black leading-[1.13] tracking-[-0.05em]">
          언더덕 앱
        </h1>
        <p className="mt-6 max-w-[310px] text-[14px] font-semibold leading-[1.8] text-gray-500 dark:text-white/50">
          언더덕 FC는 <span className="text-gray-800 dark:text-white/80">&apos;때문에&apos;</span>란 말보다
          <br />
          <span className="font-black text-[#FF8FA3] dark:text-[#FFB6C1]">&apos;덕분에&apos;</span>란 말을 추구하며,
          <br />
          서로를 존중합니다.
        </p>

        <div className="mt-8 h-px w-10 bg-[#FF8FA3] dark:bg-[#FFB6C1]" />
        <p className="mt-4 text-[11px] font-bold tracking-[0.08em] text-gray-300 dark:text-white/20">
          NOT BECAUSE OF, BUT THANKS TO
        </p>
      </section>

      <section className="relative pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => {
            setSigningIn(true);
            signIn("kakao").catch(() => setSigningIn(false));
          }}
          disabled={signingIn}
          className="press-cta flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FEE500] px-4 text-[13px] font-black text-[#191919] shadow-[0_8px_24px_rgba(45,40,0,0.12)] disabled:opacity-60"
        >
          {signingIn ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <KakaoMark />}
          {signingIn ? "카카오로 연결 중…" : "카카오로 로그인"}
        </button>
        <p className="mt-3 text-center text-[10.5px] font-bold text-gray-400 dark:text-white/30">
          언더덕 선수라면 카카오 계정으로 들어와 주세요.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setInstallOpen((open) => !open)}
            aria-expanded={installOpen}
            aria-controls="pwa-install-guide"
            className="flex min-h-12 w-full items-center gap-3 px-4 text-left active:bg-white dark:active:bg-white/5"
          >
            <Smartphone className="h-[17px] w-[17px] shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1]" />
            <span className="min-w-0 flex-1">
              <b className="block text-[11.5px] font-black">언더덕 선수라면 앱으로 보기</b>
              <span className="mt-0.5 block text-[10px] font-bold text-gray-400 dark:text-white/30">
                아이폰·안드로이드 홈 화면에 추가하기
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-gray-300 transition-transform duration-200 dark:text-white/20 ${
                installOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {installOpen && (
            <div
              id="pwa-install-guide"
              className="animate-fade border-t border-gray-100 px-4 pb-4 pt-3 dark:border-white/[0.07]"
            >
              <div className="grid gap-4 min-[390px]:grid-cols-2 min-[390px]:gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[10.5px] font-black text-gray-700 dark:text-white/75">
                    <Share className="h-3.5 w-3.5 text-blue-500" /> iPhone · Safari
                  </p>
                  <ol className="mt-2 space-y-1.5 text-[10.5px] font-bold leading-relaxed text-gray-400 dark:text-white/35">
                    <li><b className="mr-1 text-gray-600 dark:text-white/60">1.</b>Safari로 이 페이지 열기</li>
                    <li><b className="mr-1 text-gray-600 dark:text-white/60">2.</b>하단 공유 버튼 누르기</li>
                    <li><b className="mr-1 text-gray-600 dark:text-white/60">3.</b>홈 화면에 추가 → 추가</li>
                  </ol>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-[10.5px] font-black text-gray-700 dark:text-white/75">
                    <MoreVertical className="h-3.5 w-3.5 text-emerald-500" /> Android · Chrome
                  </p>
                  <ol className="mt-2 space-y-1.5 text-[10.5px] font-bold leading-relaxed text-gray-400 dark:text-white/35">
                    <li><b className="mr-1 text-gray-600 dark:text-white/60">1.</b>Chrome으로 이 페이지 열기</li>
                    <li><b className="mr-1 text-gray-600 dark:text-white/60">2.</b>오른쪽 위 ⋮ 누르기</li>
                    <li><b className="mr-1 text-gray-600 dark:text-white/60">3.</b>앱 설치 또는 홈 화면에 추가</li>
                  </ol>
                </div>
              </div>
              <p className="mt-3 border-t border-gray-100 pt-3 text-center text-[10px] font-bold text-[#e9758b] dark:border-white/[0.06] dark:text-[#FFB6C1]">
                이제 홈 화면의 언더덕 로고로 바로 들어오면 돼요.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200 dark:bg-white/[0.07]" />
          <span className="text-[9px] font-black tracking-[0.14em] text-gray-300 dark:text-white/20">
            JOIN US
          </span>
          <span className="h-px flex-1 bg-gray-200 dark:bg-white/[0.07]" />
        </div>

        <a
          href="https://www.instagram.com/underduck_fc/"
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex min-h-12 items-center justify-between rounded-2xl border border-gray-200 px-4 active:bg-white dark:border-white/10 dark:active:bg-white/5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Instagram className="h-[18px] w-[18px] shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1]" />
            <span className="min-w-0">
              <b className="block text-[12px] font-black">@underduck_fc</b>
              <span className="mt-0.5 block truncate text-[10.5px] font-bold text-gray-400 dark:text-white/30">
                가입 문의는 DM으로 살짝 노크해 주세요
              </span>
            </span>
          </span>
          <span aria-hidden className="ml-2 text-[16px]">🐥</span>
        </a>
      </section>
    </main>
  );
}
