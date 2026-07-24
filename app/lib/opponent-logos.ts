// 상대팀 로고 매핑: 팀명(공백 trim 기준) → /public 기준 이미지 경로
//
// 로고 추가하는 법:
//   1. public/opponent-logos/ 폴더에 이미지 파일을 넣는다 (png/webp/jpg 무관)
//   2. 아래에 "정확한 팀명": "/opponent-logos/파일명" 한 줄을 추가한다
//
// 매핑에 없는 팀은 자동으로 팀명 첫 글자 플레이스홀더가 표시된다.
export const OPPONENT_LOGOS: Record<string, string> = {
  "5000원fc": "/opponent-logos/5000won-fc.jpg",
  "NSW fc": "/opponent-logos/nsw-fc.jpg",
  "fc 델카": "/opponent-logos/fc-delka.jpg",
  "보타닉fc": "/opponent-logos/botanic-fc.jpg",
  "YDP fc": "/opponent-logos/ydp-fc.jpg",
  "신선fc": "/opponent-logos/sinseon-fc.jpg",
  "원 유나이티드": "/opponent-logos/won-united.jpg",
};

/** 팀명으로 로고 경로를 찾는다. 없으면 null. */
export function getOpponentLogo(name: string | null | undefined): string | null {
  if (!name) return null;
  return OPPONENT_LOGOS[name.trim()] ?? null;
}
