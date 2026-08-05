// 경기 "주목 포인트" 자동 생성.
//
// DashboardClient 안에 있던 것을 그대로 옮겼다. 홈과 /home-preview 가 같은 결과를
// 보여야 하는데, 복사해 두면 한쪽만 고쳐지는 순간 두 화면이 다른 말을 하게 된다.
// 로직은 손대지 않았고, 팀 서사와 개인 기록을 구분할 kind 만 덧붙였다
// (히어로에는 팀 서사 한 줄만 세우고 개인 기록은 경기 줄로 내리기 위해서다).

import type { MatchData } from "./match-types";

export interface Storyline {
  icon: string;
  text: string;
  priority: number;
  /** team = 팀 전체 서사(연패·연승·클린시트·상대전적) · player = 개인 기록 */
  kind: "team" | "player";
}

// 경기 "주목 포인트" 자동 생성: 대상 경기 이전까지의 기록으로 스토리라인을 만든다.
// 리더(득점왕/도움왕/MVP)는 순위 페이지와 반드시 일치해야 하므로 stats(playerStats)를 사용한다.
export function buildMatchStorylines(
  target: MatchData,
  allMatches: MatchData[],
  attendees: string[],
  playerStats: Record<string, { apps: number; goals: number; assists: number; mom: number; pos?: string }>,
): Storyline[] {
  // 이름 목록 파싱: 한 셀에 여러 명이 "," 또는 "/"로 묶여 들어올 수 있음 (특히 MOM)
  const parseNames = (csv?: string) =>
    (csv || "").split(/[,/]/).map((s) => s.trim()).filter(Boolean);
  const isReal = (m: MatchData) => m.type !== "야유회";
  const validScore = (v: string | number | undefined) =>
    v !== undefined && v !== null && String(v).trim() !== "" && !Number.isNaN(Number(v));
  const targetTime = new Date(target.date).getTime();

  // 대상 경기 이전의 완료된 정식 경기만, 날짜(동일 시 id) 순으로 정렬
  const prior = allMatches
    .filter((m) => m.id !== target.id && isReal(m) && m.result !== "예정")
    .filter((m) => {
      const t = new Date(m.date).getTime();
      if (Number.isNaN(t)) return false;
      return t < targetTime || (t === targetTime && m.id < target.id);
    })
    .sort((a, b) => {
      const d = new Date(a.date).getTime() - new Date(b.date).getTime();
      return d !== 0 ? d : a.id - b.id;
    });

  const apps: Record<string, number> = {};
  const goals: Record<string, number> = {};
  const assists: Record<string, number> = {};
  const seq: Record<string, { goals: number; point: boolean }[]> = {};
  const lastAppIdx: Record<string, number> = {}; // 선수별 마지막 출전 경기의 prior 인덱스
  const attSets: Set<string>[] = []; // 경기별 출전자 집합 (개근 계산용)

  prior.forEach((m, idx) => {
    const att = Array.from(new Set(parseNames(m.attendees)));
    attSets.push(new Set(att));
    const gs = parseNames(m.goals);
    const as = parseNames(m.assists);
    for (const name of att) {
      const g = gs.filter((n) => n === name).length;
      const a = as.filter((n) => n === name).length;
      apps[name] = (apps[name] || 0) + 1;
      goals[name] = (goals[name] || 0) + g;
      assists[name] = (assists[name] || 0) + a;
      lastAppIdx[name] = idx;
      (seq[name] ||= []).push({ goals: g, point: g + a > 0 });
    }
  });

  const out: Storyline[] = [];

  // ── 선수별 스토리라인
  // 득점왕/도움왕/MVP는 순위 페이지(stats)와 일치해야 하므로 playerStats(현재 시즌 누적)를 사용
  const statList = Object.values(playerStats);
  const teamMaxGoals = statList.length ? Math.max(...statList.map((s) => s.goals)) : 0;
  const teamMaxAssists = statList.length ? Math.max(...statList.map((s) => s.assists)) : 0;
  const teamMaxMom = statList.length ? Math.max(...statList.map((s) => s.mom)) : 0;
  const goalLeaderCount = statList.filter((s) => s.goals === teamMaxGoals).length;
  const assistLeaderCount = statList.filter((s) => s.assists === teamMaxAssists).length;
  const momLeaderCount = statList.filter((s) => s.mom === teamMaxMom).length;
  // 팀의 실제 직전 경기 득점자 (결장 선수에게 "지난 경기"가 잘못 뜨지 않도록)
  const lastMatchScorers = prior.length > 0 ? parseNames(prior[prior.length - 1].goals) : [];
  for (const name of attendees) {
    const a = apps[name] || 0;
    const g = goals[name] || 0;
    const as = assists[name] || 0;
    const st = playerStats[name] || { apps: 0, goals: 0, assists: 0, mom: 0 };
    const s = seq[name] || [];

    if (a === 0) {
      out.push({ icon: "🎬", text: `${name} 데뷔전`, priority: 92 , kind: "player" });
      continue; // 데뷔전이면 누적 스토리라인은 의미 없음
    }

    // 복귀 매치 (마지막 출전 후 팀 경기를 3경기 이상 결장하다 복귀)
    const missed = lastAppIdx[name] !== undefined ? prior.length - 1 - lastAppIdx[name] : 0;
    if (missed >= 3) {
      out.push({ icon: "🔙", text: `${name} ${missed}경기 결장 후 복귀`, priority: 82 , kind: "player" });
    }

    // 연속 공격포인트 (뒤에서부터 연속으로 득점/도움 기록)
    let streak = 0;
    for (let i = s.length - 1; i >= 0 && s[i].point; i--) streak++;
    if (streak >= 2) {
      out.push({ icon: "🔥", text: `${name} ${streak + 1}경기 연속 공격P 도전`, priority: 78 + streak , kind: "player" });
    }

    // 지난 경기 멀티골 (팀의 직전 경기에서 실제로 2골 이상)
    if (lastMatchScorers.filter((n) => n === name).length >= 2) {
      out.push({ icon: "⚡", text: `${name} 지난 경기 멀티골, 상승세`, priority: 74 , kind: "player" });
    }

    // 출전 이정표 (5경기, 이후 10의 배수)
    const nextApp = a + 1;
    if (nextApp === 5 || nextApp % 10 === 0) {
      out.push({ icon: "🎖️", text: `${name} ${nextApp}경기 출전`, priority: 60 , kind: "player" });
    }

    // 득점 이정표 (다음 골이 10의 배수면 통산, 그 외 5의 배수면 시즌)
    const nextGoal = g + 1;
    if (g > 0 && nextGoal % 10 === 0) {
      out.push({ icon: "💯", text: `${name} 통산 ${nextGoal}호골 눈앞`, priority: 58 , kind: "player" });
    } else if (g > 0 && nextGoal % 5 === 0) {
      out.push({ icon: "⚽", text: `${name} 시즌 ${nextGoal}호골 도전`, priority: 56 , kind: "player" });
    }
    // 도움 이정표
    if (as > 0 && (as + 1) % 5 === 0) {
      out.push({ icon: "🅰️", text: `${name} 시즌 ${as + 1}호 도움 도전`, priority: 52 , kind: "player" });
    }

    // 득점왕 (순위 기준 시즌 최다 득점 1위)
    if (st.goals > 0 && st.goals === teamMaxGoals) {
      out.push({ icon: "🥇", text: `${name} 시즌 득점 ${goalLeaderCount === 1 ? "1위" : "공동 1위"} (${st.goals}골)`, priority: 50 , kind: "player" });
    }
    // 도움왕 (순위 기준 시즌 최다 도움 1위)
    if (st.assists > 0 && st.assists === teamMaxAssists) {
      out.push({ icon: "🅰️", text: `${name} 시즌 도움 ${assistLeaderCount === 1 ? "1위" : "공동 1위"} (${st.assists}개)`, priority: 49 , kind: "player" });
    }

    // MVP 선두 (순위 기준 MOM 최다이며 2회 이상)
    if (st.mom >= 2 && st.mom === teamMaxMom) {
      out.push({ icon: "👑", text: `${name} MOM ${st.mom}회, 시즌 MVP ${momLeaderCount === 1 ? "선두" : "공동 선두"}`, priority: 48 , kind: "player" });
    }

    // 개근 (팀 최근 경기를 연속으로 전부 출전 중)
    let attendStreak = 0;
    for (let i = attSets.length - 1; i >= 0 && attSets[i].has(name); i--) attendStreak++;
    if (attendStreak >= 5) {
      out.push({ icon: "🎖️", text: `${name} ${attendStreak}경기 연속 출전, 개근 행진`, priority: 46 , kind: "player" });
    }
  }

  // ── 팀 스토리라인
  // 연속 클린시트
  let cleanStreak = 0;
  for (let i = prior.length - 1; i >= 0; i--) {
    if (validScore(prior[i].theirScore) && Number(prior[i].theirScore) === 0) cleanStreak++;
    else break;
  }
  if (cleanStreak >= 1) {
    out.push({ icon: "🧤", text: `${cleanStreak + 1}경기 연속 클린시트 도전`, priority: 62 , kind: "team" });
  }

  // 연승
  let winStreak = 0;
  for (let i = prior.length - 1; i >= 0; i--) {
    if (prior[i].result === "승") winStreak++;
    else break;
  }
  if (winStreak >= 2) {
    out.push({ icon: "📈", text: `팀 ${winStreak}연승, ${winStreak + 1}연승 도전`, priority: 64 , kind: "team" });
  }

  // 연패 탈출 도전 (2연패 이상)
  let loseStreak = 0;
  for (let i = prior.length - 1; i >= 0; i--) {
    if (prior[i].result === "패") loseStreak++;
    else break;
  }
  if (loseStreak >= 2) {
    out.push({ icon: "🩹", text: `팀 ${loseStreak}연패 중, 연패 탈출 도전`, priority: 66 , kind: "team" });
  }

  // 최근 5경기 폼
  const recent = prior.slice(-5);
  if (recent.length >= 3) {
    const w = recent.filter((m) => m.result === "승").length;
    const d = recent.filter((m) => m.result === "무").length;
    const l = recent.filter((m) => m.result === "패").length;
    const trend = w >= 3 ? " 상승세" : l >= 3 ? " 반등 필요" : "";
    out.push({ icon: "📊", text: `최근 ${recent.length}경기 ${w}승 ${d}무 ${l}패${trend}`, priority: 42 , kind: "team" });
  }

  // 상대 전적 (같은 상대와의 최근 경기)
  const vsSame = prior.filter((m) => (m.opponent || "").trim() === (target.opponent || "").trim());
  if (vsSame.length > 0 && validScore(vsSame[vsSame.length - 1].ourScore) && validScore(vsSame[vsSame.length - 1].theirScore)) {
    const last = vsSame[vsSame.length - 1];
    const r = last.result === "승" ? "승리" : last.result === "패" ? "패배" : "무승부";
    out.push({ icon: "🔁", text: `지난 vs ${target.opponent} ${last.ourScore}-${last.theirScore} ${r}`, priority: 44 , kind: "team" });
  }

  // N번째 맞대결 (같은 상대와 3번째 이상)
  if (vsSame.length + 1 >= 3 && (target.opponent || "").trim()) {
    out.push({ icon: "🆚", text: `${target.opponent}와 ${vsSame.length + 1}번째 맞대결`, priority: 40 , kind: "team" });
  }

  return out.sort((a, b) => b.priority - a.priority);
}
