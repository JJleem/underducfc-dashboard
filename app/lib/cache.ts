// app/lib/cache.ts
//
// 렌더링용 백엔드 읽기 캐싱 + 무효화 헬퍼.
//
// 목적: 대시보드/상세 페이지가 매 방문마다 백엔드 읽기를 반복하지 않도록
//       "렌더 읽기 래퍼"(backend.ts / matches-backend.ts)에 시간 캐시 + 태그를 건다.
//       데이터를 바꾸는 쓰기 라우트는 revalidateAppData()로 그 태그를 무효화해
//       저장 직후 즉시 새 데이터가 보이게 한다.
//
// ⚠️ read-modify-write용 읽기(sheets-write.ts의 udGet 등)에는 쓰지 말 것 — 항상 신선해야 함.

import { revalidatePath, revalidateTag } from "next/cache";

/** 렌더 읽기 fetch에 붙는 캐시 태그. */
export const UD_READ_TAG = "underduck-read";

/** 자주 바뀌는 데이터만 골라 비우기 위한 세부 태그. */
export const UD_TAG = {
  matches: "underduck-matches",
  stats: "underduck-stats",
  roster: "underduck-roster",
  lineup: "underduck-lineup",
  attendance: "underduck-attendance",
  voteComment: "underduck-vote-comment",
  feedback: "underduck-feedback",
  momVote: "underduck-mom-vote",
  featured: "underduck-featured",
  titles: "underduck-titles",
  board: "underduck-board",
  notice: "underduck-notice",
  users: "underduck-users",
  lounge: "underduck-lounge",
} as const;

export type UdCacheTag = (typeof UD_TAG)[keyof typeof UD_TAG];

/** 외부(시트 직접수정·크론 등) 변경 반영을 위한 시간 백스톱(초). */
export const UD_READ_REVALIDATE = 45;

/** 렌더 읽기 래퍼에 넘길 udGet 옵션. */
export const udReadOpts: { next: { revalidate: number; tags: string[] } } = {
  next: { revalidate: UD_READ_REVALIDATE, tags: [UD_READ_TAG] },
};

/** 전체 무효화용 태그와 세부 태그를 함께 붙인다. */
export function udReadOptsFor(
  ...tags: UdCacheTag[]
): { next: { revalidate: number; tags: string[] } } {
  return {
    next: { revalidate: UD_READ_REVALIDATE, tags: [UD_READ_TAG, ...tags] },
  };
}

/**
 * 데이터 변경 쓰기 라우트에서 호출 → 루트 레이아웃을 쓰는 모든 경로의
 * 캐시를 즉시 무효화(대시보드·순위·로스터·매치상세 전부). 다음 요청은 새 데이터.
 */
export function revalidateAppData(...tags: UdCacheTag[]): void {
  // 태그 무효화가 먼저다. revalidatePath 는 라우트의 렌더 결과만 버리고,
  // 라우트 핸들러(/api/feedback·/api/vote-comment 등)가 부른 백엔드 읽기의
  // fetch 캐시(UD_READ_REVALIDATE=45초)는 건드리지 않는다.
  // 이게 빠져 있어서 "삭제했는데 나갔다 들어오면 살아있다"가 났다.
  // { expire: 0 } = 즉시 만료. Next 16 은 두 번째 인자가 필수이고,
  // 프로필을 주면 stale-while-revalidate 로 잠깐 옛 값을 더 내보낸다.
  // 태그를 지정한 고빈도 쓰기는 관련 캐시만 비운다. 인자가 없는 기존 관리자
  // 쓰기는 안전하게 전체를 비워 이전 동작과 신선도를 그대로 유지한다.
  const targets = tags.length ? tags : [UD_READ_TAG];
  targets.forEach((tag) => revalidateTag(tag, { expire: 0 }));
  revalidatePath("/", "layout");
}
