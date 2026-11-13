# HANDOFF — 동계 유니폼 선수 사진

## 배경

- 2026-11-14 동계 유니폼 지급. 지금 앱의 선수 사진(`public/players/<이름>.webp`)은 전부 **하계**.
- 동계 사진은 **AI 생성이 아니라 실물 촬영 → 누끼 → 앱 규격으로 직접 가공**해서 넣는다.
- 하계·동계 **둘 다 남긴다.** 하계 사진은 지우지 않는다.
- 전환 기간은 정하지 않는다. 동계 사진이 있으면 동계, 없으면 하계. 나중에 하계로 돌아갈 땐 사용자가 말해준다.

## 결정한 것

1. **사진 목록을 "선수 → 여러 장" 구조로 바꾼다.** 지금은 `app/lib/player-faceons.ts` 가
   이름 26개짜리 `Set` 하나 + `/players/<이름>.webp` 고정.
2. **기본은 동계, 동계 사진이 없는 선수는 하계로 fallback.** 사진이 하나도 안 들어와도 화면은 지금과 동일해야 한다
   (그래서 사진보다 코드를 먼저 배포해도 됨).
3. **날짜별 전환(경기 날짜 따라 하계/동계)은 안 한다.** 지난 경기 포스터도 지금 사진으로 보여도 괜찮다고 판단.
4. **선수가 직접 사진 고르기는 나중에.** 지금은 1인당 하계+동계 2장뿐이라 급하지 않음.
   사진이 3~4장(동계2 등)으로 늘면 그때 붙인다 — 아래 "나중에" 참고.

## 파일 규격 (누끼 가공할 때)

기존 하계 webp 기준:

- **600×800 (3:4) webp, 투명 배경(alpha)**
- **머리 위치·크기를 하계 사진과 비슷하게.** 26-27 라인업 포스터(`StartingElevenCard2627.tsx`)는
  머리가 액자 위로 튀어나오는 구조라 사람마다 얼굴 크기·높이가 다르면 들쭉날쭉해 보인다.
- 파일명은 하계와 동일한 `이름.webp` (NFC 정규화된 한글 이름)
- 위치: `public/players/winter/<이름>.webp`
- 용량 참고: 하계 34장 = 1.7MB (장당 ~50KB)

## 작업 순서

1. `app/lib/player-faceons.ts`
   - 이름 `Set` → 선수별 보유 사진 목록(예: `{ "강창훈": ["summer", "winter"], ... }`)
   - `playerFaceOnSrc(name)` 시그니처는 **그대로** 유지 → 동계 있으면 `/players/winter/<이름>.webp`,
     없으면 `/players/<이름>.webp`, 둘 다 없으면 `null`
   - 시그니처를 유지하면 호출부 12개 파일을 안 고쳐도 된다:
     `FormationField` `LineupViewer` `PlayerAvatar` `PlayerFace` `StartingElevenCard`
     `StartingElevenCard2627` `wrapped/FramedPortrait` `wrapped/PlayerSeasonCard`
     `lib/draw-formation` `roster/RosterClient` `stats/SeasonLeaders`
   - 검토: 25-26 래핑 카드(`wrapped/*`)는 하계로 고정할지? — 지난 시즌 돌아보기라 하계가 자연스러움. 사용자에게 확인.
2. **검증**: 하계 사진 하나를 임시로 `public/players/winter/` 에 복사 → 그 선수만 바뀌는지
   홈·로스터·프로필·경기 상세·라인업 포스터(25-26판/26-27판)·저장 이미지(`draw-formation`)에서 확인 → 임시 파일 삭제.
   `npm run check` 통과.
3. 배포 (사진 없이 먼저 나가도 화면 변화 없음).
4. 촬영 후: 누끼 가공한 파일을 `public/players/winter/` 에 넣고 목록에 추가 → 배포.
   못 온 인원은 하계로 계속 보임.

## 나중에 — 선수가 직접 사진 고르기 (1인 3~4장)

- 리소스 부담은 없음: 26명 × 4장 ≈ 5MB 정적 파일, 화면엔 고른 한 장만 로드.
- 필요한 것:
  - 백엔드(FastAPI/Postgres)에 선수별 선택값 컬럼 + API (`sheets-write.ts` 말고 `underduck.ts` 의 `udPost` 직접)
  - 프로필에 본인 사진 고르는 UI, 쓰기 라우트는 `requireUser()` + 본인 확인(`currentKakaoId()`)
  - `playerFaceOnSrc` 가 선택값을 알아야 함 → 서버에서 "선수 → 선택 사진" 맵을 한 번 만들어 내려주는 방식
  - 쓰기 후 `router.refresh()`
- 선택은 모든 화면(지난 경기 포함)에 그대로 적용하는 걸로 합의. 경기별 스냅샷은 안 함.
