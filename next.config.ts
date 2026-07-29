import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  experimental: {
    // 클라이언트 Router Cache 보관 시간(초).
    //
    // 기본값이 dynamic: 0 이라 동적 라우트는 클라이언트에 하나도 남지 않는다.
    // 그래서 방금 본 탭으로 돌아가도 매번 서버 왕복 + 스켈레톤이 떴다.
    // 30초를 두면 직전에 본 탭 복귀는 즉시 뜨고, 첫 진입·30초 경과·당김
    // 새로고침 때는 그대로 스켈레톤이 나온다(= "매번" 나오는 것만 없앤다).
    //
    // 서버 fetch 캐시가 이미 45초(UD_READ_REVALIDATE)라 그보다 짧게 잡아
    // 앱이 이미 허용하는 신선도 범위를 넘지 않게 했다.
    //
    // ⚠️ 쓰기 후에는 반드시 router.refresh() 를 호출해야 한다.
    //    쓰기 라우트가 서버에서 revalidatePath 를 하지만, API 라우트는
    //    Server Action 이 아니라서 클라이언트 캐시를 비우지 못한다.
    //    안 비우면 "투표했는데 탭 갔다 오니 사라졌다"가 된다.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
