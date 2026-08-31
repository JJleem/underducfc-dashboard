# 언더덕 사랑방 핸드오프 (익명 건의·잡담 게시판)

> 팀원이 **애로사항·건의를 남기는 자리**를 새로 만드는 작업.
> 기존 화면은 홈의 진입점 한 줄 말고는 건드리지 않는다.
> 프론트(`underducfc-dashboard`)와 백엔드(`underduck-backend`) **양쪽 다 구현 완료**.
> 남은 건 DB 마이그레이션 적용뿐이다 — 8장 참고.

---

## 1. 결정된 것

| 항목 | 결정 | 이유 |
| --- | --- | --- |
| 공개 범위 | 전체 공개 | 사랑방이니까 서로 뭘 얘기하는지는 보여야 한다 |
| 작성자 표시 | **화면엔 익명, DB엔 실명** (운영진만 실명 확인) | 불편한 얘기일수록 실명으로는 못 쓴다 |
| 진입점 | 홈 공지 줄 **바로 아래 한 줄** | 매일 오는 곳이 아니라 "할 말 생겼을 때" 오는 곳 |
| 저장소 | 백엔드에 `lounge_posts` / `lounge_comments` 신설 | 기존 테이블 재활용 불가 (2장) |

### 왜 "건의함"이 아니라 게시판인가

답변이 안 달리는 건의함은 2주면 빈 페이지가 된다. 그래서 두 가지를 같이 넣는다.

- **글마다 상태 뱃지** (`접수 / 확인중 / 반영됨 / 보류`) — 운영진이 바꾼다
- **운영진 답변 블록** — 본문 바로 아래, 눈에 띄게

그리고 잡담이 섞여야 페이지가 안 죽으므로 글 종류를 둘로 나눈다.
`건의`에만 상태·답변이 붙고, `잡담`은 그냥 글+댓글이다.

---

## 2. 기존 테이블을 못 쓰는 이유 (되돌리지 말 것)

- **`feedback` 재활용 금지.** 칭호 계산에 물려 있다.
  `app/api/feedback/route.ts` 의 POST·DELETE 가 `revalidateAppData(UD_TAG.feedback, UD_TAG.titles)`
  를 부른다. 사랑방 글을 여기 넣으면 칭호가 오염된다.
- **`board`(전술게시판) 재활용 금지.** 글에 `lineup` 또는 `youtube_url` 중 하나가 반드시 있어야 하고
  (`app/api/board/route.ts` 의 검증), 상태·답변을 넣을 컬럼이 없다.

---

## 3. 익명 처리 — 여기가 이 작업의 핵심

**프론트에서 이름을 감추는 것으로는 익명이 아니다.** GET 응답에 실명이 실려 오면
개발자 도구로 그대로 다 보인다. **마스킹은 반드시 백엔드에서 한다.**

### 라벨 규칙 (백엔드가 계산해서 내려준다)

| 대상 | 라벨 |
| --- | --- |
| **글의 작성자** (목록·상세 모두) | `익명` |
| 댓글 | 이름 풀에서 하나씩 (`물갈퀴`, `코너킥장인` …) |
| 글쓴이가 자기 글에 단 댓글 | `글쓴이` |
| 운영진 답변 | `운영진` |

`글쓴이` 는 **댓글에만** 붙는 관계 표시다 — "이 댓글을 단 사람이 글쓴이"라는 뜻.
글 헤더에 쓰면 `글쓴이 · 3시간 전` 이 되어 하나 마나 한 말이 된다. 그래서 글의
작성자 자리는 어디서나 `익명` 이고, 화면도 그 값을 그대로 그린다(하드코딩 금지 —
라벨 규칙이 두 군데로 갈리면 API 와 화면이 어긋난다).

글쓴이는 이름을 받지 않는다 — 언제나 `글쓴이` 다.

### 이름은 어떻게 고르나 — `ANON_NAMES` (40개)

글 id 로 풀을 섞고(`_alias_pool`), 댓글에 **처음 등장한 순서대로** 하나씩 준다.

- 같은 글에서는 언제 불러도 순서가 같다 → 이름이 안 흔들린다
- 글이 바뀌면 순서도 바뀐다 → **같은 사람이 글마다 다른 이름**을 받는다
  (순서대로 그냥 나눠 주면 첫 댓글자는 어느 글에서나 같은 이름이 된다)
- 사람이 40명을 넘으면 한 바퀴 더 돌며 숫자를 붙인다(`물갈퀴 2`)

섞는 데 `random.shuffle` 대신 해시 정렬을 쓴다 — 파이썬 버전이 바뀌어도 결과가 같다.

이름을 고를 때의 규칙: **팀원 누구도 지칭하지 않고, 놀림으로 읽힐 여지가 없을 것.**
실력·출전 시간처럼 사람마다 실제로 다른 것은 넣지 않았다(익명이라도 콕 집힌 기분이 든다).

> ⚠️ 목록을 고치면 **이미 올라온 글의 이름도 같이 바뀐다** — 이름은 저장하지 않고
> 그때그때 계산한다. 글 안에서 사람과 이름이 1:1 인 건 그대로라 표시만 달라진다.
> 이게 곤란해지면 `lounge_comment` 에 별명을 저장하는 쪽으로 옮기면 된다.

### 대댓글

깊이는 **1단까지만**이다. 대댓글에 또 달면 부모로 접어 올린다(`parent_id`를 부모의
부모로 바꾼다). 막아버리면 "답글의 답글"을 쓰려던 사람이 갈 데가 없다.

부모를 지우면 딸린 답글도 함께 사라진다. 남겨두면 무슨 말에 대한 답인지 알 수 없는
댓글만 떠돈다.

같은 사람은 **한 글타래 안에서만** 같은 번호를 유지한다. 글이 달라지면 번호도 새로 매긴다
(글을 여러 개 쓰면 번호가 고정되어 누군지 추정되는 걸 막는다).

`덕민`이라는 말은 취향이라 바꾸기 쉽게 백엔드 상수 하나로 둔다.

### 응답에 넣을 것 / 넣지 말 것

- `author_label` — 위 규칙으로 계산한 문자열. **항상 내려준다.**
- `mine` — 요청자 본인 글인가. 본인 삭제 버튼과 "내 글" 뱃지에 쓴다.
- `author` (실명) — **운영진 요청일 때만.** 그 외에는 키 자체를 빼거나 `null`.

### 읽기에도 신원 헤더가 필요하다

`app/lib/underduck.ts` 의 `underduckFetch` 는 지금 신원 헤더를 **쓰기에만** 붙인다
(`const needsIdentity = !anonymous && method !== "GET"`). GET 캐시 키가 사용자별로 쪼개지는 걸
막으려는 의도이고, 그 주석은 맞다.

사랑방은 `mine` 과 운영진 실명 노출 때문에 **읽기에도 신원이 필요하다.** 그래서:

- `underduckFetch` 에 `withIdentity?: boolean` 옵션을 **추가**하고
  `needsIdentity` 를 `!anonymous && (method !== "GET" || withIdentity)` 로 바꾼다.
- 사랑방 읽기만 이 옵션을 켠다. 캐시는 `no-store` 로 둔다 (전술게시판도 그렇게 한다).
- **기존 호출부의 동작은 하나도 안 바뀐다.** 옵션을 안 넘기면 지금과 같다.

---

## 4. 백엔드 스펙 (FastAPI + Postgres)

모두 `/api/underduck/*` 아래, `require_underduck` 가드를 거친다.
권한은 **본문이 아니라 `X-Underduck-User` / `X-Underduck-Role` 헤더**로 판단한다 (기존 규칙과 동일).

### 테이블

```sql
CREATE TABLE lounge_posts (
  id          SERIAL PRIMARY KEY,
  kakao_id    TEXT NOT NULL,              -- pid (HMAC 가명 ID)
  author      TEXT NOT NULL,              -- 실명. 운영진에게만 내려준다
  category    TEXT NOT NULL,              -- 'suggestion' | 'chat'
  icon        VARCHAR(50),                -- 제목 앞 아이콘 (노션식). 이모티콘 id 와 같은 체계
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'received',
                                          -- 'received'|'reviewing'|'resolved'|'declined'
                                          -- category='chat' 이면 의미 없음
  admin_reply        TEXT,
  admin_reply_author TEXT,                -- 답변한 운영진 실명 (이건 공개해도 된다)
  admin_reply_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lounge_comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES lounge_posts(id) ON DELETE CASCADE,
  kakao_id   TEXT NOT NULL,
  author     TEXT NOT NULL,
  parent_id  INTEGER,         -- 대댓글이면 부모 댓글 id (1단까지)
  message    TEXT,            -- 이모티콘만 단 댓글은 NULL
  emoticon   VARCHAR(50),     -- 이모티콘 id (그림 파일 이름). URL 이 아니다
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON lounge_comments (post_id, id);
```

### 엔드포인트

| 메서드 | 경로 | 권한 | 비고 |
| --- | --- | --- | --- |
| GET | `/api/underduck/lounge` | 회원 | 목록. 고정 정렬: 최신순 |
| POST | `/api/underduck/lounge` | 회원 | `{category, title, body, icon?}` |
| GET | `/api/underduck/lounge/{id}` | 회원 | 상세 + 댓글 |
| DELETE | `/api/underduck/lounge/{id}` | 본인 or 운영진 | |
| PATCH | `/api/underduck/lounge/{id}` | **운영진만** | `{status?, admin_reply?}` |
| POST | `/api/underduck/lounge/{id}/comments` | 회원 | `{message?, emoticon?, parent_id?}` — 앞의 둘 중 하나는 필수 |
| DELETE | `/api/underduck/lounge/{id}/comments/{cid}` | 본인 or 운영진 | |

`kakao_id` / `author` 는 요청 본문으로 받지 말고 **헤더의 신원으로 서버가 채운다.**
(본문으로 받으면 남의 이름으로 글을 쓸 수 있다)

### 목록 응답 예시

```json
[{
  "id": 12,
  "category": "suggestion",
  "title": "회비 납부일 좀 앞당기면 안 될까요",
  "status": "resolved",
  "author_label": "익명",
  "mine": false,
  "comment_count": 4,
  "admin_reply": "구장 측과 얘기해서…",
  "admin_reply_author": "이재준",
  "admin_reply_at": "2026-08-30T09:10:00+09:00",
  "created_at": "2026-08-28T11:02:00+09:00"
}]
```

목록엔 `body` 를 넣지 않는다 (상세에서만). `admin_reply` 는 목록에도 싣는다 —
목록 줄에 "· 운영진 답변" 표시를 붙이는 데 쓴다.

### 삭제 권한은 백엔드가 판단한다

전술게시판은 글의 `kakaoId` 를 프론트로 받아 와 거기서 대조하지만
(`app/api/board/[id]/route.ts`), 사랑방은 그렇게 하면 안 된다 — 남의 글에 작성자
식별자를 딸려 보내는 것 자체가 익명성을 깎는다. `DELETE` 는 그냥 전달하고,
본인/운영진 여부는 백엔드가 신원 헤더로 판단해 403 을 돌려준다.

---

## 5. 프론트 스펙

### 만든 파일 (완료)

```
app/lounge/
  page.tsx                      목록 (서버)
  LoungeClient.tsx              필터 세그먼트 + 리스트 + 글쓰기 모달
  meta.ts                       상태·종류 라벨, 색, relativeTime  ← 클라이언트 안전
  preview-data.ts               백엔드 없이 화면을 보기 위한 가짜 글  ← 나중에 삭제
  [id]/page.tsx                 상세 (서버)
  [id]/LoungeDetailClient.tsx   본문 + 운영진 답변 + 댓글 + (운영진) 상태 변경
app/lib/lounge.ts               백엔드 래퍼 — app/lib/board.ts 와 같은 문법
app/components/home/LoungeEntry.tsx   홈 진입점 한 줄
app/api/lounge/route.ts                        POST 글쓰기
app/api/lounge/[id]/route.ts                   PATCH(운영진) · DELETE
app/api/lounge/[id]/comments/route.ts          POST 댓글
app/api/lounge/[id]/comments/[cid]/route.ts    DELETE 댓글
```

`meta.ts` 를 따로 둔 이유: `app/lib/lounge.ts` 는 서버 전용이라(underduck.ts 가드)
클라이언트가 못 부른다. 타입은 `import type` 으로 지워지지만 런타임 상수는 안 된다.

목록 GET 라우트는 만들지 않았다. 목록 화면이 서버 컴포넌트라 `listLoungePosts()` 를
직접 부르고, 글을 쓴 뒤에는 `router.refresh()` 로 다시 그린다.

### 손댄 기존 파일 (딱 2개)

- `app/lib/underduck.ts` — `withIdentity` 옵션 추가 (3장). 기존 호출부 동작은 그대로다.
- `app/components/home/NewHome.tsx` — import 2줄, `Promise.all` 에 사랑방 읽기 1줄,
  공지 블록 뒤에 `<LoungeEntry />` (6장)

### 재사용할 것 — 새로 만들지 말 것

| 쓸 것 | 위치 |
| --- | --- |
| 상단 바 | `app/components/home/PageHeader.tsx` (`<PageHeader label="LOUNGE" />`) |
| 새 글 점 표시 | `app/components/home/useUnseen.ts` |
| 모달 껍데기 | `app/components/home/DetailSheet.tsx` |
| 확인 다이얼로그 | `app/components/AppConfirmDialog.tsx` |
| 토스트 | `app/components/AppToast.tsx` |
| 댓글 목록 문법 | `app/components/home/FeedbackThread.tsx` 를 참고 (복붙 말고 참고) |
| 로그인 게이트 | `app/components/LoginGate.tsx` |

### 목록 화면

```
← LOUNGE                                    [글쓰기]

  이름은 공개되지 않아요. 운영진만 확인할 수 있어요.     ← 이 줄이 있어야 사람들이 쓴다

  [ 전체 ]  [ 건의 ]  [ 잡담 ]

 ─────────────────────────────────────────────────
  🟠 접수   회비 납부일 좀 앞당기면 안 될까요
            익명 · 3일 전                       💬 2
 ─────────────────────────────────────────────────
  🟢 반영   구장 주차가 너무 빡세요
            익명 · 1주 전                       💬 4
 ─────────────────────────────────────────────────
  잡담      다들 축구화 뭐 신으세요?
            익명 · 1주 전                       💬 7
 ─────────────────────────────────────────────────
```

- **카드 아님, 한 줄 리스트.** 홈 공지와 같은 결이다 (전술게시판만 그리드).
- 상태 뱃지는 `건의` 에만. `잡담` 은 회색 태그 하나.
- 색: `접수` 앰버 / `확인중` 파랑 / `반영됨` 초록 / `보류` 회색.
  팀 핑크(`#FF8FA3`)는 상태색으로 쓰지 않는다 — 액션 색이라 헷갈린다.

### 작성 모달

- 종류 토글 `[건의] [잡담]` → 제목 → 내용
- 하단 고지 한 줄: **"작성자 이름은 화면에 공개되지 않습니다. 운영진은 확인할 수 있어요."**
  (숨기지 말 것. 익명인 줄 모르면 안 쓰고, 완전 익명인 줄 알면 막 쓴다)

### 상세 화면

```
← LOUNGE

  건의   🟢 반영됨
  구장 주차가 너무 빡세요
  익명 · 8/22

  (본문)

 ┌─────────────────────────────────────────┐
 │ 운영진 답변 · 이재준 · 8/25              │   ← 핑크 톤으로 강조
 │ 8시 이후엔 뒷문 주차장을 열어두기로       │
 │ 구장 측과 얘기했습니다.                   │
 └─────────────────────────────────────────┘

  댓글 4
  덕민 1  ...
  글쓴이  ...
```

운영진에게만 추가로: 상태 변경 세그먼트, 답변 입력창, 그리고 작성자 실명 한 줄.

---

## 6. 진입점 — 홈 공지 줄 바로 아래

`app/components/home/NewHome.tsx` 의 공지 블록(`{notice && (...)}`, 456행 근처) **바로 뒤**에 넣는다.
공지가 없어도 항상 보여야 한다 (공지 블록 안이 아니라 밖).

```
  🔔 이번 주 공지 제목                      8/29
 ──────────────────────────────────────────────
  💬 언더덕 사랑방                           •
     하고 싶은 말 남기기                     →
 ──────────────────────────────────────────────
  [ 경기 목록 ... ]
```

- 공지와 같은 `border-y` 한 줄 문법을 그대로 쓴다.
- 점(`•`)은 `useUnseen("lounge", stamp)` — `stamp` 는 **최신 글 id + 전체 글 수**를 이어 붙인다
  (id만 쓰면 글이 지워졌을 때 표시가 안 뜬다).
- 목록 수는 홈 서버 컴포넌트에서 같이 읽어와야 하는데, **사랑방 조회가 실패해도 홈은 떠야 한다.**
  `NewHome` 이 이미 쓰는 `failedSections` 패턴에 얹거나, 실패 시 점 없이 진입점만 그린다.

---

## 7. 이모티콘

이모티콘은 두 군데에 붙는다.

- **댓글** — 하나씩 붙일 수 있다. 이모티콘만 달아도 댓글이 된다.
- **글 아이콘** — 노션의 페이지 아이콘처럼 제목 앞에 하나. 목록에서는 제목 왼쪽에
  34px, 상세에서는 제목 위에 56px. 글을 새로 쓰면 `DEFAULT_POST_ICON`(저도요)이
  미리 골라져 있고 바꾸거나 뺄 수 있다. 빈 칸부터 시작하면 대부분 그냥 지나쳐
  목록이 밋밋해지기 때문이다. 대신 기본값이 박혀 있으면 바꿀 수 있는 줄 모르므로
  버튼에 "바꾸기"를 붙였다. 아이콘을 빼면 그 자리가 아예 안 생긴다.

둘은 **같은 id 체계와 같은 피커**(`app/lounge/EmoticonPicker.tsx`)를 쓴다.
두 곳에서 모양이 달라지면 같은 기능으로 안 읽힌다.

**기본은 emoji 다.** 그림이 있는 건 레지스트리에 `art: true` 로 표시한 것뿐이고,
나머지는 emoji 를 바로 그린다 — 요청을 아예 보내지 않는다.

처음에는 일단 PNG 를 요청해 보고 404 가 나면 emoji 로 떨어뜨렸다. 파일만 넣으면
코드를 안 고쳐도 되는 게 장점이었지만, 그림 없는 것들이 화면을 열 때마다 404 를 내고
그 왕복만큼 늦게 떴다. **그림이 몇 개 없는 게 기본 상태**라면 손해가 더 크다.

### 지금 등록된 것 — `app/lounge/emoticons.ts`

| id | 라벨 | 지금 그리는 것 |
| --- | --- | --- |
| `me-too` | 저도요 | 🖼 그림 (`art: true`) |
| `agree` | 동의 | 🖼 그림 (`art: true`) |
| `laugh` | 빵터짐 | 😂 |
| `cry` | 슬퍼요 | 😭 |
| `sorry` | 죄송 | 🙏 |
| `thinking` | 음… | 🤔 |
| `fire` | 불타오르네 | 🔥 |
| `duck` | 꽥 | 🐥 |

### 그림 넣는 법

`public/emoticons/me-too.png` 처럼 **id 와 같은 이름**으로 넣고, `emoticons.ts` 의
그 줄에 **`art: true` 를 켠다**. 파일만 넣으면 안 쓰인다(안 켜져 있으면 emoji 를 그린다).

**얼굴 클로즈업으로 자를 것.** 화면에서 32~64px 로 그려지는데 전신 그림을 넣으면
얼굴이 전체의 1/5도 안 돼 표정이 사라진다(그래서 처음 받은 전신 스티커를 머리 위주로
잘라 넣었다). 배경 장식(반짝이·공)도 그 크기에서는 노이즈가 된다.

정사각형 투명 PNG **256px**, 30KB 안쪽. 1254px 원본을 그대로 넣으면 60px 아이콘에
1MB 를 받게 된다.

그리고 **표정을 확실히 다르게** 뽑아야 한다. 웃는 얼굴만 여러 장이면 "슬퍼요"를
만들 수가 없고, 목록에서 서로 구분도 안 된다.

### 미리 받아두기

`preloadEmoticons()` 를 화면이 뜰 때 부른다(`LoungeClient` · `LoungeDetailClient`).
`art` 가 켜진 것만 받는다 — 피커를 여는 순간에 받으면 빈 칸이 잠깐 보인다.
emoji 인 것들은 받을 게 없다.

### 늘리는 법

`app/lounge/emoticons.ts` 에 한 줄(그림이 있으면 `art: true` 까지).
**백엔드는 안 건드려도 된다** —
`lounge_comment.emoticon` 은 id 문자열만 저장하고(`^[a-z0-9-]+$`, 50자), 프론트는
모르는 id 를 조용히 무시한다. 그래서 이모티콘을 지워도 옛 댓글이 깨지지 않는다.

---

## 8. 이번에 만들지 않는 것

- 푸시 알림 (`app/api/push/*` 가 있지만 사랑방엔 붙이지 않는다 — 익명 게시판에 알림이 오면 부담이 커진다)
- 좋아요 / 조회수
- 이미지 첨부
- 글 수정 (지우고 다시 쓰기)
- 운영진 답변 알림

필요해지면 그때 붙인다.

---

## 9. 지금 상태

**프론트·백엔드 다 구현했다.** 남은 건 DB 마이그레이션 적용 하나다.

### 백엔드 (`../underduck-backend`)

```
db/models.py                                  LoungePost · LoungeComment  (추가)
schemas.py                                    Lounge* 스키마               (추가)
routers/lounge.py                             전 엔드포인트                (신규)
main.py                                       라우터 등록 2줄              (수정)
alembic/versions/d4e5f6a7b8c9_lounge_tables.py                            (신규)
```

### 마이그레이션 적용 (아직 안 함)

```bash
cd ../underduck-backend
alembic upgrade head        # d4e5f6a7b8c9 — lounge_post / lounge_comment 생성
```

배포는 `.github/workflows/deploy.yml` 을 따른다. **이걸 돌리기 전까지 사랑방은
빈 목록이고 글쓰기는 500 이다.**

### 미리보기 (백엔드 붙기 전 화면 확인용)

**`/lounge?preview=1`** 로 들어가면 `app/lounge/preview-data.ts` 의 가짜 글로 그린다.
상세 화면의 쓰기 동작은 막혀 있고 "미리보기에서는 저장되지 않아요" 토스트가 뜬다.

### 마이그레이션 적용 후 지울 것

1. `app/lounge/preview-data.ts` 파일째 삭제
2. `app/lounge/page.tsx` 의 `isPreview` 분기
3. `app/lounge/[id]/page.tsx` 의 `isPreview` 분기
4. `LoungeClient` / `LoungeDetailClient` 의 `preview` prop 과 `blockedInPreview()`

### 검증한 것 / 못 한 것

**프론트** — `npx tsc --noEmit` 통과, `npm run lint` 신규 경고 없음, `npm run build` 통과.

**백엔드** — `pytest` **69개 전부 통과** (그중 사랑방 5개는 이번에 추가).
WSL 에 python 의존성이 없어서 pip 을 임시 venv 에 부트스트랩해 돌렸다.

추가한 테스트(`tests/test_integration.py`)가 못 박는 것:

- 회원 응답에 실명도 `kakao_id` 도 없고, 운영진 응답에만 실명이 있다
- 댓글 라벨이 등장 순서대로 붙고, 같은 사람이 다시 달아도 번호가 유지되며,
  **다른 글에서는 번호가 처음부터 다시 매겨진다**
- 이모티콘만 단 댓글이 되고, 둘 다 비면 400, `../hack.png` 같은 id 는 422
- 회원은 상태·답변을 못 바꾸고, 남의 글을 못 지운다
- 신원 헤더 없이는 글을 못 쓴다

그 밖에 확인한 것:

- `alembic heads` → `d4e5f6a7b8c9` 하나. 체인 안 끊김
- 모델과 마이그레이션의 컬럼이 정확히 일치 (12개 / 7개)

**화면을 눈으로 확인하지 못했다.** 레이아웃이 세션 없이는 `LoginGate` 만 그리는데
(`app/layout.tsx:143`), 이 환경에 `.env.local` 이 없어 세션을 만들 수 없었다.
로그인한 상태에서 `/lounge?preview=1` 을 열어 확인해야 한다.

> WSL 에서 `npm run dev` 가 500 이 나면 `node_modules` 가 Windows 에서 설치된 탓이다
> (`lightningcss.linux-x64-gnu.node` 없음). 사랑방과 무관한 기존 문제다.

---

## 10. 확인 항목

1. `npx tsc --noEmit` 통과
2. 비로그인 → `/lounge` 접근 시 로그인 게이트
3. 일반 회원으로 로그인 → **네트워크 탭의 `/api/lounge` 응답에 실명이 없는지** (3장의 핵심)
4. 운영진으로 로그인 → 실명·상태 변경·답변이 보이는지
5. 한 글에 두 사람이 댓글 → `덕민 1`, `덕민 2` 가 안 섞이는지
6. 홈에서 사랑방 조회가 실패해도 홈이 정상 렌더되는지
7. 이모티콘만 달린 댓글이 등록·표시되는지
8. `public/emoticons/` 가 비어 있어도 emoji 로 떨어지는지 (그림을 넣기 전 기본 상태)
9. `alembic upgrade head` → `alembic downgrade -1` 이 깨끗하게 되돌아가는지
