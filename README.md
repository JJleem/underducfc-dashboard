# UNDERDUCK FC Dashboard

> 실제 풋살팀의 운영 문제를 해결하기 위해 만든 팀 전용 대시보드.  
> 경기 일정·결과 관리, 선수 통계, 라인업 편성, 사진 공유, MOM 투표까지 팀 운영에 필요한 기능을 하나의 앱으로 통합했습니다.

**배포** → [underduckfc.vercel.app](https://underduckfc.vercel.app)

---

## 왜 Google Sheets를 데이터베이스로?

팀원 대부분이 비개발자입니다. 경기 결과나 선수 명단을 운영진이 직접 수정해야 하는데, 별도 어드민 패널을 만들면 "앱을 써야 수정할 수 있다"는 진입 장벽이 생깁니다.

Google Sheets는 팀원 누구나 이미 익숙하고, 스프레드시트 자체가 어드민 패널 역할을 합니다. 추가 인프라 없이 비개발자 친화적인 데이터 관리가 가능한 유일한 선택이었습니다.

**구현상 고려한 점:**
- 읽기는 public API key (Google Sheets API v4), 쓰기는 Service Account JWT — 권한을 목적에 따라 분리
- googleapis SDK 없이 Node.js 내장 `crypto`로 RS256 서명을 직접 구현 — 서버리스 환경에서 번들 크기와 cold start 최소화

---

## 풀어낸 기술 챌린지

**Vercel 서버리스와 비동기 작업**

경기 결과 저장 후 푸시 알림을 보내는 로직을 fire-and-forget으로 짰더니, Vercel이 응답 반환 직후 함수를 종료해 알림이 전송되지 않는 문제가 있었습니다. `await`로 직렬화해 응답 전에 완료를 보장하는 방식으로 해결했습니다.

같은 맥락에서, `web-push` VAPID 초기화를 모듈 최상단에 두면 Vercel 빌드 시점에 env var가 없어 빌드 자체가 실패하는 문제도 있었습니다. 초기화 코드를 함수 내부로 이동해 런타임에만 실행되도록 수정했습니다.

**PWA에서의 UX 제약**

iOS standalone 모드에서는 브라우저 기본 당겨서 새로고침이 비활성화됩니다. `touchstart` / `touchmove` 이벤트로 직접 Pull-to-Refresh를 구현했습니다.

vaul Drawer 라이브러리가 모바일 키보드 등장 시 visual viewport 기준으로 Drawer를 리사이즈하면서 입력 불가 상태가 되는 문제는 `repositionInputs={false}` prop으로 해결했습니다.

**무료 푸시 알림 인프라**

별도 푸시 서버 없이 Web Push API(VAPID)만으로 iOS / Android 모두 지원합니다. 구독 정보도 Google Sheets에 저장해 추가 데이터베이스 없이 운영합니다.

---

## 아키텍처 개요

```
Next.js App Router (Vercel)
│
├── app/page.tsx              # Server Component — Sheets에서 전체 데이터 병렬 fetch
├── app/components/           # DashboardClient — 모든 UI 상태 관리
├── app/matches/[id]/edit/    # 드래그앤드롭 라인업 에디터
├── app/media/                # 미디어 갤러리
│
├── app/lib/google-sheets.ts  # 읽기 (public API key)
├── app/lib/sheets-write.ts   # 쓰기 (Service Account JWT, RS256 자체 서명)
├── app/lib/send-push.ts      # Web Push 발송
│
└── app/api/                  # 뮤테이션 엔드포인트
    ├── matches/              # 경기 CRUD
    ├── notice/               # 공지 수정
    ├── lineup/               # 라인업 저장
    ├── mom-vote/             # MOM 투표
    ├── photos/               # Cloudinary 서명 URL 발급
    └── push/subscribe/       # 푸시 구독 등록·해제

Google Sheets ──────── 모든 영구 데이터 (경기, 선수, 통계, 공지, 구독)
Cloudinary ─────────── 사진·영상 스토리지
```

---

## 기술 스택

| | 선택 이유 |
|---|---|
| **Next.js 15** App Router | Server Component로 초기 데이터 fetch, 페이지별 API route |
| **Google Sheets** API v4 | 비개발자 팀원이 직접 데이터 편집 가능한 유일한 DB |
| **Cloudinary** | 서버리스에서 파일 시스템 없이 미디어 처리, 서명 URL로 클라이언트 직접 업로드 |
| **Web Push** (VAPID) | 추가 서비스 없이 iOS/Android 네이티브 푸시 알림 |
| **Tailwind CSS v4** + Shadcn UI | 빠른 모바일 UI 구성 |
| **Vercel** | Next.js 최적화 배포, 서버리스 API route |

---

© 2026 UNDERDUCK FC · Built by **molt**
