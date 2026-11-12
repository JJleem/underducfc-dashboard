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
    // 서비스워커의 홈 저장본용 표시(public/sw.js 의 homeResponse). 로그인된 화면에만 붙고,
    // 값은 배포 id — 저장본이 지금 배포와 같은 빌드일 때만 쓰이게 한다.
    // 로그아웃 상태의 "/" 는 로그인 화면으로 rewrite 되므로 이 헤더가 없다.
    // 배포 id 를 모르면(로컬 등) 붙이지 않는다 — 그러면 저장본을 아예 안 쓴다.
    const response = NextResponse.next();
    const build = process.env.VERCEL_DEPLOYMENT_ID;
    if (build) response.headers.set("x-ud-build", build);
    return response;
  }
  return NextResponse.rewrite(new URL("/login", request.nextUrl));
});

export const config = {
  // Auth.js API와 Next 정적 파일, 확장자가 있는 public 자산은 게이트 밖에 둔다.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
