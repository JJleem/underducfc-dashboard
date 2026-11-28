// 선수 사진(누끼 webp). 선수마다 유니폼별로 여러 장을 가질 수 있다.
//   하계: public/players/<이름>.webp
//   동계: public/players/winter/<이름>.webp
// 새 사진을 넣으면 아래 목록에도 추가한다(파일만 넣으면 안 뜬다).
//
// 동계 사진이 있으면 무조건 동계, 없으면 하계.

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
  "김주성",
  "김준수",
  "문승환",
  "소윤섭",
  "신태민",
  "우진우",
  "우희준",
  "임재준",
  "최동권",
];

const KITS_BY_PLAYER = new Map<string, Kit[]>();
for (const n of SUMMER) KITS_BY_PLAYER.set(n, ["summer"]);
for (const n of WINTER) KITS_BY_PLAYER.set(n, [...(KITS_BY_PLAYER.get(n) ?? []), "winter"]);

const norm = (name: string) => name.trim().normalize("NFC");

/** 이 선수에게 있는 사진의 유니폼들. */
export function playerKits(name: string): Kit[] {
  return KITS_BY_PLAYER.get(norm(name)) ?? [];
}

/**
 * @param kit 이 유니폼으로 고정(예: 지난 시즌 래핑은 하계). 그 사진이 없으면 기본 규칙으로.
 *            생략하면 동계 → 하계 순.
 */
export function playerFaceOnSrc(name: string, kit?: Kit): string | null {
  const n = norm(name);
  const kits = KITS_BY_PLAYER.get(n);
  if (!kits) return null;
  const use: Kit =
    kit && kits.includes(kit) ? kit : kits.includes("winter") ? "winter" : "summer";
  const file = `${encodeURIComponent(n)}.webp`;
  return use === "winter" ? `/players/winter/${file}` : `/players/${file}`;
}
