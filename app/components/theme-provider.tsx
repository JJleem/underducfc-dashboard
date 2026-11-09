// app/components/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

/**
 * 안드로이드 상단바(meta theme-color)를 **앱 안에서 고른 테마**에 맞춘다.
 * layout 의 themeColor 는 폰 시스템 설정(prefers-color-scheme)만 보므로, 폰은 라이트인데
 * 앱을 다크로 바꾸면 상단바만 흰색으로 남았다. 값은 헤더 바탕색과 같다(layout.tsx themeColor 참고).
 */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  React.useEffect(() => {
    if (!resolvedTheme) return;
    const color = resolvedTheme === "dark" ? "#0f0f13" : "#ffffff";
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute("content", color);
    });
  }, [resolvedTheme]);
  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  );
}
