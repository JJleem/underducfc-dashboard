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

## 📋 다음 할 일 (순서대로)

1. **로컬 살리기**: (윈도우에서) `npm install` → `npm run dev` 정상 확인
2. **로그인 테스트**: 본인 카카오 로그인 1회 → `users` 시트에서 본인 `kakaoId` 확인
3. **`ADMIN_KAKAO_IDS`** = 본인 ID 세팅 (`.env.local` + Vercel) → 재배포
   - ⚠️ 이거 먼저 안 하고 게이팅 켜면 본인도 잠김
4. **관리자 게이팅** (로그인 확인된 다음):
   - `isAdmin(kakaoId)` 헬퍼 추가
   - **관리자만** 서버 검증: `matches`, `matches/[id]`, `notice`, `lineup`, `roster`, `photos`, `photos/sign`, `media`, `mom-vote/finalize`
   - **로그인 회원만**: `mom-vote`(투표), `feedback`(작성)
   - 클라이언트: 관리자 UI는 `currentUser`가 admin일 때만 노출
5. **2단계 투표 기능** 구현 (위 설계대로)
