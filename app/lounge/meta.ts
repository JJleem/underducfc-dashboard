// 사랑방 화면 표기 규칙 — 목록·상세가 같이 쓴다.
//
// app/lib/lounge.ts 는 서버 전용(underduck.ts 가드)이라 클라이언트에서 못 부른다.
// 타입은 `import type` 으로 가져오면 지워지지만, 런타임 상수는 여기 따로 둔다.
import type { LoungeCategory, LoungeStatus } from "../lib/lounge";

export const CATEGORY_LABEL: Record<LoungeCategory, string> = {
  suggestion: "건의",
  chat: "잡담",
};

/**
 * 상태 색. 팀 핑크(#FF8FA3)는 여기 쓰지 않는다 — 앱 전체에서 "누를 수 있는 것"의
 * 색이라 상태 뱃지에 쓰면 버튼으로 읽힌다.
 */
export const STATUS_META: Record<LoungeStatus, { label: string; dot: string; chip: string }> = {
  received: {
    label: "접수",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  },
  reviewing: {
    label: "확인중",
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
  },
  resolved: {
    label: "반영됨",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  declined: {
    label: "보류",
    dot: "bg-gray-400",
    chip: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/45",
  },
};

export const STATUS_ORDER: LoungeStatus[] = ["received", "reviewing", "resolved", "declined"];

/**
 * "2026-08-03T23:51:41Z" → "방금 · 3시간 전 · 어제 · 3일 전 · 8/1"
 * 전술게시판(BoardGrid)과 같은 규칙이다. 최신 글이 위로 오는 화면이라 며칠 안쪽은
 * 상대시간이 훨씬 빨리 읽힌다.
 */
export function relativeTime(raw: string | null): string {
  if (!raw) return "";
  const then = new Date(raw);
  if (isNaN(then.getTime())) return "";
  const min = Math.floor((Date.now() - then.getTime()) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  return `${then.getMonth() + 1}/${then.getDate()}`;
}

/** 익명 고지 — 작성 모달과 목록 안내에서 같은 문장을 쓴다. */
export const ANON_NOTICE = "이름은 공개되지 않아요. 운영진만 확인할 수 있어요.";
