# 🦆 언더덕 FC — 작업 핸드오프 (카카오 로그인 → 관리자 게이팅 → 투표)

> 새 세션/다른 PC에서 이 작업을 이어가기 위한 인수인계 문서.
> 현재 브랜치: **`feat/kakao-login`** (★ master에 머지 X = 실서버 배포 안 함)

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

## 📋 다음 할 일 (순서대로)

1. ✅ **로컬 살리기** — `npm run dev` 정상 (`.env.local` 파일명 이슈 해결: `env.local`→`.env.local`)
2. ✅ **로그인 테스트** — 카카오 로그인 1회 완료, `users` 시트에 `4950539589`(임재준) 확인
3. ✅ **`ADMIN_KAKAO_IDS`** = `4950539589` 세팅 (`.env.local`). ⚠️ 배포 시 Vercel에도 추가
4. ✅ **관리자/회원 게이팅** 완료 (위 "✅ 완료: 4단계" 참고)
5. ✅ **2단계 투표 기능** 완료 (아래 "완료: 2단계" 참고)

### (선택) 추후 정리거리
- media/media/sign을 카카오 관리자로 통합 (현재 ADMIN_PIN 유지 중)
- `push/test`(전체 푸시)에 `requireAdmin` 적용 (현재 무방비)
- 투표자 닉네임↔로스터 실명 매핑
