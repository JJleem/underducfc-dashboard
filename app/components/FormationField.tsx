"use client";

export interface LineupForField {
  formation: string;
  players: string[];
}

export const FORMATION_POSITIONS: Record<string, { x: number; y: number }[]> = {
  "4-3-3": [
    { x: 50, y: 88 },
    { x: 12, y: 70 }, { x: 36, y: 70 }, { x: 64, y: 70 }, { x: 88, y: 70 },
    { x: 22, y: 48 }, { x: 50, y: 46 }, { x: 78, y: 48 },
    { x: 16, y: 22 }, { x: 50, y: 18 }, { x: 84, y: 22 },
  ],
  "4-4-2": [
    { x: 50, y: 88 },
    { x: 12, y: 70 }, { x: 36, y: 70 }, { x: 64, y: 70 }, { x: 88, y: 70 },
    { x: 12, y: 48 }, { x: 36, y: 48 }, { x: 64, y: 48 }, { x: 88, y: 48 },
    { x: 34, y: 22 }, { x: 66, y: 22 },
  ],
  "3-5-2": [
    { x: 50, y: 88 },
    { x: 22, y: 70 }, { x: 50, y: 70 }, { x: 78, y: 70 },
    { x: 8, y: 50 }, { x: 28, y: 50 }, { x: 50, y: 48 }, { x: 72, y: 50 }, { x: 92, y: 50 },
    { x: 34, y: 22 }, { x: 66, y: 22 },
  ],
  "4-2-3-1": [
    { x: 50, y: 88 },
    { x: 12, y: 72 }, { x: 36, y: 72 }, { x: 64, y: 72 }, { x: 88, y: 72 },
    { x: 32, y: 56 }, { x: 68, y: 56 },
    { x: 14, y: 38 }, { x: 50, y: 36 }, { x: 86, y: 38 },
    { x: 50, y: 18 },
  ],
  "3-4-3": [
    { x: 50, y: 88 },
    { x: 22, y: 70 }, { x: 50, y: 70 }, { x: 78, y: 70 },
    { x: 12, y: 50 }, { x: 36, y: 50 }, { x: 64, y: 50 }, { x: 88, y: 50 },
    { x: 16, y: 22 }, { x: 50, y: 18 }, { x: 84, y: 22 },
  ],
  "5-3-2": [
    { x: 50, y: 88 },
    { x: 8, y: 70 }, { x: 26, y: 70 }, { x: 50, y: 70 }, { x: 74, y: 70 }, { x: 92, y: 70 },
    { x: 22, y: 48 }, { x: 50, y: 46 }, { x: 78, y: 48 },
    { x: 34, y: 22 }, { x: 66, y: 22 },
  ],
  "4-1-4-1": [
    { x: 50, y: 88 },
    { x: 12, y: 74 }, { x: 36, y: 74 }, { x: 64, y: 74 }, { x: 88, y: 74 },
    { x: 50, y: 60 },
    { x: 10, y: 44 }, { x: 34, y: 44 }, { x: 66, y: 44 }, { x: 90, y: 44 },
    { x: 50, y: 18 },
  ],
};

function getLayerIndex(playerIndex: number, formation: string): number {
  if (playerIndex === 0) return 0;
  const layers = formation.split("-").map(Number);
  let count = 1;
  for (let i = 0; i < layers.length; i++) {
    if (playerIndex < count + layers[i]) return i + 1;
    count += layers[i];
  }
  return layers.length;
}

function getPlayerColor(layerIndex: number, totalLayers: number) {
  if (layerIndex === 0) return { bg: "#F59E0B", border: "#FDE68A", text: "#78350F" };
  if (layerIndex === 1) return { bg: "#3B82F6", border: "#93C5FD", text: "#FFFFFF" };
  if (layerIndex === totalLayers) return { bg: "#FF8FA3", border: "#FFB6C1", text: "#FFFFFF" };
  return { bg: "#10B981", border: "#6EE7B7", text: "#FFFFFF" };
}

// ─── 풀 사이즈 필드 ────────────────────────────────────────────
export function FormationField({
  lineup,
  rosterMap,
}: {
  lineup: LineupForField;
  rosterMap: Record<string, string>;
}) {
  const positions = FORMATION_POSITIONS[lineup.formation];
  const totalLayers = lineup.formation.split("-").length;

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-xl">
      <div
        className="relative w-full"
        style={{
          paddingBottom: "145%",
          background:
            "linear-gradient(180deg,#1a5c1a 0%,#236b23 12.5%,#1a5c1a 25%,#236b23 37.5%,#1a5c1a 50%,#236b23 62.5%,#1a5c1a 75%,#236b23 87.5%,#1a5c1a 100%)",
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 145"
          preserveAspectRatio="none"
          fill="none"
        >
          <rect x="4" y="4" width="92" height="137" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
          <line x1="4" y1="72.5" x2="96" y2="72.5" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
          <circle cx="50" cy="72.5" r="13" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
          <circle cx="50" cy="72.5" r="1" fill="rgba(255,255,255,0.6)" />
          <rect x="22" y="4" width="56" height="22" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          <rect x="34" y="4" width="32" height="10" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          <circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.5)" />
          <rect x="22" y="119" width="56" height="22" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          <rect x="34" y="131" width="32" height="10" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          <circle cx="50" cy="127" r="0.8" fill="rgba(255,255,255,0.5)" />
          <rect x="40" y="1.5" width="20" height="2.5" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
          <rect x="40" y="141" width="20" height="2.5" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
          <path d="M4,8 A4,4 0 0,0 8,4" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <path d="M92,8 A4,4 0 0,1 96,4" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <path d="M4,137 A4,4 0 0,1 8,141" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <path d="M92,137 A4,4 0 0,0 96,141" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        </svg>

        {lineup.players.map((player, i) => {
          const pos = positions?.[i];
          if (!pos || !player) return null;
          const layerIdx = getLayerIndex(i, lineup.formation);
          const color = getPlayerColor(layerIdx, totalLayers);
          const isTbd = player.trim() === "미정";
          const jerseyNo = rosterMap[player.trim()];
          const isGuest = !jerseyNo && !isTbd;
          const shortName = isTbd ? "미정" : player.length > 4 ? player.slice(0, 4) : player;

          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)", zIndex: 10 }}
            >
              <div
                className="flex items-center justify-center rounded-full font-black shadow-lg"
                style={{
                  width: 34, height: 34,
                  fontSize: isTbd ? 10 : isGuest ? 8 : (jerseyNo?.length ?? 1) > 2 ? 9 : 12,
                  backgroundColor: isTbd ? "#374151" : isGuest ? "#6B7280" : color.bg,
                  border: `2.5px solid ${isTbd ? "#6B7280" : isGuest ? "#9CA3AF" : color.border}`,
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }}
              >
                {isTbd ? "?" : isGuest ? "G" : jerseyNo}
              </div>
              <div
                className="mt-0.5 px-1 rounded text-[8.5px] font-black text-white text-center leading-tight max-w-[44px] truncate"
                style={{ background: "rgba(0,0,0,0.65)", textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
              >
                {shortName}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 py-2.5 bg-[#0f3d0f]">
        {[
          { label: "GK", color: "#F59E0B" },
          { label: "DF", color: "#3B82F6" },
          { label: "MF", color: "#10B981" },
          { label: "FW", color: "#FF8FA3" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[9px] font-bold text-white/60">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 미니 필드 (아코디언용) ─────────────────────────────────────
export function MiniFormationField({
  lineup,
  rosterMap,
}: {
  lineup: LineupForField;
  rosterMap: Record<string, string>;
}) {
  const positions = FORMATION_POSITIONS[lineup.formation];
  const totalLayers = lineup.formation.split("-").length;
  if (!positions) return null;

  return (
    <div className="w-full rounded-xl overflow-hidden">
      <div
        className="relative w-full"
        style={{
          paddingBottom: "62%",
          background:
            "linear-gradient(180deg,#1a5c1a 0%,#236b23 20%,#1a5c1a 40%,#236b23 60%,#1a5c1a 80%,#236b23 100%)",
        }}
      >
        {/* 간소화된 필드 라인 */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 62"
          preserveAspectRatio="none"
          fill="none"
        >
          <rect x="2" y="2" width="96" height="58" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
          <line x1="2" y1="31" x2="98" y2="31" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          <circle cx="50" cy="31" r="9" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          <rect x="28" y="2" width="44" height="12" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <rect x="28" y="48" width="44" height="12" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
        </svg>

        {lineup.players.map((player, i) => {
          const pos = positions[i];
          if (!pos || !player) return null;
          const layerIdx = getLayerIndex(i, lineup.formation);
          const color = getPlayerColor(layerIdx, totalLayers);
          const isTbd = player.trim() === "미정";
          const jerseyNo = rosterMap[player.trim()];
          const isGuest = !jerseyNo && !isTbd;
          const shortName = isTbd ? "?" : player.slice(0, 3);

          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)", zIndex: 10 }}
            >
              <div
                className="flex items-center justify-center rounded-full font-black"
                style={{
                  width: 20, height: 20,
                  fontSize: 8,
                  backgroundColor: isTbd ? "#374151" : isGuest ? "#6B7280" : color.bg,
                  border: `1.5px solid ${isTbd ? "#6B7280" : isGuest ? "#9CA3AF" : color.border}`,
                  color: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                }}
              >
                {isTbd ? "?" : isGuest ? "G" : jerseyNo}
              </div>
              <div
                className="mt-px text-[6px] font-black text-white text-center leading-tight max-w-[26px] truncate"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,1)" }}
              >
                {shortName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
