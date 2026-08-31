// 사랑방 이모티콘 목록.
//
// 그림은 `public/emoticons/<id>.png` 에서 찾는다. **파일이 없으면 emoji 로 떨어진다**
// ([[Emoticon.tsx]]) — 그래서 그림을 그리기 전에도 기능이 돌아가고, 나중에 PNG 를
// 그 이름으로 넣기만 하면 코드를 안 고쳐도 그림으로 바뀐다.
//
// 이모티콘을 늘리려면 여기 한 줄 + PNG 한 장. 백엔드는 id 문자열만 저장하므로
// (`lounge_comment.emoticon`) 건드릴 필요가 없다.

export interface Emoticon {
  /** 저장되는 값이자 파일 이름. 소문자·숫자·하이픈만. */
  id: string;
  /** 접근성 라벨 겸 툴팁. */
  label: string;
  /** 그림이 없을 때 대신 그릴 것. */
  emoji: string;
}

export const EMOTICONS: Emoticon[] = [
  { id: "me-too", label: "저도요", emoji: "🙋" },
  { id: "agree", label: "동의", emoji: "👍" },
  { id: "laugh", label: "빵터짐", emoji: "😂" },
  { id: "cry", label: "슬퍼요", emoji: "😭" },
  { id: "sorry", label: "죄송", emoji: "🙏" },
  { id: "thinking", label: "음…", emoji: "🤔" },
  { id: "fire", label: "불타오르네", emoji: "🔥" },
  { id: "duck", label: "꽥", emoji: "🐥" },
];

/** 모르는 id 는 무시한다 — 예전 이모티콘을 지워도 옛 댓글이 깨지지 않는다. */
export function findEmoticon(id: string | null | undefined): Emoticon | null {
  return EMOTICONS.find((e) => e.id === id) ?? null;
}
