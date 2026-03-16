// app/layout.tsx
import type { Metadata } from "next";
import { ThemeProvider } from "./components/theme-provider";
import Image from "next/image"; // 👈 추가!
import "./globals.css";
import Link from "next/link";

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

  icons: {
    icon: "/underducklogo.png",
    apple: "/underducklogo.png",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning은 테마 깜빡임 방지용 필수 속성입니다
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased bg-gray-200 dark:bg-black">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 📱 모바일 앱 프레임 래퍼 */}
          <div className="max-w-md mx-auto min-h-[100dvh] flex flex-col bg-gray-50 dark:bg-[#0a0a0a] shadow-2xl relative overflow-hidden transition-colors duration-300">
            {/* 메인 컨텐츠 (Dashboard, Roster 등) */}
            <div className="flex-1">{children}</div>

            {/* 💡 전역 Footer (모든 페이지 하단에 공통 적용) */}
            <footer className="w-full pt-8 pb-10 px-5 flex flex-col items-center gap-5 border-t border-gray-200/60 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 backdrop-blur-sm mt-auto">
              {/* 팀 카피라이트 & 슬로건 */}
              <div className="flex flex-col items-center gap-1.5 text-center">
                <p className="text-[10px] font-black tracking-[0.2em] text-[#FF8FA3]/80 dark:text-[#FFB6C1]/70 uppercase ">
                  Not &apos;Because of&apos;, but &apos;Thanks to&apos;
                </p>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                  © 2026 UNDERDUCK FC. All rights reserved.
                </p>
              </div>

              {/* 몰트(molt) 제작자 뱃지 */}
              <div className="flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Designed & Built by
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="relative w-5 h-5 rounded-sm overflow-hidden shrink-0">
                    <Image
                      src="/molt.png"
                      alt="Molt Logo"
                      fill
                      className="object-contain shrink-0"
                    />
                  </div>
                  <Link
                    href={"https://github.com/JJleem"}
                    className="font-black text-xs tracking-wider text-gray-800 dark:text-gray-200 hover:text-[#FF8FA3]/80"
                  >
                    molt
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
