// 인스타 스토리 사이즈(1080x1920) 공유 카드: 나이트 매치 테마 결과 카드
import type { MatchData } from "../components/DashboardClient";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const FONT = "-apple-system, 'Apple SD Gothic Neo', Pretendard, Arial, sans-serif";

function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number) {
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
  } catch { /* 미지원 브라우저 무시 */ }
}

// 패널 공통: 유리질감 라운드 박스
function glassPanel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fill: string, stroke: string
) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 28);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export async function drawStoryCanvas(match: MatchData): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── 배경: 다크 네이비 그라데이션 ─────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#070d20");
  bg.addColorStop(0.5, "#0d1733");
  bg.addColorStop(1, "#070d20");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 스타디움 스포트라이트 (좌우 대각 빔)
  const beamL = ctx.createLinearGradient(0, 0, W * 0.55, H * 0.5);
  beamL.addColorStop(0, "rgba(255,182,193,0.13)");
  beamL.addColorStop(0.4, "rgba(255,255,255,0.04)");
  beamL.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = beamL;
  ctx.fillRect(0, 0, W, H * 0.6);

  const beamR = ctx.createLinearGradient(W, 0, W * 0.45, H * 0.5);
  beamR.addColorStop(0, "rgba(147,197,253,0.11)");
  beamR.addColorStop(0.4, "rgba(255,255,255,0.04)");
  beamR.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = beamR;
  ctx.fillRect(0, 0, W, H * 0.6);

  // 핑크 글로우 (상단 중앙)
  const glow = ctx.createRadialGradient(W / 2, 120, 0, W / 2, 120, 700);
  glow.addColorStop(0, "rgba(255,182,193,0.15)");
  glow.addColorStop(1, "rgba(255,182,193,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // 밤하늘 별
  const stars: [number, number, number, number][] = [
    [110, 140, 2.2, 0.7], [260, 80, 1.5, 0.5], [420, 180, 2, 0.6], [560, 70, 1.4, 0.45],
    [700, 150, 2.4, 0.75], [850, 90, 1.6, 0.5], [970, 200, 2, 0.6], [180, 320, 1.4, 0.4],
    [920, 380, 1.6, 0.45], [80, 520, 1.4, 0.35], [1000, 620, 1.5, 0.4], [150, 1700, 1.6, 0.4],
    [930, 1760, 1.8, 0.45], [520, 1820, 1.3, 0.35],
  ];
  stars.forEach(([x, y, r, a]) => {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 대형 로고 워터마크 (중앙)
  try {
    const logo = await loadImage("/underducklogo.png");
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.beginPath();
    ctx.arc(W / 2, 1010, 290, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, W / 2 - 290, 1010 - 290, 580, 580);
    ctx.restore();
  } catch { /* 무시 */ }

  // ── 상단 브랜드 ──────────────────────────────────────────────
  ctx.textAlign = "center";
  setLetterSpacing(ctx, 10);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("MATCH RESULT", W / 2, 218);
  setLetterSpacing(ctx, 0);

  const brand = ctx.createLinearGradient(W / 2 - 260, 0, W / 2 + 260, 0);
  brand.addColorStop(0, "#FFB6C1");
  brand.addColorStop(1, "#FF8FA3");
  ctx.fillStyle = brand;
  ctx.font = `900 66px ${FONT}`;
  ctx.fillText("UNDERDUCK FC", W / 2, 298);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `600 30px ${FONT}`;
  const subtitle = [
    match.date,
    match.time !== "미정" ? match.time : "",
    match.location !== "미정" ? match.location : "",
  ].filter(Boolean).join("  ·  ");
  ctx.fillText(subtitle, W / 2, 360);

  // 구분선 (양끝 페이드)
  const divider = ctx.createLinearGradient(140, 0, W - 140, 0);
  divider.addColorStop(0, "rgba(255,182,193,0)");
  divider.addColorStop(0.5, "rgba(255,182,193,0.45)");
  divider.addColorStop(1, "rgba(255,182,193,0)");
  ctx.fillStyle = divider;
  ctx.fillRect(140, 420, W - 280, 2);

  // ── 팀명 + 스코어 ────────────────────────────────────────────
  const isInternal = match.opponent === "자체전";
  const ourName = isInternal ? "언더덕 A" : "언더덕";
  const theirName = isInternal ? "언더덕 B" : (match.opponent || "상대팀");

  // 팀명: 좌우 절반 중앙 정렬, 길면 자동 축소
  const teamY = 600;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const fitFont = (text: string, maxW: number, base: number) => {
    let size = base;
    do {
      ctx.font = `900 ${size}px ${FONT}`;
      if (ctx.measureText(text).width <= maxW) break;
      size -= 2;
    } while (size > 24);
    return size;
  };
  fitFont(ourName, 360, 46);
  ctx.fillText(ourName, W * 0.25, teamY);
  fitFont(theirName, 360, 46);
  ctx.fillText(theirName, W * 0.75, teamY);

  setLetterSpacing(ctx, 4);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText("HOME", W * 0.25, teamY + 44);
  ctx.fillText("AWAY", W * 0.75, teamY + 44);
  setLetterSpacing(ctx, 0);

  const resultColor =
    match.result === "승" ? "#FFB6C1" : match.result === "무" ? "#cbd5e1" : "#94a3b8";

  const scoreY = 832;
  ctx.font = `900 190px ${FONT}`;
  ctx.fillStyle = resultColor;
  ctx.fillText(String(match.ourScore ?? "-"), W / 2 - 165, scoreY);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.font = `900 120px ${FONT}`;
  ctx.fillText(":", W / 2, scoreY - 18);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `900 190px ${FONT}`;
  ctx.fillText(String(match.theirScore ?? "-"), W / 2 + 165, scoreY);

  // 결과 뱃지 (필 형태)
  if (match.result && match.result !== "예정") {
    const bw = 170, bh = 72, bx = W / 2 - bw / 2, by = 894;
    if (match.result === "승") {
      const pill = ctx.createLinearGradient(bx, by, bx, by + bh);
      pill.addColorStop(0, "#FF9FB0");
      pill.addColorStop(1, "#FF8FA3");
      ctx.fillStyle = pill;
      ctx.shadowColor = "rgba(255,143,163,0.5)";
      ctx.shadowBlur = 36;
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
    }
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 36);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (match.result !== "승") {
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = match.result === "승" ? "#ffffff" : resultColor;
    ctx.font = `900 38px ${FONT}`;
    ctx.fillText(match.result, W / 2, by + 50);
  }

  // ── 골 기록 패널 ─────────────────────────────────────────────
  let curY = 1060;
  const scorers = (match.goals || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (scorers.length > 0) {
    const assists = match.assists?.split(",") || [];
    const lineH = 62;
    const shown = scorers.slice(0, 7);
    const panelH = 96 + shown.length * lineH;
    glassPanel(ctx, 110, curY, W - 220, panelH, "rgba(255,255,255,0.045)", "rgba(255,255,255,0.09)");

    setLetterSpacing(ctx, 8);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText("GOALS", W / 2, curY + 58);
    setLetterSpacing(ctx, 0);

    let gy = curY + 122;
    for (let i = 0; i < shown.length; i++) {
      const scorer = shown[i];
      const assistant = assists[i]?.trim();
      const goalText = `⚽ ${scorer}`;
      const assistText = assistant ? `  ·  A ${assistant}` : "";
      ctx.font = `800 34px ${FONT}`;
      const gw = ctx.measureText(goalText).width;
      ctx.font = `700 30px ${FONT}`;
      const aw = assistant ? ctx.measureText(assistText).width : 0;
      const startX = W / 2 - (gw + aw) / 2;

      ctx.textAlign = "left";
      ctx.font = `800 34px ${FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(goalText, startX, gy);
      if (assistant) {
        ctx.font = `700 30px ${FONT}`;
        ctx.fillStyle = "#FFB6C1";
        ctx.fillText(assistText, startX + gw, gy);
      }
      ctx.textAlign = "center";
      gy += lineH;
    }
    if (scorers.length > 7) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `700 26px ${FONT}`;
      ctx.fillText(`외 ${scorers.length - 7}골`, W / 2, gy);
    }
    curY += panelH + 44;
  }

  // ── MOM 패널 ─────────────────────────────────────────────────
  if (match.mom) {
    const panelH = 190;
    glassPanel(ctx, 110, curY, W - 220, panelH, "rgba(251,191,36,0.07)", "rgba(251,191,36,0.3)");

    setLetterSpacing(ctx, 8);
    ctx.fillStyle = "rgba(251,191,36,0.65)";
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText("MAN OF THE MATCH", W / 2, curY + 64);
    setLetterSpacing(ctx, 0);

    ctx.fillStyle = "#fbbf24";
    ctx.font = `900 52px ${FONT}`;
    ctx.shadowColor = "rgba(251,191,36,0.45)";
    ctx.shadowBlur = 28;
    ctx.fillText(`👑 ${match.mom.trim()}`, W / 2, curY + 140);
    ctx.shadowBlur = 0;
  }

  // ── 푸터 ─────────────────────────────────────────────────────
  const accent = ctx.createLinearGradient(W / 2 - 90, 0, W / 2 + 90, 0);
  accent.addColorStop(0, "rgba(255,182,193,0)");
  accent.addColorStop(0.5, "#FF8FA3");
  accent.addColorStop(1, "rgba(255,182,193,0)");
  ctx.fillStyle = accent;
  ctx.fillRect(W / 2 - 90, H - 158, 180, 3);

  setLetterSpacing(ctx, 4);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("@underduck_fc", W / 2, H - 100);
  setLetterSpacing(ctx, 0);

  // 가장자리 비네팅
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  return canvas;
}

export async function shareStoryCard(match: MatchData) {
  const canvas = await drawStoryCanvas(match);
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
