"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

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

// 중계 카메라 틸트 각도 — 필드는 이 각도로 눕고, 선수 카드는 역회전해 일어선다
const TILT = 30;

export function FormationField({
  lineup,
  rosterMap,
}: {
  lineup: LineupForField;
  rosterMap: Record<string, string>;
}) {
  const positions = FORMATION_POSITIONS[lineup.formation];
  const totalLayers = lineup.formation.split("-").length;
  const [selected, setSelected] = useState<number | null>(null);
  // 등장 스태거는 마운트 직후 한 번만 — 이후 탭 인터랙션엔 딜레이 없음
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden ring-1 ring-white/10"
      style={{
        background: "linear-gradient(180deg,#070d20 0%,#0d1733 55%,#070d20 100%)",
        boxShadow: "0 12px 40px rgba(5,10,30,0.55), 0 0 28px rgba(255,143,163,0.10)",
      }}
    >
      <div className="relative w-full" style={{ paddingBottom: "112%" }}>
        {/* 밤하늘 별 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(1.5px 1.5px at 12% 10%, rgba(255,255,255,0.7), transparent)," +
              "radial-gradient(1px 1px at 28% 5%, rgba(255,255,255,0.5), transparent)," +
              "radial-gradient(1.5px 1.5px at 45% 12%, rgba(255,255,255,0.6), transparent)," +
              "radial-gradient(1px 1px at 62% 4%, rgba(255,255,255,0.5), transparent)," +
              "radial-gradient(1.5px 1.5px at 78% 9%, rgba(255,255,255,0.7), transparent)," +
              "radial-gradient(1px 1px at 90% 14%, rgba(255,255,255,0.4), transparent)",
          }}
        />
        {/* 스타디움 스포트라이트 */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: "-10%", top: "-8%", width: "60%", height: "70%",
            background: "linear-gradient(125deg, rgba(255,182,193,0.14) 0%, rgba(255,255,255,0.05) 30%, transparent 60%)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            right: "-10%", top: "-8%", width: "60%", height: "70%",
            background: "linear-gradient(-125deg, rgba(147,197,253,0.12) 0%, rgba(255,255,255,0.05) 30%, transparent 60%)",
          }}
        />

        {/* 3D 무대 */}
        <div
          className="absolute inset-0"
          style={{ perspective: "1200px", perspectiveOrigin: "50% 25%" }}
        >
          {/* 기울어진 피치 평면 */}
          <div
            className="absolute"
            style={{
              left: "6%", right: "6%", bottom: "4%", height: "124%",
              transformOrigin: "50% 100%",
              transform: `rotateX(${TILT}deg)`,
              transformStyle: "preserve-3d",
              borderRadius: 14,
              background:
                "repeating-linear-gradient(180deg,#15592e 0%,#15592e 12.5%,#0f4a25 12.5%,#0f4a25 25%)",
              boxShadow: "0 0 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* 플러드라이트 하이라이트 + 가장자리 비네팅 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: 14,
                background:
                  "radial-gradient(85% 55% at 50% 32%, rgba(255,255,255,0.10) 0%, transparent 65%)," +
                  "radial-gradient(130% 95% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)",
              }}
            />

            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 145"
              preserveAspectRatio="none"
              fill="none"
            >
              <rect x="4" y="4" width="92" height="137" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" />
              <line x1="4" y1="72.5" x2="96" y2="72.5" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
              <circle cx="50" cy="72.5" r="13" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
              <circle cx="50" cy="72.5" r="1" fill="rgba(255,255,255,0.55)" />
              <rect x="22" y="4" width="56" height="22" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
              <rect x="34" y="4" width="32" height="10" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
              <circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.45)" />
              <rect x="22" y="119" width="56" height="22" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
              <rect x="34" y="131" width="32" height="10" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
              <circle cx="50" cy="127" r="0.8" fill="rgba(255,255,255,0.45)" />
              <rect x="40" y="1.5" width="20" height="2.5" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" />
              <rect x="40" y="141" width="20" height="2.5" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" />
              <path d="M4,8 A4,4 0 0,0 8,4" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
              <path d="M92,8 A4,4 0 0,1 96,4" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
              <path d="M4,137 A4,4 0 0,1 8,141" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
              <path d="M92,137 A4,4 0 0,0 96,141" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
            </svg>

            {/* 잔디에 깔린 중앙 로고 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-24 h-24 rounded-full overflow-hidden opacity-[0.12]">
                <Image src="/underducklogo.png" alt="" fill className="object-cover" />
              </div>
            </div>

            {lineup.players.map((player, i) => {
              const pos = positions?.[i];
              if (!pos || !player) return null;
              const layerIdx = getLayerIndex(i, lineup.formation);
              const color = getPlayerColor(layerIdx, totalLayers);
              const isTbd = player.trim() === "미정";
              const jerseyNo = rosterMap[player.trim()];
              const isGuest = !jerseyNo && !isTbd;
              const isSel = selected === i;
              const name = isTbd ? "미정" : player.trim();

              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transformStyle: "preserve-3d",
                    zIndex: isSel ? 30 : 10,
                  }}
                >
                  {/* 잔디 위에 평평하게 깔리는 그림자 */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      width: 38, height: 15,
                      transform: "translate(-50%,-50%)",
                      background: "radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%)",
                    }}
                  />
                  {/* 역회전으로 일어서는 선수 카드 (빌보드) */}
                  <div
                    className="absolute"
                    style={{
                      left: 0, bottom: 0,
                      transform: `translateX(-50%) rotateX(-${TILT}deg)`,
                      transformOrigin: "50% 100%",
                    }}
                  >
                    <motion.button
                      type="button"
                      onClick={() => setSelected(isSel ? null : i)}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: selected === null || isSel ? 1 : 0.35,
                        scale: isSel ? 1.35 : 1,
                      }}
                      transition={{
                        type: "spring", stiffness: 320, damping: 22,
                        delay: entered ? 0 : 0.15 + layerIdx * 0.12,
                      }}
                      className="flex flex-col items-center cursor-pointer"
                      style={{ transformOrigin: "50% 100%" }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full font-black"
                        style={{
                          width: 34, height: 34,
                          fontSize: isTbd ? 10 : 13,
                          backgroundColor: isTbd ? "#374151" : color.bg,
                          border: `2.5px solid ${isTbd ? "#6B7280" : color.border}`,
                          color: "#fff",
                          boxShadow: isSel
                            ? `0 0 18px ${color.bg}, 0 4px 10px rgba(0,0,0,0.55)`
                            : "0 4px 10px rgba(0,0,0,0.55)",
                        }}
                      >
                        {isTbd ? "?" : isGuest ? "G" : jerseyNo}
                      </div>
                      <div
                        className="mt-1 px-1.5 rounded-md text-[9px] font-black text-white text-center leading-tight overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{
                          maxWidth: isSel ? 96 : 50,
                          background: isSel ? "rgba(255,143,163,0.92)" : "rgba(2,6,23,0.72)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                        }}
                      >
                        {isSel ? name : name.length > 4 ? name.slice(0, 4) : name}
                      </div>
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "rgba(3,8,26,0.9)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span className="text-[9px] font-black tracking-[0.25em] text-white/50">
          STARTING XI
        </span>
        <div className="flex items-center gap-3">
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
    </div>
  );
}
