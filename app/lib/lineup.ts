export interface SubstitutionEvent {
  out: string;
  in: string;
  time?: string;
}

/**
 * 선발/대기 명단을 정규화한다.
 * 같은 실명이 선발 여러 칸 또는 선발과 대기에 동시에 있으면 먼저 나온 자리만 유지한다.
 * "미정"은 서로 다른 빈 자리를 뜻할 수 있으므로 선발에서만 중복을 허용한다.
 */
export function normalizeLineupMembers(
  players: readonly (string | null | undefined)[],
  subs: readonly (string | null | undefined)[],
): { players: string[]; subs: string[] } {
  const seen = new Set<string>();
  const cleanPlayers = players.map((value) => {
    const name = String(value ?? "").trim();
    if (!name) return "";
    if (name !== "미정") {
      if (seen.has(name)) return "";
      seen.add(name);
    }
    return name;
  });
  const cleanSubs: string[] = [];
  for (const value of subs) {
    const name = String(value ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    cleanSubs.push(name);
  }
  return { players: cleanPlayers, subs: cleanSubs };
}

export function parseSubstitutions(raw?: string): SubstitutionEvent[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const event = item as Record<string, unknown>;
        const out = typeof event.out === "string" ? event.out.trim() : "";
        const incoming = typeof event.in === "string" ? event.in.trim() : "";
        const time = typeof event.time === "string" ? event.time.trim() : "";
        if (!out && !incoming) return null;
        return { out, in: incoming, ...(time ? { time } : {}) };
      })
      .filter((event): event is SubstitutionEvent => event !== null);
  } catch {
    return [];
  }
}
