// 선수 사진(누끼 webp). 선수마다 유니폼별로 여러 장을 가질 수 있다.
//   하계: public/players/<이름>.webp
//   동계: public/players/winter/<이름>.webp
// 새 사진을 넣으면 아래 목록에도 추가한다(파일만 넣으면 안 뜬다).
//
// 어떤 사진을 쓸지:
//   1. 본인이 프로필에서 고른 유니폼(roster.kit) — 그 사진이 있을 때만
//   2. 없으면 동계가 있으면 동계, 아니면 하계
// 고른 값은 레이아웃이 한 번 내려 준다(PlayerKitPrefs → setPlayerKitPrefs).
// 그래서 호출부는 playerFaceOnSrc(name) 그대로다.

export type Kit = "summer" | "winter";

const SUMMER = [
  "강창훈",
  "강현준",
  "강환국",
  "공도하",
  "금상덕",
  "김광민",
  "김주성",
  "김준수",
  "김한별",
  "문대영",
  "문승환",
  "박상민",
  "백성원",
  "박영휘",
  "송종현",
  "신태민",
  "우진우",
  "원석희",
  "이건주",
  "이재욱",
  "임재준",
  "임준우",
  "최동권",
  "최혜성",
  "홍창의",
  "황동주",
];

// 동계 사진이 들어오는 대로 이름을 추가한다.
const WINTER: string[] = [
  "강창훈",
  "금상덕",
  "김광민",
  "김준수",
  "문승환",
  "우진우",
  "우희준",
  "임재준",
  "최동권",
];

const KITS_BY_PLAYER = new Map<string, Kit[]>();
for (const n of SUMMER) KITS_BY_PLAYER.set(n, ["summer"]);
for (const n of WINTER) KITS_BY_PLAYER.set(n, [...(KITS_BY_PLAYER.get(n) ?? []), "winter"]);

const norm = (name: string) => name.trim().normalize("NFC");

let kitPrefs: Record<string, Kit> = {};

/** 선수별로 고른 유니폼. 레이아웃(클라이언트)에서 렌더마다 한 번 넣는다. */
export function setPlayerKitPrefs(prefs: Record<string, Kit>) {
  kitPrefs = prefs;
}

/** roster 행(backend.getRosterRows: 1 name, 8 kit)에서 고른 유니폼 맵을 만든다. */
export function kitPrefsFromRoster(rows: string[][]): Record<string, Kit> {
  const out: Record<string, Kit> = {};
  for (const r of rows.slice(1)) {
    const kit = (r[8] || "").trim();
    if (r[1] && (kit === "summer" || kit === "winter")) out[norm(r[1])] = kit;
  }
  return out;
}

/** 이 선수에게 있는 사진의 유니폼들. */
export function playerKits(name: string): Kit[] {
  return KITS_BY_PLAYER.get(norm(name)) ?? [];
}

/**
 * @param kit 이 유니폼으로 고정(예: 지난 시즌 래핑은 하계). 그 사진이 없으면 기본 규칙으로.
 *            생략하면 본인이 고른 값 → 동계 → 하계 순.
 */
export function playerFaceOnSrc(name: string, kit?: Kit): string | null {
  const n = norm(name);
  const kits = KITS_BY_PLAYER.get(n);
  if (!kits) return null;
  const wanted = kit ?? kitPrefs[n];
  const use: Kit =
    wanted && kits.includes(wanted) ? wanted : kits.includes("winter") ? "winter" : "summer";
  const file = `${encodeURIComponent(n)}.webp`;
  return use === "winter" ? `/players/winter/${file}` : `/players/${file}`;
}
