"use client";
// 이모티콘 고르는 격자. 글 아이콘(노션식)과 댓글 이모티콘이 같이 쓴다.
// 두 곳에서 모양이 달라지면 같은 기능으로 안 읽힌다.

import Emoticon from "./Emoticon";
import { EMOTICONS } from "./emoticons";

export default function EmoticonPicker({
  selected,
  onPick,
  onClear,
}: {
  selected: string | null;
  /** 이미 골라둔 걸 다시 누르면 해제한다(노션 아이콘처럼 토글). */
  onPick: (id: string) => void;
  /** 있으면 "빼기" 줄이 붙는다. */
  onClear?: () => void;
}) {
  return (
    <div className="animate-fade rounded-2xl bg-gray-50 p-2 dark:bg-white/[0.04]">
      <div className="grid grid-cols-4 gap-1">
        {EMOTICONS.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onPick(e.id)}
            aria-label={e.label}
            aria-pressed={selected === e.id}
            className={`flex flex-col items-center gap-1 rounded-xl py-2.5 transition-colors ${
              selected === e.id
                ? "bg-[#FF8FA3]/12 dark:bg-[#FFB6C1]/12"
                : "active:bg-gray-200/70 dark:active:bg-white/10"
            }`}
          >
            <Emoticon id={e.id} size={32} />
            <span className="text-[9px] font-black text-gray-400 dark:text-white/30">
              {e.label}
            </span>
          </button>
        ))}
      </div>
      {onClear && selected && (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 w-full rounded-xl py-2 text-[10.5px] font-black text-gray-400 active:bg-gray-200/70 dark:text-white/30 dark:active:bg-white/10"
        >
          아이콘 빼기
        </button>
      )}
    </div>
  );
}
