# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # node --test tests/*.test.mjs
npm run check      # lint --quiet + typecheck + test  ← 커밋 전 이걸 돌리세요
```

보조 스크립트(수동 실행, `.env.local` 필요):

```bash
npm run verify:positions   # 포지션 배치 규칙 검증 (npm test 에는 포함되지 않음)
npm run gen:matchday       # 매치데이 아트 생성 (FAL_KEY)
npm run backup:photos      # Cloudinary 사진 백업
```

테스트는 `tests/*.test.mjs` 에 있고 `app/lib` 의 `chemistry` · `home-state` · `lineup` ·
`matchday-art` · `seasons` · `wrapped` 를 덮습니다. `titles.ts` · `positions.ts` 는 아직 테스트가 없습니다.
(`titles.ts` 는 확장자 없는 상대 import 가 있어 node ESM 테스트에서 바로 import 되지 않습니다 —
그래서 `scaleSeasonTiers` 가 `seasons.ts` 에 있습니다.)

## Environment Variables

Required in `.env.local`:

```
UNDERDUCK_API_BASE=             # FastAPI 백엔드 주소 — 실제 DB
UNDERDUCK_API_SECRET=           # X-Underduck-Secret 헤더

AUTH_SECRET=                    # Auth.js v5 (process.env 로 직접 읽지 않고 SDK 가 집어감)
AUTH_KAKAO_ID=
AUTH_KAKAO_SECRET=
ADMIN_KAKAO_IDS=                # 쉼표 구분 — 운영진 판정
ADMIN_PIN=                      # 운영진 PIN (/api/admin/verify)

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

CRON_SECRET=                    # /api/cron/* 의 Bearer 토큰
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # 웹 푸시
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
OPENWEATHER_API_KEY=            # 경기 날씨
FAL_KEY=                        # 매치데이 아트 생성 스크립트 전용
```

`GOOGLE_SHEET_ID` · `GOOGLE_SHEETS_API_KEY` 는 이제 `app/lib/google-sheets.ts` 에서만
읽히는데 그 파일을 import 하는 곳이 하나도 없습니다(아래 참고). 없어도 앱은 돕니다.

## Architecture

> **⚠️ 현재 DB는 Google Sheets가 아닙니다.** 실제 저장소는 별도 **FastAPI + Postgres 백엔드**이고,
> 서버사이드 전용 클라이언트는 `app/lib/underduck.ts`(`udGet`, `X-Underduck-Secret` 헤더)입니다.
> 렌더 읽기는 `app/lib/backend.ts` / `app/lib/matches-backend.ts`가 `udGet`으로 백엔드를 호출한 뒤,
> 기존 파서를 그대로 쓰기 위해 응답을 아래 시트 레이아웃(`string[][]`)으로 환원해 돌려줍니다.
> 즉 **아래 표는 이제 "저장 위치"가 아니라 "행/열 레이아웃 계약"으로만 유효합니다.**
>
> 마이그레이션 잔재 두 개의 **현재 상태가 다릅니다**:
> - `app/lib/sheets-write.ts` — **살아 있고 많이 쓰입니다.** 이름만 시트 시절 것이고 내부는
>   전부 `udPost`/`udPut`/`udDelete` 위임입니다. 시그니처가 그대로라 호출부를 안 고쳤을 뿐입니다.
> - `app/lib/google-sheets.ts` — **import 하는 곳이 0건인 죽은 파일**입니다.
>
> 새 코드는 `app/lib/underduck.ts` 의 `udGet`/`udPost` 를 직접 쓰세요.

**(레거시) Google Sheets 레이아웃** — 위 주의사항 참고. 데이터 형태 참조용:

| Sheet      | Range   | Purpose                                               |
| ---------- | ------- | ----------------------------------------------------- |
| `matches`  | A1:M50  | Match results, scores, MOM, attendees, photo URLs     |
| `roster`   | A1:J50  | Player registration (등번호, 이름, 포지션)            |
| `stats`    | A1:G50  | Season stats (appearances, goals, assists, MOM count) |
| `notice`   | A1:D20  | Only row 2 is shown on the dashboard                  |
| `lineup`   | A1:S100 | Formation + 11 players + 5 subs per match/quarter     |
| `feedback` | A1:D500 | Match feedback comments                               |
| `mom_vote` | A1:E500 | Man-of-the-match votes                                |
| `attendance_vote` | A1:E500 | Attendance votes (matchId, kakaoId, nickname, response, timestamp) |

**시즌:**

시즌은 DB 컬럼이 아니라 **경기 날짜에서 파생**됩니다. 표는 두 군데에 **쌍둥이로** 있습니다:

- `app/lib/seasons.ts` — `SEASONS` 배열 (프론트 집계 · 화면)
- `underduck-backend/seasons.py` — 같은 표 (스탯 엔드포인트)

**새 시즌을 열 때는 두 파일에 같은 줄을 넣습니다.** 어긋나면 `/api/underduck/stats?season=`
가 400 을 던지도록 해 뒀습니다(조용히 통산으로 떨어지면 시즌 화면에 통산 숫자가 뜹니다).

- 첫 시즌의 `start` 는 `null` — "경계 없음" 이라 아무리 오래된 경기도 받아냅니다.
- **행을 지우지 말고 id 로 거릅니다.** `rawMatches` 의 배열 index 가 곧 `matchId` 이고
  lineup · mom_vote · attendance 가 그 id 를 참조합니다. `seasonMatchIds()` /
  `rowsOfMatchIds()` / `maskMatchRowsToSeason()` 이 그래서 있습니다.
- 기본 시즌은 **오늘이 속한 시즌**(`currentSeasonId()`)입니다. 개막 직후 경기가 0건이어도
  현재 시즌을 그대로 보여 줍니다 — "경기 있는 최신 시즌" 으로 넘기면 시즌이 바뀐 걸
  아무도 눈치채지 못합니다.
- 시즌마다 `accent`(대표색)가 다릅니다. **팀 브랜드 핑크와는 다른 축**입니다 —
  `#FF8FA3`/`#FFB6C1` 은 CSS 토큰 없이 415군데 하드코딩돼 있어 시즌마다 못 바꿉니다.
  시즌색은 `.season-scope` + `var(--season)` 으로 시즌 기록 화면에만 씁니다.

**칭호 — 통산과 시즌 두 벌:**

- **통산**: `TITLES`. 지금까지와 동일, 계속 쌓입니다. 뱃지 = 원형 + 광택.
- **시즌**: `SEASON_TITLES`. 같은 칭호를 그 시즌 기록만으로 평가하되 컷이 낮습니다
  (`SEASON_OVERRIDES` 수동값, 없으면 `scaleSeasonTiers` 로 통산 × 0.25). 뱃지 = 육각 + 브러시드
  (`EarnedTitle.scope === "season"`). 기준은 한 시즌 ≈ 24경기.
- **리더**(득점왕 등)는 임계값이 아니라 "지금 1위" 라서 **시즌 기준 하나만** 있습니다.
- `getTeamTitleData(seasonId)` 가 `allTitles`(표시용) · `seasonTitles` · `careerTitles` 를
  한 번에 냅니다. 대표 칭호(featured)는 **통산에서만** 고릅니다.
  홈·게시판·경기 상세 뱃지는 `buildPlayerBadges` 로 만듭니다 — 지난 시즌 칭호를 대표로 걸어 둔 것도 붙습니다.
- 통산 규칙 숫자를 바꾸면 전원의 칭호가 바뀝니다. 시즌 컷만 손볼 땐 `SEASON_OVERRIDES` 만
  건드리세요.

**시즌 래핑 (`/wrapped`) — 공개 전입니다:**

스포티파이 래핑식 개인 돌아보기 + 선수카드. 미리 만들어 두고 **시즌이 끝나면 엽니다.**

- **게이트는 404(`notFound`)** 입니다. 403 을 주면 "여기 뭔가 있다"가 드러나 공개 전에
  소문이 먼저 돕니다. 공개일은 `SeasonDef.wrappedFrom` 한 줄 — 그 날이 지나면 회원 전원.
  그 전까지는 `currentIsAdmin()` 인 사람만.
- 시즌을 안 찍고 들어오면 **막 공개된 시즌**(`latestPublicWrappedSeason`)입니다. 현재 시즌이 아닙니다 —
  공개일이 곧 다음 시즌 개막일이라 현재 시즌을 기본으로 두면 404 가 뜹니다. 프로필 진입 버튼도 같은 기준.
- 대상은 로그인한 **본인**. 운영진은 `?player=이름` 으로 남의 것을 미리 볼 수 있고,
  그때 화면에 "공개 전 · 운영진 미리보기" 가 찍힙니다.
- `app/lib/wrapped.ts` 는 **의존성 없는 순수 계산**입니다(테스트 때문에 그렇게 뒀습니다 —
  `seasons.ts` 를 값으로 import 하면 node ESM 테스트에서 못 불러옵니다. 시즌 라벨을
  인자로 받는 이유).
- 새로 세는 건 **팀 내 순위**뿐입니다. 나머지는 `buildPlayerStatsReport` ·
  `buildPlayerChemistry` · 시즌 칭호 · 시즌 stats 를 불러 모읍니다.
- 선수카드에 **종합 레이팅(OVR)은 없습니다.** 동호회에서 사람마다 숫자 등급을 매기면
  재미보다 서운함이 먼저 옵니다 — 실제 기록만 싣습니다.
- 내용이 없는 장은 만들지 않습니다. 빈 칸을 "아직 없어요" 로 채우면 여덟 장 중 다섯 장이
  사과문이 됩니다.
- **시즌 베스트 11** (`pickBestEleven`) 은 세 가지를 지킵니다. 하나라도 어기면 말이 안 되는
  XI 가 나옵니다 — 셋 다 실제로 겪었습니다.
  1. 틀을 **그 시즌 최다 사용 포메이션**에서 가져옵니다(4-3-3 고정으로 뒀더니, 윙어가
     사실상 없는 팀(LW 7Q·RW 5Q)에 FW 3칸을 강제해 수비수가 최전방에 섰습니다.
     이 팀은 4-2-3-1 을 72쿼터 중 59회 씁니다).
  2. 4개 그룹이 아니라 **세부 역할**로 고릅니다(그룹으로 세면 "FW 8쿼터"가 주전 공격수).
  3. 역할 27종은 72쿼터에 비해 너무 잘아서 **9개 버킷으로 병합**합니다(`roleBucket`).
     좌우는 합치지 않습니다 — 왼쪽과 오른쪽은 다른 자리입니다.
  한 선수는 한 자리만 차지합니다. 슬롯 순서대로 채우는 탐욕법인데, 실측 데이터에서
  최대 가중 매칭과 결과가 같았습니다(307Q).
- 피치는 `FormationField` 가 아니라 전용 `BestElevenPitch` 입니다 — 래핑에 탭 스탯 패널·
  전술·주장 완장은 방해입니다.
- 포지션 집계는 **라인업이 저장된 경기에서만** 나옵니다. 25-26 은 30경기 중 19경기뿐이라
  화면에 커버리지를 밝힙니다(`lineupCoverage`). 안 밝히면 "왜 쟤가 저기 있지" 가 됩니다.

**로그인 · 권한:**

- `auth.ts` — Auth.js v5 + 카카오. 세션은 JWT(1년, 하루 1회 갱신).
- `app/lib/admin.ts` — 라우트 가드. `requireAdmin()` / `requireUser()` 는 거부 시
  `NextResponse` 를 돌려주므로 `const denied = await requireAdmin(); if (denied) return denied;`
  형태로 씁니다. 소유권까지 볼 땐 `currentKakaoId()` / `currentIsAdmin()`.
- 운영진 판정은 `ADMIN_KAKAO_IDS`. **쓰기 라우트에는 예외 없이 가드를 답니다.**

**Data flow:**

1. `app/page.tsx` 는 `app/components/home/NewHome.tsx` 를 렌더하는 6줄짜리 껍데기입니다.
2. 서버 컴포넌트가 `app/lib/backend.ts` · `matches-backend.ts` 로 백엔드를 읽고, 응답을
   아래 시트 레이아웃(`string[][]`)으로 환원해 기존 파서에 넘깁니다.
3. 쓰기는 `app/api/*` 라우트 → `sheets-write.ts` → 백엔드.
4. **쓰기 직후 클라이언트에서 `router.refresh()` 를 부르세요.** `next.config.ts` 의
   `staleTimes.dynamic = 30` 때문에 안 부르면 탭을 갔다 왔을 때 방금 쓴 게 사라져 보입니다.
   (API 라우트는 Server Action 이 아니라서 서버의 `revalidatePath` 만으로는 부족합니다.)

**matches sheet column mapping** (used throughout the codebase):

```
A=date, B=time, C=location, D=opponent, E=ourScore, F=theirScore,
G=result, H=type, I=goals, J=assists, K=MOM, L=attendees, M=photos(CSV)
```

Row index in the sheet = `matchId + 2` (header offset). This arithmetic appears in all write functions.

**lineup sheet** stores one row per `(matchId, quarter)` pair with 19 fixed columns: `matchId, quarter, formation, p1–p11, sub1–sub5`.

**Photo storage:** Cloudinary. `app/api/photos/sign/route.ts` generates a signed upload URL; after upload the Cloudinary URL is written to `matches!M{row}` as a comma-separated list (max 5 photos per match).

## UI Structure

The app is **mobile-first** (max-w-md container). Dark mode is supported via `next-themes`.

라우트는 18개입니다: `/` `/board` `/board/[id]` `/board/lineup` `/login` `/lounge`
`/lounge/[id]` `/matches/[id]` `/matches/[id]/edit` `/matchday-gallery` `/matchday-preview`
`/players/[name]` `/record` `/roster` `/stats` `/titles` `/vote` `/wrapped`

- `app/components/home/NewHome.tsx` — 홈. 인스타 피드형이고 `/matchday-preview` 와 한 파일을 공유합니다.
- `app/components/FormationField.tsx` — 포지션별 포메이션 렌더링, 7종 지원
- `app/matches/[id]/edit/LineupEditor.tsx` — 라인업 편집기. **드래그는 자체 구현입니다**
  (`react-dnd` 가 package.json 에 있지만 import 하는 곳은 없습니다).
- `app/components/ui/` — Shadcn 생성물 6개. 수정하지 마세요.

**선수 사진:** `app/lib/player-faceons.ts` 가 이름 26개를 하드코딩한 Set 을 들고 있고
`/players/<이름>.webp` 만 내보냅니다. `public/players/*.png` 는 화면에 안 쓰이고
`scripts/gen-*.mts` 의 원본 참고 사진입니다. (`public/players/README.md` 의 "등번호·jpg 도
된다"는 설명은 지금 코드와 맞지 않습니다.)

Player ranking score = `goals + assists + mom + apps` (descending), ties broken by Korean name alphabetical order.

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
