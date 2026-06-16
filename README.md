# UNDERDUCK FC Dashboard (MVP)

실제 풋살팀의 운영을 위한 팀 전용 대시보드입니다. 경기 일정·결과 관리, 선수 통계, 라인업 편성, MOM 투표, 사진 공유까지 팀 운영에 필요한 기능을 하나의 PWA로 통합했습니다.

**배포** → [underduckfc.vercel.app](https://underduckfc.vercel.app)

---

- 비개발자 팀원이 직접 데이터를 수정해야 하는 제약 조건에서, Google Sheets를 DB로 채택하여 별도 어드민 패널 없이 운영 가능한 구조 설계
- 읽기(public API key)와 쓰기(Service Account JWT)의 인증 경로를 분리하고, googleapis SDK 없이 Node.js `crypto`로 RS256 서명을 직접 구현하여 서버리스 환경의 번들 크기 최소화
- Web Push API(VAPID)와 구독 정보 Sheets 저장으로 추가 인프라 없이 iOS/Android 푸시 알림 구현
- Vercel 서버리스 함수의 응답 후 즉시 종료 특성을 고려해 푸시 발송 로직을 `await`로 직렬화하여 유실 방지
- Canvas API로 라인업 포메이션 이미지를 브라우저에서 직접 생성, PNG 저장 및 SNS 공유 기능 구현

---

`Next.js 15` `TypeScript` `Google Sheets API` `Cloudinary` `Web Push (VAPID)` `Tailwind CSS` `Vercel`
