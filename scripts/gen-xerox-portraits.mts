// 제록스 단독 선수 매치데이 포스터 생성. 규칙은 HANDOFF-matchday-xerox-portraits.md 에 있다.
//
//   node --env-file=.env.local scripts/gen-xerox-portraits.mts            # 정의된 선수 전부
//   node --env-file=.env.local scripts/gen-xerox-portraits.mts 강창훈     # 한 명만
//   node --env-file=.env.local scripts/gen-xerox-portraits.mts pink 강창훈 # 채택본 핑크 후처리
//
// 생성은 바랜 로즈로 하고, 눈으로 채택한 뒤에만 pink 로 핫핑크를 올린다. 모델에게
// 처음부터 강한 핑크를 시키면 피부까지 물든다.

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const MODEL = "fal-ai/nano-banana/edit";
const OUT_DIR = join(process.cwd(), "public", "matchday");

// 매 프롬프트에 그대로 들어가는 공통문. 문장 하나하나가 앞선 실패에 대한 대응이다.
const BASE = `Create a square single-player matchday poster using the reference as the ONLY person
and identity source. Exactly one Korean male player. Preserve his real face, hairstyle,
expression and distinctive pose recognizably. Never replace, beautify or invent his face.
No additional person, face, body or silhouette. Ignore the reference photo's plain cut-out
background entirely.

Dark underground black-and-white Xerox football fanzine aesthetic: high-contrast
photocopied portrait, crushed toner blacks, coarse speckled grain across skin and fabric,
distressed midnight-navy paper, scratches, dust and worn analog printing. Skin and kit
remain monochrome. Use restrained dusty-rose grease-pencil marks that will be boosted to
hot pink in post-processing.

Match this exact print: the tone is warm, not cold grey. Highlights on skin and hair burn
out to pale ivory bone-cream, midtones sit in warm sepia-grey, and the shadows collapse
into a near-black midnight-navy sheet crossed by fine white hairline cracks, creases, dust
specks and photocopier streaks. The paper fills the whole canvas edge to edge.

Make the player large: face height occupies roughly 35 to 45 percent of the canvas.
Place the face clearly off-center on the far left or far right. Keep the center and the
opposite side as continuous dark textured paper for later D-DAY typography.

Hard framing constraint: the head stays inside one vertical third of the canvas, either the
far left third or the far right third. The face must never enter the middle band between 40
and 60 percent of the width — huge D-DAY type will be printed there. A centered head is a
failed image. The whole half of the canvas away from the player is empty dark textured
paper with nothing in it but grain, scratches and dust.

Shoulders, arms and torso continue beyond the canvas edges or dissolve gradually into
crushed black toner. Absolutely no white outline, sticker border, halo, cyan fringe,
cut-paper edge, hard shoulder cut line, rectangular photo boundary or visible
background-removal seam. The portrait must feel full-bleed, never pasted on.

The chest is plain black fabric sinking into toner: erase the club crest, remove the round
badge, remove sponsor marks and shirt lettering entirely. Nowhere in the image is there a
readable word, letter, number, logo, badge, watermark, UI or white central sheet.

Grease-pencil marks are large and confident, drawn in a single gesture — open loops, ovals
and circles roughly 15 to 25 percent of the canvas wide, thick waxy stroke, never small
timid doodles. The pencil is a deep saturated rose-magenta that reads instantly against the
black paper, never a pale washed-out blush; only these marks carry colour. Three or four of them sit in the corners and along the outer edges, and one
may sit in a far corner of the empty side, but the middle band of the canvas stays clear.
Two or three strips of pale beige masking tape are pinned across the corners at slight
angles, semi-transparent with torn fibrous ends. Square 1:1.`;

interface Shot {
  /** 선수 이름. 그대로 출력 파일명이 된다. */
  name: string;
  /** public/players/ 안의 레퍼런스 한 장. 여러 장을 넣으면 얼굴이 섞인다. */
  ref: string;
  /** 원본 특징 → 좌표와 크기 → 프레임 이탈 → 장식 순서로 적는다. */
  extra: string;
  /**
   * 레퍼런스에서 위쪽 몇 %만 쓸지. 원본 가슴에 박힌 스폰서 글자를 아예 입력에서
   * 잘라낸다 — 글자를 지우라고 말로 시키면 모델이 매번 무시했다.
   */
  refTop?: number;
  /**
   * 정면 클로즈업 레퍼런스는 모델이 그 배치를 그대로 물려받아 얼굴이 매번
   * 정중앙에 온다. 좌표를 말로 아무리 적어도 안 된다. 그럴 때는 입력 자체를
   * 원하는 배치로 미리 짜서 넘긴다 — 잘라낼 영역(가로 비율), 캔버스 높이 대비
   * 크기, 붙일 위치(왼쪽/위 비율). `scale`·`y` 를 주면 세로 위치까지 잡힌다.
   */
  refLayout?: {
    cropLeft: number;
    cropRight: number;
    x: number;
    /** 캔버스 높이 대비 인물 높이. 기본 1(꽉 참). */
    scale?: number;
    /** 위에서 몇 %에 붙일지. 기본 0. */
    y?: number;
  };
}

// 강현준·공도하·김광민은 원본 사진을 다시 찍기로 해서 보류다. 지금 누끼는 600x800
// 저해상도라 특히 공도하는 모델이 다른 사람 얼굴을 만들어냈다. 새 사진이 오면
// 얼굴 묘사와 구도를 다시 잡고 돌린다.
const SHOTS: Shot[] = [
  {
    // 구도 A: 큰 왼쪽 상반신. 주먹으로 옷깃을 쥔 사진(강창훈.png)은 두 팔이 벌어져
    // 매번 정중앙 대칭 구도가 나왔다. 엄지척 쪽이 왼쪽 크롭이 안정적이다.
    name: "강창훈",
    // refTop 으로 가슴을 잘라내면 모델이 얼굴을 화면 가득 확대해 구도가 무너진다.
    ref: "public/players/강창훈1.png",
    refLayout: { cropLeft: 0.21, cropRight: 1, x: 0 },
    extra: `The reference is a young Korean man with a rounded face, straight blunt black fringe over
his forehead, a calm closed-mouth expression and eyes looking straight ahead into the
camera. One hand is raised beside his cheek in a clear thumbs-up — keep that thumbs-up, it
is his signature gesture. Both pupils point straight forward, level and identical in size.

Composition: large upper body pushed hard into the left edge, cropped by it. Face centre at
x=21%, y=38% of the canvas, face height about 40%; the right side of his head reaches no
further than x=38%. The thumbs-up hand sits high beside his chin against the left edge, its
forearm cut off by the left edge. No hand, arm or elbow reaches past x=45%. His far shoulder
is cut off by the left edge, his chest runs off the bottom edge, and the near shoulder fades
into crushed black toner well before the middle of the frame. The right 60% of the canvas
stays empty dark paper.

Decoration: a big open grease-pencil loop over the top-left corner above his hair, a thick
short stroke along the left edge beside the thumbs-up, one loose oval floating in the far
bottom-right corner, and masking tape across the top-left and bottom-left corners.`,
  },
  {
    // 구도 B: 큰 오른쪽 상반신. 원본이 정적이라 고개 기울기와 시선을 그대로 살린다.
    name: "강현준",
    ref: "public/players/강현준.png",
    extra: `The reference is a Korean man with a broad soft face, short black hair parted low over the
forehead, and a restrained closed-lip smirk with the head tilted very slightly to one side.
He looks straight into the camera. Keep the smirk and the slight head tilt; both pupils
point forward together, do not turn the gaze sideways or cross the eyes.

Composition: large upper body pushed hard into the right edge, cropped by it, turned about
three quarters toward the viewer. Face centre at x=78%, y=38% of the canvas, face height
about 40%; the left side of his head reaches no further than x=62%. His near shoulder is cut
off by the right edge, his chest and arm fill the bottom-right corner and run off both the
bottom and right edges with no straight boundary anywhere, and his far shoulder fades
gradually into crushed black toner — it must never end in a clean diagonal line. The left
60% of the canvas stays empty dark textured paper.

Decoration: one big grease-pencil half-circle arc sweeping over the top-right corner above
his head, two thick parallel strokes hugging the right edge beside his shoulder, one loose
circle in the far top-left corner, and masking tape across the top-right corner tilted about
-10 degrees.`,
  },
  {
    // 구도 C: 왼쪽 아래에서 대각선. 앞의 두 장이 수직이라 이 장만 몸을 기울여 시리즈에 리듬을 준다.
    name: "강환국",
    ref: "public/players/강환국.png",
    extra: `The reference is a solidly built Korean man with a heavy square jaw, thick straight black
fringe across the forehead, wide shoulders and a stern unsmiling stare straight into the
camera. Keep that hard neutral expression and the heavy build. Both pupils look straight
forward, level and identical in size — no squint, no sideways glance.

Composition: the upper body rises diagonally out of the bottom-left corner, the whole torso
and head tilted about 12 degrees so the shoulders climb from lower-left, cropped hard by the
left edge. Face centre at x=22%, y=54% of the canvas, face height about 40%, chin low and
head angled slightly up; the right side of his head reaches no further than x=38%. His left
shoulder is cut off by the left edge, his chest runs off the bottom edge, and the trailing
shoulder dissolves into crushed black toner before the middle of the frame. The upper-right
two thirds of the canvas stays empty dark textured paper.

Decoration: a thick grease-pencil stroke slashing along the bottom-left corner under his
shoulder, a big open loop at the left edge beside his jaw, one oval in the far top-right
corner, and two strips of masking tape — one across the bottom-left corner tilted about 20
degrees, one short strip high on the left edge.`,
  },
  {
    // 구도 D: 오른쪽 아래에서 몸을 안쪽으로. 안경과 웃는 얼굴이라 시선을 내리깔아 시리즈 안에서 유일한 표정이 된다.
    name: "공도하",
    ref: "public/players/공도하.webp",
    extra: `The reference is a heavy-set Korean man with a wide full face, round soft cheeks, a soft
padded jaw and chin, and a thick neck. His straight black hair lies flat across his
forehead, not spiked. He wears thin glasses with narrow rectangular lenses, low on his
nose. He is grinning with his lips closed or barely parted — a warm quiet smile, not an
open-mouthed laugh — with his cheeks pushed up and both eyes crinkled almost shut, his head
dipped and turned down and away from the camera. Copy that heavy round face shape exactly:
do not slim his jaw, do not sharpen his cheekbones, do not give him round wire glasses, do
not open his mouth wide, and do not lift his gaze to the camera.

Composition: upper body leaning in from the bottom-right corner, shoulders tilted about 10
degrees, head dipped toward the centre-bottom. Face centre at x=76%, y=50% of the canvas,
face height about 40%; the left side of his head reaches no further than x=60%. His near
shoulder and arm are cut off by the right edge, his chest fills and leaves the bottom-right
corner, and the far shoulder dissolves into crushed black toner. The upper-left two thirds
of the canvas stays empty dark textured paper.

Decoration: a big grease-pencil oval floating in the top-right corner above his head, a
thick stroke running down the right edge past his shoulder, one loop in the far bottom-left
corner, and masking tape across the top-right and bottom-right corners.`,
  },
  {
    // 구도 F: 정수리를 위쪽 프레임으로 자른 초근접. 시리즈에서 유일하게 얼굴이 화면을 꽉 채운다.
    name: "금상덕",
    ref: "public/players/금상덕.webp",
    extra: `The reference is a heavy-set Korean man with a wide round face, full cheeks, a thick black
bowl fringe across the forehead and a small closed-mouth grin, eyes looking straight into
the camera with a relaxed easy warmth. Keep the round face, the heavy build and that quiet
grin; both pupils point straight forward, level and identical in size.

Composition: an extreme close crop, the largest head in the series. The top of his hair is
cut off by the top edge of the canvas. Face centre at x=22%, y=45% of the canvas, face
height about 46%; the right side of his head reaches no further than x=40%. His shoulders
are cut off by the left and bottom edges and the trailing shoulder sinks into crushed black
toner. The right 58% of the canvas stays empty dark textured paper.

Decoration: a thick grease-pencil stroke slashing down the left edge past his cheek, a big
loose circle low in the bottom-left corner over his shoulder, one small oval in the far
top-right corner, and one strip of masking tape across the bottom-left corner tilted about
15 degrees.`,
  },
  {
    // 구도 B: 오른쪽 위. 스튜디오 정면 누끼라 refLayout 없이는 무조건 정중앙으로 온다.
    name: "김한별",
    ref: "public/players/김한별1.png",
    refLayout: { cropLeft: 0.25, cropRight: 0.8, x: 0.588 },
    extra: `The reference is a Korean man with a long oval face, a strong straight nose, thick black
hair swept back off the forehead with a soft side part, and a small closed-lip smile with
relaxed eyes looking straight into the camera. Keep that quiet confident half-smile; both
pupils point straight forward, level and identical in size.

Composition: upper body high in the frame and hard against the right edge, cropped by it.
Face centre at x=76%, y=36% of the canvas, face height about 38%; the left side of his head
reaches no further than x=60%. His near shoulder is cut off by the right edge, his chest
runs off the bottom-right corner, and the far shoulder dissolves into crushed black toner
before the middle of the frame. The left 58% of the canvas stays empty dark textured paper.

Decoration: a big open grease-pencil loop over the top-right corner beside his hair, a thick
stroke running down the right edge past his shoulder, one oval low in the far bottom-left
corner, and masking tape across the top-right and bottom-right corners.`,
  },
  {
    // 구도 D: 오른쪽 아래. 시리즈에서 유일한 활짝 웃는 얼굴이라 몸을 안쪽으로 기울인다.
    name: "문대영",
    ref: "public/players/문대영1.png",
    refLayout: { cropLeft: 0.22, cropRight: 0.78, x: 0.571, scale: 0.85, y: 0.2 },
    extra: `The reference is a Korean man with a broad friendly face, thick black hair swept up and
back off the forehead, and a wide open grin showing his teeth, eyes crinkled with the smile,
looking straight at the camera. Keep that big open laugh — it is the only wide grin in the
series — and keep both pupils pointing forward, level and identical in size.

Composition: upper body leaning in from the bottom-right, shoulders tilted about 10 degrees.
Face centre at x=75%, y=52% of the canvas, face height about 34%; the left side of his head
reaches no further than x=60%. His near shoulder and arm are cut off by the right edge, his
chest fills and leaves the bottom-right corner, and the far shoulder dissolves into crushed
black toner. The upper-left two thirds of the canvas stays empty dark textured paper.

Decoration: a big grease-pencil circle floating in the top-right corner well above his head,
a thick stroke slashing along the bottom-right corner under his chest, one loop in the far
top-left corner, and masking tape across the bottom-right and top-left corners.`,
  },
  {
    // 구도 C: 왼쪽. 앞으로 몸을 기울여 말하는 원본이라 시리즈에서 유일하게 움직임이 있다.
    // 보류 — 정의는 그대로 두었으니 다시 뽑을 때 이름만 넘기면 된다.
    name: "문승환",
    ref: "public/players/문승환2.png",
    refLayout: { cropLeft: 0.28, cropRight: 0.95, x: 0.075 },
    extra: `The reference is a Korean man with a lean angular face, high cheekbones, a sharp jaw and
thick black hair swept upward off the forehead. He is leaning forward toward the camera with
his head tilted, mouth slightly open mid-sentence, eyebrows raised, eyes wide and locked on
the lens. Keep that leaning-in posture, the tilted head and the open mouth caught in
mid-speech; both pupils point forward together, level and identical in size.

Composition: upper body leaning in from the left edge, cropped by it, the head tilted about
10 degrees. Face centre at x=24%, y=41% of the canvas, face height about 39%; the right side
of his head reaches no further than x=42%. His far shoulder is cut off by the left edge, his
chest runs off the bottom-left corner, and the near shoulder dissolves into crushed black
toner before the middle of the frame. The right 55% of the canvas stays empty dark paper.

Decoration: a big open grease-pencil loop over the top-left corner above his hair, a thick
stroke down the left edge beside his shoulder, one oval in the far bottom-right corner, and
masking tape across the top-left and bottom-left corners.`,
  },
  {
    // 구도 E: 두 엄지척을 아래 모서리에 몰아 얼굴과 손을 한쪽에 붙인다.
    name: "김광민",
    ref: "public/players/김광민.png",
    extra: `The reference is a lean Korean man with a narrow face, high cheekbones, straight black
fringe and a calm closed-mouth look aimed straight at the camera, both hands raised in a
double thumbs-up in front of his chest. Keep the double thumbs-up and the deadpan calm
expression. Both pupils point straight forward, level and identical in size.

Composition: upper body pushed hard into the right edge, cropped by it. Face centre at
x=76%, y=42% of the canvas, face height about 38%; the left side of his head reaches no
further than x=62%. Both thumbs-up fists sit large and low in the bottom-right corner just
under his chest, the outer hand cut off by the right edge. His near shoulder is cut off by
the right edge, his chest runs off the bottom edge, and the far shoulder fades into crushed
black toner before the middle of the frame. The left 58% of the canvas stays empty dark
textured paper.

Decoration: a big grease-pencil circle looping around the two thumbs in the bottom-right
corner, a thick short stroke at the right edge beside his ear, one open loop in the far
top-left corner, and masking tape across the top-right corner tilted about 15 degrees.`,
  },
];

/**
 * 누끼 실루엣을 흐리고, 잘라낸 사각 테두리는 바깥으로 갈수록 투명하게 만든다.
 * 검은 배경 위에 얹으면 인물이 토너 속으로 녹아드는 입력이 된다.
 */
async function featherEdges(png: Buffer, blur = 8, ramp = 60): Promise<Buffer> {
  const { width: w = 0, height: h = 0 } = await sharp(png).metadata();
  const rgb = await sharp(png).removeAlpha().raw().toBuffer();
  const alpha = await sharp(png).extractChannel(3).blur(blur).raw().toBuffer();

  for (let y = 0; y < h; y++) {
    const fy = Math.min(1, Math.min(y, h - 1 - y) / ramp);
    for (let x = 0; x < w; x++) {
      const fx = Math.min(1, Math.min(x, w - 1 - x) / ramp);
      const k = Math.min(fx, fy);
      if (k < 1) alpha[y * w + x] = Math.round(alpha[y * w + x] * k);
    }
  }

  return sharp(rgb, { raw: { width: w, height: h, channels: 3 } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();
}

async function refDataUri(shot: Shot): Promise<string> {
  const src = await readFile(join(process.cwd(), shot.ref));
  let img = sharp(src);
  const { width = 0, height = 0 } = await img.metadata();
  if (shot.refTop) {
    img = img.extract({ left: 0, top: 0, width, height: Math.round(height * shot.refTop) });
  }

  let buf: Buffer;
  if (shot.refLayout) {
    const { cropLeft, cropRight, x, scale = 1, y = 0 } = shot.refLayout;
    const left = Math.round(width * cropLeft);
    let cropped = await img
      .extract({ left, top: 0, width: Math.round(width * cropRight) - left, height })
      .resize({ height: Math.round(1024 * scale) })
      .png()
      .toBuffer();
    // 캔버스를 넘치면 sharp 가 합성을 거부한다. 넘치는 만큼 잘라 붙인다.
    const fit = await sharp(cropped).metadata();
    const maxW = 1024 - Math.round(1024 * x);
    const maxH = 1024 - Math.round(1024 * y);
    if ((fit.width ?? 0) > maxW || (fit.height ?? 0) > maxH) {
      cropped = await sharp(cropped)
        .extract({ left: 0, top: 0, width: Math.min(fit.width ?? 0, maxW), height: Math.min(fit.height ?? 0, maxH) })
        .png()
        .toBuffer();
    }
    // 붙일 때 가장자리를 흐린다. 칼같은 실루엣이나 잘린 직사각형을 그대로 주면
    // 모델이 그 선을 따라 누끼선을 긋거나 사각 사진 경계를 그려 넣는다.
    cropped = await featherEdges(cropped);

    // 여백은 원본 배경색으로 채운다. 배경이 튀면 모델이 거기에 사각 경계를 그린다.
    const { data: corner } = await sharp(src).extract({ left: 0, top: 0, width: 8, height: 8 }).raw().toBuffer({ resolveWithObject: true });
    const bg = { r: corner[0], g: corner[1], b: corner[2] };
    buf = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: bg } })
      .composite([{ input: cropped, left: Math.round(1024 * x), top: Math.round(1024 * y) }])
      .png()
      .toBuffer();
  } else {
    buf = await img.resize(1024, 1024, { fit: "inside" }).png({ compressionLevel: 9 }).toBuffer();
  }
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function generate(shot: Shot, key: string): Promise<Buffer> {
  const res = await fetch(`https://fal.run/${MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `${BASE}\n\n${shot.extra}`,
      image_urls: [await refDataUri(shot)],
      num_images: 1,
      output_format: "png",
      aspect_ratio: "1:1",
    }),
  });
  if (!res.ok) throw new Error(`fal ${res.status} ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const url = json?.images?.[0]?.url;
  if (!url) throw new Error("응답에 이미지 URL이 없음");
  const image = await fetch(url);
  if (!image.ok) throw new Error("이미지 다운로드 실패");
  return Buffer.from(await image.arrayBuffer());
}

/**
 * 핑크 계열 픽셀만 골라 색조를 342도로 모으고 채도를 올린다. 피부(주황 계열)와
 * 흑백 토너는 색조·채도 조건에서 걸러지므로 건드리지 않는다. AI 재생성이 아니라
 * 픽셀 연산이라 얼굴과 구도가 변하지 않는다.
 */
async function boostPink(file: string): Promise<void> {
  const path = join(OUT_DIR, file);
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) continue;
    const s = max === 0 ? 0 : d / max;
    // 회색 토너는 채도가 낮아 여기서 빠진다.
    if (s < 0.1) continue;

    let h: number;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
    // 핑크·마젠타 구간. 피부의 주황(10~40도)은 들어오지 않는다.
    // 모델이 마젠타 대신 크림슨을 칠하는 경우가 있어 빨강 쪽도 조금 받되,
    // 그쪽은 채도 문턱을 높여 둔다 — 이 인쇄에서 피부와 입술은 채도 0.3을 넘지 않는다.
    // 밝기 문턱이 핵심이다. 따뜻한 세피아 인쇄에서 머리카락·눈썹은 채도가 0.5를
    // 넘기면서 색조가 빨강 쪽에 걸린다. 어두운 픽셀을 빼지 않으면 머리에 핑크
    // 점이 박힌다.
    // 빨강 쪽(모델이 마젠타 대신 크림슨을 칠한 경우)은 문턱을 훨씬 높인다. 일부러
    // 그은 자국은 진하고 밝지만, 머리카락 하이라이트는 채도가 0.6에 못 미친다.
    const pink = (h >= 285 && h <= 355 && max >= 0.3) || ((h > 355 || h < 8) && s >= 0.6 && max >= 0.6);
    if (!pink) continue;

    // 색조만 맞추면 어둡게 그려진 장이 여전히 따로 논다. 밝은 자국만 끌어올려
    // 시리즈 톤을 맞춘다 — 어두운 픽셀까지 올리면 머리에 점이 박힌다.
    // test36 의 실측값이 색조 342 / 채도 0.77 / 명도 0.78 이다. 채도를 0.9까지
    // 열어두면 같은 342도라도 라즈베리 핑크가 아니라 크림슨으로 읽힌다.
    const v = max >= 0.4 ? Math.max(max, 0.78) : max;
    const ns = Math.min(0.78, Math.max(0.62, s * 1.6));
    const c = v * ns;
    const x = c * (1 - Math.abs(((342 / 60) % 2) - 1));
    const m = v - c;
    // 342도는 h'=5.7 구간 → (c, 0, x)
    data[i] = Math.round((c + m) * 255);
    data[i + 1] = Math.round(m * 255);
    data[i + 2] = Math.round((x + m) * 255);
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toFile(path);
}

/**
 * 흑백으로 뽑힌 장을 test36 의 따뜻한 세피아 인쇄로 맞춘다. test36 의 피부는
 * 실측 R-B +26, 채도 0.178, 색조 40도인데 test42~45 는 채도 0.02~0.06 의 순수
 * 회색이라 나란히 놓으면 얼굴색이 따로 논다.
 *
 * 밝기를 유지한 채 R:G:B 비율만 고정해 얹는다(색조 40도·채도 0.178 이 나오는 비율).
 * 핑크 자국은 건너뛴다 — 같이 물들면 주황으로 밀린다.
 */
async function warmTone(file: string, out: string): Promise<void> {
  const { data, info } = await sharp(join(OUT_DIR, file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [KR, KG, KB] = [1.0585, 0.9957, 0.87];

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d > 0 && max >= 0.4 && d / max >= 0.45) {
      let h;
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
      if (h >= 280 || h < 20) continue;
    }
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = Math.min(255, Math.round(lum * KR));
    data[i + 1] = Math.min(255, Math.round(lum * KG));
    data[i + 2] = Math.min(255, Math.round(lum * KB));
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toFile(join(OUT_DIR, out));
}

const key = process.env.FAL_KEY;
const [mode, ...names] = process.argv.slice(2);

if (mode === "pink") {
  for (const name of names) {
    const file = `candidate-${name}.png`;
    process.stdout.write(`${file} 핑크 후처리… `);
    await boostPink(file);
    console.log("완료");
  }
} else if (mode === "webp") {
  // 채택본을 피드용으로 변환한다. 넘긴 순서대로 xerox-1.webp, xerox-2.webp …
  // 피드 배경이라 화질보다 용량이 중요해서 목표(120KB)에 들어올 때까지 품질을 낮춘다.
  let n = 0;
  for (const name of names) {
    const out = `xerox-${++n}.webp`;
    let last = { bytes: 0, quality: 0 };
    for (const quality of [78, 70, 62, 54, 46]) {
      const data = await sharp(join(OUT_DIR, `${name}.png`))
        .resize(1080, 1080, { fit: "cover" })
        .webp({ quality })
        .toBuffer();
      last = { bytes: data.byteLength, quality };
      await writeFile(join(OUT_DIR, out), data);
      if (data.byteLength <= 120_000) break;
    }
    console.log(`${name}.png → ${out} (${Math.round(last.bytes / 1024)}KB, q${last.quality})`);
  }
} else if (mode === "warm") {
  // 원본은 그대로 두고 test42 → test-42w.png 로 새로 뽑는다.
  for (const name of names) {
    const out = `${name.replace(/^test/, "test-")}w.png`;
    process.stdout.write(`${name}.png → ${out} … `);
    await warmTone(`${name}.png`, out);
    console.log("완료");
  }
} else {
  if (!key) {
    console.error("FAL_KEY 가 없습니다. --env-file=.env.local 로 실행하세요.");
    process.exit(1);
  }
  const wanted = mode ? [mode, ...names] : [];
  const targets = wanted.length ? SHOTS.filter((s) => wanted.includes(s.name)) : SHOTS;
  if (targets.length === 0) {
    console.error(`정의된 선수가 아닙니다: ${wanted.join(", ")}`);
    process.exit(1);
  }

  for (const shot of targets) {
    const file = `candidate-${shot.name}.png`;
    process.stdout.write(`${file} 생성 중… `);
    try {
      const png = await generate(shot, key);
      await writeFile(join(OUT_DIR, file), png);
      console.log(`완료 (${Math.round(png.byteLength / 1024)}KB)`);
    } catch (err) {
      console.log("실패");
      console.error(`  ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log("\n/matchday-preview 에서 얼굴·눈·중앙 여백·어깨 누끼선을 검수하세요.");
}
