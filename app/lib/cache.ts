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

import { revalidatePath } from "next/cache";

/** 렌더 읽기 fetch에 붙는 캐시 태그. */
export const UD_READ_TAG = "underduck-read";

/** 외부(시트 직접수정·크론 등) 변경 반영을 위한 시간 백스톱(초). */
export const UD_READ_REVALIDATE = 45;

/** 렌더 읽기 래퍼에 넘길 udGet 옵션. */
export const udReadOpts: { next: { revalidate: number; tags: string[] } } = {
  next: { revalidate: UD_READ_REVALIDATE, tags: [UD_READ_TAG] },
};

/**
 * 데이터 변경 쓰기 라우트에서 호출 → 루트 레이아웃을 쓰는 모든 경로의
 * 캐시를 즉시 무효화(대시보드·순위·로스터·매치상세 전부). 다음 요청은 새 데이터.
 */
export function revalidateAppData(): void {
  revalidatePath("/", "layout");
}
