export interface SubstitutionEvent {
  out: string;
  in: string;
  time?: string;
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
