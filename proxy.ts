import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * 로그아웃 상태에서는 보호 페이지 자체를 렌더링하지 않는다.
 * 단순 CSS 오버레이만 쓰면 RSC/HTML 안에 팀 데이터가 남을 수 있어,
 * URL은 유지한 채 공개 로그인 화면으로 rewrite한다.
 */
export default auth((request) => {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return request.auth
      ? NextResponse.redirect(new URL("/", request.nextUrl))
      : NextResponse.next();
  }

  if (request.auth) {
    // 서비스워커가 "로그인된 진짜 화면"만 저장하도록 표시한다(public/sw.js 의 홈 캐시).
    // 로그아웃 상태의 "/" 는 로그인 화면으로 rewrite 되므로 이 헤더가 없다.
    const response = NextResponse.next();
    response.headers.set("x-ud-authed", "1");
    return response;
  }
  return NextResponse.rewrite(new URL("/login", request.nextUrl));
});

export const config = {
  // Auth.js API와 Next 정적 파일, 확장자가 있는 public 자산은 게이트 밖에 둔다.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
