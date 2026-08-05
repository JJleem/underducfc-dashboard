// 예정 경기 카드 배경 생성. `npm run gen:matchday`
//
// 한 번 돌려 public/matchday/ 에 넣고 커밋하는 오프라인 도구다. 런타임에는
// fal.ai 를 부르지 않는다 — 피드가 뜰 때마다 외부 API를 기다릴 이유가 없고,
// 같은 카드가 매번 다른 그림이 되면 "디자인"이 아니라 "노이즈"가 된다.
//
// 뽑는 건 배경뿐이다. D-day 숫자와 언더덕 로고는 화면에서 얹는다(이유: lib/matchday-art.ts).
// 그래서 프롬프트에는 글자·로고·엠블럼을 넣지 말라고 못 박는다. 넣으면 모델이
// 뭉개진 글자와 엉뚱한 오리를 그려 넣고, 그 위에 진짜 로고를 얹으면 둘이 겹친다.
//
// 인물은 "뒷모습·실루엣만". 얼굴은 확산 모델이 가장 크게 무너지는 지점이라
// 아예 화면에 들이지 않는다. 손도 멀리 두거나 실루엣으로 처리한다.
//
// 환경변수: FAL_KEY (.env.local)

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

/** 맨바닥에서 그리는 모델. */
const MODEL = "fal-ai/flux-pro/v1.1-ultra";
/** 레퍼런스 이미지를 물고 그리는 모델. 크레스트를 다시 그리지 않고 그대로 얹는다. */
const EDIT_MODEL = "fal-ai/nano-banana/edit";
const OUT_DIR = join(process.cwd(), "public", "matchday");
/** 피드에 깔리는 배경이라 용량이 곧 첫 화면 속도다. */
const MAX_BYTES = 120_000;
const SIZE = 1080;

// 어느 그림에나 걸리는 규칙. 여기가 흔들리면 나머지 프롬프트가 다 무의미하다.
const RULES = [
  // 등번호(한두 자리 숫자)만 예외다. 단어·문장은 여전히 금지 — 모델이 반드시 뭉갠다.
  "no words, no letters, no sentences, no typography, no watermark",
  "no logos, no emblems, no badges, no brand marks",
  "no faces, no front-facing people — only backs, rear views, or backlit silhouettes",
  "no sponsor text on kits",
  // 언더덕 킷: 검정 바탕에 핑크 카라·소매 트림. 말로 기술되는 디자인이라
  // 레퍼런스 이미지 없이도 재현된다(public/uniform.png 참고).
  "kits are plain black with soft pink collar and cuff trim",
  // 인물은 한국인이다. 뒷모습만 나오므로 단서는 머리색·체형뿐이라 명시해 둔다.
  "Korean players, East Asian, black hair, lean athletic build",
  // 사람은 적게. 여럿을 세우면 화면이 빽빽해져 숫자가 앉을 자리가 없어진다.
  "at most three people in frame, often just one",
  // 화면 한가운데는 D-day 숫자 자리다. 피사체를 아래쪽이나 옆으로 밀어 비워 둔다.
  "square composition, the centre of the frame stays simple and uncluttered, " +
    "subject placed in the lower third or off to one side",
].join(", ");

// 위쪽 가운데는 D-day 숫자, 아래 가운데는 로고가 앉을 자리다. 그림이 거기서
// 복잡하면 글자가 안 읽힌다. 그래서 여백을 프롬프트로 요구한다.
const LOOK =
  "cinematic night football atmosphere, deep navy (#070d20) to midnight blue palette, " +
  "soft rose-pink (#FF8FA3) rim light accents, volumetric haze, fine film grain, " +
  "premium editorial sports poster, moody and restrained, high dynamic range";

interface Shot {
  stage: string;
  index: number;
  prompt: string;
  /**
   * 레퍼런스로 넘길 이미지. 레포 루트 기준 경로. 있으면 EDIT_MODEL 로 간다.
   * "지어내면 안 되는 것"은 반드시 여기로 넣는다 — 크레스트도, 우리 팀 모습도
   * 말로 설명해서 그리게 하면 매번 다른 것이 나온다(실제로 서양 팀이 나왔다).
   */
  ref?: string;
  /** 이 컷만 다른 화풍으로 갈 때. 비우면 공통 LOOK 을 쓴다. */
  look?: string;
  /** 이 컷만 다른 금지 규칙을 쓸 때. 비우면 공통 RULES. */
  rules?: string;
}

/** 레퍼런스는 한 번만 읽어 데이터 URI 로 만들어 재사용한다. */
const refCache = new Map<string, string>();
async function refDataUri(file: string): Promise<string> {
  const cached = refCache.get(file);
  if (cached) return cached;
  // 원본 로고는 2MB가 넘는다. 긴 변 768이면 크레스트 디테일은 충분히 남고 요청이 가볍다.
  const buf = await sharp(await readFile(join(process.cwd(), file)))
    .resize(1024, 1024, { fit: "inside" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const uri = `data:image/png;base64,${buf.toString("base64")}`;
  refCache.set(file, uri);
  return uri;
}

// 깃발 컷 전용 규칙. 공통 RULES 를 쓰면 안 된다 — 거기엔 "글자 금지"가 있는데
// 크레스트에 "UNDERDUCK FC" 글자가 박혀 있어서 서로 싸운다. 모델이 그 지시를
// 따르려고 크레스트의 글자를 지우거나 뭉갠다.
const FLAG_RULES = [
  "keep the crest exactly as in the reference image — same two ducks, same football, " +
    "same pink ring, same navy shield, same lettering, same stars",
  "do not redraw, restyle or simplify the crest, and do not crop it",
  "the crest's own lettering is the only text allowed — no other words, numbers or watermarks",
  "no people, no faces",
  // 초록이 크게 들어오면 네이비+핑크 팔레트가 깨진다. 잔디는 가라앉힌다.
  "any grass is dark and desaturated toward navy, never bright green",
  // D-day 숫자가 앉을 자리. 가운데를 채우면 크레스트 위에 숫자가 겹친다.
  "the upper centre of the frame stays dark, empty and uncluttered",
  "square 1:1 composition",
].join(", ");

// 화풍을 크게 비트는 컷(픽셀·수채·로우폴리)은 크레스트도 그 화풍으로 따라가야 한다.
// "원본 그대로"를 강요하면 사진 같은 크레스트가 그림 위에 붙어 따로 논다.
// 대신 구성 요소는 하나도 빠뜨리지 못하게 묶는다.
const FLAG_RULES_STYLIZED = [
  "redraw the crest from the reference in this illustration style, but keep every element and " +
    "its layout identical — two white ducks facing each other, a football between them, " +
    "a navy shield, a pink outer ring, the words UNDERDUCK FC around the top, 2025 at the bottom, " +
    "a small star on each side",
  "the crest's own lettering is the only text allowed — no other words, numbers or watermarks",
  "no people, no faces",
  "any grass is dark and desaturated toward navy, never bright green",
  "the upper centre of the frame stays dark, empty and uncluttered",
  "square 1:1 composition",
].join(", ");

// 우리 팀 사진을 레퍼런스로 쓰는 컷. 얼굴이 사라지는 건 상관없다 — 가져오려는 건
// 인물이 아니라 "느낌"이다. 대신 말로는 절대 안 나오던 것들이 따라온다:
// 실제 킷, 한국 사람 체형, 뒷산과 아파트가 보이는 동네 구장.
// (레퍼런스 없이 뽑았을 때는 아무리 지시해도 서양 팀 사진이 나왔다.)
// ⚠️ 레퍼런스에서 "지킬 것"과 "바꿀 것"을 분명히 나눈다.
// 처음에 구도까지 지키라고 했더니 원본 사진에 색만 입힌 결과가 나왔다.
// 우리가 레퍼런스에서 가져오려는 건 사진 자체가 아니라 **우리 팀이라는 사실**이다.
// 킷과 사람만 지키고, 시간·날씨·빛·배경·매체는 과감하게 새로 짓게 한다.
const TRANSFORM = [
  "this must NOT look like the reference photo with a colour filter on it — " +
    "it must read as a new artwork that merely borrows the team from the photo",
  "keep only: the black kit with pink trim, the players and roughly how many there are",
  "change everything else boldly — time of day, weather, light, sky, background, " +
    "camera angle and medium are all yours to reinvent",
].join(", ");

const TEAM_RULES = [
  TRANSFORM,
  // "얼굴을 지워라"는 절대 금지. 그렇게 시켰더니 살색 빈 타원을 남겨 놨다.
  // 어설프게 닮은 얼굴이 낫다 — 화풍이 세면 어차피 그림으로 읽힌다.
  "draw every face fully and confidently in the target art style — never leave a face blank, " +
    "smudged, erased or featureless",
  "keep the team's black kit with pink trim",
  "no readable words or letters anywhere — any sponsor text on the kits becomes illegible texture",
  // 초록이 크게 들어오면 팔레트가 깨진다. 낮 사진이 많아 특히 중요하다.
  "any grass is dark and desaturated, never bright saturated green",
  // D-day 숫자 자리. 레퍼런스는 위쪽이 하늘이라 살리기만 하면 된다.
  "the upper third of the frame stays open and uncluttered — sky, darkness or haze only",
  "square 1:1 composition, crop the reference to square",
].join(", ");

// 얼굴이 이질감을 만드는 건 "잘 못 그려서"가 아니라, 사진에 필터만 씌우면 얼굴이
// 사진도 그림도 아닌 중간에 남기 때문이다. 그래서 두 갈래만 쓴다.
//   · 얼굴이 안 보이는 구도(뒷모습·원거리·역광) — 아예 문제를 만들지 않는다
//   · 얼굴이 나오면 화풍을 끝까지 민다 — 확실한 그림이면 뇌가 그림으로 받아들인다
// 그리고 "고급짐"은 대부분 여백에서 나온다. 비우는 걸 규칙으로 박아 둔다.
const TEAM_RULES_QUIET = [
  TRANSFORM,
  "faces are never the subject — keep people turned away, distant, or reduced to silhouette; " +
    "where a face is unavoidable, render it as a confident finished drawing, never half-erased",
  "keep the team's black kit with pink trim",
  "no readable words or letters anywhere — sponsor text becomes illegible texture",
  "any grass is dark and desaturated, never bright saturated green",
  // 고급짐 = 여백. 화면을 채우지 못하게 못 박는다.
  "restrained and minimal, generous negative space, few elements, nothing cluttered",
  "the upper half of the frame stays open and quiet — sky, darkness, mist or bare ground only",
  "square 1:1 composition, crop the reference to square",
].join(", ");

// flag-5 에서 나온 화풍. 흑백으로 밀되 핑크 하나만 남긴다 —
// 그 한 색이 "우리 팀"이라는 표식이 된다.
const MONO_LOOK =
  "high contrast black and white documentary film photograph, heavy 35mm grain, deep blacks and " +
  "bright whites, one single colour accent — the rose pink of the kit — everything else fully " +
  "monochrome, editorial and timeless";

// 감독 컷 전용. TRANSFORM 을 **일부러 쓰지 않는다** — 여기선 세계를 새로 짓는 게
// 아니라 옷만 갈아입히는 편집이다. 자세와 뒷모습을 지켜야 그 사람으로 남는다.
const COACH_RULES = [
  "keep the person exactly as in the reference — same body, same build, same hair, " +
    "same back view, same pose, same camera angle",
  "he is seen from BEHIND — never turn him around, never invent a face",
  "change only his clothing and the background treatment, nothing else",
  "no readable words, letters or numbers anywhere",
  "the upper part of the frame stays open and quiet",
  "square 1:1 composition",
].join(", ");

// 단계가 올라갈수록 조여든다: 멀리·차분 → 가까이·핑크가 올라옴 → 코앞·가장 강렬.
// 소재는 매 장 다르게 간다. 같은 그림을 밝기만 바꿔 아홉 번 내면 "다양"이 아니다.
const SHOTS: Shot[] = [
  // ── 팀 사진 기반. 화풍을 서로 멀리 벌려 같은 사진의 필터 놀이가 되지 않게 한다.
  { stage: "team", index: 1, ref: "test/stretching.jpeg", rules: TEAM_RULES,
    look: "photorealistic cinematic night football photography, day turned into dramatic night, " +
      "deep navy sky, stadium floodlights raking across, rose pink rim light on the players, " +
      "volumetric haze, fine film grain, premium editorial sports poster",
    prompt:
      "the squad standing in a warm-up circle seen from behind, transformed from a bright afternoon " +
      "into a moody floodlit night, the hillside and sky above them dark and empty" },

  { stage: "team", index: 2, ref: "test/lineup1.jpg", rules: TEAM_RULES,
    look: "Korean webtoon illustration, bold confident ink linework, flat cel shading, " +
      "expressive drawn faces with clear eyes and smiles, " +
      "limited palette of navy, black and rose pink, dramatic graphic sky",
    prompt:
      "the whole squad posing together for a team photo on the pitch, fully redrawn as a webtoon " +
      "panel with every player's face illustrated, the sky above a flat dark field with speed lines" },

  { stage: "team", index: 3, ref: "test/match.jpeg", rules: TEAM_RULES,
    look: "loose oil painting on canvas, visible palette-knife strokes, muted navy and rose pink, " +
      "impressionistic and atmospheric, painterly light",
    prompt:
      "players spread across a wide pitch with Korean apartment blocks and hills on the horizon, " +
      "painted at dusk, the upper third left as soft open sky" },

  { stage: "team", index: 4, ref: "test/stretching.jpeg", rules: TEAM_RULES,
    look: "stylised 3D animated film render, soft global illumination, rounded friendly shapes, " +
      "gentle rim light, navy and rose pink palette, tilt-shift shallow depth of field",
    prompt:
      "the squad in a warm-up circle seen from behind, rendered as characters in an animated film, " +
      "evening light, the sky above kept clean and empty" },

  // ── 안 쓴 레퍼런스 전부 + 기존 레퍼런스의 다른 화풍.
  { stage: "team", index: 5, ref: "test/lineup2.jpg", rules: TEAM_RULES,
    look: "vintage 1970s sports magazine cover, faded Kodachrome colour, heavy paper grain, " +
      "slightly washed navy and dusty pink, nostalgic and warm",
    prompt:
      "the squad posing together on the pitch under a big sky, shot like an old team photo, " +
      "the wide sky above them left open" },

  { stage: "team", index: 6, ref: "test/lineup3.webp", rules: TEAM_RULES,
    look: "moody rain-soaked cinematic photography, wet asphalt sheen, cold navy tones with " +
      "rose pink highlights, heavy atmosphere, fine grain",
    prompt:
      "the squad standing together in pouring rain on a wet pitch with apartment towers behind, " +
      "the grey sky above darkened almost to black" },

  { stage: "team", index: 7, ref: "test/coach.jpeg", rules: TEAM_RULES,
    look: "high contrast black and white documentary photograph, deep blacks, 35mm grain, " +
      "one single colour accent — the pink of the kit — everything else monochrome",
    prompt:
      "a lone figure in the number 9 shirt seen from behind with one arm raised, directing play, " +
      "standing in the lower right, the sky above emptied to near black" },

  { stage: "team", index: 8, ref: "test/kim.jpeg", rules: TEAM_RULES,
    look: "Japanese sports anime cel animation, dramatic sunset sky, bold cel shading, " +
      "expressive drawn face, lens flare, energetic",
    prompt:
      "a player walking alone across the running track beside the pitch, drawn as an anime frame, " +
      "the huge sky above him left open for a title" },

  { stage: "team", index: 9, ref: "test/leemjung.jpeg", rules: TEAM_RULES,
    look: "charming 3D animated film render, rounded caricatured character design, warm rim light, " +
      "soft depth of field, navy and rose pink palette, playful and funny",
    prompt:
      "two teammates grinning at the camera throwing peace signs and thumbs up, " +
      "redrawn as animated film characters, dark trees behind, the top of the frame kept clear" },

  { stage: "team", index: 10, ref: "test/shin.png", rules: TEAM_RULES,
    look: "gritty graphic novel ink illustration, heavy cross-hatching, high contrast, " +
      "limited navy black and rose pink palette, dramatic and serious",
    prompt:
      "a player walking across the pitch in profile with apartment blocks towering behind, " +
      "drawn as a graphic novel panel, the overcast sky above flattened to dark tone" },

  { stage: "team", index: 11, ref: "test/박영휘 1.png", rules: TEAM_RULES,
    look: "bold flat vector poster illustration, simplified geometric shapes, thick outlines, " +
      "limited palette of navy, cream and rose pink, clean and graphic",
    prompt:
      "the goalkeeper in a green shirt standing with one glove raised, reduced to bold flat shapes, " +
      "placed in the lower right, a large flat field of colour above" },

  { stage: "team", index: 12, ref: "test/이건주goal.png", rules: TEAM_RULES,
    look: "explosive comic book action panel, halftone dots, motion lines, dramatic ink shadows, " +
      "electric rose pink against deep navy",
    prompt:
      "a player driving forward with the ball at his feet, drawn as a comic action panel with " +
      "impact lines radiating outward, the upper area left as flat dark space" },

  { stage: "team", index: 13, ref: "test/match.jpeg", rules: TEAM_RULES,
    look: "isometric low-poly 3D miniature diorama, clean flat-shaded geometry, tilt-shift toy scale, " +
      "navy and rose pink palette, soft studio lighting",
    prompt:
      "the whole pitch and its surrounding neighbourhood rebuilt as a tiny model in the lower half " +
      "of the frame, players as small figures, dark empty space above" },

  { stage: "team", index: 14, ref: "test/stretching.jpeg", rules: TEAM_RULES,
    look: "loose watercolour and ink wash on textured paper, bleeding pigment, navy indigo washes " +
      "with rose pink blooms, generous paper space",
    prompt:
      "the warm-up circle seen from behind, painted loosely along the bottom of the page, " +
      "the upper two thirds left as bare textured paper" },

  { stage: "team", index: 15, ref: "test/lineup1.jpg", rules: TEAM_RULES,
    look: "dramatic chiaroscuro oil painting in the style of an old master group portrait, " +
      "deep shadow, a single warm light source, rich navy and rose pink, museum-like gravitas",
    prompt:
      "the squad arranged as a formal group portrait emerging from darkness, " +
      "only their faces and kit catching the light, the top of the canvas almost black" },

  // ── 3차. 사진에 필터 씌운 티가 나면 실패다. 세계를 통째로 다시 짓는다.
  { stage: "team", index: 17, ref: "test/whole.jpeg", rules: TEAM_RULES_QUIET,
    look: "epic cinematic wide shot at blue hour, colossal empty stadium bowl, towering floodlight " +
      "pylons, thick ground mist, deep navy with a single rose pink light bloom, anamorphic flare",
    prompt:
      "the line of players seen from behind shrunk small along the very bottom of the frame, " +
      "dwarfed by an enormous dark stadium and an immense empty sky above them" },

  { stage: "team", index: 18, ref: "test/whole.jpeg", rules: TEAM_RULES_QUIET,
    look: "minimal fine-art print, almost abstract, two flat tones of deep navy and cream, " +
      "heavy paper grain, vast emptiness, gallery poster restraint",
    prompt:
      "the row of players reduced to a thin band of tiny dark silhouettes across the bottom third, " +
      "everything above them a single uninterrupted flat field of colour" },

  { stage: "team", index: 19, ref: "test/tipoon.jpeg", rules: TEAM_RULES_QUIET,
    look: "dramatic golden-hour backlight, long shadows stretching toward the camera, " +
      "heavy atmospheric haze, warm rim light against deep navy shadow, cinematic telephoto compression",
    prompt:
      "two players walking away from camera reduced to backlit silhouettes with enormously long " +
      "shadows, an empty sun-flared expanse filling the rest of the frame" },

  { stage: "team", index: 20, ref: "test/tipoon.jpeg", rules: TEAM_RULES_QUIET,
    look: "traditional East Asian ink brush painting on rice paper, sparse confident strokes, " +
      "vast empty paper, a single rose pink seal mark, meditative",
    prompt:
      "two tiny figures walking, painted with a few brush strokes low in the composition, " +
      "the rest of the paper left completely bare" },

  { stage: "team", index: 21, ref: "test/yayoo.jpeg", rules: TEAM_RULES,
    look: "warm nostalgic animated film interior, soft lamplight, rich shadows, " +
      "cosy and charming, navy blues with amber and rose pink glow, Ghibli-like warmth",
    prompt:
      "the squad sprawled around a dim room together the night before a match, " +
      "reimagined as a hand-drawn animation still, one warm lamp lighting the whole scene" },

  { stage: "team", index: 22, ref: "test/yayoo.jpeg", rules: TEAM_RULES,
    look: "bold graphic silkscreen poster, three flat colours only — deep navy, cream, rose pink, " +
      "heavy simplification into shapes, no photographic detail whatsoever",
    prompt:
      "the team gathered together in a room, reduced to a flat graphic arrangement of simple " +
      "shapes and shadows, large empty colour field above them" },

  { stage: "team", index: 23, ref: "test/stretching.jpeg", rules: TEAM_RULES_QUIET,
    look: "torrential night rain under a single harsh floodlight, water exploding off the ground, " +
      "everything else swallowed by blackness, extreme contrast, cinematic",
    prompt:
      "the warm-up circle transformed into a downpour at night, players as dark shapes ringed by " +
      "one blinding light, the entire top of the frame pure black rain" },

  { stage: "team", index: 24, ref: "test/lineup1.jpg", rules: TEAM_RULES,
    look: "bold Korean webtoon key visual, thick confident inking, dramatic screen tone, " +
      "expressive stylised faces, explosive pink energy behind the figures, no photographic realism",
    prompt:
      "the squad redrawn as a webtoon cover — heroic low angle, wind in their kit, " +
      "a burst of graphic pink light behind them, flat dark sky above for a title" },

  { stage: "team", index: 25, ref: "test/lineup2.jpg", rules: TEAM_RULES,
    look: "1920s art deco travel poster, geometric stylisation, flat symmetrical composition, " +
      "limited navy cream and rose pink palette, elegant and graphic",
    prompt:
      "the squad rendered as stylised deco figures beneath a great symmetrical arch of light, " +
      "wide empty sky above, everything reduced to clean geometry" },

  { stage: "team", index: 26, ref: "test/lineup3.webp", rules: TEAM_RULES_QUIET,
    look: "long-exposure night photography, motion smeared into light trails, deep navy, " +
      "wet reflections, ghostly and beautiful, minimal",
    prompt:
      "the team dissolved into soft blurred shapes and streaks of pink light on a rain-soaked pitch, " +
      "an empty black sky filling the upper half" },

  { stage: "team", index: 27, ref: "test/coach.jpeg", rules: TEAM_RULES_QUIET,
    look: "stark minimal fine-art photograph, one small figure against an immense empty field, " +
      "muted navy and grey, a single pink accent, enormous negative space",
    prompt:
      "a lone figure with an arm raised, tiny in the bottom right of a vast empty snowy pitch, " +
      "the whole upper frame a blank pale void" },

  { stage: "team", index: 28, ref: "test/kim.jpeg", rules: TEAM_RULES,
    look: "explosive Japanese sports anime key visual, dramatic speed lines, blazing sunset, " +
      "hard cel shading, lens flare, heroic low angle, no photographic realism",
    prompt:
      "a single player striding forward, drawn as an anime hero shot with the track and pitch " +
      "streaking past, a burning sky above left open" },

  { stage: "team", index: 29, ref: "test/leemjung.jpeg", rules: TEAM_RULES,
    look: "playful vinyl-toy 3D render, chunky caricatured proportions, glossy surfaces, " +
      "studio lighting on a seamless navy backdrop, rose pink accents, funny and premium",
    prompt:
      "two teammates as collectible figurines standing on a plain backdrop, " +
      "big empty space above them, clean product-shot lighting" },

  { stage: "team", index: 30, ref: "test/shin.png", rules: TEAM_RULES_QUIET,
    look: "monochrome charcoal drawing on grey paper, smudged tone, bold gestural marks, " +
      "one small stroke of rose pink, raw and expressive",
    prompt:
      "a single player mid-stride sketched loosely in the lower half, " +
      "the apartment towers behind reduced to faint suggestions, the top of the page nearly blank" },

  { stage: "team", index: 31, ref: "test/박영휘 1.png", rules: TEAM_RULES,
    look: "dramatic sports magazine cover portrait, hard single-source studio light, " +
      "deep black background, saturated rose pink rim light, high production value",
    prompt:
      "the goalkeeper lit hard from one side against total blackness, gloves raised, " +
      "isolated in the lower right, the rest of the frame pure black" },

  { stage: "team", index: 32, ref: "test/이건주goal.png", rules: TEAM_RULES,
    look: "kinetic ink and paint splatter illustration, figure dissolving into flying particles " +
      "and brush marks, deep navy with violent rose pink spray, gallery sports art",
    prompt:
      "a player driving with the ball, his form breaking apart into streaks of paint and shards, " +
      "the upper frame left as clean dark space" },

  { stage: "team", index: 33, ref: "test/match.jpeg", rules: TEAM_RULES_QUIET,
    look: "architectural blueprint drawing, fine white line work on deep navy ground, " +
      "technical annotations reduced to abstract marks, precise and elegant",
    prompt:
      "the pitch and its surroundings drawn as a technical plan with a few tiny figures marked on it, " +
      "the upper area left as empty blueprint ground" },

  { stage: "team", index: 34, ref: "test/문승환goal.png", rules: TEAM_RULES,
    look: "layered cut-paper collage, visible paper edges and drop shadows, " +
      "three tones of navy cream and rose pink, tactile and crafted",
    prompt:
      "a single player built from cut paper shapes standing low in the frame, " +
      "flat layered paper sky filling the space above" },

  // ── 위트 묶음. 남기신 것들이 죄다 "확실히 그림"인 계열이라 그쪽으로 민다.
  //    사진처럼 보이는 순간 이질감이 생기고, 만화면 오히려 편하게 읽힌다.
  { stage: "fun", index: 1, ref: "test/whole.jpeg", rules: TEAM_RULES,
    look: "vintage football sticker album illustration, thick outlines, flat cheerful colours, " +
      "printed card texture, playful retro Panini style",
    prompt:
      "the row of players redrawn as a strip of collectible sticker figures standing shoulder to " +
      "shoulder along the bottom, a big flat colour panel above them for a title" },

  { stage: "fun", index: 2, ref: "test/yayoo.jpeg", rules: TEAM_RULES,
    look: "cosy hand-drawn animation still, warm lamplight, rounded friendly character design, " +
      "rich shadows, Ghibli-like warmth, navy with amber and rose pink",
    prompt:
      "the squad sprawled around a cluttered room the night before a match, some asleep, " +
      "some staring at phones, drawn with affection and humour, dark ceiling above left empty" },

  { stage: "fun", index: 3, ref: "test/leemjung.jpeg", rules: TEAM_RULES,
    look: "chunky vinyl collectible figure render, glossy plastic, oversized heads, " +
      "clean studio lighting on a seamless navy backdrop, rose pink accents, funny and premium",
    prompt:
      "two teammates as grinning toy figurines throwing peace signs, standing small on a plain " +
      "backdrop, a huge empty space above them" },

  { stage: "fun", index: 4, ref: "test/coach.jpeg", rules: TEAM_RULES,
    look: "epic movie poster illustration, dramatic low angle, heroic lighting, painted realism " +
      "with graphic flair, deep navy and blazing rose pink",
    prompt:
      "the number 9 seen from behind with one arm raised commanding the pitch, painted like a " +
      "blockbuster poster, storm clouds and light beams above him left open" },

  { stage: "fun", index: 5, ref: "test/이건주goal.png", rules: TEAM_RULES,
    look: "retro 90s arcade game attract screen, chunky pixel-adjacent shapes, bold cel shading, " +
      "electric pink on deep navy, energetic and nostalgic",
    prompt:
      "a player striking the ball drawn as a retro game character mid-kick, " +
      "impact burst around the ball, flat dark space filling the top of the screen" },

  { stage: "fun", index: 6, ref: "public/players/임재준.png", rules: TEAM_RULES,
    look: "bold Korean webtoon character portrait, thick confident inking, flat cel shading, " +
      "expressive eyes, graphic pink burst behind, no photographic realism",
    prompt:
      "a single player in the black and pink kit with arms folded, drawn as a webtoon character " +
      "standing in the lower right, flat dark space filling the upper left" },

  { stage: "fun", index: 7, ref: "public/players/임재준.png", rules: TEAM_RULES,
    look: "charming 3D animated film character render, rounded caricatured proportions, " +
      "soft rim light, navy backdrop with rose pink glow, warm and funny",
    prompt:
      "a single player as an animated film character grinning with a football under one arm, " +
      "standing small in the bottom third, a wide empty backdrop above" },

  { stage: "fun", index: 8, ref: "test/stretching.jpeg", rules: TEAM_RULES,
    look: "comic book double page splash, halftone dots, dramatic ink shadows, motion lines, " +
      "electric rose pink against deep navy",
    prompt:
      "the warm-up circle drawn as a comic splash panel seen from a low heroic angle, " +
      "the sky above rendered as flat graphic colour for a title" },

  { stage: "fun", index: 9, ref: "test/lineup3.webp", rules: TEAM_RULES,
    look: "expressive hand-painted gouache illustration, visible brushwork, warm rich colour, " +
      "storybook charm, navy and rose pink",
    prompt:
      "the squad squeezed together grinning in the rain, painted with humour and warmth, " +
      "the grey sky above simplified to a flat wash" },

  { stage: "fun", index: 10, ref: "test/lineup2.jpg", rules: TEAM_RULES,
    look: "bold Korean webtoon group key visual, thick inking, flat cel shading, " +
      "each character clearly drawn, dynamic pink energy behind them",
    prompt:
      "the whole squad posing heroically as a webtoon cast lineup, wind in their kit, " +
      "a flat dark sky above kept clear for a title" },

  { stage: "fun", index: 11, ref: "test/문승환goal.png", rules: TEAM_RULES,
    look: "1970s riso-printed gig poster, two fluorescent inks — hot pink and deep navy, " +
      "misregistered layers, coarse grain, raw and punchy",
    prompt:
      "a lone player walking away after scoring, printed as a two-colour poster, " +
      "the figure small and low, a huge flat field of colour above" },

  { stage: "fun", index: 12, ref: "test/tipoon.jpeg", rules: TEAM_RULES,
    look: "stylised 3D animated film wide shot, soft evening light, rounded shapes, " +
      "tilt-shift miniature feel, navy and rose pink, charming",
    prompt:
      "two tiny animated characters walking side by side across an enormous pitch, " +
      "a vast open sky above them" },

  { stage: "fun", index: 13, ref: "test/kim.jpeg", rules: TEAM_RULES,
    look: "Japanese sports anime opening frame, blazing sunset, hard cel shading, " +
      "dramatic speed lines, lens flare, heroic",
    prompt:
      "a single player striding along the running track drawn as an anime hero, " +
      "the track streaking past him, a burning sky above left open" },

  { stage: "fun", index: 14, ref: "test/shin.png", rules: TEAM_RULES,
    look: "graphic novel ink illustration, bold cross-hatching, high contrast, " +
      "limited navy and rose pink palette, cinematic framing",
    prompt:
      "a player walking in profile with apartment towers looming behind, drawn as a comic panel, " +
      "the sky above flattened into a dark graphic band" },

  { stage: "fun", index: 15, ref: "test/lineup1.jpg", rules: TEAM_RULES,
    look: "playful cut-paper collage, layered paper with visible edges and soft drop shadows, " +
      "navy cream and rose pink, tactile and crafted",
    prompt:
      "the squad built from cut paper shapes posing together along the bottom, " +
      "a flat layered paper sky filling the space above" },

  { stage: "fun", index: 16, ref: "test/match.jpeg", rules: TEAM_RULES,
    look: "warm nostalgic animated film wide shot, golden evening light, soft painted background, " +
      "gentle and cinematic, navy and rose pink",
    prompt:
      "a quiet neighbourhood pitch with apartment blocks behind, a few animated characters playing, " +
      "an enormous painted evening sky filling the upper half" },

  { stage: "fun", index: 17, ref: "test/박영휘 1.png", rules: TEAM_RULES,
    look: "comic book hero splash panel, halftone shading, bold ink outlines, " +
      "explosive pink impact burst, no photographic realism",
    prompt:
      "THE GOALKEEPER in a plain GREEN goalkeeper jersey and GREEN gloves — never the black and " +
      "pink outfield kit — leaping to punch a ball clear, drawn as a comic hero moment, " +
      "flat dark space above. No letters or numbers on the jersey" },

  { stage: "fun", index: 18, ref: "test/whole.jpeg", rules: TEAM_RULES,
    look: "stylised 3D animated film render, rounded character design, soft evening rim light, " +
      "tilt-shift miniature scale, navy and rose pink, charming and premium",
    prompt:
      "the line of players seen from behind as animated characters standing on a snowy pitch, " +
      "small along the bottom, a huge quiet sky above them" },

  // ── 듀오 컷. 상반신 누끼라 주변 세계를 통째로 지어 줘야 한다.
  //    parkhwang 은 표정이 과장돼 있어 위트 쪽, leemkim 은 차분해서 분위기 쪽으로 나눈다.
  //    가슴의 작은 크레스트는 살린다 — 그게 "우리 팀"이라는 유일한 표식이다.
  { stage: "duo", index: 1, ref: "test/parkhwang.png", rules: TEAM_RULES,
    look: "explosive comic book reaction panel, thick ink outlines, halftone dots, " +
      "radiating speed lines, electric rose pink on deep navy, no photographic realism",
    prompt:
      "two teammates in black and pink kit losing their minds celebrating — one roaring with his " +
      "mouth wide open, the other grinning ear to ear — drawn as a comic panel with pink energy " +
      "bursting behind them, both placed in the lower half, flat dark space above. " +
      "The small club crest on the chest stays" },

  { stage: "duo", index: 2, ref: "test/parkhwang.png", rules: TEAM_RULES,
    look: "glossy vinyl collectible figure render, oversized heads, exaggerated expressions, " +
      "clean studio light on a seamless navy backdrop, rose pink rim glow, funny and premium",
    prompt:
      "two teammates as chunky toy figurines with wildly exaggerated faces, standing side by side " +
      "small in the bottom third, a big empty backdrop above them. " +
      "The tiny club crest on their shirts stays" },

  { stage: "duo", index: 3, ref: "test/leemkim.png", rules: TEAM_RULES,
    look: "bold Korean webtoon key visual, thick confident inking, flat cel shading, " +
      "cool composed expressions, dramatic pink backlight, no photographic realism",
    prompt:
      "two teammates standing back to back with arms folded looking dead cool, drawn as a webtoon " +
      "cover duo, night floodlight glow behind them, placed low in the frame with flat dark sky " +
      "above for a title. The small club crest on the chest stays" },

  // 4번(3D 캐릭터)은 어색해서 버렸다. 아래 둘은 그림 쪽으로 덜 밀고 실사에 가깝게 간다.
  { stage: "duo", index: 5, ref: "test/parkhwang.png", rules: TEAM_RULES,
    look: "photorealistic cinematic sports photography, night floodlights, shallow depth of field, " +
      "deep navy with rose pink rim light, fine grain, premium press-photo quality",
    prompt:
      "two teammates caught mid-celebration on a floodlit pitch at night — one roaring, the other " +
      "laughing — shot like a real press photograph, both in the lower half, " +
      "dark blurred stadium and empty night sky above" },

  // 6번 첫 시도는 실패했다. "실사 인물 사진"만 시키니 모델이 누끼를 검은 배경에
  // 그대로 얹고 끝냈다. 실사로 가더라도 **장면**을 요구해야 세계가 지어진다.
  { stage: "duo", index: 6, ref: "test/leemkim.png", rules: TEAM_RULES,
    look: "photorealistic cinematic sports photography, floodlit night stadium far behind, " +
      "shallow depth of field, deep navy with rose pink rim light, fine grain, press-photo quality",
    prompt:
      "two teammates walking out side by side onto a floodlit pitch at night, shot from the front " +
      "at waist height as they stride toward camera, calm and focused, empty stands and dark night " +
      "sky filling the space above them. A real scene with real depth — not a cutout on a backdrop" },

  // ── 감독. ⚠️ 다른 컷과 정반대 원칙이다 — 여기선 바꾸지 말고 **지켜야** 한다.
  //
  // 레퍼런스가 뒷모습이라 얼굴이 아예 안 보인다. 그런데 앞서 "세계를 다시 지으라"고
  // 시켰더니 모델이 없는 얼굴을 지어내 정면으로 세웠고, 당연히 하나도 안 닮았다.
  // 그래서 TRANSFORM 을 빼고, 자세·체형·구도를 그대로 둔 채 옷만 갈아입힌다.
  { stage: "coach", index: 1, ref: "test/coach.jpeg", rules: COACH_RULES,
    look: "same photograph, lightly desaturated cinematic grade, muted tones, soft film grain",
    prompt:
      "DO NOT REDRAW THIS PERSON. Keep the head exactly as it is — the same hair, the same " +
      "side profile, the same skin, the same neck, pixel for pixel. Do not add glasses. " +
      "Do not change his face, his angle or his expression in any way. " +
      "Change ONLY the clothing below the neck: replace the football shirt and trousers with a " +
      "black tailored suit jacket, white shirt collar and black suit trousers. " +
      "Everything else in the photo stays where it is, just with the colour pulled down."},

  // ── 사이버펑크 네온 + 애니메이션. 화풍을 끝까지 미는 쪽이라 얼굴이 나와도
  //    확실한 그림으로 읽힌다(사진과 그림 사이에서 어정쩡할 때만 이질감이 생긴다).
  { stage: "duo", index: 7, ref: "test/parkhwang.png", rules: TEAM_RULES,
    look: "cyberpunk anime cel animation, neon-drenched rainy night, hot pink and cyan glow, " +
      "wet asphalt reflections, holographic signage bokeh, hard cel shading with bloom, " +
      "80s retro-future energy, no photographic realism",
    prompt:
      "two teammates in the black and pink kit laughing hard together on a neon-lit backstreet " +
      "at night, rain falling through the glow, drawn as an anime frame, both in the lower half, " +
      "dark neon-hazed sky filling the space above them" },

  { stage: "duo", index: 8, ref: "test/leemkim.png", rules: TEAM_RULES,
    look: "cyberpunk anime cel animation, cool neon night city, electric pink and cyan rim light, " +
      "rain-slicked ground, glowing signage far behind, sharp cel shading with bloom, " +
      "moody retro-future atmosphere, no photographic realism",
    prompt:
      "two teammates in the black and pink kit standing side by side looking dead calm on a neon " +
      "city street at night, backlit by glowing signs, drawn as an anime key frame, " +
      "low in the frame with a dark neon sky above" },

  // ── 흑백 다큐 + 핑크 한 색. flag-5 에서 나온 문법을 레퍼런스 전반에 적용한다.
  //    흑백이라 탁해지지 않고, 변환이 확실히 보이고, 유일하게 남은 색이 팀 색이라
  //    "언더덕과 무슨 상관이냐"는 문제까지 한 번에 걸린다.
  { stage: "mono", index: 1, ref: "test/whole.jpeg", rules: TEAM_RULES_QUIET,
    look: MONO_LOOK,
    prompt:
      "the line of players seen from behind standing shoulder to shoulder on a snow-covered pitch, " +
      "shot from far back so they sit small along the bottom, an immense pale empty sky above them" },

  { stage: "mono", index: 2, ref: "test/stretching.jpeg", rules: TEAM_RULES_QUIET,
    look: MONO_LOOK,
    prompt:
      "the warm-up circle seen from behind under heavy floodlight at night, long shadows raking " +
      "across the ground, the hillside and sky above swallowed by black" },

  { stage: "mono", index: 3, ref: "test/tipoon.jpeg", rules: TEAM_RULES_QUIET,
    look: MONO_LOOK,
    prompt:
      "two players walking away from camera across an enormous empty pitch, tiny in the lower third, " +
      "a vast blown-out white sky filling everything above them" },

  { stage: "mono", index: 4, ref: "test/lineup3.webp", rules: TEAM_RULES,
    look: MONO_LOOK,
    prompt:
      "the squad crowded together grinning in pouring rain, water streaking through the frame, " +
      "apartment towers behind reduced to grey shapes, the sky above pushed to near white" },

  { stage: "mono", index: 5, ref: "test/coach.jpeg", rules: TEAM_RULES_QUIET,
    look: MONO_LOOK,
    prompt:
      "a lone figure seen from behind with one arm raised, directing play, standing small in the " +
      "lower right of a vast empty pitch, everything above him near black" },

  { stage: "mono", index: 6, ref: "test/문승환goal.png", rules: TEAM_RULES,
    look: MONO_LOOK,
    prompt:
      "a single player walking forward after scoring, caught mid-stride, isolated low in the frame " +
      "against deep blackness, a hard shaft of light falling across him" },

  { stage: "mono", index: 7, ref: "test/이건주goal.png", rules: TEAM_RULES,
    look: MONO_LOOK,
    prompt:
      "a player driving forward with the ball at his feet, frozen mid-motion, spray kicking up " +
      "around the ball, dark empty space filling the top of the frame" },

  { stage: "mono", index: 8, ref: "test/match.jpeg", rules: TEAM_RULES_QUIET,
    look: MONO_LOOK,
    prompt:
      "players scattered across a wide pitch with Korean apartment blocks on the horizon, " +
      "shot like a documentary frame, the upper third a flat pale sky" },

  // ── 골키퍼 뒷모습. 앞모습은 실제 얼굴과 달라 계속 어색했다. 뒤에서 잡으면
  //    그 문제가 통째로 사라지고, 등번호 1이 곧 신원이 된다.
  { stage: "gk", index: 7, ref: "test/박영휘 1.png", rules: TEAM_RULES,
    look: "photorealistic cinematic sports photography, floodlit night stadium, motion energy, " +
      "deep navy with rose pink rim light, fine grain, premium press-photo quality",
    prompt:
      "THE GOALKEEPER seen from BEHIND — his back fully to camera, face never visible — " +
      "flying through the air in a full-stretch super save, both arms reaching for the ball. " +
      "He wears a GREEN goalkeeper jersey with a large clear number 1 on the back and GREEN gloves — " +
      "never the black and pink outfield kit. Diagonal pose across the lower half, " +
      "dark empty night sky filling the top. Only the number 1 appears on the shirt, no other text" },

  // ── 골키퍼 전용 규칙으로 다시. 앞선 시도가 두 번 다 틀렸다.
  //    ① 옷에 알 수 없는 글자가 박혔다 ② 초록 GK 유니폼을 필드 킷으로 갈아입혔다.
  //    "그림에 글자 금지"와 "GK는 초록"을 각 컷 프롬프트에서 다시 못 박는다.
  { stage: "gk", index: 1, ref: "test/박영휘 1.png", rules: TEAM_RULES,
    look: "dramatic sports magazine cover portrait, one hard studio light from the side, " +
      "deep black background, rose pink rim light, high production value",
    prompt:
      "THE GOALKEEPER — he must wear a GREEN goalkeeper jersey and GREEN goalkeeper gloves, " +
      "never the black and pink outfield kit. One glove raised, lit hard against darkness, " +
      "placed low and to the right. Absolutely no letters, words or numbers on the jersey — " +
      "the fabric is plain green" },

  { stage: "gk", index: 2, ref: "test/박영휘 1.png", rules: TEAM_RULES,
    look: "bold Korean webtoon key visual, thick confident inking, flat cel shading, " +
      "explosive graphic energy behind the figure, no photographic realism",
    prompt:
      "THE GOALKEEPER in a GREEN goalkeeper jersey and GREEN gloves — never the outfield kit — " +
      "drawn as a webtoon hero shot diving across the frame, a burst of pink light behind him, " +
      "flat dark space above. The jersey is plain green with no letters or numbers on it" },

  // 3번(정면·정적·작게)은 밋밋해서 버렸다. 아래 셋은 캐릭터를 크게 세우고 움직임을 준다.
  // 비니와 안경은 원본에서 온 그 사람의 특징이라 일부러 살린다.
  { stage: "gk", index: 4, ref: "test/박영휘 1.png", rules: TEAM_RULES,
    look: "Pixar animated feature film still, warm expressive character design, large friendly eyes, " +
      "soft subsurface skin, cinematic rim light, rich depth of field, polished and heartfelt",
    prompt:
      "THE GOALKEEPER as a Pixar hero — a GREEN goalkeeper jersey and GREEN gloves, never the " +
      "black and pink outfield kit — crouched ready with a determined grin, beanie and glasses kept, " +
      "goal net softly blurred behind, placed in the lower right with warm evening sky above. " +
      "Plain green fabric with no letters or numbers on it" },

  { stage: "gk", index: 5, ref: "test/박영휘 1.png", rules: TEAM_RULES,
    look: "cute flat illustration, chunky rounded shapes, thick friendly outlines, simple dot eyes, " +
      "cheerful limited palette of navy, green and rose pink, sticker-like charm",
    prompt:
      "THE GOALKEEPER drawn as an adorable little character with an oversized head, tiny body, " +
      "GREEN goalkeeper jersey and big GREEN gloves — never the outfield kit — beanie and glasses " +
      "kept, hugging a football, standing small at the bottom with a flat colour field above. " +
      "Plain green fabric, no letters or numbers" },

  { stage: "gk", index: 6, ref: "test/박영휘 1.png", rules: TEAM_RULES,
    look: "premium stylised 3D character render, glossy surfaces, dramatic studio key light, " +
      "deep navy backdrop with rose pink rim glow, shallow depth of field, high-end game cinematic",
    prompt:
      "THE GOALKEEPER as a 3D character mid-dive with both arms stretched for the ball, " +
      "GREEN goalkeeper jersey and GREEN gloves — never the outfield kit — beanie and glasses kept, " +
      "dynamic diagonal pose across the lower half, dark empty space filling the top. " +
      "Plain green fabric with no letters or numbers" },

  { stage: "team", index: 16, ref: "test/문승환goal.png", rules: TEAM_RULES,
    look: "risograph print, visible misregistered ink layers, coarse grain, " +
      "two-colour palette of fluorescent pink and deep navy, raw and punchy",
    prompt:
      "a lone player walking forward after scoring, printed as a two-colour riso poster, " +
      "the figure low in the frame, a large open field of flat colour above" },

  // ── 언더덕 깃발. 크레스트는 레퍼런스에서 그대로 가져온다(ref).
  //    네 장의 화풍을 일부러 멀리 떨어뜨렸다. 같은 그림에 필터만 바꾼 것처럼
  //    보이면 "다양"이 아니라 "우려먹기"가 된다. 깃발 위치도 매번 옮긴다.
  { stage: "flag", index: 1, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "photorealistic cinematic night photography, deep navy and soft rose pink (#FF8FA3), " +
      "volumetric haze, fine film grain, premium sports poster, dark and moody",
    prompt:
      "the crest printed on a black supporters flag with soft pink trim, streaming in the wind " +
      "on a pole in the LOWER LEFT of the frame, backlit by out-of-focus stadium floodlights, " +
      "the upper right sky dark and empty" },

  { stage: "flag", index: 2, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "Korean webtoon illustration, bold confident ink linework, flat cel shading, " +
      "limited palette of navy, black and rose pink, dramatic graphic sky, crisp and clean",
    prompt:
      "the crest printed on a black supporters flag with pink trim, whipping diagonally across " +
      "the LOWER RIGHT of the frame, speed lines and wind, stylised floodlight glow, " +
      "the upper left of the frame left as flat dark sky" },

  { stage: "flag", index: 3, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "stylised 3D animated film render, soft global illumination, gentle rim light, " +
      "rounded shapes, warm and charming, navy and rose pink palette, shallow depth of field",
    prompt:
      "the crest on a black supporters flag with pink trim, planted on a floodlit pitch and seen " +
      "from a low angle at the BOTTOM RIGHT, small in frame, night sky and soft bokeh lights " +
      "filling the rest, the upper centre kept empty" },

  { stage: "flag", index: 4, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "elegant neon sign photography at night, glass tube glow in rose pink and cool white, " +
      "wet asphalt reflections, deep black surroundings, restrained and premium, no clutter",
    prompt:
      "the crest recreated as a glowing neon sign mounted low on a dark wet wall in the " +
      "LOWER RIGHT of the frame, its light pooling on the wet ground below, " +
      "the upper left almost pure black" },

  // ── 세 번째 묶음. 끝난 경기 카드에도 쓰이는 자리라 어둡고 묵직한 쪽으로만 간다.
  //    소재는 기존 8장과 안 겹치게: 트로피·라커룸·서포터·티포·공.
  { stage: "flag", index: 9, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "high contrast black and white documentary photograph, heavy 35mm grain, deep blacks, " +
      "one single colour accent — the pink of the crest — everything else monochrome",
    prompt:
      "a supporter seen from behind holding a big flag with the crest over their shoulders, " +
      "standing low in the frame on a dark terrace at night, floodlight haze above, " +
      "the upper half almost pure black" },

  { stage: "flag", index: 10, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "photorealistic cinematic interior photography, one hard overhead light, deep shadow, " +
      "muted navy and rose pink, fine grain, quiet and premium",
    prompt:
      "the crest mounted as a metal emblem on a dark dressing room wall, lit hard from above, " +
      "empty benches and hanging kit blurred in the shadows below, " +
      "the wall above it left as flat darkness" },

  { stage: "flag", index: 11, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "photorealistic macro product photography, wet surfaces catching light, " +
      "deep navy background, rose pink rim light, shallow depth of field, premium and moody",
    prompt:
      "a football with the crest printed on it, resting on wet dark grass in the bottom right, " +
      "rain beading on its surface, floodlight bokeh far behind, " +
      "the upper left dissolving into darkness" },

  { stage: "flag", index: 12, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "photorealistic cinematic wide shot at night, floodlight haze, deep navy, " +
      "rose pink glow, film grain, epic and atmospheric",
    prompt:
      "an enormous tifo banner bearing the crest unfurled across a dark stand, filling the lower " +
      "half of the frame, silhouetted heads along its bottom edge, " +
      "black night sky above it" },

  { stage: "flag", index: 13, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "dramatic still-life photography, single raking light, near-black surroundings, " +
      "polished metal catching rose pink, extremely shallow depth of field, luxurious",
    prompt:
      "a trophy engraved with the crest standing on a dark reflective surface in the lower right, " +
      "one shaft of light across it, everything else swallowed by black" },

  // ── 네 번째 묶음. 앞선 13장에 없던 "시점"과 "질감"으로 벌린다.
  //    지금까지는 전부 사람 눈높이에서 본 장면이었다.
  // 첫 시도는 "항공샷"이 통째로 무시되고 로고만 허공에 떴다. 장면을 먼저 세우고
  // 크레스트를 그 장면 안의 사물로 넣어야 시점이 잡힌다.
  { stage: "flag", index: 14, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "cinematic night photography from a high vantage point, floodlight pools on wet turf, " +
      "deep navy and rose pink, atmospheric haze, film grain",
    prompt:
      "A FOOTBALL PITCH PHOTOGRAPHED FROM HIGH ABOVE, looking down at a steep angle onto the grass. " +
      "The pitch markings, centre circle and penalty box are clearly visible below. " +
      "Painted large onto the turf in the lower half of the frame is the crest, seen at that same " +
      "steep downward angle so it sits flat on the ground and follows the perspective of the pitch. " +
      "This is a wide scene of a whole pitch — not a logo on a plain background. " +
      "The upper part of the frame is dark empty grass" },

  { stage: "flag", index: 15, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "extreme macro textile photography, individual embroidery threads visible, " +
      "soft raking light across the weave, deep navy fabric with rose pink stitching, " +
      "very shallow depth of field, tactile and luxurious",
    prompt:
      "the crest embroidered into dark knitted fabric, filling the lower right of the frame, " +
      "thread texture sharp in focus and falling out of focus toward the edges, " +
      "the upper left dissolving into soft dark blur" },

  // ── 두 번째 묶음. 소재를 깃발 밖으로 넓히고 화풍을 더 멀리 벌린다.
  { stage: "flag", index: 5, ref: "public/underducklogo.png", rules: FLAG_RULES,
    look: "high contrast black and white documentary film photograph, heavy 35mm grain, " +
      "deep blacks, one single colour accent — the pink of the crest — everything else monochrome",
    prompt:
      "the crest woven into a supporters scarf held up taut by unseen hands across the BOTTOM " +
      "of the frame, floodlight flare and rain streaks above, night terrace atmosphere, " +
      "the upper half almost pure black" },

  { stage: "flag", index: 6, ref: "public/underducklogo.png", rules: FLAG_RULES_STYLIZED,
    look: "loose watercolour and ink wash painting on textured cotton paper, visible brush strokes " +
      "and bleeding pigment, navy indigo washes with rose pink blooms, generous white paper space",
    prompt:
      "the crest painted on a football resting on dark grass in the LOWER LEFT corner, " +
      "the rest of the paper left almost bare with only faint washes, quiet and airy" },

  { stage: "flag", index: 7, ref: "public/underducklogo.png", rules: FLAG_RULES_STYLIZED,
    look: "16-bit pixel art, crisp square pixels, limited retro palette of navy, black, cream and " +
      "rose pink, dithered gradients, arcade game aesthetic",
    prompt:
      "a tiny pixel-art night stadium along the BOTTOM of the frame with the crest displayed on " +
      "a big scoreboard screen at the lower right, pixel floodlights, " +
      "a flat dark pixel sky filling the top two thirds" },

  { stage: "flag", index: 8, ref: "public/underducklogo.png", rules: FLAG_RULES_STYLIZED,
    look: "isometric low-poly 3D miniature diorama, clean flat-shaded geometry, soft studio lighting, " +
      "navy and rose pink palette, tilt-shift toy-like scale",
    prompt:
      "a miniature isometric football stadium sitting in the LOWER RIGHT of the frame with the crest " +
      "laid out on the centre circle, dark empty background filling the upper left" },

  // ── D-7 이상: 차분하고 멀다. 사람 없이 공간과 사물이 주인공.
  { stage: "far", index: 1, prompt:
    "an empty floodlit football pitch at dusk seen from high above, long shadows raking across the grass, " +
    "faint pink glow on the horizon, vast quiet space, no people" },
  { stage: "far", index: 2, prompt:
    "a single football resting on dewy grass in the lower third of the frame at blue hour, " +
    "shallow depth of field, distant floodlight bokeh, cool navy tones with one warm pink highlight" },
  { stage: "far", index: 3, prompt:
    "a pair of worn football boots hanging by their laces on a dark fence at dusk, lower left of frame, " +
    "empty pitch blurred far behind, quiet and still, faint pink sky" },

  // ── D-3~1: 가까워진다. 사람이 들어오고 핑크가 올라온다.
  { stage: "near", index: 1, prompt:
    "a black flag with pink trim rippling on a tall pole against night floodlights, flag in the lower left, " +
    "wind-caught folds catching pink rim light, dark sky filling the upper frame" },
  { stage: "near", index: 2, prompt:
    "one Korean footballer seen from behind sitting on a bench lacing a boot at night, lower right of frame, " +
    "black kit with pink collar and cuff trim, black hair, floodlight haze and pink rim light behind" },
  { stage: "near", index: 3, prompt:
    "a tunnel exit onto a floodlit night pitch seen from inside, dark walls framing the bright opening, " +
    "pink light spill, dramatic and expectant, no people" },

  // ── D-DAY: 가장 강렬. 핑크가 화면을 민다.
  { stage: "dday", index: 1, prompt:
    "low angle close-up of a football being struck by a boot on a floodlit night pitch, lower third of frame, " +
    "spray of water and grass in the air, motion blur, intense pink and white floodlight beams above" },
  { stage: "dday", index: 2, prompt:
    "two Korean footballers seen from directly behind walking out of a tunnel onto a floodlit pitch, " +
    "small in the lower third of the frame, backs fully to camera, black hair, " +
    "black kits with pink collar and cuff trim and large clean pink squad numbers, " +
    "simple one and two digit numerals only, pink floodlight blast and haze ahead of them" },
  { stage: "dday", index: 3, prompt:
    "a large black flag with pink trim streaming hard in the wind across the lower half of the frame, " +
    "blinding pink and white floodlights behind it, heavy volumetric haze, heroic and cinematic" },
];

async function generate(shot: Shot, key: string): Promise<Buffer> {
  const prompt = `${shot.prompt}. ${shot.look ?? LOOK}. ${shot.rules ?? RULES}`;
  const model = shot.ref ? EDIT_MODEL : MODEL;
  const body: Record<string, unknown> = shot.ref
    ? { prompt, image_urls: [await refDataUri(shot.ref)], num_images: 1, output_format: "jpeg", aspect_ratio: "1:1" }
    : {
        prompt,
        aspect_ratio: "1:1",
        num_images: 1,
        output_format: "jpeg",
        safety_tolerance: "5",
        // 같은 시드 = 같은 그림. 다시 돌려도 결과가 재현되고, 한 장만 마음에 안 들면
        // 그 시드만 바꿔 다시 뽑을 수 있다.
        seed: shot.stage.length * 1000 + shot.index,
      };

  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${shot.stage}-${shot.index}: fal ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const url = json?.images?.[0]?.url;
  if (!url) throw new Error(`${shot.stage}-${shot.index}: 응답에 이미지 URL이 없음`);
  const image = await fetch(url);
  if (!image.ok) throw new Error(`${shot.stage}-${shot.index}: 이미지 다운로드 실패`);
  return Buffer.from(await image.arrayBuffer());
}

/** 목표 용량에 들어올 때까지 품질을 낮춘다. 배경이라 화질보다 무게가 중요하다. */
async function toWebp(input: Buffer): Promise<{ data: Buffer; quality: number }> {
  let last = { data: input, quality: 0 };
  for (const quality of [78, 70, 62, 54, 46]) {
    const data = await sharp(input)
      .resize(SIZE, SIZE, { fit: "cover" })
      .webp({ quality })
      .toBuffer();
    last = { data, quality };
    if (data.byteLength <= MAX_BYTES) break;
  }
  return last;
}

const key = process.env.FAL_KEY;
if (!key) {
  console.error("FAL_KEY 가 없습니다. .env.local 에 넣고 다시 실행하세요.");
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

// `npm run gen:matchday -- dday 2` → dday 단계에서 앞 2장만.
// 전부 돌리기 전에 한두 장으로 방향을 눈으로 확인하려고 둔 통로다.
const only = process.argv[2];
const limit = Number(process.argv[3]) || Infinity;
let targets = only ? SHOTS.filter((s) => s.stage === only) : SHOTS;
if (targets.length === 0) {
  console.error(`"${only}" 단계가 없습니다. far | near | dday 중 하나여야 합니다.`);
  process.exit(1);
}
// `-- dday 4,5` 처럼 인덱스를 찍어 그 장만 다시 뽑을 수도 있다.
if (typeof process.argv[3] === "string" && process.argv[3].includes(",")) {
  const want = new Set(process.argv[3].split(",").map(Number));
  targets = targets.filter((s) => want.has(s.index));
} else {
  targets = targets.slice(0, limit);
}

for (const shot of targets) {
  const name = `${shot.stage}-${shot.index}.webp`;
  process.stdout.write(`${name} 생성 중… `);
  try {
    const { data, quality } = await toWebp(await generate(shot, key));
    await writeFile(join(OUT_DIR, name), data);
    const kb = Math.round(data.byteLength / 1024);
    console.log(`완료 (${kb}KB, q${quality})${data.byteLength > MAX_BYTES ? " ⚠️ 목표 초과" : ""}`);
  } catch (err) {
    console.log("실패");
    console.error(`  ${err instanceof Error ? err.message : err}`);
  }
}

console.log(
  "\n끝났습니다. 그림을 눈으로 확인한 뒤 app/lib/matchday-art.ts 의 COUNT 를 실제 장수로 올리세요.",
);
