// Cloudinary 배달 URL.
//
// DB에 저장된 주소는 변환이 붙지 않은 원본이다(5MB 안팎, 5712×4284). 화면에 그대로 쓰면
// 휴대폰이 원본을 통째로 받는다. 그래서 사진을 그리는 곳은 전부 여기를 거친다.
//
// 이 파일이 생긴 이유: 같은 replace 가 네 군데에 복붙돼 있었고 그중 MatchRow 라이트박스
// 하나가 변환을 빠뜨려 원본을 내려주고 있었다. 통로를 하나로 두면 그 실수가 안 난다.
//
// q_auto 는 고정 압축률이 아니라 이미지마다 품질을 정하고, f_auto 는 기기가 지원하면
// webp/avif 로 내려준다. 둘 다 "같은 화질을 더 적은 용량으로" 쪽이다.

/** 변환을 끼워 넣을 자리. Cloudinary 주소가 아니면 그대로 돌려준다. */
function apply(url: string, transform: string): string {
  return url.includes("/upload/") ? url.replace("/upload/", `/upload/${transform}/`) : url;
}

/**
 * 정사각 썸네일. 그리드·리스트처럼 칸 크기가 정해진 자리용.
 * @param size CSS 크기가 아니라 실제 내려받을 픽셀. 2x 화면을 감안해 넉넉히 준다.
 * @param eco 잘게 나오는 썸네일은 q_auto:eco 로 한 단계 더 줄여도 티가 안 난다.
 */
export function cldThumb(url: string, size: number, eco = false): string {
  return apply(url, `c_fill,g_auto,w_${size},h_${size},q_auto${eco ? ":eco" : ""},f_auto`);
}

/**
 * 정사각 크게. 피드 캐러셀처럼 칸은 정사각인데 확대까지 되는 자리용.
 * 기본 1600 인 이유는 PHOTO_ZOOM_MAX 주석 참고.
 */
export function cldSquare(url: string, size = 1600): string {
  return apply(url, `c_fill,w_${size},h_${size},q_auto,f_auto`);
}

/** 비율 유지. 라이트박스처럼 사진 전체를 봐야 하는 자리용. */
export function cldFit(url: string, width = 1600): string {
  return apply(url, `w_${width},c_limit,q_auto,f_auto`);
}

// 핀치 줌은 4배까지 열린다(FeedPinchPhoto / PinchZoomImage 의 MAX_SCALE).
// 피드 폭이 448px 이므로 4배면 1792 CSS px 이 필요하고, 1080 으로는 확대했을 때
// 아파트 창틀 같은 잔디테일이 뭉개진다. 1600 이면 원본과 거의 구분되지 않으면서
// 원본(5.4MB) 대비 13배 작다 — 확대가 없는 자리라면 이만큼 줄 필요는 없다.
