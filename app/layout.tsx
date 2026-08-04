// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { ThemeProvider } from "./components/theme-provider";
import PullToRefresh from "./components/PullToRefresh";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import PushNotificationBanner from "./components/PushNotificationBanner";
import PageTransition from "./components/PageTransition";
import AppBottomNav, {
  AppBottomNavFallback,
  NavTabProvider,
} from "./components/AppBottomNav";
import Image from "next/image";
import "./globals.css";
import Link from "next/link";
import LoginGate from "./components/LoginGate";

export const metadata: Metadata = {
  title: "UNDERDUCK FC | 언더덕 FC",
  description: "언더덕 FC 팀 대시보드 - Not 'Because of', but 'Thanks to'",
  // 💡 공유 시 보여줄 오픈 그래프(Open Graph) 설정
  openGraph: {
    title: "UNDERDUCK FC | 팀 대시보드",
    description: "언더덕 FC 팀원들을 위한 경기 일정 및 기록 확인 대시보드",
    url: "https://underducfc-dashboard.vercel.app/", // 나중에 배포할 실제 주소로 바꿔주세요!
    siteName: "UNDERDUCK FC",
    images: [
      {
        url: "/meta.png", // 💡 준비하신 1200x630 이미지
        width: 1200,
        height: 630,
        alt: "UNDERDUCK FC 메인 로고",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  // 💡 트위터용 카드 설정 (필요 시)
  twitter: {
    card: "summary_large_image",
    title: "UNDERDUCK FC | 팀 대시보드",
    description: "언더덕 FC 경기 일정 및 선수 랭킹 확인",
    images: ["/meta.png"],
  },

  // 이전에는 2.13MB짜리 원본 로고(1024px)를 파비콘·애플 아이콘으로 그대로 썼다.
  // 용도별 크기를 따로 만들어 첫 로드에서 불필요한 2MB 다운로드를 없앤다.
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  },

  // 💡 PWA: 홈 화면에 추가 시 standalone 앱으로 실행
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UNDERDUCK FC",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // 💡 PWA standalone에서 env(safe-area-inset-*)가 실제 값을 갖게 하는 필수 옵션.
  //    이게 없으면 iOS는 safe-area를 전부 0으로 계산해서, 하단 탭바/푸터의
  //    pb-[env(safe-area-inset-bottom)] 이 무효가 되고 홈 인디케이터와 겹친다.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};
// iOS standalone 실행 시 흰 화면 번쩍임을 없애는 스플래시 이미지.
// iOS는 media query가 기기와 "정확히" 일치할 때만 쓰므로 해상도별 파일이 따로 필요하다.
// [CSS 폭, CSS 높이, DPR] — public/splash/{폭*DPR}x{높이*DPR}.png 와 짝을 이룬다.
const IOS_SPLASH: [number, number, number][] = [
  [375, 667, 2], // SE(2·3세대), 8, 7, 6s
  [375, 812, 3], // X, XS, 11 Pro, 12·13 mini
  [390, 844, 3], // 12, 13, 14
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [402, 874, 3], // 16 Pro
  [414, 896, 2], // XR, 11
  [414, 896, 3], // XS Max, 11 Pro Max
  [428, 926, 3], // 12·13 Pro Max, 14 Plus
  [430, 932, 3], // 14·15 Pro Max, 15 Plus, 16 Plus
  [440, 956, 3], // 16 Pro Max
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const signedIn = !!session?.user;

  return (
    // suppressHydrationWarning은 테마 깜빡임 방지용 필수 속성입니다
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Pretendard: 한글 가독성 + 고급스러운 타이포 (동적 서브셋) */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* iOS 스플래시 (Next의 metadata API가 지원하지 않아 직접 link 태그로 넣는다) */}
        {IOS_SPLASH.map(([w, h, dpr]) => (
          <link
            key={`${w}x${h}@${dpr}`}
            rel="apple-touch-startup-image"
            href={`/splash/${w * dpr}x${h * dpr}.png`}
            media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`}
          />
        ))}
      </head>
      <body className="antialiased bg-zinc-100 dark:bg-black">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider session={session}>
          <NavTabProvider>
          <ServiceWorkerRegister />
          {/* 📱 모바일 앱 프레임 래퍼 */}
          <div className="max-w-md mx-auto min-h-[100dvh] flex flex-col bg-gray-50 dark:bg-[#09090b] shadow-2xl relative overflow-hidden transition-colors duration-300">
            {signedIn ? (
            <>
            <PushNotificationBanner />
            <PullToRefresh>
            {/* 메인 컨텐츠 (Dashboard, Roster 등) */}
            <div className="flex-1">
              <PageTransition>{children}</PageTransition>
            </div>

            {/* 전역 Footer — 하단 탭과 경쟁하지 않는 조용한 팀 서명. */}
            <footer className="mt-auto w-full border-t border-gray-200/60 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 dark:border-white/[0.06]">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF8FA3] dark:text-[#FFB6C1]">
                    UNDERDUCK FC
                  </p>
                  <p className="mt-1.5 text-[9.5px] font-bold tracking-[0.06em] text-gray-400 dark:text-white/30">
                    NOT BECAUSE OF, BUT THANKS TO
                  </p>
                </div>
                <Link
                  href="https://github.com/JJleem"
                  aria-label="molt GitHub"
                  className="flex min-h-10 shrink-0 items-center gap-1.5 text-[10px] font-black text-gray-400 active:text-[#FF8FA3] dark:text-white/35 dark:active:text-[#FFB6C1]"
                >
                  <span className="relative h-4 w-4 overflow-hidden rounded-sm opacity-65">
                    <Image src="/molt.png" alt="" fill sizes="16px" className="object-contain" />
                  </span>
                  molt
                </Link>
              </div>
              <p className="mt-4 text-[9px] font-medium text-gray-300 dark:text-white/20">
                © 2026 UNDERDUCK FC
              </p>
            </footer>
            </PullToRefresh>

            {/* 💡 하단 탭바: 라우트가 바뀌어도 언마운트되지 않도록 레이아웃에 1회만 둔다.
                PullToRefresh의 transform 바깥에 둬서 당기는 동안에도 제자리에 고정된다. */}
            <Suspense fallback={<AppBottomNavFallback />}>
              <AppBottomNav />
            </Suspense>
            </>
            ) : (
              <LoginGate />
            )}
          </div>
          </NavTabProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
