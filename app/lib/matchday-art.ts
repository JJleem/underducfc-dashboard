// 예정 경기 카드의 배경 그림 고르기.
//
// AI로 뽑는 건 "배경"뿐이다. D-day 숫자는 화면에서 얹는다 — 확산 모델은 글자를
// 뭉개고, 예정 경기는 전부 피드에 올라오므로(NewHome) D 값에 상한이 없다.
// D-21 카드도 생긴다. 배경에 숫자를 구우면 그 순간 대응할 수 없는 값이 생긴다.
// (언더덕 크레스트는 반대로 그림 안에 있다 — 레퍼런스 이미지로 넣어 뽑았다.
//  scripts/gen-matchday-art.mts 참고.)
//
// 고르는 방식은 "고정된 랜덤"이다. 매 렌더마다 뽑으면 새로고침할 때마다 그림이
// 바뀌어 산만하고, 서버와 클라이언트가 달라져 hydration 이 깨진다.
// hash(matchId, dDay) 로 뽑으면 경기마다 다른 그림이 나오면서도 같은 날 안에서는
// 고정된다. 하루가 지나면 바뀌므로 카운트다운이 실제로 진행되는 느낌이 난다.

export interface MatchdayArt {
  src: string;
  /** 매치데이 아카이브에서 사용자에게 보여 주는 작품 제목. */
  title?: string;
  /** 배경이 밝은 그림. 흰 글씨가 묻히므로 카드가 어두운 글씨로 뒤집는다. */
  light?: boolean;
  /**
   * 이미 그림 자체가 어두운 것. 막을 얇게 깐다.
   * 깃발처럼 배경이 단순한 그림은 두껍게 깔아야 글씨가 사는데, 팀 사진처럼
   * 원래 어두운 그림에 같은 막을 씌우면 애써 만든 그림이 그냥 탁해진다.
   */
  soft?: boolean;
}

/**
 * public/matchday/ 에 실제로 들어 있는 배경들.
 * 여기 적힌 것만 쓰인다 — 파일 없는 이름을 넣으면 카드마다 404 가 나간다.
 */
export const MATCHDAY_ART: readonly MatchdayArt[] = [
  // 사용자가 직접 선별한 언더덕 아카이브 45장
  { src: "/matchday/아카이브-튈프-박사의-VAR-판독.webp", title: "튈프 박사의 VAR 판독", soft: true },
  { src: "/matchday/아카이브-PK-VS-화면.webp", title: "PK VS 화면", soft: true },
  { src: "/matchday/아카이브-하프타임-작전판.webp", title: "하프타임 작전판", soft: true },
  { src: "/matchday/아카이브-스티커-앨범.webp", title: "스티커 앨범", light: true },
  { src: "/matchday/아카이브-순교자.webp", title: "순교자", soft: true },
  { src: "/matchday/아카이브-누가-찰래.webp", title: "누가 찰래", light: true },
  { src: "/matchday/아카이브-골대.webp", title: "골대", light: true },
  { src: "/matchday/아카이브-판정-불복.webp", title: "판정 불복", soft: true },
  { src: "/matchday/아카이브-물웅덩이.webp", title: "물웅덩이", light: true },
  { src: "/matchday/아카이브-말리는-중.webp", title: "말리는 중", soft: true },
  { src: "/matchday/아카이브-벽-뒤에-눕는-사람.webp", title: "벽 뒤에 눕는 사람", soft: true },
  { src: "/matchday/아카이브-완장의-계승.webp", title: "완장의 계승", light: true },
  { src: "/matchday/아카이브-공-어디-갔어.webp", title: "공 어디 갔어", light: true },
  { src: "/matchday/아카이브-엇갈림.webp", title: "엇갈림", light: true },
  { src: "/matchday/아카이브-스트레칭.webp", title: "스트레칭", soft: true },
  { src: "/matchday/아카이브-죄목-오프사이드-상습범.webp", title: "죄목: 오프사이드 상습범", light: true },
  { src: "/matchday/아카이브-프레싱-오-드-퍼퓸.webp", title: "PRESSING — 오 드 퍼퓸", soft: true },
  { src: "/matchday/아카이브-마법의-축구화.webp", title: "마법의 축구화", soft: true },
  { src: "/matchday/아카이브-누가-패스를-안-했나.webp", title: "누가 패스를 안 했나", soft: true },
  { src: "/matchday/아카이브-자전거-레이싱팀.webp", title: "자전거 레이싱팀", soft: true },
  { src: "/matchday/아카이브-속보-헛발질.webp", title: "속보: 헛발질", soft: true },
  { src: "/matchday/아카이브-신부는-축구공.webp", title: "신부는 축구공", light: true },
  { src: "/matchday/아카이브-이번-주-특가-미드필더.webp", title: "이번 주 특가: 미드필더", light: true },
  { src: "/matchday/아카이브-코너킥-공포.webp", title: "코너킥 공포", soft: true },
  { src: "/matchday/아카이브-셰프의-특제-전술.webp", title: "셰프의 특제 전술", light: true },
  { src: "/matchday/아카이브-우주정거장-킥오프.webp", title: "우주정거장 킥오프", soft: true },
  { src: "/matchday/아카이브-최후의-작전회의.webp", title: "최후의 작전회의", soft: true },
  { src: "/matchday/아카이브-새벽-편의점-골키퍼.webp", title: "새벽 편의점 골키퍼", light: true },
  { src: "/matchday/아카이브-홍콩-느와르.webp", title: "홍콩 느와르", soft: true },
  { src: "/matchday/아카이브-야생의-미드필더.webp", title: "야생의 미드필더", soft: true },
  { src: "/matchday/아카이브-조선시대-축국.webp", title: "조선시대 축국", light: true },
  { src: "/matchday/아카이브-무단-도로-축구.webp", title: "무단 도로 축구", light: true },
  { src: "/matchday/아카이브-벤치-대기.webp", title: "벤치 대기", light: true },
  { src: "/matchday/아카이브-미드필드의-상속자들.webp", title: "미드필드의 상속자들", soft: true },
  { src: "/matchday/아카이브-골대-지고-정상까지.webp", title: "골대 지고 정상까지", light: true },
  { src: "/matchday/아카이브-핸드볼-파울-청문회.webp", title: "핸드볼 파울 청문회", light: true },
  { src: "/matchday/아카이브-능력이-다-애매한-히어로.webp", title: "능력이 다 애매한 히어로", soft: true },
  { src: "/matchday/아카이브-러닝머신-마라톤-우승.webp", title: "러닝머신 마라톤 우승", light: true },
  { src: "/matchday/아카이브-잃어버린-축구공을-찾아서.webp", title: "잃어버린 축구공을 찾아서", soft: true },
  { src: "/matchday/아카이브-축구공-모양-심장.webp", title: "축구공 모양 심장", light: true },
  { src: "/matchday/아카이브-찜질방-VAR-판독실.webp", title: "찜질방 VAR 판독실", soft: true },
  { src: "/matchday/아카이브-야간-스타디움-세이브.webp", title: "야간 스타디움 세이브", soft: true },
  { src: "/matchday/아카이브-우승-트로피-세리머니.webp", title: "우승 트로피 세리머니", soft: true },
  { src: "/matchday/아카이브-사이드라인-돌파.webp", title: "사이드라인 돌파", soft: true },
  { src: "/matchday/아카이브-새벽-훈련-스프린트.webp", title: "새벽 훈련 스프린트", light: true },
  // 2026 FINAL NIGHT gallery selection
  { src: "/matchday/gallery-final-night-1.webp", soft: true },
  { src: "/matchday/gallery-final-night-2.webp", soft: true },
  { src: "/matchday/gallery-final-night-3.webp", soft: true },
  { src: "/matchday/gallery-final-night-6.webp", soft: true },
  { src: "/matchday/gallery-final-night-7.webp", soft: true },
  { src: "/matchday/gallery-final-night-all.webp", soft: true },
  { src: "/matchday/gallery-group-archive.webp", soft: true },
  { src: "/matchday/gallery-coach.webp", soft: true },
  { src: "/matchday/gallery-hyunjun.webp", soft: true },
  // 언더덕 크레스트 15장
  { src: "/matchday/flag-1.webp" },
  { src: "/matchday/flag-2.webp" },
  { src: "/matchday/flag-3.webp" },
  { src: "/matchday/flag-4.webp" },
  { src: "/matchday/flag-5.webp" },
  { src: "/matchday/flag-6.webp", light: true },
  { src: "/matchday/flag-7.webp" },
  { src: "/matchday/flag-8.webp" },
  { src: "/matchday/flag-9.webp" },
  { src: "/matchday/flag-10.webp" },
  { src: "/matchday/flag-11.webp" },
  { src: "/matchday/flag-12.webp" },
  { src: "/matchday/flag-13.webp" },
  { src: "/matchday/flag-14.webp" },
  { src: "/matchday/flag-15.webp" },
  // 흑백 + 핑크 한 색 3장
  { src: "/matchday/mono-5.webp", soft: true },
  { src: "/matchday/mono-6.webp", soft: true },
  { src: "/matchday/mono-8.webp", soft: true },
  // 듀오 2장
  { src: "/matchday/duo-2.webp", soft: true },
  { src: "/matchday/duo-3.webp", soft: true },
  // 팀 사진 변환 20장
  { src: "/matchday/team-1.webp", soft: true },
  { src: "/matchday/team-3.webp", soft: true },
  { src: "/matchday/team-4.webp", soft: true },
  { src: "/matchday/team-7.webp", soft: true },
  { src: "/matchday/team-13.webp", soft: true },
  { src: "/matchday/team-14.webp", soft: true },
  { src: "/matchday/team-16.webp", soft: true },
  { src: "/matchday/team-18.webp", soft: true },
  { src: "/matchday/team-20.webp", soft: true },
  { src: "/matchday/team-22.webp", soft: true },
  { src: "/matchday/team-25.webp", soft: true },
  { src: "/matchday/team-29.webp", soft: true },
  { src: "/matchday/team-30.webp", soft: true },
  { src: "/matchday/team-32.webp", soft: true },
  { src: "/matchday/team-33.webp", soft: true },
  { src: "/matchday/team-34.webp", soft: true },
  { src: "/matchday/team-35.webp", soft: true },
  { src: "/matchday/team-36.webp", soft: true },
  { src: "/matchday/team-37.webp", soft: true },
  { src: "/matchday/team-38.webp", soft: true },
  // 종이공예 크림 배경. 밝아서 카드가 어두운 글씨로 뒤집는다.
  { src: "/matchday/team-39.webp", light: true },
  // 위트 5장
  { src: "/matchday/fun-11.webp", soft: true },
  { src: "/matchday/fun-16.webp", soft: true },
  { src: "/matchday/fun-18.webp", soft: true },
  // 콜라주. 바탕이 밝은 편이라 기본 막을 그대로 쓴다.
  { src: "/matchday/fun-19.webp" },
  { src: "/matchday/fun-20.webp", light: true },
  // 단독 인물 3장(제록스 시리즈와 별개 화풍)
  { src: "/matchday/solo-1.webp", soft: true },
  { src: "/matchday/solo-2.webp", soft: true },
  // 실크스크린 GK. 가운데가 크림색이라 기본 막을 그대로 쓴다.
  { src: "/matchday/solo-3.webp" },
  // 핑크 만다라 단독 선수. 원본부터 어두워 얇은 막을 쓴다.
  { src: "/matchday/solo-4.webp", soft: true },
  // 핑크 라인 스튜디오 단독 선수.
  { src: "/matchday/solo-5.webp", soft: true },
  // 하트 단체사진도 인물과 종이 질감을 살리려고 얇은 막을 쓴다.
  { src: "/matchday/team-40.webp", soft: true },
  // 제록스 단독 선수 포스터 8장. 원본부터 어두워서 전부 soft.
  // (xerox-7은 강환국이었는데 뺐다. 번호는 나머지를 건드리지 않으려고 비워 둔다.)
  // 만드는 법과 규칙은 HANDOFF-matchday-xerox-portraits.md 에 있다.
  { src: "/matchday/xerox-1.webp", soft: true }, // 시리즈 기준(test36)
  { src: "/matchday/xerox-2.webp", soft: true }, // 황동주
  { src: "/matchday/xerox-3.webp", soft: true }, // 박상민
  { src: "/matchday/xerox-4.webp", soft: true }, // 김준수
  { src: "/matchday/xerox-6.webp", soft: true }, // 강창훈
  { src: "/matchday/xerox-8.webp", soft: true }, // 금상덕
  { src: "/matchday/xerox-9.webp", soft: true }, // 김한별
  { src: "/matchday/xerox-10.webp", soft: true }, // 문대영
  // 다크 시네마틱 단독 선수 7장. 검은 경기장 배경이라 전부 soft.
  { src: "/matchday/dark-1.webp", soft: true }, // 강환국
  { src: "/matchday/dark-2.webp", soft: true }, // 공도하
  { src: "/matchday/dark-3.webp", soft: true }, // 김광민
  { src: "/matchday/dark-4.webp", soft: true }, // 김주성
  { src: "/matchday/dark-5.webp", soft: true }, // 원석희
  { src: "/matchday/dark-6.webp", soft: true }, // 이재욱
  { src: "/matchday/dark-7.webp", soft: true }, // 임재준
];

/**
 * 그림 위에 까는 막. 카드와 확인용 페이지가 같은 값을 쓰도록 여기 모아 둔다
 * (양쪽에 복붙해 두면 한쪽만 고쳐져 두 화면이 조용히 달라진다).
 *
 * 어두운 그림: 전체를 한 겹 가라앉히고 + 글자 뒤(위·아래)를 한 번 더 누른다.
 * 밝은 그림(수채화): 반대로 흰 막을 깔아 어두운 글씨를 받친다.
 */
export const ART_VEIL = "rgba(7,13,32,.30)";
export const ART_SCRIM_DARK =
  "linear-gradient(180deg,rgba(7,13,32,.62) 0%,rgba(7,13,32,.18) 46%,rgba(7,13,32,.50) 100%)";
/** 이미 어두운 그림용. 글자 뒤만 살짝 누르고 가운데는 거의 건드리지 않는다. */
export const ART_SCRIM_SOFT =
  "linear-gradient(180deg,rgba(7,13,32,.42) 0%,rgba(7,13,32,0) 40%,rgba(7,13,32,.28) 100%)";
/**
 * 끝난 경기 카드용. 예정 경기보다 훨씬 두껍다 — 그 카드는 스코어·득점자·MOM까지
 * 글자가 빽빽해서, 얇게 깔면 그림과 글자가 서로 잡아먹는다.
 * 그림은 분위기만 남기고 내용이 주인공으로 남게 한다.
 */
export const ART_RESULT_VEIL =
  "linear-gradient(180deg,rgba(7,13,32,.52) 0%,rgba(7,13,32,.26) 45%,rgba(7,13,32,.58) 100%)";
export const ART_SCRIM_LIGHT =
  "linear-gradient(180deg,rgba(255,255,255,.72) 0%,rgba(255,255,255,.34) 46%,rgba(255,255,255,0) 72%)";

/** 작은 정수 해시(FNV-1a 변형). 인접한 입력이 인접한 결과로 몰리지 않게 섞는다. */
function hash(a: number, b: number): number {
  let h = 2166136261 ^ a;
  h = Math.imul(h ^ b, 16777619);
  h ^= h >>> 13;
  return Math.abs(Math.imul(h, 16777619));
}

/**
 * 예정 경기 그림을 통째로 다시 섞고 싶을 때 올리는 값.
 *
 * "오늘 뜬 게 별로다" 싶으면 이 숫자만 바꾸면 된다. 예정 경기 그림은 어차피
 * 날마다 바뀌는 값이라 다시 섞여도 잃는 게 없다.
 * ⚠️ 끝난 경기(matchResultArt)는 이걸 쓰지 않는다 — 그건 고정이어야 한다.
 */
const DDAY_SALT = 989;

/** 32비트 정수를 고루 흩뜨린다(murmur3 fmix32). */
function mix32(n: number): number {
  let h = n | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * 그림 순서를 통째로 섞는다. 뽑을 때마다 새로 뽑지 않고 이 순열을 훑는 이유는
 * `matchdayArt` 주석에 있다.
 *
 * ⚠️ 끝난 경기(matchResultArt·matchCasualArt)는 `hash` 를 그대로 쓴다. 그쪽은
 *    한 번 정해진 그림이 바뀌면 안 되므로 여기서만 바꿨다.
 */
function shuffledOrder(seed: number): number[] {
  const order = MATCHDAY_ART.map((_, i) => i);
  let s = mix32(seed);
  for (let i = order.length - 1; i > 0; i--) {
    s = mix32(s);
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * 경기 하나가 카운트다운 동안 쓰는 칸 수. 크론이 다음 토요일 경기를 만들므로
 * 실제로 뜨는 건 D-7~D-0 여덟 장이다(scripts 아님, app/api/cron/create-match).
 */
const SLOTS_PER_MATCH = 8;

/**
 * 이 경기·이 날짜에 쓸 배경. 그림이 하나도 없으면 null(카드는 기존 그라디언트).
 *
 * 위 `hash` 를 쓰지 않는다. 그 함수는 matchId·dDay 처럼 작고 인접한 입력에서
 * 뭉갠다 — 경기 36개 × D-0~21 로 792번 뽑아 봤더니 서로 다른 값이 64개뿐이었고,
 * 그림 59장 중 17장은 한 번도 안 걸렸다. 애써 만든 그림이 영영 안 보이는 것이다.
 * 뒤에 fmix32 를 덧대도 소용없다. 이미 사라진 정보는 되살아나지 않는다.
 *
 * 그래서 순열을 훑는다. 매번 새로 뽑으면 D-9 와 D-7 에 같은 그림이 걸리는 일이
 * 생기는데(실제로 생겼다), 카운트다운은 같은 사람이 며칠을 이어 보는 화면이라
 * 그 중복이 제일 눈에 띈다.
 *
 * 단 순열을 **경기마다 새로** 섞으면 안 된다. 그러면 한 경기 안에서만 안 겹칠 뿐
 * 경기와 경기 사이는 복원추출이 되어, 이전에 뭘 썼는지 기억하지 못한다. 그림
 * 76장 기준으로 뽑기 40번(경기 5회) 시점에 45장이 한 번도 안 뜨고 8장이 두세 번
 * 뜬다. 전부 한 번씩 보려면 평균 374번, 주 8번씩 뽑아도 47주가 걸린다.
 *
 * 그래서 순열은 **전역으로 하나만** 두고, 경기가 이어서 소비한다. `pos` 는 하루에
 * 한 칸, 경기마다 여덟 칸 전진하는 전역 카운터다. 그림을 다 쓰면(열 경기 남짓)
 * 다음 바퀴에서 다시 섞인다. 열 경기면 76장이 전부 한 번씩 나온다.
 *
 * ⚠️ 끝난 경기(matchResultArt·matchCasualArt)는 `hash` 를 그대로 쓴다. 그쪽은
 *    한 번 정해진 그림이 바뀌면 안 되므로 여기서만 바꿨다.
 */
export function matchdayArt(matchId: number, dDay: number): MatchdayArt | null {
  const n = MATCHDAY_ART.length;
  if (n === 0) return null;
  // 결과 입력이 늦어 D 가 음수인 카드도, 관리자가 미리 만들어 D 가 8 이상인 카드도
  // 들어온다(MatchFeed 의 awaitingResult). 둘 다 앞뒤 칸으로 자연스럽게 밀린다.
  const pos = matchId * SLOTS_PER_MATCH - dDay;
  // 바퀴가 바뀌는 지점을 경기 단위로 끊는다. `pos` 로 바퀴를 세면 한 경기의 여드레가
  // 경계를 걸칠 때 중간에 순열이 갈려 D-5 와 D-2 에 같은 그림이 걸린다(2000경기에
  // 31번). 경기의 첫 칸(D-7)으로 세면 여드레가 한 순열 안에 있어 0번이 된다.
  const cycle = Math.floor((matchId * SLOTS_PER_MATCH - (SLOTS_PER_MATCH - 1)) / n);
  const order = shuffledOrder(Math.imul(cycle + DDAY_SALT * 7919, 0x9e3779b1));
  return MATCHDAY_ART[order[((pos % n) + n) % n]];
}

/**
 * 끝난 경기 카드·타일에 쓸 배경 후보. 크레스트가 박힌 깃발 계열만 쓴다.
 *
 * 결과 카드에는 원래 언더덕 마크를 워터마크로 얹고 있었는데, 그림 안에 이미
 * 크레스트가 있으니 둘이 겹친다. 그래서 워터마크를 걷고 그림 쪽에 맡겼다.
 * 밝은 그림(수채화)은 뺀다 — 흰 글씨를 얹는 자리라 바탕이 밝으면 안 읽힌다.
 */
const RESULT_ART = MATCHDAY_ART.filter((a) => a.src.includes("/flag-") && !a.light);

/**
 * 이미 끝난 경기(사진 없는)의 배경. 날짜를 섞지 않는다 — 여기가 예정 경기와 다르다.
 *
 * 지난 경기는 기록이다. 하루마다 그림이 바뀌면 "그 경기의 사진"이 아니게 되고,
 * 무엇보다 피드와 마이페이지가 서로 다른 그림을 띄우게 된다(자정을 걸쳐 보면
 * 사람마다 달라지기도 한다). matchId 하나로만 뽑아 영구 고정한다.
 */
export function matchResultArt(matchId: number): MatchdayArt | null {
  if (RESULT_ART.length === 0) return null;
  return RESULT_ART[hash(matchId, 0x9e37) % RESULT_ART.length];
}

/**
 * 자체전·풋살·야유회 카드의 배경. 팀·펀 계열만 쓴다.
 *
 * 깃발(크레스트)은 "상대와 붙으러 나간 날"의 그림이다. 자체전은 우리끼리 편을
 * 갈라 하는 훈련이라 같은 그림을 깔면 결과 카드와 구분이 안 된다 — 카드 내용을
 * 아무리 바꿔도 첫인상이 같으면 스크롤에서는 같은 카드로 읽힌다.
 */
const CASUAL_ART = MATCHDAY_ART.filter(
  (a) => (a.src.includes("/team-") || a.src.includes("/fun-")) && !a.light,
);

/** 자체전 카드의 배경. 결과 카드와 같은 이유로 날짜를 섞지 않는다(영구 고정). */
export function matchCasualArt(matchId: number): MatchdayArt | null {
  if (CASUAL_ART.length === 0) return null;
  return CASUAL_ART[hash(matchId, 0x51ed) % CASUAL_ART.length];
}
