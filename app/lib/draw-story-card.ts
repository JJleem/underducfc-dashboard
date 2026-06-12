// 인스타 스토리 사이즈(1080x1920) 공유 카드: 결과 + 골 기록 + MOM + 포메이션 합본
import type { MatchData, LineupData } from "../components/DashboardClient";
import { FORMATION_POSITIONS } from "../components/FormationField";

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
  if (layerIndex === 0) return { bg: "#F59E0B", border: "#FDE68A" };
  if (layerIndex === 1) return { bg: "#3B82F6", border: "#93C5FD" };
  if (layerIndex === totalLayers) return { bg: "#FF8FA3", border: "#FFB6C1" };
  return { bg: "#10B981", border: "#6EE7B7" };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const FONT = "-apple-system, 'Apple SD Gothic Neo', Arial, sans-serif";

async function drawStoryCanvas(
  match: MatchData,
  lineup: LineupData | null,
  rosterMap: Record<string, string>
): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── 배경: 다크 네이비 + 핑크 글로우 + 별 ─────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#070d20");
  bg.addColorStop(0.5, "#0d1733");
  bg.addColorStop(1, "#070d20");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 600);
  glow.addColorStop(0, "rgba(255,182,193,0.16)");
  glow.addColorStop(1, "rgba(255,182,193,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  [[130, 90], [310, 50], [480, 120], [660, 40], [840, 100], [970, 160], [200, 200], [900, 250]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // ── 상단 브랜드 ──────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFB6C1";
  ctx.font = `900 38px ${FONT}`;
  ctx.fillText("UNDERDUCK FC", W / 2, 130);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `600 26px ${FONT}`;
  const subtitle = [match.date, match.time !== "미정" ? match.time : "", match.location !== "미정" ? match.location : ""]
    .filter(Boolean).join("  ·  ");
  ctx.fillText(subtitle, W / 2, 182);

  ctx.strokeStyle = "rgba(255,182,193,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 220);
  ctx.lineTo(W - 120, 220);
  ctx.stroke();

  // ── 팀명 + 스코어 ────────────────────────────────────────────
  const isInternal = match.opponent === "자체전";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `900 40px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText(isInternal ? "언더덕 A" : "언더덕", 110, 330);
  ctx.textAlign = "right";
  ctx.fillText(isInternal ? "언더덕 B" : (match.opponent || "상대팀"), W - 110, 330);

  const resultColor = match.result === "승" ? "#FFB6C1" : match.result === "무" ? "#9ca3af" : "#6b7280";
  ctx.textAlign = "center";
  ctx.font = `900 150px ${FONT}`;
  ctx.fillStyle = resultColor;
  ctx.fillText(String(match.ourScore ?? "-"), W / 2 - 130, 370);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = `900 90px ${FONT}`;
  ctx.fillText(":", W / 2, 355);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `900 150px ${FONT}`;
  ctx.fillText(String(match.theirScore ?? "-"), W / 2 + 130, 370);

  // 결과 뱃지
  if (match.result && match.result !== "예정") {
    const bw = 120, bh = 56, bx = W / 2 - bw / 2, by = 410;
    ctx.fillStyle = match.result === "승" ? "rgba(255,182,193,0.25)" : "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 28);
    ctx.fill();
    ctx.fillStyle = resultColor;
    ctx.font = `900 30px ${FONT}`;
    ctx.fillText(match.result, W / 2, by + 39);
  }

  // ── 골 기록 + MOM ────────────────────────────────────────────
  let curY = 560;
  if (match.goals) {
    const scorers = match.goals.split(",");
    const assists = match.assists?.split(",") || [];
    for (let i = 0; i < scorers.length && i < 7; i++) {
      const scorer = scorers[i]?.trim();
      if (!scorer) continue;
      const assistant = assists[i]?.trim();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = `800 30px ${FONT}`;
      ctx.fillText(`⚽ ${scorer}${assistant ? `   ·   assist ${assistant}` : ""}`, W / 2, curY);
      curY += 50;
    }
  }
  if (match.mom) {
    curY += 10;
    ctx.fillStyle = "#fbbf24";
    ctx.font = `900 32px ${FONT}`;
    ctx.fillText(`⭐ MOM  ${match.mom.trim()}`, W / 2, curY);
    curY += 50;
  }

  // ── 포메이션 필드 ────────────────────────────────────────────
  const positions = lineup ? FORMATION_POSITIONS[lineup.formation] : null;
  if (lineup && positions) {
    const FX = 150, FW_ = W - 300; // 필드 영역
    const FY = Math.max(curY + 30, 760);
    const FH = 1800 - FY;

    // 잔디 스트라이프
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(FX, FY, FW_, FH, 24);
    ctx.clip();
    const stripes = 8;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#15592e" : "#0f4a25";
      ctx.fillRect(FX, FY + (i * FH) / stripes, FW_, FH / stripes);
    }
    // 필드 라인
    const pad = 24;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(FX + pad, FY + pad, FW_ - pad * 2, FH - pad * 2);
    ctx.beginPath();
    ctx.moveTo(FX + pad, FY + FH / 2);
    ctx.lineTo(FX + FW_ - pad, FY + FH / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(FX + FW_ / 2, FY + FH / 2, 90, 0, Math.PI * 2);
    ctx.stroke();
    // 페널티 박스 (위/아래)
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    const pbW = FW_ * 0.5, pbH = FH * 0.13;
    ctx.strokeRect(FX + (FW_ - pbW) / 2, FY + pad, pbW, pbH);
    ctx.strokeRect(FX + (FW_ - pbW) / 2, FY + FH - pad - pbH, pbW, pbH);

    // 중앙 로고
    try {
      const img = await loadImage("/underducklogo.png");
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(FX + FW_ / 2, FY + FH / 2, 80, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, FX + FW_ / 2 - 80, FY + FH / 2 - 80, 160, 160);
      ctx.globalAlpha = 1;
    } catch { /* 무시 */ }
    ctx.restore();

    // 선수 마커
    const totalLayers = lineup.formation.split("-").length;
    const momNames = (match.mom || "").split(",").map((s) => s.trim());
    for (let i = 0; i < lineup.players.length; i++) {
      const player = lineup.players[i];
      const pos = positions[i];
      if (!pos || !player) continue;
      const x = FX + (pos.x / 100) * FW_;
      const y = FY + (pos.y / 100) * FH;
      const R = 34;
      const isTbd = player.trim() === "미정";
      const jerseyNo = rosterMap[player.trim()];
      const color = isTbd ? { bg: "#374151", border: "#9CA3AF" } : getPlayerColor(getLayerIndex(i, lineup.formation), totalLayers);

      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = color.bg;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color.border;
      ctx.lineWidth = 4;
      ctx.stroke();

      const label = isTbd ? "?" : jerseyNo || "G";
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${label.length > 2 ? 20 : 26}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y);

      const name = isTbd ? "미정" : player.trim().slice(0, 4);
      ctx.font = `800 18px ${FONT}`;
      const nameW = ctx.measureText(name).width + 16;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.beginPath();
      ctx.roundRect(x - nameW / 2, y + R + 6, nameW, 26, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(name, x, y + R + 19);

      // MOM 왕관
      if (!isTbd && momNames.includes(player.trim())) {
        ctx.font = "26px serif";
        ctx.fillText("👑", x, y - R - 16);
      }
      ctx.textBaseline = "alphabetic";
    }

    // 포메이션 라벨
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `900 24px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`${lineup.formation}  ·  ${lineup.quarter}`, W / 2, FY - 18);
  }

  // ── 푸터 ─────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = `700 22px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("UNDERDUCK FC  ·  @underduck_fc", W / 2, H - 50);

  return canvas;
}

export async function shareStoryCard(
  match: MatchData,
  lineup: LineupData | null,
  rosterMap: Record<string, string>
) {
  const canvas = await drawStoryCanvas(match, lineup, rosterMap);
  const fileName = `언더덕_${match.opponent}_${match.date}_스토리.png`;

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error("이미지 생성 실패")); return; }
      const file = new File([blob], fileName, { type: "image/png" });
      try {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        } catch { /* 클립보드 미지원 무시 */ }

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "언더덕 경기 스토리" });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }
        resolve();
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") resolve();
        else reject(e);
      }
    }, "image/png");
  });
}
