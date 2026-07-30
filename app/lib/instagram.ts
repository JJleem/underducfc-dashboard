// 인스타그램 URL 파싱 유틸 (클라이언트/서버 공용, 외부 의존성 없음).
// 릴스(reel/reels), 일반 게시물(p), IGTV(tv) 링크를 지원한다.
//
// 왜 iframe 인가: 공식 oEmbed API(graph.facebook.com/instagram_oembed)는 페이스북
// 앱 토큰 + 앱 심사가 필요하다. 토큰 없이 쓸 수 있는 건 공개 임베드 페이지(/embed)이고,
// 이 페이지는 X-Frame-Options·frame-ancestors 가 없어 iframe 으로 붙일 수 있다.
// 대신 썸네일 이미지 URL은 API 없이 안정적으로 얻을 수 없어 목록에서는 placeholder 를 쓴다.

// instagram.com/reel/CODE, instagram.com/{username}/reel/CODE, /p/CODE, /tv/CODE
// 뒤에 붙는 쿼리(?igsh=…)는 자연히 무시된다.
const INSTAGRAM_RE =
  /instagram\.com\/(?:[\w.]+\/)?(reels?|p|tv)\/([\w-]{5,})/;

/** 인스타그램 링크에서 종류와 코드 추출. 실패 시 null. */
export function instagramMedia(
  url: string | null | undefined,
): { kind: "reel" | "p" | "tv"; code: string } | null {
  if (!url) return null;
  const m = url.match(INSTAGRAM_RE);
  if (!m) return null;
  // reel/reels 는 임베드 경로가 동일하게 /reel/ 이다.
  const kind = m[1].startsWith("reel") ? "reel" : (m[1] as "p" | "tv");
  return { kind, code: m[2] };
}

/** 인스타그램 링크인가. */
export function isInstagramUrl(url: string | null | undefined): boolean {
  return instagramMedia(url) !== null;
}

/** 임베드용 URL. 인스타 링크가 아니면 null. */
export function instagramEmbed(url: string | null | undefined): string | null {
  const media = instagramMedia(url);
  return media ? `https://www.instagram.com/${media.kind}/${media.code}/embed/` : null;
}
