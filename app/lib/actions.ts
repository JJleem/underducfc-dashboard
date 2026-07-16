"use server";
// app/lib/actions.ts
// 클라이언트에서 호출 가능한 서버 액션.

import { revalidateAppData } from "./cache";

/** 당겨서 새로고침 등 사용자 수동 새로고침 시: 캐시를 비워 다음 렌더가 새 데이터를 받게 한다. */
export async function refreshAppData(): Promise<void> {
  revalidateAppData();
}
