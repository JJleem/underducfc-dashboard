// 26-27 결과 카드(피드 카드 · 공유 이미지)가 같이 쓰는 순수 계산.
// 두 군데가 따로 세면 앱에서 본 카드와 공유한 그림이 달라진다.

export interface ScorerLine {
  name: string;
  /** 상대 자책골 · 게스트 — 흐리게 그리고 맨 뒤로 보낸다. */
  muted: boolean;
  goals: number;
  /** 이 득점자에게 도움을 준 사람들(겹치면 한 번). */
  assists: string[];
}

const OWN_GOAL = /^(OG|자책골)$/i;
const MUTED = /^(OG|자책골|게스트)$/i;

/**
 * goals · assists 는 index 로 짝이다(goals[i] 의 도움이 assists[i]).
 * 득점자별로 묶고 그 골들의 도움을 모은다. 많이 넣은 순, 같으면 먼저 넣은 순.
 */
export function scorerLines(goals: string, assists: string): ScorerLine[] {
  const g = (goals || "").split(",").map((s) => s.trim());
  const a = (assists || "").split(",").map((s) => s.trim());
  const map = new Map<string, ScorerLine & { first: number }>();
  g.forEach((raw, i) => {
    if (!raw) return;
    const name = OWN_GOAL.test(raw) ? "상대 자책골" : raw;
    let line = map.get(name);
    if (!line) {
      line = { name, muted: MUTED.test(raw), goals: 0, assists: [], first: i };
      map.set(name, line);
    }
    line.goals++;
    if (a[i] && !line.assists.includes(a[i])) line.assists.push(a[i]);
  });
  return [...map.values()]
    .sort((x, y) => Number(x.muted) - Number(y.muted) || y.goals - x.goals || x.first - y.first)
    .map(({ first: _first, ...rest }) => rest);
}

export interface MomSlot {
  name: string;
  role: "ATTACK" | "DEFENCE" | null;
}

/** 확정 MOM "공격 / 수비"(공동은 쉼표). `/` 가 없으면 역할을 안 붙인다. */
export function momSlots(mom: string): MomSlot[] {
  const raw = (mom || "").trim();
  if (!raw) return [];
  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  if (!raw.includes("/")) return list(raw).map((name) => ({ name, role: null }));
  const [atk = "", def = ""] = raw.split("/");
  return [
    ...list(atk).map((name) => ({ name, role: "ATTACK" as const })),
    ...list(def).map((name) => ({ name, role: "DEFENCE" as const })),
  ];
}

export const RESULT_TAG: Record<string, string> = { 승: "WIN", 패: "LOSS", 무: "DRAW" };

/** lucide Volleyball — 앱이 골에 쓰는 아이콘. 캔버스(Path2D)와 SVG 가 같이 쓴다. */
export const BALL_PATHS = [
  "M11.1 7.1a16.55 16.55 0 0 1 10.9 4",
  "M12 12a12.6 12.6 0 0 1-8.7 5",
  "M16.8 13.6a16.55 16.55 0 0 1-9 7.5",
  "M20.7 17a12.8 12.8 0 0 0-8.7-5 13.3 13.3 0 0 1 0-10",
  "M6.3 3.8a16.55 16.55 0 0 0 1.9 11.5",
];
