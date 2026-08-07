# 언더덕 FC — 제록스 단독 선수 매치데이 시리즈 핸드오프

> 2026-08-07 확정. `test36`에서 시작한 어두운 단독 선수 포스터 시리즈를
> 다른 세션에서도 같은 결로 이어 만들기 위한 문서다.

## 목표

선수마다 단독 포스터를 한 장씩 만든다. 모든 포스터는 같은 시리즈로 읽히되 다음
요소는 매번 바꾼다.

- 선수 위치: 왼쪽 / 오른쪽 / 하단 모서리
- 얼굴 방향과 크롭: 정면 / 측면 / 기울어진 상반신
- 원본에 있는 손동작과 표정
- 핑크 낙서: 원, 반원, 짧은 선, 지그재그, 붓 자국
- 테이프: 위치, 각도, 개수

공통 결과는 **검정·딥 네이비의 거친 제록스 축구 팬진**이어야 한다. 피부와 유니폼은
흑백이고, 핑크 장식만 또렷하게 튄다. 인물 반대편과 중앙에는 실제 피드가 얹는
`NEXT MATCH / D-n` 문구 공간을 남긴다.

## 현재 기준 이미지

| 파일 | 역할 / 레퍼런스 | 상태 |
|---|---|---|
| `public/matchday/test36.png` | 시리즈 최초 기준. 큰 왼쪽 인물, 어두운 풀블리드, 자연스러운 어깨 | 최우선 미감 기준 |
| `public/matchday/test42.png` | `황동주3.png`, 손 프레임 동작, 오른쪽 인물 | 채택 |
| `public/matchday/test43.png` | `박상민2.png`, 전화 손동작, 큰 왼쪽 인물 | 채택 |
| `public/matchday/test44.png` | `김준수3.png`, 큰 왼쪽 인물과 오른쪽 여백 | 채택 구도 기준 |
| `public/matchday/test45.png` | `임재준.png`, 큰 오른쪽 인물과 왼쪽 여백 | 채택. 눈 방향 보정 완료 |

`test38`, `test39` 등 앞선 실험은 최종 기준으로 쓰지 않는다. 특히 `test39`의 초기
결과처럼 스타일 레퍼런스 속 인물을 복제하는 실패가 있었다.

2026-08-07 2차분 6장(`candidate-강창훈`, `강현준`, `강환국`, `공도하`, `금상덕`,
`김광민`). 생성·후처리 전부 `scripts/gen-xerox-portraits.mts` 에 들어 있다.

```bash
node --env-file=.env.local scripts/gen-xerox-portraits.mts            # 전원
node --env-file=.env.local scripts/gen-xerox-portraits.mts 강창훈     # 한 명
node scripts/gen-xerox-portraits.mts pink 강창훈                      # 채택 후 핑크
```

파일명을 `candidate-이름.png` 로 두면 `/matchday-preview` 가 자동으로 잡는다.
(디렉터리를 매 요청 다시 읽으므로 재빌드는 필요 없다. 단 라우트가 생기기 전부터
떠 있던 dev 서버는 이 페이지를 못 내주니 그럴 땐 `npm run dev` 를 다시 띄운다.)

## 생성 모델과 비용

- 모델: `fal-ai/nano-banana/edit`
- 키: `.env.local`의 `FAL_KEY`
- 입력: 선수 레퍼런스 **한 장만** `image_urls`에 데이터 URI로 전달
- 출력: PNG, 1:1, 한 장
- 2026-08-07 가격: 장당 약 `$0.039` (가격은 변경될 수 있음)
- 런타임 생성이 아니다. 미리 생성해 `public/matchday/`에 저장한다.

## 가장 중요한 규칙

### 1. 한 요청에는 선수 한 명만 넣는다

여러 선수 사진을 동시에 넣으면 첫 얼굴만 살아남고 나머지가 가상 인물로 변하거나
서로 섞였다. 선수 한 명당 요청 한 번이 원칙이다.

### 2. `test36`을 이미지 레퍼런스로 같이 넣지 않는다

`test36 + 선수 사진`을 함께 넣었을 때 모델이 `test36`의 얼굴을 새 선수 대신
복제했다. `test36`은 사람이 눈으로 참고하고, 모델에는 아래 화풍을 **문장으로만**
전달한다.

### 3. 얼굴은 중앙에 두지 않는다

디데이 문구는 카드 중앙에 뜬다. 얼굴 중심의 x 좌표는 대략 18~25% 또는 75~82%로
잡는다. 얼굴이 화면 중앙 40~60% 구간에 들어오면 실패다.

### 4. 인물은 크게 만든다

`test36`, `test42`, `test44`가 보기 좋은 이유는 얼굴 높이가 화면의 약 35~45%이고
몸이 프레임 밖까지 이어지기 때문이다. 작은 전신·증명사진 크기는 쓰지 않는다.

### 5. 어깨 누끼선을 절대 허용하지 않는다

다음 표현을 매 프롬프트에 반복한다.

> Shoulders, arms and torso continue beyond the canvas edges or dissolve gradually into
> crushed black toner. Absolutely no white outline, sticker border, halo, cyan fringe,
> cut-paper edge, hard shoulder cut line, rectangular photo boundary or visible
> background-removal seam.

어깨가 가위로 잘린 듯 끝나거나 흰색·청록색 선이 보이면 폐기한다. `test36`처럼 몸이
화면 밖으로 이어지거나 검은 토너에 자연스럽게 녹아야 한다.

### 6. 눈을 반드시 원본과 비교한다

`test45` 초기본은 양쪽 동공이 코 쪽으로 몰려 사시처럼 보였다. 생성 후 원본과 나란히
놓고 다음을 확인한다.

- 양쪽 동공이 같은 방향을 보는가
- 눈 크기와 높이가 비정상적으로 달라지지 않았는가
- 원본의 측면 시선이 정면 시선으로 바뀌지 않았는가

눈만 틀리면 전체를 다시 만들기보다 원본 얼굴을 기준으로 국소 편집한다.

### 7. 좌표를 말로 적어도 얼굴이 가운데로 오면 입력을 미리 짠다

정면 클로즈업 누끼(`강창훈1.png` 처럼 얼굴이 화면을 꽉 채운 사진)는 모델이 그
배치를 그대로 물려받는다. `face centre at x=21%`, `머리가 x=38%를 넘지 마라`,
`가운데 40~60%는 실패다` 를 전부 넣어도 다섯 번 연속 정중앙이 나왔다.

해결책은 프롬프트가 아니라 입력 이미지다. 레퍼런스를 원하는 배치로 미리 조립해
넘긴다 — 정사각 캔버스를 원본 배경색으로 채우고, 인물을 왼쪽(또는 오른쪽) 끝에
붙인 뒤 반대편을 비워서 준다. 스크립트의 `refLayout` 이 그 일을 한다. 한 번에
해결됐다.

반대로 `refTop` 으로 가슴을 잘라 넘기면 모델이 얼굴을 화면 가득 확대해 구도가
무너진다. 스폰서 글자를 지우려고 쓰는 건 좋지만 구도용으로는 쓰지 않는다.

### 8. 원본에 글자가 있으면 말로는 절대 안 지워진다

`강창훈.png` 가슴의 스폰서 워드마크는 "erase the sponsor lettering" 을 공통문과
개별문에 넣어도, 생성본을 다시 넣어 국소 수정을 시켜도 그대로 남았다. 방법은 둘
뿐이다 — 글자가 없는 다른 사진을 쓰거나, `refTop` 으로 글자를 입력에서 잘라낸다.
(생성 후 그 부분만 어둡게 눌러 지우는 건 하지 마라. 사각 얼룩이 남는다.)

## 기본 프롬프트

아래 공통문 뒤에 선수별 구도와 장식만 붙인다.

```text
Create a square single-player matchday poster using the reference as the ONLY person
and identity source. Exactly one Korean male player. Preserve his real face, hairstyle,
expression and distinctive pose recognizably. Never replace, beautify or invent his face.
No additional person, face, body or silhouette.

Dark underground black-and-white Xerox football fanzine aesthetic: high-contrast
photocopied portrait, crushed toner blacks, coarse speckled grain across skin and fabric,
distressed midnight-navy paper, scratches, dust and worn analog printing. Skin and kit
remain monochrome. Use restrained dusty-rose grease-pencil marks that will be boosted to
hot pink in post-processing.

Make the player large: face height occupies roughly 35 to 45 percent of the canvas.
Place the face clearly off-center on the far left or far right. Keep the center and the
opposite side as continuous dark textured paper for later D-DAY typography.

Shoulders, arms and torso continue beyond the canvas edges or dissolve gradually into
crushed black toner. Absolutely no white outline, sticker border, halo, cyan fringe,
cut-paper edge, hard shoulder cut line, rectangular photo boundary or visible
background-removal seam. The portrait must feel full-bleed, never pasted on.

Plain black kit with logos, crest and sponsor markings obscured into toner texture.
No white central sheet, words, letters, numbers, logos, badges, watermark or UI.
Square 1:1.
```

## 선수별로 바꿀 프롬프트 항목

공통문 뒤에 아래 네 가지를 구체적으로 작성한다.

1. **원본 특징**: 표정, 시선, 손동작, 헤어스타일
2. **좌표와 크기**: 예) `face center at x=22%, y=42%`, `face height about 40%`
3. **프레임 이탈 방향**: 왼쪽 어깨는 왼쪽 밖, 가슴은 아래 밖 등
4. **장식**: 인물 반대편이 아닌 외곽에만 핑크 낙서와 테이프

### 추천 구도 순환

- A: 큰 왼쪽 상반신, 얼굴 x=22%, 오른쪽 60% 여백
- B: 큰 오른쪽 상반신, 얼굴 x=78%, 왼쪽 60% 여백
- C: 왼쪽 아래에서 대각선으로 기울어진 상반신, 오른쪽 위 여백
- D: 오른쪽 아래에서 몸을 안쪽으로 기울인 상반신, 왼쪽 위 여백
- E: 원본에 강한 손동작이 있으면 손과 얼굴을 같은 모서리에 크게 배치

정중앙 정면 증명사진 구도는 금지한다.

## 레퍼런스 선택

선수마다 `public/players/`에서 가장 특징적인 누끼 사진 한 장을 고른다.

- 표정·손동작이 있는 `*2.png`, `*3.png`가 있으면 우선 검토
- 얼굴이 작거나 흐린 사진보다 얼굴이 큰 사진 우선
- 이미 채택한 예: `황동주3.png`, `박상민2.png`, `김준수3.png`, `임재준.png`
- 생성 전 반드시 원본을 직접 열어 눈, 시선, 어깨 범위를 확인한다.

## 핑크 후처리

생성 모델에 강한 핫핑크를 요구하면 얼굴·피부까지 물들거나 배경 전체가 핑크가 되기
쉽다. 생성은 바랜 로즈 핑크로 하고, 채택한 이미지에만 픽셀 후처리를 한다.

2026-08-07에 다음 파일의 핑크 후처리를 완료했다.

```text
test36.png test42.png test43.png test44.png test45.png
```

후처리 원칙(`gen-xerox-portraits.mts` 의 `pink` 모드):

- HSV 기준 핑크/마젠타 계열만 선택
- 목표 색조 약 342도
- 채도 최소 약 0.62, 최대 약 0.90
- 피부와 흑백 토너는 건드리지 않는다
- AI 재생성이 아니므로 얼굴·구도 변형과 API 비용이 없다

**밝기 문턱을 빼면 머리카락에 핑크 점이 박힌다.** 따뜻한 세피아 인쇄에서 머리카락·
눈썹은 채도가 높으면서 색조가 빨강 쪽(0~10도)에 걸린다. 그래서 조건은 두 갈래다.

- 마젠타(285~355도): 명도 0.3 이상
- 빨강(355도 이상 또는 8도 미만): 채도 0.6 **그리고** 명도 0.6 이상

모델이 마젠타 대신 어두운 크림슨을 칠하는 장이 있어 빨강 쪽을 조금 받되 문턱을
높게 뒀다. 색조만 맞추면 그런 장이 여전히 따로 놀아서, 명도 0.4 이상인 자국만
0.85까지 끌어올려 시리즈 톤을 맞춘다.

점이 이미 박힌 이미지를 사후에 구제하려 하지 마라. 마스크 침식·팽창으로 지우면
디더링으로 그려진 자국까지 같이 갉아먹는다(김광민에서 겪었다). 규칙을 고치고
그 장만 다시 뽑는 편이 빠르고 결과도 낫다.

새 이미지를 채택하면 기존 다섯 장과 나란히 썸네일을 만들어 핑크 세기를 맞춘다.

## 생성 후 검수 체크리스트

- [ ] 실제 선수와 얼굴이 같은가
- [ ] 양쪽 눈이 같은 방향을 보는가
- [ ] 정확히 한 명만 있는가
- [ ] 얼굴이 중앙 디데이 영역을 침범하지 않는가
- [ ] 얼굴 높이가 화면의 약 35~45%인가
- [ ] 어깨·몸통이 프레임 밖이나 토너 속으로 자연스럽게 이어지는가
- [ ] 흰 누끼선, 청록 테두리, 사각 사진 경계가 없는가
- [ ] 반대편에 충분한 어두운 여백이 있는가
- [ ] 글자·번호·가짜 로고가 생성되지 않았는가
- [ ] 핑크가 장식에만 있고 피부는 흑백인가

하나라도 크게 틀리면 목록에 등록하지 않는다.

## 실제 피드 등록 시

최종 채택본은 PNG 테스트 파일 그대로 등록하지 말고 기존 매치데이 파이프라인처럼
1080×1080 WebP로 변환한다. `webp` 모드가 넘긴 순서대로 `xerox-N.webp` 를 만들고
120KB에 들어올 때까지 품질을 낮춘다.

```bash
node scripts/gen-xerox-portraits.mts webp test36 test-42w candidate-강창훈 …
```

이 시리즈는 원본부터 어두우므로 `app/lib/matchday-art.ts`의 `ART` 배열에는
`soft: true`로 넣고, 누가 누구인지 주석을 단다.

```ts
{ src: "/matchday/xerox-1.webp", soft: true }, // 시리즈 기준(test36)
```

2026-08-07에 10장(`xerox-1`~`xerox-10`)을 등록해 ART가 39장 → 49장이 됐다.
`xerox-` 는 `RESULT_ART`(flag 계열)·`CASUAL_ART`(team·fun 계열) 필터에 걸리지
않으므로 예정 경기 카드에만 뜬다.

**등록하면 그날 뜨는 그림이 전부 바뀐다.** `ART.length` 가 나눗셈에 들어가기
때문이다. 특정 경기에 제록스를 띄우고 싶으면 `DDAY_SALT` 를 올려 가며 원하는
조합이 나오는 값을 고른다(주석에 적힌 용도 그대로다).

실제 피드는 사진을 블러 처리하지 않는다. `soft`는 중앙을 거의 건드리지 않고 위아래
글자 뒤에만 얇은 어두운 그라디언트를 적용한다.

## 다음 작업 시작 문장

새 세션에서는 다음처럼 요청하면 된다.

> `HANDOFF-matchday-xerox-portraits.md`를 전부 읽고, 아직 만들지 않은 선수부터
> 한 명당 레퍼런스 한 장으로 제록스 단독 포스터를 생성해줘. 먼저 3장만 만들고
> 얼굴·눈·중앙 여백·어깨 누끼선을 검수한 뒤 계속 진행해.

