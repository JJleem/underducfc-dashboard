import test from "node:test";
import assert from "node:assert/strict";
import { REGULAR_SHARE, bucketize, buildSeasonWrapped, pickBench, pickBestEleven, rankOf, roleBucket } from "../app/lib/wrapped.ts";
import { isWrappedPublic } from "../app/lib/seasons.ts";

// ───────────────────────── 공개 게이트 ─────────────────────────

test("래핑은 시즌 마지막 경기(10/31)까지 닫혀 있다", () => {
  // 그 전까지는 운영진만 본다(운영진 판정은 페이지에서 따로 한다).
  assert.equal(isWrappedPublic("2526", new Date("2026-09-21T12:00:00+09:00")), false);
  assert.equal(isWrappedPublic("2526", new Date("2026-10-31T23:00:00+09:00")), false);
});

test("시즌이 닫히는 11/1 부터 전원에게 열린다", () => {
  assert.equal(isWrappedPublic("2526", new Date("2026-11-01T00:10:00+09:00")), true);
  assert.equal(isWrappedPublic("2526", new Date("2026-12-01T12:00:00+09:00")), true);
});

test("wrappedFrom 이 null 인 시즌은 영영 운영진 전용", () => {
  // 아직 시작도 안 한 시즌 — 끝날 때쯤 날짜를 넣는다.
  assert.equal(isWrappedPublic("2627", new Date("2027-06-01T12:00:00+09:00")), false);
});

test("한국 날짜로 판정한다 — UTC 로 재면 공개일 아침이 전날로 밀린다", () => {
  // 한국 11/1 08:00 = UTC 10/31 23:00. UTC 기준이면 아직 안 열렸다고 나온다.
  assert.equal(isWrappedPublic("2526", new Date("2026-11-01T08:00:00+09:00")), true);
});

// ───────────────────────── 팀 내 순위 ─────────────────────────

test("동점은 같은 등수이고 공동으로 표시한다", () => {
  // 같은 기록의 두 사람이 서로 다른 등수를 보면 안 된다.
  const values = [9, 7, 7, 3];
  assert.deepEqual(rankOf(values, 9), { value: 9, rank: 1, total: 4, tied: false });
  assert.deepEqual(rankOf(values, 7), { value: 7, rank: 2, total: 4, tied: true });
  assert.deepEqual(rankOf(values, 3), { value: 3, rank: 4, total: 4, tied: false });
});

test("0인 기록은 순위를 내지 않는다", () => {
  // "0골 공동 12위" 는 돌아볼 거리가 못 된다.
  assert.equal(rankOf([5, 3, 0, 0], 0), null);
  assert.equal(rankOf([], 3), null);
});

// ───────────────────────── 래핑 조립 ─────────────────────────

const STATS = [
  ["no", "name", "pos", "apps", "goals", "assists", "mom"],
  ["7", "홍길동", "FW", "18", "7", "3", "2"],
  ["10", "김철수", "MF", "20", "7", "1", "1"],
  ["4", "박영희", "DF", "12", "0", "4", "0"],
  ["", "게스트", "", "5", "9", "9", "9"], // 로스터 밖 — 순위에 끼면 안 된다
];
const ROSTER = new Set(["홍길동", "김철수", "박영희"]);

const REPORT = {
  totalQuarters: 40,
  lineupMatches: 15,
  avgQuarters: "2.7",
  pointsPerGame: "0.56",
  momRate: 11,
  roles: [
    { role: "ST", quarters: 24, percent: 60, point: { x: 50, y: 20 } },
    { role: "CM", quarters: 16, percent: 40, point: { x: 50, y: 55 } },
  ],
  primaryRole: "ST",
  primaryFormation: "4-3-3",
  roleSummary: "ST 역할에서 가장 뚜렷한 정체성을 보였어요.",
  recent: [],
  bestGame: { matchId: 4, opponent: "NSW FC", result: "승", goals: 2, assists: 1, isMom: true },
  maxGoals: 2,
  maxPoints: 3,
  maxPointStreak: 4,
  record: { wins: 10, draws: 3, losses: 5, winRate: 56 },
  pointMatches: 8,
  recentPoints: 3,
  roleVariety: 2,
  sideBalance: { left: 10, center: 80, right: 10 },
  groupBalance: [{ group: "MF", percent: 40 }, { group: "FW", percent: 60 }],
  latestRoles: ["ST"],
  topOpponent: { name: "NSW FC", points: 5 },
};

const CHEMISTRY = {
  totalQuarters: 40,
  featured: null,
  partners: [
    // 호흡 점수는 높지만 같이 뛴 쿼터는 적다 — 래핑은 "가장 오래" 를 말하므로 얘가 아니다
    { name: "박영희", sharedQuarters: 9, sharedMatches: 5, affinity: 99, supplied: 3, received: 0, combinedGoals: 3, record: {}, label: "", strength: "찰떡궁합", rankScore: 99 },
    { name: "김철수", sharedQuarters: 31, sharedMatches: 14, affinity: 40, supplied: 1, received: 2, combinedGoals: 3, record: {}, label: "", strength: "강한 연결", rankScore: 40 },
  ],
};

const base = {
  name: "홍길동",
  seasonId: "2526",
  seasonLabel: "25-26",
  rawSeasonStats: STATS,
  rosterNames: ROSTER,
  report: REPORT,
  chemistry: CHEMISTRY,
  titles: [],
  teamMatches: 22,
  attended: 18,
  maxStreak: 6,
  roleQuarters: {},
  xiShape: [],
  formation: "4-2-3-1",
  lineupCoverage: { withLineup: 19, total: 30 },
  matchesByPlayer: {},
  monthly: [],
  team: { played: 30, wins: 6, draws: 1, losses: 18, goalsFor: 92, goalsAgainst: 140 },
  bestGameArt: {},
  weather: { rain: 0, heat: 0, cold: 0 },
  momMatches: [],
};

test("기본 스탯과 시즌 라벨을 그대로 싣는다", () => {
  const w = buildSeasonWrapped(base);
  assert.equal(w.seasonLabel, "25-26");
  assert.equal(w.apps, 18);
  assert.equal(w.goals, 7);
  assert.equal(w.assists, 3);
  assert.equal(w.mom, 2);
  assert.equal(w.points, 10);
  assert.equal(w.hasRecord, true);
});

test("로스터 밖 이름(게스트·자책골)은 순위 모집단에서 뺀다", () => {
  // 게스트는 여러 사람이 공유하는 이름이라 기록이 계속 누적된다 — 끼면 전원이 밀린다.
  const w = buildSeasonWrapped(base);
  assert.equal(w.goalsRank.total, 3);
  // 홍길동 7골 · 김철수 7골 → 공동 1위. 게스트 9골이 끼면 2위가 된다.
  assert.equal(w.goalsRank.rank, 1);
  assert.equal(w.goalsRank.tied, true);
  assert.equal(w.pointsRank.rank, 1); // 10P 로 단독 1위
  assert.equal(w.pointsRank.tied, false);
});

test("기록이 0인 항목은 순위를 만들지 않는다", () => {
  const w = buildSeasonWrapped({
    ...base,
    name: "박영희",
    report: { ...REPORT, roles: [], totalQuarters: 0, roleVariety: 0 },
  });
  assert.equal(w.goals, 0);
  assert.equal(w.goalsRank, null);
  assert.equal(w.assistsRank.rank, 1); // 4도움 단독 1위
});

test("가장 오래 함께 뛴 사람은 호흡 점수가 아니라 쿼터 수로 고른다", () => {
  // partners 는 호흡 점수순으로 정렬돼 오지만, 래핑이 말하려는 건 "제일 많이 같이 뛴" 사람이다.
  const w = buildSeasonWrapped(base);
  assert.equal(w.topPartner.name, "김철수");
  assert.equal(w.topPartner.sharedQuarters, 31);
  assert.equal(w.topPartner.linkedGoals, 3); // supplied 1 + received 2
});

test("출석률은 팀이 실제로 치른 경기 대비로 낸다", () => {
  const w = buildSeasonWrapped(base);
  assert.equal(w.attendance.count, 18);
  assert.equal(w.attendance.total, 22);
  assert.equal(w.attendance.rate, 82);
  assert.equal(w.attendance.maxStreak, 6);
});

test("팀 경기가 0이면 출석률은 null — 0%로 쓰면 안 나온 것처럼 읽힌다", () => {
  const w = buildSeasonWrapped({ ...base, teamMatches: 0, attended: 0 });
  assert.equal(w.attendance.rate, null);
});

test("주 포지션은 가장 많이 뛴 역할과 그 비중이다", () => {
  const w = buildSeasonWrapped(base);
  assert.equal(w.primaryRole, "ST");
  assert.equal(w.primaryRoleQuarters, 24);
  assert.equal(w.primaryRolePercent, 60);
  assert.equal(w.totalQuarters, 40);
});

test("한 경기도 안 뛰었으면 hasRecord 가 false — 0으로 가득한 여덟 장을 넘기게 하지 않는다", () => {
  const w = buildSeasonWrapped({
    ...base,
    name: "박영희",
    rawSeasonStats: [STATS[0], ["4", "박영희", "DF", "0", "0", "0", "0"]],
    report: { ...REPORT, totalQuarters: 0, roles: [] },
    chemistry: { totalQuarters: 0, featured: null, partners: [] },
    attended: 0,
  });
  assert.equal(w.hasRecord, false);
  assert.equal(w.topPartner, null);
});

test("stats 에 아예 없는 이름도 터지지 않고 빈 래핑을 낸다", () => {
  const w = buildSeasonWrapped({ ...base, name: "없는사람" });
  assert.equal(w.apps, 0);
  assert.equal(w.goals, 0);
  assert.equal(w.goalsRank, null);
});

// ───────────────────────── 베스트 11 ─────────────────────────

// 4-2-3-1 슬롯. 실제 팀이 72쿼터 중 59회 쓰는 틀이다.
const SHAPE = [
  { role: "GK", group: "GK" },
  { role: "LB", group: "DF" }, { role: "LCB", group: "DF" },
  { role: "RCB", group: "DF" }, { role: "RB", group: "DF" },
  { role: "LDM", group: "MF" }, { role: "RDM", group: "MF" },
  { role: "LM", group: "MF" }, { role: "CAM", group: "MF" }, { role: "RM", group: "MF" },
  { role: "ST", group: "FW" },
];

// 세부 역할로 흩어진 기록. 병합이 되는지 보려고 일부러 쪼개 놨다.
const RQ = {
  박영휘: { GK: 57 },
  공도하: { LCB: 24, CB: 5, RCB: 10 },        // CB 계열 합 39
  황동주: { RCB: 23, LCB: 6, LDM: 10, LCM: 2, RCM: 2 },
  김주성: { RB: 27, RWB: 4, RCM: 13 },
  임재준: { LB: 15, LWB: 1, RB: 5, RWB: 1, ST: 13, LS: 1, LM: 3 },
  김준수: { RDM: 25, RCM: 4, CAM: 4, CDM: 2, LDM: 1 },
  김광민: { LM: 13, RDM: 9, RCM: 3, LDM: 5 },
  신태민: { RM: 14, LM: 8, LW: 2, RW: 1 },
  강창훈: { RM: 21, RW: 3, LM: 1, RF: 2 },
  이건주: { CAM: 20, LM: 8, RF: 1, RS: 1 },
  금상덕: { ST: 31, LS: 1, GK: 4 },
  문대영: { ST: 8, LDM: 9 },
};

test("인접 역할을 버킷으로 합친다", () => {
  // 한 시즌 72쿼터에 역할이 27개라 같은 자리가 잘게 쪼개진다.
  // 쪼개진 채로 1등을 뽑으면 "13쿼터짜리 주전" 같은 얇은 결론이 나온다.
  const b = bucketize(RQ);
  assert.equal(b["공도하"].CB, 39);      // LCB 24 + CB 5 + RCB 10
  assert.equal(b["김준수"].CM, 32);      // RDM 25 + RCM 4 + CDM 2 + LDM 1
  assert.equal(b["신태민"].LM, 10);      // LM 8 + LW 2
  assert.equal(b["신태민"].RM, 15);      // RM 14 + RW 1
  assert.equal(b["금상덕"].ST, 32);      // ST 31 + LS 1
});

test("좌우는 합치지 않는다 — 왼쪽과 오른쪽은 다른 자리다", () => {
  assert.equal(roleBucket("LB"), "LB");
  assert.equal(roleBucket("RB"), "RB");
  assert.equal(roleBucket("LM"), "LM");
  assert.equal(roleBucket("RM"), "RM");
  assert.notEqual(roleBucket("LB"), roleBucket("RB"));
});

test("윙백·윙어는 같은 레인의 같은 자리로 본다", () => {
  assert.equal(roleBucket("LWB"), roleBucket("LB"));
  assert.equal(roleBucket("RW"), roleBucket("RM"));
  assert.equal(roleBucket("CF"), roleBucket("ST"));
  assert.equal(roleBucket("CDM"), roleBucket("CM"));
});

test("모르는 역할은 그대로 둔다", () => {
  assert.equal(roleBucket("좌우당간"), "좌우당간");
});

test("베스트 11은 포메이션 11칸을 그 자리 기록으로 채운다", () => {
  const xi = pickBestEleven(RQ, SHAPE, "임재준");
  assert.equal(xi.length, 11);
  const at = (role) => xi.find((s) => s.role === role);
  assert.equal(at("GK").name, "박영휘");
  assert.equal(at("LCB").name, "공도하");
  assert.equal(at("RB").name, "김주성");
  assert.equal(at("ST").name, "금상덕");
  assert.equal(at("CAM").name, "이건주");
});

test("한 선수가 두 자리를 차지하지 않는다", () => {
  const xi = pickBestEleven(RQ, SHAPE, "");
  const names = xi.map((s) => s.name);
  assert.equal(new Set(names).size, names.length);
});

test("앞 자리에 뽑히면 뒤 자리에서는 빠진다", () => {
  // 김광민은 LM 13 · CM 17. CM 슬롯(LDM/RDM)이 LM 보다 앞이라 거기서 먼저 찬다.
  // 그 덕에 LM 은 신태민(10Q)에게 간다 — 이게 병합 전과 달라진 지점이다.
  const xi = pickBestEleven(RQ, SHAPE, "");
  assert.equal(xi.find((s) => s.role === "RDM").name, "김광민");
  assert.equal(xi.find((s) => s.role === "LM").name, "신태민");
});

test("표시 쿼터는 병합된 버킷 수치다", () => {
  const xi = pickBestEleven(RQ, SHAPE, "");
  assert.equal(xi.find((s) => s.role === "LCB").quarters, 39);
  assert.equal(xi.find((s) => s.role === "LM").quarters, 10);
});

test("내 자리는 isMe 로 표시된다", () => {
  const xi = pickBestEleven(RQ, SHAPE, "임재준");
  assert.equal(xi.filter((s) => s.isMe).length, 1);
  assert.equal(xi.find((s) => s.isMe).role, "LB");
});

test("그 자리를 아무도 안 뛰었으면 같은 라인에서 대신 채우고 표시한다", () => {
  const only = { 가: { CB: 9 }, 나: { CB: 4 } };
  const xi = pickBestEleven(only, SHAPE, "");
  const filled = xi.filter((s) => s.group === "DF");
  assert.ok(filled.length >= 2);
  // LB 자리는 LB 기록이 없어 DF 라인에서 대체된다
  const lb = xi.find((s) => s.role === "LB");
  assert.equal(lb.fromGroup, true);
});

test("빈 입력에도 터지지 않는다", () => {
  assert.deepEqual(pickBestEleven({}, SHAPE, "아무개"), []);
  assert.deepEqual(bucketize({}), {});
});

test("베스트 11에 못 들면 내 라인 순위를 낸다", () => {
  const w = buildSeasonWrapped({ ...base, name: "문대영", roleQuarters: RQ, xiShape: SHAPE });
  assert.equal(w.inBestEleven, false);
  assert.equal(w.myPositionRank.group, "MF");   // 문대영 LDM 9 → CM 9, ST 8 보다 많다
  assert.ok(w.myPositionRank.rank > 1);
});

test("베스트 11에 들면 라인 순위는 내지 않는다", () => {
  const w = buildSeasonWrapped({ ...base, name: "공도하", roleQuarters: RQ, xiShape: SHAPE });
  assert.equal(w.inBestEleven, true);
  assert.equal(w.myPositionRank, null);
});

test("출전 쿼터 순위는 상위 11명까지, 내가 밖이면 내 줄을 덧붙인다", () => {
  const w = buildSeasonWrapped({ ...base, name: "문대영", roleQuarters: RQ, xiShape: SHAPE });
  const me = w.quarterRanking.find((r) => r.isMe);
  assert.ok(me, "내 줄이 있어야 한다");
  assert.equal(me.name, "문대영");
  assert.equal(me.rank, w.myQuarterRank.rank);
});

test("라인업 커버리지를 그대로 싣는다 — 근거를 밝혀야 오해가 없다", () => {
  const w = buildSeasonWrapped({
    ...base, roleQuarters: RQ, xiShape: SHAPE,
    lineupCoverage: { withLineup: 19, total: 30 },
  });
  assert.deepEqual(w.lineupCoverage, { withLineup: 19, total: 30 });
  assert.equal(w.formation, "4-2-3-1");
});

test("점유율 분모는 버킷 전체가 아니라 '한 자리분'이다", () => {
  // CB·CM 은 슬롯이 둘이라 버킷 전체로 나누면 주전도 구조적으로 반토막이 난다.
  // 실제로 공도하 39Q 가 30% 로 찍혀 로테이션으로 분류됐었다.
  const xi = pickBestEleven(RQ, SHAPE, "");
  const gk = xi.find((s) => s.role === "GK");
  assert.equal(gk.quarters, 57);
  assert.ok(Math.abs(gk.share - 57 / 61) < 1e-9, "GK 는 슬롯 1개라 그대로");

  const lcb = xi.find((s) => s.role === "LCB");
  // CB 버킷 총합을 슬롯 2개로 나눈 값이 분모. 한 자리분을 넘으면 1 로 자른다.
  const cbTotal = Object.values(bucketize(RQ)).reduce((n, q) => n + (q.CB ?? 0), 0);
  const expected = Math.min(1, lcb.quarters / (cbTotal / 2));
  assert.ok(Math.abs(lcb.share - expected) < 1e-9, `${lcb.share} vs ${expected}`);
  assert.ok(lcb.share > 0.5, `슬롯당으로 보면 주전이어야 한다 (${lcb.share})`);
});

test("점유율은 1을 넘지 않는다", () => {
  // 한 사람이 그 자리를 독점하면 슬롯당 분모를 넘길 수 있어 상한을 둔다.
  const solo = { 가: { GK: 30 }, 나: { CB: 4 } };
  const gk = pickBestEleven(solo, SHAPE, "").find((s) => s.role === "GK");
  assert.ok(gk.share <= 1);
});

test("붙박이와 로테이션을 점유율로 가른다", () => {
  const xi = pickBestEleven(RQ, SHAPE, "");
  for (const s of xi) assert.equal(s.isRegular, s.share >= REGULAR_SHARE);
  // GK 는 압도적이라 붙박이, LM 은 여러 명이 나눠 뛰어 로테이션
  assert.equal(xi.find((s) => s.role === "GK").isRegular, true);
  assert.equal(xi.find((s) => s.role === "LM").isRegular, false);
});

test("같은 자리 점유율의 합은 1을 넘지 않는다", () => {
  const xi = pickBestEleven(RQ, SHAPE, "");
  for (const s of xi) assert.ok(s.share >= 0 && s.share <= 1, `${s.role} share=${s.share}`);
});

test("라인에서 대체로 채운 자리는 점유율을 주장하지 않는다", () => {
  const only = { 가: { CB: 9 }, 나: { CB: 4 } };
  const lb = pickBestEleven(only, SHAPE, "").find((s) => s.role === "LB");
  assert.equal(lb.fromGroup, true);
  assert.equal(lb.share, 0);
  assert.equal(lb.isRegular, false);
});

// ───────────────────────── 새 슬라이드 재료 ─────────────────────────

test("역할 분포는 세부 역할 그대로 내고 좌표를 함께 싣는다", () => {
  // 4칸(GK/DF/MF/FW)으로 뭉치면 "MF 60%" 가 되어 어느 자리였는지가 사라진다.
  const w = buildSeasonWrapped({
    ...base,
    name: "임재준",
    roleQuarters: { 임재준: { LB: 15, ST: 13, LM: 3 } },
    report: { ...REPORT, roles: [{ role: "ST", quarters: 13, percent: 42, point: { x: 50, y: 18 } }] },
  });
  assert.equal(w.myRoleShares.length, 3);
  assert.equal(w.myRoleShares[0].role, "LB");        // 15Q 로 1위
  assert.equal(w.myRoleShares[0].percent, 48);       // 15/31
  // report.roles 에 좌표가 있는 역할은 그 좌표를, 없으면 가운데를 쓴다
  const st = w.myRoleShares.find((r) => r.role === "ST");
  assert.equal(st.y, 18);
  const lb = w.myRoleShares.find((r) => r.role === "LB");
  assert.equal(lb.x, 50);
});

test("함께 뛴 사람은 쿼터순 상위 5명까지", () => {
  const many = Array.from({ length: 8 }, (_, i) => ({
    name: `선수${i}`, sharedQuarters: 20 - i, sharedMatches: 10 - i,
    affinity: 0, supplied: 1, received: 1, combinedGoals: 0, record: {}, label: "", strength: "발견", rankScore: 0,
  }));
  const w = buildSeasonWrapped({ ...base, chemistry: { totalQuarters: 0, featured: null, partners: many } });
  assert.equal(w.topPartners.length, 5);
  assert.equal(w.topPartners[0].name, "선수0");
  assert.equal(w.topPartners[0].linkedGoals, 2);     // supplied 1 + received 1
});

test("순위 줄에 경기 수가 함께 실린다", () => {
  // 쿼터만 보면 "39Q" 가 몇 경기인지 감이 안 온다.
  const w = buildSeasonWrapped({
    ...base,
    name: "가",
    roleQuarters: { 가: { LB: 20 }, 나: { LB: 10 } },
    matchesByPlayer: { 가: 12, 나: 7 },
  });
  assert.equal(w.quarterRanking[0].quarters, 20);
  assert.equal(w.quarterRanking[0].matches, 12);
  assert.equal(w.quarterRanking[1].matches, 7);
});

test("월별·팀요약·날씨·베스트경기 아트를 그대로 전달한다", () => {
  const w = buildSeasonWrapped({
    ...base,
    monthly: [{ month: "2026-05", teamMatches: 5, attended: 4 }],
    weather: { rain: 3, heat: 2, cold: 1 },
    bestGameArt: { photo: "https://x/p.jpg", logo: "/opponent-logos/nsw-fc.jpg" },
  });
  assert.equal(w.monthly[0].attended, 4);
  assert.equal(w.team.wins, 6);
  assert.equal(w.weather.rain, 3);
  assert.equal(w.bestGameArt.photo, "https://x/p.jpg");
});

// ───────────────────────── 벤치 ─────────────────────────

test("벤치는 XI 에 못 든 사람 중 쿼터순 상위다", () => {
  const xi = pickBestEleven(RQ, SHAPE, "");
  const bench = pickBench(RQ, SHAPE, new Set(xi.map((s) => s.name)), "");
  const inXi = new Set(xi.map((s) => s.name));
  for (const b of bench) assert.equal(inXi.has(b.name), false, `${b.name} 이 XI 와 겹친다`);
  // 쿼터 내림차순
  for (let i = 1; i < bench.length; i++) assert.ok(bench[i - 1].quarters >= bench[i].quarters);
});

test("벤치는 각자 가장 오래 뛴 자리를 이름표로 단다", () => {
  const bench = pickBench(
    { 가: { LM: 3, CM: 9 }, 나: { ST: 5 } },
    SHAPE,
    new Set(),
    "",
  );
  const a = bench.find((b) => b.name === "가");
  assert.equal(a.role, "CM");      // 9 > 3
  assert.equal(a.quarters, 9);
  assert.equal(a.group, "MF");
});

test("벤치 인원 수를 제한한다", () => {
  const many = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [`선수${i}`, { CM: 20 - i }]),
  );
  assert.equal(pickBench(many, SHAPE, new Set(), "", 5).length, 5);
});

test("내가 벤치면 isMe 로 표시된다", () => {
  const xi = pickBestEleven(RQ, SHAPE, "");
  const bench = pickBench(RQ, SHAPE, new Set(xi.map((s) => s.name)), bench0Name(xi));
  function bench0Name(x) {
    const excluded = new Set(x.map((s) => s.name));
    return Object.keys(RQ).find((n) => !excluded.has(n)) ?? "";
  }
  assert.ok(bench.some((b) => b.isMe), "벤치 안의 내가 표시돼야 한다");
});

test("XI 에 다 들어가면 벤치는 비어 있을 수 있다", () => {
  const two = { 가: { GK: 5 }, 나: { CB: 5 } };
  const xi = pickBestEleven(two, SHAPE, "");
  const bench = pickBench(two, SHAPE, new Set(xi.map((s) => s.name)), "");
  assert.equal(bench.length, 0);
});

test("MOM 받은 경기와 개인 최고 기록을 그대로 싣는다", () => {
  // 숫자만 있으면 기록이고, 날짜가 붙어야 이야기가 된다.
  const w = buildSeasonWrapped({
    ...base,
    momMatches: [
      { date: "2026-03-07", opponent: "조마조마fc" },
      { date: "2026-08-08", opponent: "NSW FC" },
    ],
    report: { ...REPORT, maxGoals: 2, maxPoints: 3, maxPointStreak: 4 },
  });
  assert.equal(w.momMatches.length, 2);
  assert.equal(w.momMatches[0].opponent, "조마조마fc");
  assert.deepEqual(w.personalBests, { maxGoals: 2, maxPoints: 3, maxPointStreak: 4 });
});

test("MOM 이 없어도 개인 최고 기록은 남는다 — 그 장이 비지 않게", () => {
  const w = buildSeasonWrapped({
    ...base,
    momMatches: [],
    report: { ...REPORT, maxGoals: 1, maxPoints: 1, maxPointStreak: 0 },
  });
  assert.deepEqual(w.momMatches, []);
  assert.equal(w.personalBests.maxGoals, 1);
});
