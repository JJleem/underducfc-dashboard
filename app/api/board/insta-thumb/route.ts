// 인스타그램 릴스/게시물의 썸네일 프록시.
//
// 왜 프록시인가: 인스타 CDN 이미지 URL은 서명+만료가 붙어 있어서 DB에 저장해둘 수 없다.
// 대신 공개 임베드 페이지(/embed) HTML 안에 들어 있는 썸네일 URL을 그때그때 뽑아
// 이미지 바이트만 넘겨준다. 공식 oEmbed API(페이스북 앱 토큰·심사 필요)가 필요 없다.
//
// 실패해도 조용히 404 → 목록 카드는 인스타 그라데이션 placeholder 로 폴백한다.
// (인스타가 데이터센터 IP를 막으면 이 경로는 전부 404가 되고, 화면은 예전과 동일해진다)

import { NextRequest, NextResponse } from "next/server";

// 임의 URL을 대신 받아오는 오픈 프록시가 되지 않도록, 코드/종류만 받아 URL은 서버가 만든다.
const CODE_RE = /^[\w-]{5,24}$/;
const ALLOWED_IMAGE_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DAY = 86400;
/** 목록 카드는 128px 폭이라 320px 변형이면 충분하다(원본은 260KB까지 나온다). */
const TARGET_WIDTH = 320;

/** 임베드 HTML 안 JSON에서 썸네일 URL을 고른다. 없으면 null. */
function pickThumbnail(html: string): string | null {
  // HTML 안에 JS 문자열로 박혀 있어 따옴표·슬래시가 이스케이프돼 있다.
  const unescaped = html.replace(/\\"/g, '"');
  const unescapeUrl = (u: string) =>
    u.replace(/\\\\\//g, "/").replace(/\\\//g, "/").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");

  // thumbnail_resources: 같은 이미지의 240·320·480·576px 변형 목록
  const variants = [...unescaped.matchAll(/"src":"(https:[^"]+?)","config_width":(\d+)/g)]
    .map((m) => ({ url: unescapeUrl(m[1]), width: Number(m[2]) }))
    .filter((v) => /cdninstagram|fbcdn/.test(v.url))
    .sort((a, b) => a.width - b.width);
  const pick = variants.find((v) => v.width >= TARGET_WIDTH) ?? variants.at(-1);
  if (pick) return pick.url;

  // 변형 목록이 없으면 원본 포스터라도 쓴다.
  const single = unescaped.match(/"(?:thumbnail_src|display_url)":"(https:[^"]+?)"/);
  return single ? unescapeUrl(single[1]) : null;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const kindParam = request.nextUrl.searchParams.get("kind");
  const kind = kindParam === "p" || kindParam === "tv" ? kindParam : "reel";
  if (!CODE_RE.test(code)) return new NextResponse(null, { status: 400 });

  try {
    // 스크레이핑은 하루 한 번만(fetch 캐시). 이미지 응답은 아래 cache-control 로 CDN·브라우저가 캐싱.
    const page = await fetch(`https://www.instagram.com/${kind}/${code}/embed/`, {
      headers: { "user-agent": UA, "accept-language": "ko,en;q=0.8" },
      next: { revalidate: DAY },
    });
    if (!page.ok) return new NextResponse(null, { status: 404 });

    const src = pickThumbnail(await page.text());
    if (!src || !ALLOWED_IMAGE_HOST.test(new URL(src).hostname)) {
      return new NextResponse(null, { status: 404 });
    }

    const image = await fetch(src, { headers: { "user-agent": UA } });
    if (!image.ok || !image.body) return new NextResponse(null, { status: 404 });

    return new NextResponse(image.body, {
      headers: {
        "content-type": image.headers.get("content-type") ?? "image/jpeg",
        "cache-control": `public, max-age=${DAY}, stale-while-revalidate=${DAY * 7}`,
      },
    });
  } catch {
    // 인스타 차단·형식 변경·타임아웃 → placeholder 폴백
    return new NextResponse(null, { status: 404 });
  }
}
