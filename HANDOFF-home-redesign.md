# 홈 개편 핸드오프 (인스타 피드형)

> 언더덕 FC 대시보드의 **홈을 인스타 피드형으로 새로 만드는 작업**.
> 아직 **커밋·푸시하지 않았다.** 기존 홈은 한 줄도 지우지 않았고 플래그로 갈아끼운다.
> (기존 `HANDOFF.md` 는 카카오 로그인·백엔드 마이그레이션 건이라 다른 작업이다)

---

## 0. Codex 에게 — 첫 프롬프트로 쓸 것

```
언더덕 FC 대시보드(Next.js)의 홈을 인스타 피드형으로 개편하는 작업을 이어받는다.
먼저 HANDOFF-home-redesign.md 를 전부 읽고, 3장 "왜 이렇게 만들었나"의 결정들은
정리·리팩터한다는 이유로 되돌리지 마라. 커밋·푸시는 하지 마라.
개발 서버는 nohup 으로 띄우고, 변경 후엔 npx tsc --noEmit 과 주요 라우트 응답을 확인해라.
```

---

## 1. 지금 어디까지 왔나

### 새로 만든 것

```
app/lib/
  home-flag.ts          새 홈 ON/OFF 스위치
  home-state.ts         홈 상태 판정 (dday / afterMatch / needVote / matching / idle)
  storylines.ts         주목 포인트 — DashboardClient 에서 추출 (기존 홈도 이걸 씀)
  team-stats.ts         시즌 요약·상대전적·장소전적·듀오 집계
  matchday-message.ts   경기 당일 랜덤 응원 문구 (경기별 고정 시드)

app/components/home/
  NewHome.tsx           새 홈 본체(서버). 실제 홈 + /home-preview 가 같이 씀
  AppHeader.tsx         상단 바 (로고·칭호·계정·테마)
  HomeHero.tsx          상태별 히어로
  MatchFeed.tsx         피드형 경기 게시물   ← 확정된 레이아웃
  MatchRow.tsx          목록형 경기 줄       ← 비교용으로만 남김 (?list=list)
  FeedList.tsx          무한 스크롤 (4개씩)
  FeedbackThread.tsx    댓글 (작성·삭제·상대시간)
  MomVote.tsx           MOM 투표 (요약 한 줄 + 드로어)
  MatchEditor.tsx       관리자 경기 등록/결과 입력 드로어
  NoticeEditor.tsx      관리자 공지 수정 드로어
  NewMatchButton.tsx    관리자 경기 등록 버튼
  PhotoUploader.tsx     관리자 사진 업로드 (Cloudinary 직접 업로드)
  DetailSheet.tsx       드로어 껍데기 (트리거 + 제목 + 스크롤)
  Storylines.tsx        주목 포인트 칩
  PageHeader.tsx        /stats·/record 상단 바
  useUnseen.ts          "새 내용" 점 (localStorage)
  match-result.ts       자체전·스코어 없음 처리

app/stats/page.tsx + StatsTable.tsx   시즌 요약 · 듀오 · 선수 순위
app/record/page.tsx                   상대팀별 · 장소별 전적
app/home-preview/page.tsx             NewHome 을 preview 모드로 (상태·레이아웃 스위치)
```

### 기존 파일 수정 (총 +20줄 / −202줄)

| 파일 | 변경 |
|---|---|
| `app/page.tsx` | 맨 앞에 새 홈 분기 3줄 + import 2줄 |
| `app/components/DashboardClient.tsx` | `buildMatchStorylines` 197줄을 `lib/storylines.ts` 로 이동 + import 1줄 / 경기 유형에 `풋살` 추가(2곳) |
| `app/components/AppBottomNav.tsx` | 스탯 탭 `/?tab=stats` → `/stats`, 활성 판정에 `/stats`·`/record` 추가 |

**기존 홈(DashboardClient)의 동작은 그대로다.** 리팩터 후 주목 포인트 출력이 이전과 동일함을 확인했다.

---

## 2. 켜고 끄는 법 (이번 작업의 전제 조건)

`app/lib/home-flag.ts`

```
1. 주소에 ?home=old / ?home=new    그 요청만. 배포 없이 비교
2. 환경변수 NEW_HOME=on / off       전체 적용
3. DEFAULT_NEW_HOME = false         코드 기본값
```

**현재 `.env.local` 에 `NEW_HOME=on` 이 들어 있다**(사용자가 직접 켬).
`NEXT_PUBLIC_` 을 안 붙인 건 의도적 — 서버 컴포넌트에서만 읽어 요청 시점에 평가된다.

---

## 3. 왜 이렇게 만들었나 — 되돌리지 말 것

작업 내내 사용자가 여러 번 방향을 고쳐 잡았다. 아래는 **이유가 있어서 그렇게 된 것들**이다.

1. **카드를 쓰지 않는다.** 테두리+그림자+라운드 박스를 쌓으면 아무리 안을 정리해도
   "박스가 쌓인 화면"이 된다. 인스타 피드에도 커뮤니티 목록에도 박스가 없다.
   → 헤어라인(`divide-y`)으로만 구분.

2. **접는 단위는 경기 하나.** 예전엔 경기마다 6개 섹션이 각각 접혀서 6번 눌러야 했다.
   지금은 액션 줄 아이콘 하나 = 드로어 하나.

3. **여는 방법은 드로어로 통일.** 댓글·참석·MOM·라인업·주목포인트 전부 `DetailSheet`
   또는 vaul `Drawer`. 직접 만든 `fixed inset-0` 모달은 "뿅" 나타나서 전부 교체했다.

4. **본문에 남는 건 "경기 자체의 사실"뿐** — 스코어, 득점, 확정 MOM(👑), 주목포인트 칩 2개,
   마지막 댓글 1개. 나머지는 드로어.

5. **색은 데이터에만.** 골격은 무채색. 핑크=승/D-day/주요 CTA, 보라=자체전, 앰버=MOM.
   (어시스트를 초록으로 칠했다가 "왜 초록?" 지적받고 회색으로 낮췄다 — 그 색이 아무것도 구분해주지 못했다)

6. **관리자 기능은 기존 홈과 내용이 100% 같아야 한다.** 처음에 추측으로 만들었다가 전부 틀렸다:
   - 경기 유형 = `일반 매칭 · 자체전 · 풋살` (풋살은 이번에 추가)
   - 결과 = `예정 · 승 · 무 · 패 · 자체전` ← **자체전이 결과에도 있다**
   - 시간 = 자유 입력이 아니라 `미정 + 06:00~24:00` 칩 19개
   - 날짜 = `<input type="date">` 가 아니라 `Calendar` 컴포넌트
   - 골 기록 = 드롭다운이 아니라 **골 추가 → 득점자(자책골 OG 포함) → 어시스트(선택) → 확인** 피커
   - 참석자에서 이름을 빼면 그 사람이 낀 골 기록도 같이 삭제된다
   - 저장 형식: `goals`/`assists` 를 골 순서대로 쉼표로 나란히, 도움 없으면 그 자리를 빈 칸
     (`"A,B"` / `",김광민"`). 짝이 어긋나면 도움이 엉뚱한 골에 붙는다.

7. **자체전(풋살·3파전)은 승패가 없고 스코어도 비어 있다.**
   `- : - 패배` 로 뜨던 걸 `match-result.ts` 로 처리. 최근 폼 뱃지에서는 제외
   (승률처럼 읽히는 줄에 승패 없는 칸이 섞이면 오해된다).

8. **예정 경기도 피드에 넣는다.** 원래 홈은 경기가 잡히는 순간 카드가 생겨서 경기 전에
   거기 댓글이 달렸다(8/8 경기에 이미 댓글 있음). 끝난 경기만 보여주면 그 대화 자리가 사라진다.
   히어로 = "지금 할 일", 피드의 예정 경기 = "얘기하는 자리".

9. **라인업은 "있으면" 보여준다.** D-DAY 상태에만 묶어두면 정작 사람들이 확인하는
   전날·전전날에 화면에 없다. D-DAY 에는 기본 펼침.

10. **주목 포인트는 위치별로 개수가 다르다.** 히어로 1개(팀 서사 헤드라인) /
    피드 칩 2개 + 드로어 전체. 경기당 4~26개(평균 12.5)가 나오므로 **자르지 말고 접을 것.**

11. **홈 상단 탭 3개를 없앴다.** 하단 탭바와 이중이었다. 스탯·전적은 `/stats`·`/record` 라우트로 분리.

---

## 4. 작업 중 발견한 실제 버그 (수정 완료)

1. **`react-day-picker` 버전 불일치** — `package.json`·lockfile 은 9.14.0인데 `node_modules` 만 8.10.1.
   `ui/calendar.tsx` 는 v9 문법이라 클래스가 전부 무시돼 **캘린더가 스타일 없이 렌더**됐다.
   `npm install react-day-picker` 로 해결. 이걸 고치니 `tsc` 에러가 **전체 0건**이 됐다
   (그동안 뜨던 DashboardClient·calendar 에러가 전부 이것 때문이었다).

2. **`풋살` 유형이 선택지에 없었다** — 데이터엔 이미 쓰이는데(3/14·3/21·5/9) 드로어엔 없어서
   그 경기를 수정하면 유형이 조용히 덮어써졌다. 두 홈 모두에 추가했다.

3. **라이트박스가 페이지 가운데에 떴다** — 조상의 transform 때문에 `fixed` 가 뷰포트가 아니라
   조상 기준이 된다. `ModalPortal` 로 body 에 그려 해결(`ModalPortal.tsx` 주석에 설명 있음).

4. **야유회가 "다음 경기"로 잡혔다** — 결과가 비어 있어 `result || "예정"` 에서 예정이 된다.
   `type !== "야유회"` 필터가 필요하다.

---

## 5. 남은 일

### 아직 새 홈에 없는 것
- **매치 캘린더** (기존 홈 일정 탭). "홈에서 빼고 일정 탭 안쪽으로" 합의했으나 미구현.
- 기존 홈 일정 탭의 나머지 — 야유회 포스터 카드 등.

### 폰에서 실제로 눌러봐야 확인되는 것 (curl 로는 비로그인이라 안 보임)
- 사진 업로드 / MOM 투표 저장 / 댓글 작성·삭제
- 관리자 드로어 저장 (경기 등록·결과 입력·공지 수정)
- 인스타 결과 카드 공유 — `navigator.share` 라 데스크톱과 동작이 다르다
- 라이트박스가 화면 가운데에 뜨는지

---

## 6. 검증 방법

```bash
# 개발 서버 — 백그라운드 작업으로 띄우면 세션 종료 시 죽는다. 분리해서 띄울 것
nohup npm run dev > /tmp/dev.log 2>&1 < /dev/null & disown

npx tsc --noEmit                  # 현재 0건 (.next/ 생성물 제외)
npx eslint app/components/home app/stats app/record

for u in "/" "/?home=old" "/stats" "/record" "/home-preview" "/roster" "/vote"; do
  printf "%-16s " "$u"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000$u"
done
```

`/home-preview?state=dday&list=feed` 로 5개 상태 × 2개 레이아웃을 강제로 볼 수 있다.
상태: `matching` `needVote` `dday` `afterMatch` `idle`

### 실 데이터 확인
```bash
set -a; source ./.env.local; set +a
curl -s -H "X-Underduck-Secret: $UNDERDUCK_API_SECRET" \
  "$UNDERDUCK_API_BASE/api/underduck/matches" | python3 -m json.tool | head -40
```
엔드포인트: `matches` `roster` `stats` `notice` `lineup` `attendance` `feedback` `mom-vote` `featured`

### 지금 데이터의 특징 (테스트 시 참고)
- 다음 경기 = **8/8, 상대·장소·시간 전부 미정** → 자동 판정은 `matching`
- 자체전 3건: 3/14, 3/21(상대=자체전), 5/9(상대=3파전) — 전부 스코어 없음, `type=풋살`
- 시즌 집계: 20경기 6승 0무 14패 / 승률 30% / 득 62 실 102

---

## 7. 주의

- **커밋하지 말 것.** 사용자가 반응 보고 결정한다. 브랜치 `master`, 마지막 커밋 `403bc90`.
- `app/lineup-preview/`, `public/lineup-reference.jpeg`, `public/players/*1.png` 등은
  이번 작업과 무관한 기존 untracked 파일이다. 건드리지 말 것.
- `DashboardClient.tsx:85` 의 `react-hooks/set-state-in-effect` 린트 에러는 **원본에 있던 것**이다.
- 이 저장소는 DB가 Google Sheets 가 아니라 **별도 FastAPI+Postgres 백엔드**다.
  읽기는 `app/lib/backend.ts`·`matches-backend.ts` (`udGet`). `google-sheets.ts`·`sheets-write.ts` 는
  마이그레이션 잔재이므로 새 코드에서 쓰지 말 것. (`CLAUDE.md` 상단 경고 참고)
