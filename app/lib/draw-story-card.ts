// 공유 카드: 나이트 매치 테마 결과 카드
// - story: 1080x1920 (9:16, 인스타 스토리)
// - feed:  1080x1350 (4:5, 인스타 게시글)
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

export type CardFormat = "story" | "feed";

// 포맷별 세로 레이아웃 (가로는 1080 공통)
const LAYOUTS = {
  story: {
    H: 1920,
    brandSmallY: 218, brandY: 298, subY: 360, divY: 420,
    teamY: 600, teamLabelDy: 44,
    scoreY: 832, scoreSize: 190, colonSize: 120,
    badgeY: 894, badgeH: 72,
    goalsY: 1060, goalLineH: 62, goalTitleDy: 58, goalFirstDy: 122, goalFont: 34, assistFont: 30, maxGoals: 7,
    momH: 190, momLabelDy: 64, momNameDy: 140,
    wmY: 1010, wmR: 290,
  },
  feed: {
    H: 1350,
    brandSmallY: 112, brandY: 182, subY: 236, divY: 284,
    teamY: 396, teamLabelDy: 38,
    scoreY: 566, scoreSize: 150, colonSize: 96,
    badgeY: 618, badgeH: 62,
    goalsY: 736, goalLineH: 50, goalTitleDy: 50, goalFirstDy: 104, goalFont: 30, assistFont: 26, maxGoals: 5,
    momH: 146, momLabelDy: 52, momNameDy: 112,
    wmY: 700, wmR: 250,
  },
} as const;

export async function drawStoryCanvas(
  match: MatchData,
  format: CardFormat = "story"
): Promise<HTMLCanvasElement> {
  const L = LAYOUTS[format];
  const W = 1080, H = L.H;
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
  const glow = ctx.createRadialGradient(W / 2, 120, 0, W / 2, 120, H * 0.36);
  glow.addColorStop(0, "rgba(255,182,193,0.15)");
  glow.addColorStop(1, "rgba(255,182,193,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // 밤하늘 별 (세로 위치는 포맷에 맞게 스케일)
  const stars: [number, number, number, number][] = [
    [110, 140, 2.2, 0.7], [260, 80, 1.5, 0.5], [420, 180, 2, 0.6], [560, 70, 1.4, 0.45],
    [700, 150, 2.4, 0.75], [850, 90, 1.6, 0.5], [970, 200, 2, 0.6], [180, 320, 1.4, 0.4],
    [920, 380, 1.6, 0.45], [80, 520, 1.4, 0.35], [1000, 620, 1.5, 0.4], [150, 1700, 1.6, 0.4],
    [930, 1760, 1.8, 0.45], [520, 1820, 1.3, 0.35],
  ];
  const yScale = H / 1920;
  stars.forEach(([x, y, r, a]) => {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y * yScale, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 대형 로고 워터마크 (중앙)
  try {
    const logo = await loadImage("/underducklogo.png");
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.beginPath();
    ctx.arc(W / 2, L.wmY, L.wmR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, W / 2 - L.wmR, L.wmY - L.wmR, L.wmR * 2, L.wmR * 2);
    ctx.restore();
  } catch { /* 무시 */ }

  // ── 상단 브랜드 ──────────────────────────────────────────────
  ctx.textAlign = "center";
  setLetterSpacing(ctx, 10);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("MATCH RESULT", W / 2, L.brandSmallY);
  setLetterSpacing(ctx, 0);

  const brand = ctx.createLinearGradient(W / 2 - 260, 0, W / 2 + 260, 0);
  brand.addColorStop(0, "#FFB6C1");
  brand.addColorStop(1, "#FF8FA3");
  ctx.fillStyle = brand;
  ctx.font = `900 66px ${FONT}`;
  ctx.fillText("UNDERDUCK FC", W / 2, L.brandY);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `600 30px ${FONT}`;
  const subtitle = [
    match.date,
    match.time !== "미정" ? match.time : "",
    match.location !== "미정" ? match.location : "",
  ].filter(Boolean).join("  ·  ");
  ctx.fillText(subtitle, W / 2, L.subY);

  // 구분선 (양끝 페이드)
  const divider = ctx.createLinearGradient(140, 0, W - 140, 0);
  divider.addColorStop(0, "rgba(255,182,193,0)");
  divider.addColorStop(0.5, "rgba(255,182,193,0.45)");
  divider.addColorStop(1, "rgba(255,182,193,0)");
  ctx.fillStyle = divider;
  ctx.fillRect(140, L.divY, W - 280, 2);

  // ── 팀명 + 스코어 ────────────────────────────────────────────
  const isInternal = match.opponent === "자체전";
  const ourName = isInternal ? "언더덕 A" : "언더덕";
  const theirName = isInternal ? "언더덕 B" : (match.opponent || "상대팀");

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
  ctx.fillText(ourName, W * 0.25, L.teamY);
  fitFont(theirName, 360, 46);
  ctx.fillText(theirName, W * 0.75, L.teamY);

  setLetterSpacing(ctx, 4);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText("HOME", W * 0.25, L.teamY + L.teamLabelDy);
  ctx.fillText("AWAY", W * 0.75, L.teamY + L.teamLabelDy);
  setLetterSpacing(ctx, 0);

  const resultColor =
    match.result === "승" ? "#FFB6C1" : match.result === "무" ? "#cbd5e1" : "#94a3b8";

  ctx.font = `900 ${L.scoreSize}px ${FONT}`;
  ctx.fillStyle = resultColor;
  ctx.fillText(String(match.ourScore ?? "-"), W / 2 - 165, L.scoreY);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.font = `900 ${L.colonSize}px ${FONT}`;
  ctx.fillText(":", W / 2, L.scoreY - 18);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `900 ${L.scoreSize}px ${FONT}`;
  ctx.fillText(String(match.theirScore ?? "-"), W / 2 + 165, L.scoreY);

  // 결과 뱃지 (필 형태)
  if (match.result && match.result !== "예정") {
    const bw = 170, bh = L.badgeH, bx = W / 2 - bw / 2, by = L.badgeY;
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
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (match.result !== "승") {
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = match.result === "승" ? "#ffffff" : resultColor;
    ctx.font = `900 38px ${FONT}`;
    ctx.fillText(match.result, W / 2, by + bh / 2 + 14);
  }

  // ── 골 기록 패널 ─────────────────────────────────────────────
  let curY = L.goalsY;
  const scorers = (match.goals || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (scorers.length > 0) {
    const assists = match.assists?.split(",") || [];
    const shown = scorers.slice(0, L.maxGoals);
    const extra = scorers.length - shown.length;
    const panelH = L.goalFirstDy - L.goalLineH + 36 + (shown.length + (extra > 0 ? 1 : 0)) * L.goalLineH;
    glassPanel(ctx, 110, curY, W - 220, panelH, "rgba(255,255,255,0.045)", "rgba(255,255,255,0.09)");

    setLetterSpacing(ctx, 8);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText("GOALS", W / 2, curY + L.goalTitleDy);
    setLetterSpacing(ctx, 0);

    let gy = curY + L.goalFirstDy;
    for (let i = 0; i < shown.length; i++) {
      const scorer = shown[i];
      const assistant = assists[i]?.trim();
      const goalText = `⚽ ${scorer}`;
      const assistText = assistant ? `  ·  A ${assistant}` : "";
      ctx.font = `800 ${L.goalFont}px ${FONT}`;
      const gw = ctx.measureText(goalText).width;
      ctx.font = `700 ${L.assistFont}px ${FONT}`;
      const aw = assistant ? ctx.measureText(assistText).width : 0;
      const startX = W / 2 - (gw + aw) / 2;

      ctx.textAlign = "left";
      ctx.font = `800 ${L.goalFont}px ${FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(goalText, startX, gy);
      if (assistant) {
        ctx.font = `700 ${L.assistFont}px ${FONT}`;
        ctx.fillStyle = "#FFB6C1";
        ctx.fillText(assistText, startX + gw, gy);
      }
      ctx.textAlign = "center";
      gy += L.goalLineH;
    }
    if (extra > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `700 26px ${FONT}`;
      ctx.fillText(`외 ${extra}골`, W / 2, gy);
    }
    curY += panelH + (format === "story" ? 44 : 32);
  }

  // ── MOM 패널 ─────────────────────────────────────────────────
  if (match.mom) {
    glassPanel(ctx, 110, curY, W - 220, L.momH, "rgba(251,191,36,0.07)", "rgba(251,191,36,0.3)");

    setLetterSpacing(ctx, 8);
    ctx.fillStyle = "rgba(251,191,36,0.65)";
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText("MAN OF THE MATCH", W / 2, curY + L.momLabelDy);
    setLetterSpacing(ctx, 0);

    ctx.fillStyle = "#fbbf24";
    ctx.font = `900 ${format === "story" ? 52 : 44}px ${FONT}`;
    ctx.shadowColor = "rgba(251,191,36,0.45)";
    ctx.shadowBlur = 28;
    ctx.fillText(`👑 ${match.mom.trim()}`, W / 2, curY + L.momNameDy);
    ctx.shadowBlur = 0;
  }

  // ── 푸터 ─────────────────────────────────────────────────────
  const accent = ctx.createLinearGradient(W / 2 - 90, 0, W / 2 + 90, 0);
  accent.addColorStop(0, "rgba(255,182,193,0)");
  accent.addColorStop(0.5, "#FF8FA3");
  accent.addColorStop(1, "rgba(255,182,193,0)");
  ctx.fillStyle = accent;
  ctx.fillRect(W / 2 - 90, H - (format === "story" ? 158 : 108), 180, 3);

  setLetterSpacing(ctx, 4);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("@underduck_fc", W / 2, H - (format === "story" ? 100 : 56));
  setLetterSpacing(ctx, 0);

  // 가장자리 비네팅
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 생성 실패"))), "image/png");
  });
}

export async function shareStoryCard(match: MatchData) {
  // 피드(4:5) + 스토리(9:16) 두 장을 한 번에 공유 — 용도에 맞게 골라 쓰면 됨
  const [feedCanvas, storyCanvas] = await Promise.all([
    drawStoryCanvas(match, "feed"),
    drawStoryCanvas(match, "story"),
  ]);
  const [feedBlob, storyBlob] = await Promise.all([toBlob(feedCanvas), toBlob(storyCanvas)]);

  const base = `언더덕_${match.opponent}_${match.date}`;
  const files = [
    new File([feedBlob], `${base}_게시글용.png`, { type: "image/png" }),
    new File([storyBlob], `${base}_스토리용.png`, { type: "image/png" }),
  ];

  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": feedBlob })]);
  } catch { /* 클립보드 미지원 무시 */ }

  try {
    if (navigator.canShare?.({ files })) {
      await navigator.share({ files, title: "언더덕 경기 결과" });
    } else if (navigator.canShare?.({ files: [files[0]] })) {
      await navigator.share({ files: [files[0]], title: "언더덕 경기 결과" });
    } else {
      files.forEach((f) => {
        const url = URL.createObjectURL(f);
        const a = document.createElement("a");
        a.href = url;
        a.download = f.name;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  } catch (e) {
    if (!(e instanceof Error && e.name === "AbortError")) throw e;
  }
}
