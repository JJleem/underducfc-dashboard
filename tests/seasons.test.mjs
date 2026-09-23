import test from "node:test";
import assert from "node:assert/strict";
import {
  SEASONS,
  currentSeasonId,
  isInSeason,
  normalizeDate,
  resolveSeasonId,
  rowsOfMatchIds,
  seasonMatchIds,
  seasonOf,
  seasonsWithMatches,
  todayInKst,
  resolveSeasonFilter,
  ALL_SEASONS,
  scaleSeasonTiers,
  maskMatchRowsToSeason,
  seasonStatus,
  daysUntilSeason,
  latestPublicWrappedSeason,
  openingCountdown,
} from "../app/lib/seasons.ts";


test("첫 시즌은 start 가 null 이라 아무리 오래된 경기도 받아낸다", () => {
  // 시즌 경계 이전 경기가 어느 시즌에도 안 속해 기록에서 통째로 사라지는 게 최악이다.
  assert.equal(seasonOf("2020-01-01"), "2526");
  assert.equal(seasonOf("2025-08-10"), "2526");
  assert.equal(seasonOf("2026-10-31"), "2526");
});

test("시즌 시작일 당일부터 새 시즌이다", () => {
  const boundary = SEASONS[1].start;
  assert.equal(boundary, "2026-11-01");
  assert.equal(seasonOf("2026-10-31"), "2526");
  assert.equal(seasonOf("2026-11-01"), "2627");
  assert.equal(seasonOf("2027-05-05"), "2627");
});

test("날짜를 못 읽으면 어느 시즌도 아니다", () => {
  assert.equal(seasonOf(""), null);
  assert.equal(seasonOf("미정"), null);
  assert.equal(seasonOf(undefined), null);
  assert.equal(seasonOf(null), null);
});

test("한 자리 월·일과 점/슬래시 구분자도 읽는다", () => {
  // 시트에서 넘어온 옛 데이터에 "2025-8-3" 같은 표기가 섞여 있다.
  assert.equal(normalizeDate("2025-8-3"), "2025-08-03");
  assert.equal(normalizeDate("2026/11/01"), "2026-11-01");
  assert.equal(normalizeDate("2026.11.01"), "2026-11-01");
  assert.equal(normalizeDate("  2025-08-10  "), "2025-08-10");
  assert.equal(normalizeDate("이상한값"), "");
  assert.equal(seasonOf("2026/11/5"), "2627");
});

test("현재 시즌은 경기가 없어도 한국 날짜만으로 정해진다", () => {
  // Vercel(UTC)에서 로컬 날짜를 쓰면 한국 오전 9시까지 전날로 계산된다.
  // 시즌이 바뀌는 11월 1일 새벽에 어제 시즌을 보여주면 안 된다.
  const kstMidnightOfOpeningDay = new Date("2026-11-01T00:30:00+09:00");
  assert.equal(todayInKst(kstMidnightOfOpeningDay), "2026-11-01");
  assert.equal(currentSeasonId(kstMidnightOfOpeningDay), "2627");

  const dayBefore = new Date("2026-10-31T23:30:00+09:00");
  assert.equal(currentSeasonId(dayBefore), "2526");
});

test("모르는 ?season= 값은 현재 시즌으로 떨어진다", () => {
  const now = new Date("2026-11-15T12:00:00+09:00");
  assert.equal(resolveSeasonId("2526", now), "2526");
  assert.equal(resolveSeasonId("2627", now), "2627");
  assert.equal(resolveSeasonId("9999", now), "2627");
  assert.equal(resolveSeasonId(undefined, now), "2627");
  assert.equal(resolveSeasonId("", now), "2627");
  // 같은 키가 두 번 오면 첫 값만 본다
  assert.equal(resolveSeasonId(["2526", "2627"], now), "2526");
});

test("개막 직후 경기가 0건이어도 현재 시즌을 그대로 보여준다", () => {
  // "경기 있는 최신 시즌"으로 몰래 넘기면 시즌이 바뀐 걸 아무도 눈치채지 못한다.
  const openingDay = new Date("2026-11-01T10:00:00+09:00");
  assert.equal(resolveSeasonId(undefined, openingDay), "2627");
});

const MATCHES = [
  ["date", "time", "location", "opponent"],
  ["2025-08-10", "", "", "A"], // matchId 0 → 2526
  ["2026-10-31", "", "", "B"], // matchId 1 → 2526
  ["2026-11-01", "", "", "C"], // matchId 2 → 2627
  ["", "", "", "미정"], //        matchId 3 → 날짜 없음
  ["2027-03-02", "", "", "D"], // matchId 4 → 2627
];

test("시즌 필터는 행을 지우지 않고 matchId 집합만 낸다", () => {
  // 소비처가 배열 index 를 matchId 로 쓰고 lineup·mom_vote 가 그 id 를 참조한다.
  // 행을 걸러내면 id 가 밀려 라인업이 엉뚱한 경기에 붙는다.
  assert.deepEqual([...seasonMatchIds(MATCHES, "2526")], [0, 1]);
  assert.deepEqual([...seasonMatchIds(MATCHES, "2627")], [2, 4]);
});

test("날짜 없는 경기는 어느 시즌에도 안 들어간다", () => {
  assert.equal(seasonMatchIds(MATCHES, "2526").has(3), false);
  assert.equal(seasonMatchIds(MATCHES, "2627").has(3), false);
  assert.equal(isInSeason("", "2526"), false);
});

test("matchId 를 물고 있는 행(라인업 등)을 시즌으로 거르고 헤더는 남긴다", () => {
  const lineups = [
    ["matchId", "quarter"],
    ["0", "1Q"],
    ["2", "1Q"],
    ["4", "2Q"],
    ["1", "3Q"],
  ];
  const ids = seasonMatchIds(MATCHES, "2627");
  assert.deepEqual(rowsOfMatchIds(lineups, ids), [
    ["matchId", "quarter"],
    ["2", "1Q"],
    ["4", "2Q"],
  ]);
});

test("빈 행 목록에 필터를 걸어도 터지지 않는다", () => {
  assert.deepEqual(rowsOfMatchIds([], new Set([1])), []);
  assert.deepEqual([...seasonMatchIds([], "2526")], []);
});

test("경기가 있는 시즌 목록 — 드롭다운에서 빈 시즌을 숨길 때 쓴다", () => {
  assert.deepEqual([...seasonsWithMatches(MATCHES)].sort(), ["2526", "2627"]);
  assert.deepEqual([...seasonsWithMatches([["date"], ["2025-01-01"]])], ["2526"]);
});

test("시즌 등급 컷 자동 축소는 항상 오름차순을 지킨다", () => {
  // [1,3,5,10,20] * 0.25 를 그냥 반올림하면 [1,1,1,3,5] 로 뭉개져
  // 등급 하나를 달성하는 순간 세 등급이 한꺼번에 붙는다.
  const scaled = scaleSeasonTiers([1, 3, 5, 10, 20]);
  for (let i = 1; i < scaled.length; i++) {
    assert.ok(scaled[i] > scaled[i - 1], `오름차순 위반: ${scaled}`);
  }
  assert.ok(scaled.every((n) => n >= 1));
});

test("모든 시즌은 id·라벨·대표색이 유일하다", () => {
  const ids = SEASONS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "시즌 id 중복");
  const labels = SEASONS.map((s) => s.label);
  assert.equal(new Set(labels).size, labels.length, "시즌 라벨 중복");
  const accents = SEASONS.map((s) => s.accent.light);
  assert.equal(new Set(accents).size, accents.length, "시즌 대표색 중복 — 나란히 놓으면 구분 불가");
});

test("시즌 목록은 start 오름차순이어야 한다 (seasonOf 가 뒤에서부터 훑는다)", () => {
  // 순서가 깨지면 경기가 조용히 엉뚱한 시즌으로 들어간다. 테스트가 유일한 방어선이다.
  assert.equal(SEASONS[0].start, null, "첫 시즌의 start 는 null 이어야 옛 경기를 받아낸다");
  for (let i = 1; i < SEASONS.length; i++) {
    assert.ok(SEASONS[i].start, `${SEASONS[i].id} 에 start 가 없다`);
    const prev = SEASONS[i - 1].start;
    if (prev) assert.ok(SEASONS[i].start > prev, `${SEASONS[i].id} 의 start 가 앞 시즌보다 이르다`);
  }
});

test("시즌 밖 경기는 지우지 않고 가린다 — index(=matchId)가 보존돼야 한다", () => {
  // buildPlayerStatsReport 가 배열 index 를 그대로 경기 상세 링크에 쓴다.
  // 행을 지우면 "최근 경기"를 눌렀을 때 엉뚱한 경기가 열린다.
  const masked = maskMatchRowsToSeason(MATCHES, "2627");
  assert.equal(masked.length, MATCHES.length);
  assert.deepEqual(masked[0], MATCHES[0]);          // 헤더 그대로
  assert.deepEqual(masked[3], MATCHES[3]);          // matchId 2 = 26-27 → 원본
  assert.deepEqual(masked[5], MATCHES[5]);          // matchId 4 = 26-27 → 원본
  assert.equal(masked[1][0], "");                   // matchId 0 = 25-26 → 가려짐
  assert.equal(masked[2][0], "");                   // matchId 1 = 25-26 → 가려짐
});

test("가려진 경기는 result 가 '예정' 이라 모든 집계에서 빠진다", () => {
  // 소비처들이 하나같이 예정 경기를 빼므로, 명단이 빈 것과 더해 이중으로 안 세어진다.
  const masked = maskMatchRowsToSeason(MATCHES, "2627");
  assert.equal(masked[1][6], "예정");
  assert.equal(masked[2][6], "예정");
});

test("빈 목록을 가려도 터지지 않는다", () => {
  assert.deepEqual(maskMatchRowsToSeason([], "2526"), []);
});

test("개막 전 시즌은 future — '기록 없음' 이 아니라 '개막 전' 이어야 한다", () => {
  // 오늘이 2026-09-21 이면 2526 이 진행 중이고 2627 은 아직 시작 전이다.
  const beforeOpening = new Date("2026-09-21T12:00:00+09:00");
  assert.equal(seasonStatus("2526", beforeOpening), "current");
  assert.equal(seasonStatus("2627", beforeOpening), "future");

  const afterOpening = new Date("2026-11-02T12:00:00+09:00");
  assert.equal(seasonStatus("2526", afterOpening), "past");
  assert.equal(seasonStatus("2627", afterOpening), "current");
});

test("개막일 당일은 future 가 아니라 current 다", () => {
  const openingDay = new Date("2026-11-01T09:00:00+09:00");
  assert.equal(seasonStatus("2627", openingDay), "current");
  assert.equal(daysUntilSeason("2627", openingDay), null);
});

test("개막까지 남은 날수는 한국 날짜 기준으로 센다", () => {
  assert.equal(daysUntilSeason("2627", new Date("2026-10-31T12:00:00+09:00")), 1);
  assert.equal(daysUntilSeason("2627", new Date("2026-10-02T12:00:00+09:00")), 30);
  // 첫 시즌은 start 가 없으니 셀 게 없다
  assert.equal(daysUntilSeason("2526", new Date("2026-10-31T12:00:00+09:00")), null);
  // UTC 로 계산하면 한국 오전에 하루가 어긋난다
  assert.equal(daysUntilSeason("2627", new Date("2026-10-31T00:30:00+09:00")), 1);
});

// ───────────────────────── 대표 칭호 키 ─────────────────────────
// (featureKey 는 titles.ts 에 있어 node 테스트에서 직접 import 할 수 없으므로
//  같은 규칙을 여기 복제해 계약만 고정한다. 규칙이 갈리면 이 테스트가 먼저 깨진다.)

const featureKey = (t) =>
  t.scope === "season" && t.seasonId ? `season:${t.seasonId}:${t.id}` : `career:${t.id}`;
const normalizeFeatureKey = (raw) => {
  const v = (raw || "").trim();
  if (!v) return "";
  return v.startsWith("season:") || v.startsWith("career:") ? v : `career:${v}`;
};

test("같은 칭호라도 시즌판과 통산판은 다른 대표 키를 갖는다", () => {
  // 둘이 같은 키면 "26-27 득점왕" 을 걸어둬도 통산 쪽이 붙었다 떨어졌다 한다.
  const season = { id: "lead_goals", scope: "season", seasonId: "2627" };
  const career = { id: "lead_goals" };
  assert.equal(featureKey(season), "season:2627:lead_goals");
  assert.equal(featureKey(career), "career:lead_goals");
  assert.notEqual(featureKey(season), featureKey(career));
});

test("시즌이 다르면 키도 다르다 — 지난 시즌 대표가 덮이지 않는다", () => {
  assert.notEqual(
    featureKey({ id: "lead_goals", scope: "season", seasonId: "2526" }),
    featureKey({ id: "lead_goals", scope: "season", seasonId: "2627" }),
  );
});

test("접두사 없는 옛 값은 통산으로 읽는다 — 마이그레이션이 필요 없다", () => {
  assert.equal(normalizeFeatureKey("scorer"), "career:scorer");
  assert.equal(normalizeFeatureKey("career:scorer"), "career:scorer");
  assert.equal(normalizeFeatureKey("season:2526:scorer"), "season:2526:scorer");
  assert.equal(normalizeFeatureKey("  scorer  "), "career:scorer");
  assert.equal(normalizeFeatureKey(""), "");
});

test("대표 키는 DB 컬럼(VARCHAR 50)에 들어간다", () => {
  // season:<4자>:<칭호 id> — 가장 긴 칭호 id 를 써도 여유가 있어야 한다.
  const longest = "attacking_centerback"; // 20자
  const key = featureKey({ id: longest, scope: "season", seasonId: "2526" });
  assert.ok(key.length <= 50, `${key} (${key.length}자) 가 50자를 넘는다`);
});

// ───────────────────────── 전체 보기 ─────────────────────────

test("전체(all)와 빈 값은 필터 없음(null)이다 — 홈은 기본이 전체다", () => {
  // 기본을 현재 시즌으로 두면 개막일 아침에 홈 피드가 통째로 빈다.
  assert.equal(resolveSeasonFilter(undefined), null);
  assert.equal(resolveSeasonFilter(""), null);
  assert.equal(resolveSeasonFilter("all"), null);
  assert.equal(resolveSeasonFilter(ALL_SEASONS), null);
});

test("아는 시즌은 그 시즌으로, 모르는 값은 전체로 떨어진다", () => {
  // /stats 의 resolveSeasonId 와 다르다 — 거기선 모르는 값이 현재 시즌이지만
  // 홈에서는 전체로 떨어져야 피드가 안 빈다.
  assert.equal(resolveSeasonFilter("2526"), "2526");
  assert.equal(resolveSeasonFilter("2627"), "2627");
  assert.equal(resolveSeasonFilter("9999"), null);
  assert.equal(resolveSeasonFilter(["2526", "2627"]), "2526");
});

test("래핑 기본 시즌은 '전원 공개된 가장 최근 시즌' 이다 — 현재 시즌이 아니다", () => {
  // 개막일(11/1)부터 현재 시즌은 26-27 인데 그 래핑은 아직 안 열렸다.
  // 기본을 현재 시즌으로 두면 막 열린 25-26 래핑 대신 404 가 뜬다.
  const kst = (d, h = 0) => new Date(`${d}T${String(h).padStart(2, "0")}:00:00+09:00`);
  assert.equal(latestPublicWrappedSeason(kst("2026-10-31", 23)), null);
  assert.equal(latestPublicWrappedSeason(kst("2026-11-01", 0)), "2526");
  assert.equal(latestPublicWrappedSeason(kst("2027-03-01", 12)), "2526");
  // 같은 순간 현재 시즌은 이미 26-27 이다.
  assert.equal(currentSeasonId(kst("2026-11-01", 0)), "2627");
});

// ───────────────────────── 26-27 전환 회귀 ─────────────────────────
// 경계는 KST 11/1 0시 = UTC 10/31 15:00. Vercel 은 UTC 로 돈다.

test("전환 경계: UTC 10/31 14:59:59 까지는 25-26, 15:00 부터 26-27", () => {
  const before = new Date("2026-10-31T14:59:59Z");
  const at = new Date("2026-10-31T15:00:00Z");
  assert.equal(currentSeasonId(before), "2526");
  assert.equal(currentSeasonId(at), "2627");
  assert.equal(resolveSeasonId(undefined, at), "2627");
  assert.equal(seasonStatus("2526", at), "past");
  assert.equal(seasonStatus("2627", at), "current");
});

test("전환 경계: 같은 순간 래핑 기본 시즌은 막 열린 25-26 이다", () => {
  assert.equal(latestPublicWrappedSeason(new Date("2026-10-31T14:59:59Z")), null);
  assert.equal(latestPublicWrappedSeason(new Date("2026-10-31T15:00:00Z")), "2526");
});

test("개막 D-day 는 개막 45일 전부터만 뜬다", () => {
  const kst = (d) => new Date(`${d}T09:00:00+09:00`);
  assert.equal(openingCountdown(kst("2026-09-16")), null); // 46일 전
  assert.deepEqual(openingCountdown(kst("2026-09-17")), { seasonId: "2627", label: "26-27", days: 45 });
  assert.deepEqual(openingCountdown(kst("2026-09-23")), { seasonId: "2627", label: "26-27", days: 39 });
  assert.deepEqual(openingCountdown(kst("2026-10-31")), { seasonId: "2627", label: "26-27", days: 1 });
  // 개막일 당일부터는 D-day 가 아니라 그냥 현재 시즌이다.
  assert.equal(openingCountdown(kst("2026-11-01")), null);
});
