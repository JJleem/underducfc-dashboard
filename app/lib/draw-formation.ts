// Canvas API로 포메이션 필드를 직접 그려 이미지로 공유 (html2canvas 불필요)

const FORMATION_POSITIONS: Record<string, { x: number; y: number }[]> = {
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function drawFormationCanvas(
  lineup: { formation: string; players: string[] },
  rosterMap: Record<string, string>,
  label?: string // 예: "언더덕 vs 어미새fc · 예상"
): Promise<HTMLCanvasElement> {
  const W = 400;
  const H = 580;
  const PADDING = 20;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  const positions = FORMATION_POSITIONS[lineup.formation];
  if (!positions) return canvas;

  // ─── 잔디 스트라이프 배경 ───────────────────────────────────
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#1a5c1a" : "#236b23";
    ctx.fillRect(0, (i * H) / stripes, W, H / stripes);
  }

  // ─── 필드 라인 ──────────────────────────────────────────────
  ctx.lineWidth = 1.5;

  // 외곽선
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.strokeRect(PADDING, PADDING, W - PADDING * 2, H - PADDING * 2);

  // 하프라인
  ctx.beginPath();
  ctx.moveTo(PADDING, H / 2);
  ctx.lineTo(W - PADDING, H / 2);
  ctx.stroke();

  // 센터서클
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 55, 0, Math.PI * 2);
  ctx.stroke();

  // 센터도트
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // 페널티 박스 (위/아래)
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.2;
  const pbW = W * 0.56, pbH = H * 0.14;
  const pbX = (W - pbW) / 2;
  ctx.strokeRect(pbX, PADDING, pbW, pbH); // 위
  ctx.strokeRect(pbX, H - PADDING - pbH, pbW, pbH); // 아래

  const gsW = W * 0.32, gsH = H * 0.065;
  const gsX = (W - gsW) / 2;
  ctx.strokeRect(gsX, PADDING, gsW, gsH); // 위 골에어리어
  ctx.strokeRect(gsX, H - PADDING - gsH, gsW, gsH); // 아래

  // 골대
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  const goalW = W * 0.18;
  const goalX = (W - goalW) / 2;
  ctx.strokeRect(goalX, PADDING - 6, goalW, 6);
  ctx.strokeRect(goalX, H - PADDING, goalW, 6);

  // ─── 중앙 로고 ──────────────────────────────────────────────
  try {
    const img = await loadImage("/underducklogo.png");
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 50, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, W / 2 - 50, H / 2 - 50, 100, 100);
    ctx.restore();
  } catch {
    // 무시
  }

  // ─── 선수 ────────────────────────────────────────────────────
  const totalLayers = lineup.formation.split("-").length;

  for (let i = 0; i < lineup.players.length; i++) {
    const player = lineup.players[i];
    const pos = positions[i];
    if (!pos || !player) continue;

    const x = (pos.x / 100) * W;
    const y = (pos.y / 100) * H;
    const R = 18;

    const layerIdx = getLayerIndex(i, lineup.formation);
    const isTbd = player.trim() === "미정";
    const jerseyNo = rosterMap[player.trim()];
    const isGuest = !jerseyNo && !isTbd;

    const color = isTbd
      ? { bg: "#374151", border: "#9CA3AF", text: "#FFFFFF" }
      : getPlayerColor(layerIdx, totalLayers);

    // 그림자
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;

    // 원
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fillStyle = color.bg;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = color.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.stroke();

    // 등번호/라벨
    const label = isTbd ? "?" : isGuest ? "G" : jerseyNo;
    ctx.fillStyle = color.text;
    ctx.font = `bold ${label.length > 2 ? 10 : 13}px -apple-system, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);

    // 이름 배경
    const name = isTbd ? "미정" : player.slice(0, 4);
    ctx.font = "bold 8.5px -apple-system, Arial, sans-serif";
    const nameW = ctx.measureText(name).width + 8;

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.beginPath();
    ctx.rect(x - nameW / 2, y + R + 2, nameW, 12);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    ctx.fillText(name, x, y + R + 3.5);
  }

  // ─── 하단 라벨 (옵션) ────────────────────────────────────────
  if (label) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, H - 22, W, 22);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px -apple-system, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, W / 2, H - 11);
  }

  return canvas;
}

export async function shareFormation(
  lineup: { formation: string; players: string[] },
  rosterMap: Record<string, string>,
  fileName: string,
  label?: string
) {
  const canvas = await drawFormationCanvas(lineup, rosterMap, label);

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error("이미지 생성 실패")); return; }
      const file = new File([blob], fileName, { type: "image/png" });
      try {
        // 클립보드에 단일 포맷으로 미리 복사 (Mac 붙여넣기 중복 방지)
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        } catch {
          // 클립보드 API 미지원 시 무시
        }

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "언더덕 라인업" });
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
