"use client";
// 칭호 하이라이트 줄 + 대표 칭호 편집 진입점.
//
// 예전엔 줄 위에 "칭호 (12)  대표 고르기" 라벨 줄이 따로 있었다. 레퍼런스(인스타 프로필)엔
// 하이라이트 위에 라벨도 개수도 없고, 편집은 줄 맨 앞의 "New ＋" 동그라미가 맡는다.
// 같은 자리로 옮기면 줄 하나가 통째로 사라지면서 칭호가 히어로에 더 붙는다.
//
// 편집 패널(FeaturedEditor)은 가로 스크롤 줄 안에 넣을 수 없어서 여기서 상태만 들고
// 줄 아래에 편다. 그래서 FeaturedEditor 를 제어 모드로 쓴다.

import { useState } from "react";
import { Plus } from "lucide-react";
import { EarnedTitle } from "../lib/titles";
import PlayerTitleCards from "./PlayerTitleCards";
import FeaturedEditor from "./FeaturedEditor";

export default function TitleHighlights({
  titles,
  featuredIds,
  canEdit,
}: {
  titles: EarnedTitle[];
  featuredIds: string[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <PlayerTitleCards
        titles={titles}
        featuredIds={featuredIds}
        leading={
          canEdit ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex w-full flex-col items-center gap-1.5 transition-transform active:scale-[0.94]"
            >
              {/* 칭호 링(50px 뱃지 + 3px 패딩 + 1.5px 테두리 = 59px)과 지름을 맞춘다 */}
              <span className="flex h-[59px] w-[59px] items-center justify-center rounded-full border-[1.5px] border-dashed border-gray-300 text-gray-400 dark:border-white/20 dark:text-white/40">
                <Plus width={22} height={22} strokeWidth={2.2} />
              </span>
              <span className="text-center text-[9.5px] font-black leading-[1.25] tracking-[-0.02em] text-gray-400 dark:text-white/40">
                대표
              </span>
            </button>
          ) : undefined
        }
      />
      {canEdit && (
        <FeaturedEditor
          titles={titles}
          current={featuredIds}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
    </>
  );
}
