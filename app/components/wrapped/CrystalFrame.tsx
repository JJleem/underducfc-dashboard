"use client";

// 카드 크리스탈 프레임(/card-frame.webp)을 **시즌색으로 물들여** 그린다.
//
// 세 번 갈아엎었다. 남겨 둘 만한 실패였다:
//
//  1. hue-rotate — CSS hue-rotate 는 진짜 색상 회전이 아니라 행렬 근사다. 보라(292°)를
//     팀 핑크(349°)까지 돌리면 채도가 튀어 새빨개진다. 중간에 멈추면 팀 색도 아니고
//     원본 보라도 아닌 어정쩡한 마젠타가 된다.
//  2. color 블렌드 + overlay — overlay 가 채도·대비를 밀어올려 다시 빨개졌다.
//  3. (지금) **톤을 눌러** color 블렌드 — 핵심은 "핑크는 빨강보다 밝고 채도가 낮다" 는 것.
//     color 블렌드는 위 레이어의 **색상과 채도를 그대로** 가져간다. 그래서 원색을 그대로
//     먹이면 어두운 면이 진한 빨강이 된다. **HSL 에서 채도를 낮춘** 톤을 먹이고
//     명도를 살짝 들어 올려야 비로소 "핑크빛 크리스탈" 로 읽힌다.

/**
 * 물들일 때 쓸 채도 비율(0~1). 1 이면 원색 그대로라 어두운 면이 진한 빨강이 된다.
 *
 * ⚠️ 흰색을 RGB 로 섞는 걸로는 안 된다 — 팀 핑크는 R 이 이미 255 라 흰색을 섞어도
 *    HSL 채도가 100% 그대로다(명도만 오른다). color 블렌드는 채도를 그대로 가져가므로
 *    **HSL 에서 직접 채도를 낮춰야** 핑크로 읽힌다.
 */
const TINT_SATURATION = 0.6;
/** 물들일 톤의 목표 명도(0~1). 크리스탈이 가라앉지 않게 살짝 밝게. */
const TINT_LIGHTNESS = 0.78;
/** 명도를 들어 올리는 양. 어두운 면이 검붉게 가라앉는 걸 막는다. */
const LIFT = 0.16;

/** #rrggbb → HSL 로 가서 채도·명도를 눌러 다시 rgb() 로. */
function softTint(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const h = !d
    ? 0
    : (((max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60) %
        360 +
        360) %
      360;

  const L = TINT_LIGHTNESS;
  const S = TINT_SATURATION;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = L - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  const to255 = (v: number) => Math.round((v + mm) * 255);
  return `rgb(${to255(r1)}, ${to255(g1)}, ${to255(b1)})`;
}

export default function CrystalFrame({ accent }: { accent: string }) {
  const mask = {
    WebkitMaskImage: "url(/card-frame.webp)",
    maskImage: "url(/card-frame.webp)",
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  } as const;

  const tint = softTint(accent);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- 원본 명암(크리스탈 면)을 그대로 써야 한다 */}
      <img
        src="/card-frame.webp"
        alt=""
        className="absolute inset-0 h-full w-full select-none"
        draggable={false}
      />
      {/* 명도 살짝 올리기 — color 블렌드 **전에** 해야 어두운 면이 검붉지 않다 */}
      <div
        className="absolute inset-0"
        style={{ ...mask, background: "#ffffff", mixBlendMode: "soft-light", opacity: LIFT }}
      />
      {/* 색상·채도만 덮어쓴다(명도는 원본 유지). 흰색을 섞은 톤이라 빨강이 아니라 핑크. */}
      <div
        className="absolute inset-0"
        style={{ ...mask, background: tint, mixBlendMode: "color" }}
      />
    </div>
  );
}
