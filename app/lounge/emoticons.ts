// 사랑방 이모티콘 목록.
//
// **기본은 emoji 다.** 그림(`public/emoticons/<id>.png`)이 있는 건 `art: true` 로
// 표시한 것뿐이고, 나머지는 emoji 를 바로 그린다 — 요청을 아예 보내지 않는다.
//
// 예전에는 일단 PNG 를 요청해 보고 404 가 나면 emoji 로 떨어뜨렸다. 그림을 넣기만
// 하면 코드를 안 고쳐도 됐지만, 그림 없는 것들이 화면을 열 때마다 404 를 내고
// 그 왕복만큼 늦게 떴다. 그림이 몇 개 없는 게 기본 상태라면 손해가 더 크다.
//
// 그림을 새로 넣으면 파일을 두고 여기 `art: true` 한 줄을 켜면 된다.

export interface Emoticon {
  /** 저장되는 값이자 파일 이름. 소문자·숫자·하이픈만. */
  id: string;
  /** 접근성 라벨 겸 이름표. */
  label: string;
  /** 그림이 없을 때 그리는 것. 대부분 이걸 쓴다. */
  emoji: string;
  /** `public/emoticons/<id>.png` 가 **실제로 있을 때만** 켠다. */
  art?: boolean;
}

export const EMOTICONS: Emoticon[] = [
  { id: "me-too", label: "저도요", emoji: "🙋", art: true },
  { id: "agree", label: "동의", emoji: "👍", art: true },
  { id: "laugh", label: "빵터짐", emoji: "😂" },
  { id: "cry", label: "슬퍼요", emoji: "😭" },
  { id: "sorry", label: "죄송", emoji: "🙏" },
  { id: "thinking", label: "음…", emoji: "🤔" },
  { id: "fire", label: "불타오르네", emoji: "🔥" },
  { id: "duck", label: "꽥", emoji: "🐥" },
];

/**
 * 글을 새로 쓸 때 미리 골라져 있는 아이콘. 아무것도 없는 칸부터 시작하면 대부분
 * 그냥 지나쳐서 목록이 밋밋해진다. 물론 바꾸거나 뺄 수 있다.
 */
export const DEFAULT_POST_ICON = "me-too";

/** 모르는 id 는 무시한다 — 예전 이모티콘을 지워도 옛 댓글이 깨지지 않는다. */
export function findEmoticon(id: string | null | undefined): Emoticon | null {
  return EMOTICONS.find((e) => e.id === id) ?? null;
}
