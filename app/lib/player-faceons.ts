const PLAYER_FACEONS = new Set([
  "강창훈",
  "강현준",
  "공도하",
  "금상덕",
  "김광민",
  "김주성",
  "김준수",
  "문대영",
  "문승환",
  "박상민",
  "박영휘",
  "원석희",
  "이건주",
  "이재욱",
  "임재준",
  "최동권",
  "황동주",
]);

export function playerFaceOnSrc(name: string): string | null {
  const normalized = name.trim().normalize("NFC");
  return PLAYER_FACEONS.has(normalized)
    ? `/players/${encodeURIComponent(normalized)}.webp`
    : null;
}
