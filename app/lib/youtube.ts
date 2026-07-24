// 유튜브 URL 파싱 유틸 (클라이언트/서버 공용, 외부 의존성 없음).
// watch?v=, youtu.be/, shorts/, embed/, live/ 형태를 모두 지원.

/** 유튜브 URL에서 11자리 videoId 추출. 실패 시 null. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** 임베드 재생용 URL. videoId 없으면 null. */
export function youtubeEmbed(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/** 썸네일 이미지 URL. videoId 없으면 null. */
export function youtubeThumb(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
