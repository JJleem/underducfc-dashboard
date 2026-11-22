// 26-27 결과 공유 이미지 — 피드의 ResultCard2627 을 캔버스로 옮긴 것.
// 공유한 그림이 앱에서 보던 카드와 달라지면 "그 경기의 카드"로 안 읽힌다.
// 좌표는 피드 시안(540 폭) 단위로 쓰고 2배로 키워 1080 폭에 그린다.
import type { MatchData } from "./match-types";
import { matchResultArt } from "./matchday-art";
import { playerFaceOnSrc } from "./player-faceons";
import { seasonAccent, seasonLabel, seasonOf } from "./seasons";
import { BALL_PATHS, RESULT_TAG, momSlots, scorerLines } from "./result-card";
import { matchLogo } from "../components/home/match-result";
import { anton } from "./fonts";

const ACCENT = seasonAccent("2627").light;
const INK = "#1B1A22";
const DIM = "rgba(255,255,255,0.5)";
const KR = "-apple-system, 'Apple SD Gothic Neo', Pretendard, Arial, sans-serif";
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

type Format = "story" | "feed";

// 포맷별 세로 배치(540 폭 단위). 피드 4:5 = 675, 스토리 9:16 = 960.
const LAYOUT = {
  feed: { H: 675, top: 34, brand: false, title: 34, crestTop: 128, crest: 78, score: 128, goalsTop: 300, goalScale: 1.08, momScale: 1, bottom: 34, footer: false },
  story: { H: 960, top: 92, brand: true, title: 52, crestTop: 250, crest: 92, score: 150, goalsTop: 470, goalScale: 1.18, momScale: 1.22, bottom: 110, footer: true },
} as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
const tryImage = (src: string | null) => (src ? loadImage(src).catch(() => null) : Promise.resolve(null));

function fmtDate(date: string, time: string): string {
  const t = new Date(`${date}T00:00:00`);
  if (Number.isNaN(t.getTime())) return date;
  return `${t.getMonth() + 1}월 ${t.getDate()}일 (${DOW[t.getDay()]})${time && time !== "미정" ? ` ${time}` : ""}`;
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
  } catch { /* 미지원 브라우저 무시 */ }
}

/** 폭을 넘으면 말줄임. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function ball(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of BALL_PATHS) ctx.stroke(new Path2D(d));
  ctx.beginPath();
  ctx.arc(12, 12, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function crest(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, initial: string, cx: number, top: number, size: number) {
  if (img) {
    const s = Math.min(size / img.width, size / img.height);
    const w = img.width * s, h = img.height * s;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, top + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - w / 2, top + (size - h) / 2, w, h);
    ctx.restore();
    return;
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx, top + size / 2, size * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `900 ${size * 0.38}px ${KR}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, cx, top + size / 2);
  ctx.textBaseline = "alphabetic";
}

/** "ASSIST 이름" 을 x 에서 그리고, 끝난 x 를 돌려준다. */
function assistText(ctx: CanvasRenderingContext2D, ANTON: string, names: string, x: number, y: number, size: number, maxW: number) {
  ctx.textAlign = "left";
  ctx.font = `400 ${size * 0.92}px ${ANTON}`;
  setSpacing(ctx, 1);
  ctx.fillStyle = ACCENT;
  ctx.fillText("ASSIST", x, y);
  const lw = ctx.measureText("ASSIST").width + size * 0.35;
  setSpacing(ctx, 0);
  ctx.font = `700 ${size}px ${KR}`;
  ctx.fillStyle = DIM;
  ctx.fillText(fit(ctx, names, Math.max(0, maxW - lw)), x + lw, y);
}

export async function drawResultCard2627(match: MatchData, format: Format): Promise<HTMLCanvasElement> {
  const L = LAYOUT[format];
  const W = 540, H = L.H, PAD = 30;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  const ANTON = anton.style.fontFamily;
  const lines = scorerLines(match.goals ?? "", match.assists ?? "");
  const moms = momSlots(match.mom ?? "").slice(0, 4);
  const art = matchResultArt(match.id);
  const [, artImg, usImg, themImg, ...faces] = await Promise.all([
    document.fonts.load(`400 40px ${ANTON}`).catch(() => null),
    tryImage(art?.src ?? null),
    tryImage("/underducklogo.png"),
    tryImage(matchLogo(match)),
    ...moms.map((m) => tryImage(playerFaceOnSrc(m.name))),
  ]);

  // ── 배경: 나이트 + 그 경기 깃발 옅게 + 45° 빛 띠 ──
  ctx.fillStyle = "#121019";
  ctx.fillRect(0, 0, W, H);
  if (artImg) {
    const s = Math.max(W / artImg.width, H / artImg.height);
    ctx.globalAlpha = 0.2;
    ctx.drawImage(artImg, (W - artImg.width * s) / 2, (H - artImg.height * s) / 2, artImg.width * s, artImg.height * s);
    ctx.globalAlpha = 1;
  }
  const band = ctx.createLinearGradient(0, 0, W, W);
  band.addColorStop(0.4, "rgba(255,255,255,0)");
  band.addColorStop(0.4, "rgba(255,255,255,0.05)");
  band.addColorStop(0.63, "rgba(255,255,255,0.05)");
  band.addColorStop(0.63, "rgba(255,255,255,0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, H);

  // ── 헤더 ──
  let y: number = L.top;
  if (L.brand) {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `700 13px ${KR}`;
    ctx.fillText(`UNDERDUCK FC · ${seasonLabel(seasonOf(match.date) ?? "")} SEASON`, PAD, y - 14);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = `400 ${L.title}px ${ANTON}`;
  const titleAsc = ctx.measureText("F").actualBoundingBoxAscent || L.title * 0.8;
  ctx.fillText("FULL-TIME", PAD, y + titleAsc);

  const tag = RESULT_TAG[match.result];
  if (tag) {
    ctx.font = `400 20px ${ANTON}`;
    const tw = ctx.measureText(tag).width;
    const bw = tw + 22, bh = 31;
    ctx.fillStyle = match.result === "승" ? ACCENT : match.result === "패" ? "#fff" : "#8B8794";
    ctx.fillRect(W - PAD - bw, y, bw, bh);
    ctx.fillStyle = match.result === "패" ? INK : "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tag, W - PAD - bw / 2, y + bh / 2 + 1);
    ctx.textBaseline = "alphabetic";
  }

  ctx.textAlign = "left";
  ctx.font = `700 ${L.brand ? 14 : 12}px ${KR}`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  const meta = L.brand
    ? fmtDate(match.date, match.time) + (match.location !== "미정" ? ` · ${match.location}` : "")
    : [seasonLabel(seasonOf(match.date) ?? ""), fmtDate(match.date, match.time), match.location !== "미정" ? match.location : ""].filter(Boolean).join(" · ");
  ctx.fillText(fit(ctx, meta, W - PAD * 2 - 90), PAD, y + titleAsc + 8 + (L.brand ? 16 : 12));

  // ── 크레스트 · 스코어 ──
  y = L.crestTop;
  const colW = L.crest + 18;
  const lx = PAD + colW / 2, rx = W - PAD - colW / 2;
  crest(ctx, usImg, "U", lx, y, L.crest);
  crest(ctx, themImg, match.opponent.trim().charAt(0) || "?", rx, y, L.crest);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = `900 11px ${KR}`;
  ctx.fillText("UNDERDUCK", lx, y + L.crest + 18);
  ctx.fillText(fit(ctx, match.opponent, colW + 10), rx, y + L.crest + 18);

  const cy = y + L.crest / 2;
  const scored = match.ourScore !== "" && match.ourScore != null && match.theirScore !== "" && match.theirScore != null;
  if (scored) {
    const us = String(match.ourScore), them = String(match.theirScore);
    ctx.font = `400 ${L.score}px ${ANTON}`;
    const asc = ctx.measureText("0").actualBoundingBoxAscent || L.score * 0.72;
    const wu = ctx.measureText(us).width, wt = ctx.measureText(them).width;
    ctx.font = `400 ${L.score * 0.45}px ${ANTON}`;
    const wd = ctx.measureText("–").width;
    const gap = 12;
    let x = W / 2 - (wu + wd + wt + gap * 2) / 2;
    const base = cy + asc / 2;
    ctx.textAlign = "left";
    ctx.font = `400 ${L.score}px ${ANTON}`;
    ctx.fillStyle = match.result === "승" ? ACCENT : "#fff";
    ctx.fillText(us, x, base);
    x += wu + gap;
    ctx.font = `400 ${L.score * 0.45}px ${ANTON}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("–", x, cy + (L.score * 0.45 * 0.3) / 2);
    x += wd + gap;
    ctx.font = `400 ${L.score}px ${ANTON}`;
    ctx.fillStyle = match.result === "패" ? "#8B8794" : "#fff";
    ctx.fillText(them, x, base);
  } else {
    ctx.font = `900 30px ${KR}`;
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("기록 없음", W / 2, cy);
    ctx.textBaseline = "alphabetic";
  }

  // ── MOM 칸 위치를 먼저 잡는다(득점이 넘치면 그 위에서 자른다) ──
  const ms = L.momScale;
  const momH = (14 + 20 + 74 + 7 + 14 + 16) * ms; // 위 여백 · 머리 · 액자 · 역할 · 이름
  const momTop = H - L.bottom - momH;

  // ── 득점 — 득점자 옆 공 하나 = 골 하나, 5명 이상이면 ASSIST 를 같은 줄에 ──
  if (lines.length > 0) {
    const gs = L.goalScale;
    const two = lines.length > 2, dense = lines.length > 4;
    const blockW = Math.min((two ? 440 : 240), (W - PAD * 2) / gs);
    const colGap = 26, rowGap = dense ? 4 : 7;
    const cw = two ? (blockW - colGap) / 2 : blockW;
    const rowH = 20 + (dense ? 0 : 16);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, L.goalsTop - 4, W, momTop - 10 - (L.goalsTop - 4));
    ctx.clip();
    ctx.translate((W - blockW * gs) / 2, L.goalsTop);
    ctx.scale(gs, gs);
    lines.forEach((g, i) => {
      const col = two ? i % 2 : 0, row = two ? Math.floor(i / 2) : i;
      const x = col * (cw + colGap), top = row * (rowH + rowGap);
      ctx.textAlign = "left";
      ctx.font = `${g.muted ? 700 : 900} 14px ${KR}`;
      ctx.fillStyle = g.muted ? DIM : "#fff";
      const name = fit(ctx, g.name, cw - 16);
      ctx.fillText(name, x, top + 15);
      let bx = x + ctx.measureText(name).width + 8;
      for (let k = 0; k < g.goals; k++) {
        if (bx + 13 > x + cw) break;
        ball(ctx, bx, top + 3.5, 13, g.muted ? "rgba(255,255,255,0.45)" : ACCENT);
        bx += 15;
      }
      if (g.assists.length) {
        if (dense) assistText(ctx, ANTON, g.assists.join("·"), bx + 6, top + 15, 11, x + cw - bx - 6);
        else assistText(ctx, ANTON, g.assists.join(" · "), x, top + 32, 11.5, cw);
      }
    });
    ctx.restore();
  }

  // ── MOM ──
  if (moms.length > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(PAD, momTop, W - PAD * 2, 1);
    ctx.save();
    ctx.translate(PAD, momTop);
    ctx.scale(ms, ms);
    const innerW = (W - PAD * 2) / ms;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `400 13px ${ANTON}`;
    setSpacing(ctx, 1.2);
    ctx.fillText("MAN OF", 0, 14 + 13);
    ctx.fillText("THE MATCH", 0, 14 + 30);
    setSpacing(ctx, 0);

    const gap = moms.length >= 4 ? 8 : 12;
    let x = innerW - (moms.length * 78 + (moms.length - 1) * gap);
    const ft = 14 + 20; // 얼굴이 액자 위로 머리만 살짝 튀어나오게 여유를 둔다
    moms.forEach((m, i) => {
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.4 / ms;
      ctx.beginPath();
      ctx.moveTo(x + 1, ft);
      ctx.lineTo(x + 1, ft + 58);
      ctx.lineTo(x + 16, ft + 73);
      ctx.lineTo(x + 77, ft + 73);
      ctx.lineTo(x + 77, ft);
      ctx.stroke();
      const img = faces[i];
      if (img) {
        const bw = 70, bh = 93;
        const s = Math.max(bw / img.width, bh / img.height);
        const sw = bw / s, sh = bh / s;
        ctx.drawImage(img, (img.width - sw) / 2, 0, sw, sh, x + 4, ft + 74 - 1 - bh, bw, bh);
      } else {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x + 39, ft + 74 - 10 - 24, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.font = `900 18px ${KR}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m.name.trim().charAt(0), x + 39, ft + 74 - 34);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
      }
      let ny = ft + 74 + 7;
      if (m.role) {
        ctx.font = `400 11px ${ANTON}`;
        setSpacing(ctx, 1);
        ctx.fillStyle = ACCENT;
        ctx.fillText(m.role, x, ny + 10);
        setSpacing(ctx, 0);
        ny += 14;
      }
      ctx.font = `900 13px ${KR}`;
      ctx.fillStyle = "#fff";
      ctx.fillText(fit(ctx, m.name, 78), x, ny + 13);
      x += 78 + gap;
    });
    ctx.restore();
  }

  if (L.footer) {
    ctx.textAlign = "center";
    setSpacing(ctx, 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `700 13px ${KR}`;
    ctx.fillText("@underduck_fc", W / 2, H - 44);
    setSpacing(ctx, 0);
  }

  return canvas;
}
