// 새 홈(인스타 피드형)과 기존 홈 사이의 스위치.
//
// 새 홈을 넣으면서 기존 홈 코드는 한 줄도 지우지 않았다. 반응이 안 좋으면 되돌릴 수
// 있어야 하는데, 그때 git 을 되감는 건 그 사이 쌓인 다른 작업까지 같이 날린다.
// 그래서 두 홈을 동시에 두고 여기서 고른다.
//
// 되돌리는 방법 (빠른 순서대로)
//   1. 주소에 ?home=old  — 그 요청만 즉시 기존 홈. 배포 없이 확인용
//   2. 환경변수 NEW_HOME=off — 서버가 읽는 값이라 전체 사용자에게 즉시 적용
//   3. DEFAULT_NEW_HOME 을 false 로 — 코드 한 줄
//
// NEXT_PUBLIC_ 접두사를 안 붙인 건 의도적이다. 서버 컴포넌트에서만 읽으므로
// 빌드에 박히지 않고 요청 시점에 평가된다.

/** 아무 설정도 없을 때의 기본값. 새 홈을 기본으로 켜려면 true 로 바꾼다. */
const DEFAULT_NEW_HOME = false;

/**
 * @param override URL 의 ?home= 값 ("new" | "old")
 */
export function newHomeEnabled(override?: string): boolean {
  if (override === "new") return true;
  if (override === "old") return false;

  const env = (process.env.NEW_HOME || "").trim().toLowerCase();
  if (env === "on" || env === "true" || env === "1") return true;
  if (env === "off" || env === "false" || env === "0") return false;

  return DEFAULT_NEW_HOME;
}
