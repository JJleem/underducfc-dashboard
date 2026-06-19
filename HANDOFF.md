# 🦆 언더덕 FC — 작업 핸드오프 (카카오 로그인 → 게이팅 → 투표 → 칭호/페이스온)

> 새 세션/다른 PC에서 이 작업을 이어가기 위한 인수인계 문서.
> 현재 브랜치: **`feat/kakao-login`** (★ master에 머지 X = 실서버 배포 안 함)
> 최신 작업(2026-06-19): 라이트/다크 모드 정상화 + Google Sheets→underduck 백엔드 마이그레이션 **착수**(matches 도메인 래퍼까지). 아래 "라이트/다크" · "마이그레이션" 섹션 참고.

## 프로젝트 개요

- **Next.js 16** (App Router, Turbopack), **Vercel** 배포, 모바일 PWA(`max-w-md`)
- **DB = 구글 시트**
  - 읽기: `app/lib/google-sheets.ts` (API 키)
  - 쓰기: `app/lib/sheets-write.ts` (서비스 계정 JWT, RS256 수동 서명)
- 푸시 알림: `web-push` 기존 인프라 있음 (`app/api/push/*`, `push_subscriptions` 시트)
- 기존 관리자: `ADMIN_PIN` 방식 (단, 대부분 라우트는 서버 검증 없음 — 아래 "보안" 참고)

## ✅ 완료: 1단계 카카오 로그인

- `next-auth`(Auth.js v5) + Kakao Provider, **JWT 1년 세션**(`updateAge`로 활동 시 자동 연장)
- 카카오는 로그인 순간 신원 확인용으로만 사용, 이후 우리 JWT 세션으로 유지
- 추가/수정 파일:
  - `auth.ts` — NextAuth 설정, 로그인 시 `users` 시트 upsert
  - `app/api/auth/[...nextauth]/route.ts` — 핸들러
  - `app/lib/sheets-write.ts` — `upsertUser()` 추가
  - `app/page.tsx` — 서버 `auth()` → `currentUser` prop 전달
  - `app/components/DashboardClient.tsx` — 헤더에 카카오 로그인/프로필·로그아웃 버튼
- **`users` 시트 스키마**: `A=kakaoId  B=nickname  C=profileImage  D=joinedAt  E=lastLogin`

## ✅ 완료: 4단계 관리자/회원 게이팅 (2026-06-18)

- **`app/lib/admin.ts`** 신규: `isAdmin(kakaoId)`, `currentKakaoId()`, `requireAdmin()`(401/403), `requireUser()`(401)
- **서버 가드** — 모든 쓰기 라우트에 `const denied = await requireAdmin()/requireUser(); if (denied) return denied;`
  - **관리자 전용**: `matches`(POST), `matches/[id]`(PUT), `notice`(PUT), `roster`(POST), `lineup`(POST), `photos`(POST/DELETE), `photos/sign`(GET), `mom-vote/finalize`(POST)
  - **로그인 회원**: `mom-vote`(POST/DELETE), `feedback`(POST/DELETE)
  - GET(읽기)·`/`는 공개. 비로그인 호출 시 401 — 스모크 테스트로 확인 완료.
- **클라이언트 게이팅**: `page.tsx`·`roster/page.tsx`가 서버에서 `isAdmin` 계산 → prop 전달
  - 관리자 UI(`isAdmin`일 때만): 공지 수정, 경기 등록, 경기 결과 수정, 사진 추가/삭제, 라인업 편집 링크, 선수 추가
  - `/matches/[id]/edit`는 서버에서 비관리자 `redirect("/")`
  - MOM 자동 확정 effect도 `isAdmin`일 때만 실행
- **회원 UX (3단계 분리)**:
  - 비로그인 → 투표/피드백 폼 대신 **"로그인하고 투표하기/댓글 쓰기"** 카카오 CTA
  - 로그인 → 투표자/작성자 이름 **`currentUser.name` 자동 채움** (투표 모달의 "나는" 선택 단계 제거)
  - 댓글 삭제는 **작성자 본인 또는 관리자**만 노출
- **⚠️ media/media/sign은 의도적으로 미변경**: 기존 `ADMIN_PIN`(x-admin-pin) 방식으로 잘 작동 중이고 이미 보호됨(보안 구멍 아님). `/media` 페이지(`MediaClient.tsx`)가 PIN UI를 씀. 카카오 관리자로 통합하려면 미디어 페이지 UI까지 같이 고쳐야 함 → 별도 작업.
- **⚠️ 투표자 신원 = 카카오 닉네임**: 닉네임이 로스터 실명과 다르면 본인 후보 자동제외가 어긋날 수 있음. 닉네임=실명 권장, 또는 추후 users 시트에 실명 매핑.
- `ADMIN_KAKAO_IDS=4950539589`(임재준) — `.env.local`만 설정. **배포 시 Vercel에도 추가 필요.**

## 🔑 환경 세팅 (체크리스트)

`.env.local`(깃 제외) + **Vercel 환경변수** 양쪽에 동일하게:

| 변수 | 비고 |
|---|---|
| `AUTH_SECRET` | 랜덤 시크릿 |
| `AUTH_KAKAO_ID` | 카카오 REST API 키 (`cb05...`) |
| `AUTH_KAKAO_SECRET` | 카카오 [REST API 키 수정] 페이지의 클라이언트 시크릿 |
| `GOOGLE_*`, `CLOUDINARY_*`, `ADMIN_PIN` | 기존값 — Vercel에서 복사 |

- 카카오 콘솔: 클라이언트 시크릿 **"사용함"**, 리다이렉트 URI 등록
  - 프로덕션: `https://<도메인>/api/auth/callback/kakao`
  - 로컬테스트: `http://localhost:3000/api/auth/callback/kakao` ← localhost 테스트하려면 필수 추가

## ⚠️ 알려진 이슈 / 주의

- **lightningcss 네이티브 바이너리**: 프로젝트가 윈도우 디스크(`C:\`)에 있을 때 **WSL(리눅스)에서 `npm install` 하면 깨짐** (`Cannot find module '...win32-x64-msvc.node'`). → npm 명령은 **반드시 실행할 OS(윈도우면 윈도우 터미널)** 에서. 깨졌으면 `node_modules` + `package-lock.json` 지우고 그 OS에서 재설치.
- **`.env.local`은 깃 제외** → 새 PC에서 재생성 필요.
- 로컬 카카오 로그인은 위 localhost 리다이렉트 URI 등록돼야 동작.

## 🧭 확정된 설계 결정

- **관리자 = 카카오ID 화이트리스트** env `ADMIN_KAKAO_IDS`(콤마 구분). **일단 본인 혼자.**
  - 본인 `kakaoId`는 로그인 1회 후 `users` 시트 A열에서 확인.
- **보안 현황(중요)**: 현재 쓰기 라우트 대부분이 **서버 보호 없음** = API 직접 호출 시 누구나 쓰기 가능. `media`/`media/sign`만 `x-admin-pin` 검증. → 관리자 게이팅은 단순 UX가 아니라 실제 보안 강화.
- **투표 기능(2단계) 설계**:
  - 매주 **토요일** 경기 (시간·장소는 매번 다름)
  - **토요일 저녁 Vercel Cron**으로 다음 주 토요일 투표 자동 생성 → 일주일 투표 기간
  - 생성 시 전체에게 **푸시 알림**(기존 web-push 재사용)
  - 매치는 `appendMatch()`로 `result="예정"` 자동 생성 (예정/종료 구분 = result값으로 이미 가능)
  - 시간·장소는 **관리자가 추후 기입** (`updateMatchResult` 활용)
  - 마감 시 참석자 → `matches!L`(attendees) 기록. `mom-vote/finalize` 패턴 재사용
  - 신원 = 카카오 로그인(kakaoId), 출석 투표는 `(matchId, kakaoId)` upsert(append라 동시성 안전)

## ✅ 완료: 2단계 출석 투표 기능 (2026-06-18)

- **`attendance_vote` 시트 스키마**: `A=matchId  B=kakaoId  C=nickname  D=response(참석/불참/미정)  E=timestamp`
  - ⚠️ **구글 시트에 `attendance_vote` 탭을 수동으로 생성해야 함** (헤더: matchId, kakaoId, nickname, response, timestamp)
- **`matches` 시트 O열**: `attendanceStatus` (`진행중`/`마감`)
  - 기존 행의 빈값은 `진행중`으로 간주
  - 관리자 마감 시 참석자를 L열에 확정하고 O열을 `마감`으로 저장
- **`app/lib/sheets-write.ts`**: `upsertAttendanceVote()` — (matchId, kakaoId) 기준 upsert, `finalizeAttendance()` — 참석자 → matches!L 기록
- **`app/lib/google-sheets.ts`**: SheetRange에 `attendance_vote!A1:E500` 추가
- **API 라우트**:
  - `app/api/attendance/route.ts` — GET(모든 투표 조회), POST(투표 등록) — `requireUser`로 보호. 세션에서 kakaoId/nickname 자동 추출
  - `app/api/attendance/finalize/route.ts` — POST(투표 마감 → matches!L 기록) — `requireAdmin`
- **서버 데이터**: `page.tsx`에서 `attendance_vote` 시트 fetch → `AttendanceVoteData[]`로 변환 → DashboardClient prop
- **UI (DashboardClient.tsx)**:
  - D-Day 배너 아래에 출석 투표 카드 표시 (예정 경기 대상)
  - 로그인 사용자: 참석/미정/불참 3버튼 (낙관적 업데이트)
  - 비로그인: "로그인하고 투표하기" 카카오 CTA
  - 투표 현황: 참석/미정/불참별 닉네임 뱃지 목록
  - 관리자: "투표 마감" 버튼 (confirm 후 finalize API 호출)
- **Vercel Cron**: `app/api/cron/create-match/route.ts`
  - `vercel.json` → `0 12 * * 6` (매주 토요일 21:00 KST)
  - `CRON_SECRET` 환경변수로 보호 (Authorization: Bearer)
  - 다음 주 토요일 날짜 계산 → `appendMatch(result="예정")` → 푸시 알림
  - ⚠️ **배포 시 Vercel 환경변수에 `CRON_SECRET` 추가 필요**

## ✅ 완료: 칭호 / 뱃지 / 페이스온 시스템 (2026-06-19) — 커밋 `6a7cf33`~`9ea9a77`

선수별 칭호(자동 계산)를 부여하고, 라인업·순위·개인 페이지에 뱃지로 노출하는 시스템.

### 핵심 파일
- **`app/lib/titles.ts`** — 규칙 엔진(클라 import 금지, 서버 전용 로직).
  - `buildContexts(raw시트들)` → 선수별 `PlayerContext` 집계 (라인업 슬롯→포지션, 득점 CSV, 날씨, 출석/승부, 투표·댓글)
  - `TITLES`(자동 규칙 43종, 등급형/달성형), `evaluatePlayer(ctx)` → `EarnedTitle[]`
  - `LEADER_TITLES`(팀 1위 5종) + `evaluateLeaders(contexts)` — 최다 출전/득점왕/도움왕/공격P왕/클린시트왕
  - `MANAGER_NAME = "금상덕"` + `managerTitle()` — 감독 특별 뱃지
  - `pickBadges(earned, featuredIds, n)` — 대표 우선, 없으면 자동 상위 N / `topTitles` — 등급 정렬
- **`app/lib/title-icons.tsx`** — lucide 아이콘 kebab→컴포넌트 매핑
- **`app/components/TitleBadges.tsx`** — `TitleBadge`/`TitleBadges`(아이콘 전용, 그라디언트 링+글로우) + `TitleChips`(아이콘+이름+등급)
- **`app/components/PlayerTitleCards.tsx`** — 개인 페이지 칭호 카드형(설명 포함). 4개만 보이고 **하단 블러 + "전체 확인하기"**
- **`app/components/FeaturedEditor.tsx`** — 본인 대표 칭호 최대 3개 순서 선택 → `/api/featured` 저장
- **`app/components/PlayerAvatar.tsx`** — 페이스온 아바타. `public/players/{이름|등번호}.{jpg,png,webp}` onError 폴백 → 없으면 실루엣
- **`app/players/[name]/page.tsx`** — 전용 선수 페이지(페이스온 히어로 + 스탯 + 출석률 + 칭호 카드 + 최근 활약). 본인이면 FeaturedEditor 노출
- **`app/api/featured/route.ts`** — 대표 칭호 저장 POST. 세션 닉네임 == 선수명(본인)만
- 수정: `app/page.tsx`(칭호 산출+`playerTitles` 전달, `vote_comment`/`featured` fetch), `DashboardClient.tsx`(순위표 뱃지+행클릭→`/players`, **기존 프로필 Drawer 제거**), `FormationField.tsx`(토큰에 뱃지 3), `sheets-write.ts`(`writeFeaturedTitles`), `google-sheets.ts`(SheetRange에 `featured`)
- 문서: **`TITLES_SPEC.md`**(임계값 편집용 명세, id 1:1 대응), **`titles-preview.html`**(전체 칭호/등급 시각 카탈로그 — 브라우저로 열기)

### ⚠️ 새 시트 (수동 생성 필요)
- **`featured`** 탭 — `A=선수명  B=칭호id  C=칭호id  D=칭호id`. **대표 칭호 저장용.**
  - ⚠️ **탭이 없으면 "저장" 시 에러.** (읽기는 없어도 자동으로 top3 폴백)
  - 비어 있어도 됨 — 본인이 저장 누르면 자동 채워짐. id는 `TITLES_SPEC.md` id열과 동일(예: `scorer`, `mvp`, `lead_goals`).
- (선택) **`titles`** 탭 — 수동 칭호(분위기메이커 등) `A=선수명 B=칭호 C=lucide아이콘 D=설명`. **아직 코드 미연동**(연동 시 read + 머지 필요).

### 확정 설계
- 등급 4단계: **루키(브론즈)/아마추어(실버)/준프로(골드)/프로(로즈-바이올렛 글로우)**. 색은 `TitleBadges.tsx` `TIER_VIS`.
- 라인업·순위 = **상위 3개 아이콘**(대표 우선). 개인 페이지 = **카드형 전체**.
- **본인 확인 = 카카오 닉네임 == roster 선수명**(자동 매칭). **본인만** 대표 편집(관리자 예외 없음).
- 사진 = **로컬 `public/players/`** (Vercel public-fs 이슈 회피 위해 브라우저 onError 폴백).
- 야유회 경기는 투표 제외(`vote/page.tsx`, 커밋 `6a7cf33`).

### 데이터 제약 (칭호 추가/변경 시 참고)
- 🔴 **결승골/역전승 불가**: 득점에 시간·순서 없음, 쿼터별 스코어 없음 → 필요 시 수동(`titles` 시트).
- 🟡 **날씨 칭호**: matches N열에 날씨 저장된 경기만. 앞으로 치르는 경기부터 정확.
- 🟡 **투표/댓글 칭호**(투표러/수다왕/활동왕/얼리버드/오프너): 카카오 닉네임이 선수명과 정확히 같아야 집계.

## 📋 다음 할 일 (순서대로)

1. ✅ **로컬 살리기** — `npm run dev` 정상 (`.env.local` 파일명 이슈 해결: `env.local`→`.env.local`)
2. ✅ **로그인 테스트** — 카카오 로그인 1회 완료, `users` 시트에 `4950539589`(임재준) 확인
3. ✅ **`ADMIN_KAKAO_IDS`** = `4950539589` 세팅 (`.env.local`). ⚠️ 배포 시 Vercel에도 추가
4. ✅ **관리자/회원 게이팅** 완료 (위 "✅ 완료: 4단계" 참고)
5. ✅ **2단계 투표 기능** 완료 (위 "완료: 2단계" 참고)
6. ✅ **칭호/뱃지/페이스온** 완료 (위 "완료: 칭호/뱃지/페이스온" 참고)

### ⏭️ 칭호 시스템 — 다른 PC에서 이어서 할 것
1. **`featured` 시트 탭 생성** (대표 칭호 저장용) — 안 만들면 저장 시 에러
2. (선택) **선수 사진** `public/players/`에 파일 넣기 (`이름.jpg`/`등번호.png` 등)
3. (선택) **`titles` 시트(수동 칭호) 연동** — 시트 만들고 read+머지 코드 추가
4. (선택) **임계값 조정** — `TITLES_SPEC.md` 숫자 수정 → `app/lib/titles.ts` `TITLES`에 반영
5. (선택) 라인업 토큰 뱃지가 너무 빽빽하면 `FormationField.tsx`에서 size/max 조정

### (선택) 추후 정리거리
- media/media/sign을 카카오 관리자로 통합 (현재 ADMIN_PIN 유지 중)
- `push/test`(전체 푸시)에 `requireAdmin` 적용 (현재 무방비)
- 투표자 닉네임↔로스터 실명 매핑 (칭호 활동 집계·본인확인과도 연결됨)
