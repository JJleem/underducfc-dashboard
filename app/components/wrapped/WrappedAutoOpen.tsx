"use client";

// 래핑이 공개된 뒤 앱을 처음 열면 한 번만 /wrapped 로 보낸다.
//
// 공개일(SeasonDef.wrappedFrom)에 아무도 프로필의 "시즌 돌아보기" 버튼을 찾아 들어가지
// 않는다. 그래서 첫 진입 한 번은 데려가고, 그 뒤로는 버튼으로 다시 보게 한다
// (필름 마지막 장에 그 길을 적어 둔다).
//
// "봤다" 표시는 이 기기에만 남는다(localStorage). 폰을 바꾸면 한 번 더 뜨는 정도는 괜찮다.
// 저장이 막힌 브라우저(프라이빗 모드 등)에선 매번 끌려가지 않도록 아예 보내지 않는다.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WrappedAutoOpen({ seasonId }: { seasonId: string }) {
  const router = useRouter();
  useEffect(() => {
    const key = `wrapped_seen_${seasonId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      return;
    }
    router.push(`/wrapped?season=${seasonId}`);
  }, [router, seasonId]);
  return null;
}
