import type { MatchData } from "../components/DashboardClient";

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawMatchResultCanvas(match: MatchData): Promise<HTMLCanvasElement> {
  const W = 400, H = 560;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── 배경 ──────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0f0f1a");
  bg.addColorStop(1, "#1a0f1e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 핑크 글로우 (상단)
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 220);
  glow.addColorStop(0, "rgba(255,182,193,0.18)");
  glow.addColorStop(1, "rgba(255,182,193,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── 로고 워터마크 ──────────────────────────────────────────────
  try {
    const logo = await loadImage("/underducklogo.png");
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.drawImage(logo, W / 2 - 80, H / 2 - 80, 160, 160);
    ctx.restore();
  } catch { /* 무시 */ }

  // ── 상단: 브랜드 + 날짜 ────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFB6C1";
  ctx.font = "bold 13px -apple-system, Arial, sans-serif";
  ctx.fillText("UNDERDUCK FC", W / 2, 44);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "11px -apple-system, Arial, sans-serif";
  const subtitle = [match.date, match.type].filter(Boolean).join("  ·  ");
  ctx.fillText(subtitle, W / 2, 64);

  // 구분선
  ctx.strokeStyle = "rgba(255,182,193,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 78);
  ctx.lineTo(W - 40, 78);
  ctx.stroke();

  // ── 팀명 ──────────────────────────────────────────────────────
  ctx.font = "bold 15px -apple-system, Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.textAlign = "left";
  ctx.fillText("언더덕", 44, 128);
  ctx.textAlign = "right";
  ctx.fillText(match.opponent || "상대팀", W - 44, 128);

  // ── 스코어 ────────────────────────────────────────────────────
  const resultColor = match.result === "승" ? "#FFB6C1" : match.result === "무" ? "#9ca3af" : "#6b7280";
  ctx.textAlign = "center";
  ctx.font = "bold 72px -apple-system, Arial, sans-serif";
  ctx.fillStyle = resultColor;
  ctx.fillText(String(match.ourScore ?? "-"), W / 2 - 58, 188);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "bold 44px -apple-system, Arial, sans-serif";
  ctx.fillText(":", W / 2, 183);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "bold 72px -apple-system, Arial, sans-serif";
  ctx.fillText(String(match.theirScore ?? "-"), W / 2 + 58, 188);

  // ── 결과 뱃지 ─────────────────────────────────────────────────
  const badgeText = match.result || "";
  if (badgeText) {
    const bw = 44, bh = 22, bx = W / 2 - bw / 2, by = 200;
    const badgeBg = match.result === "승" ? "rgba(255,182,193,0.25)" : "rgba(255,255,255,0.08)";
    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 11);
    ctx.fill();
    ctx.fillStyle = resultColor;
    ctx.font = "bold 12px -apple-system, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(badgeText, W / 2, by + 15);
  }

  // 구분선
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 238);
  ctx.lineTo(W - 40, 238);
  ctx.stroke();

  // ── 골 기록 ───────────────────────────────────────────────────
  let curY = 264;
  if (match.goals) {
    ctx.textAlign = "left";
    const scorers = match.goals.split(",");
    const assists = match.assists?.split(",") || [];

    for (let i = 0; i < scorers.length; i++) {
      const scorer = scorers[i]?.trim();
      const assistant = assists[i]?.trim();
      if (!scorer) continue;

      ctx.font = "bold 13px -apple-system, Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.fillText(`⚽  ${scorer}`, 52, curY);

      if (assistant) {
        ctx.font = "11px -apple-system, Arial, sans-serif";
        ctx.fillStyle = "#FFB6C1";
        ctx.fillText(`assist  ${assistant}`, 72, curY + 17);
        curY += 36;
      } else {
        curY += 26;
      }
    }
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "12px -apple-system, Arial, sans-serif";
    ctx.fillText("기록 없음", W / 2, curY);
    curY += 24;
  }

  // ── MOM ───────────────────────────────────────────────────────
  if (match.mom) {
    const momY = Math.max(curY + 16, 430);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, momY - 14);
    ctx.lineTo(W - 40, momY - 14);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "bold 13px -apple-system, Arial, sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`⭐  MOM  ${match.mom.trim()}`, W / 2, momY + 6);
  }

  // ── 푸터 ──────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "10px -apple-system, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("UNDERDUCK FC", W / 2, H - 20);

  return canvas;
}

export async function shareMatchResult(match: MatchData) {
  const canvas = await drawMatchResultCanvas(match);
  const fileName = `언더덕_${match.opponent}_${match.date}_결과.png`;

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error("이미지 생성 실패")); return; }
      const file = new File([blob], fileName, { type: "image/png" });
      try {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        } catch { /* 무시 */ }

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "언더덕 경기 결과" });
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
