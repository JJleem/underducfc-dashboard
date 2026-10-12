"use client";

// 홈에 들어왔을 때 띄울 축하 화면 차례 — MOM 발표 → 칭호 획득 순.
//
// 둘 다 이 기기에서 한 번만 뜬다([[seen]]).
//   · MOM: 경기마다 키가 따로 있다(fx_mom_<경기id>).
//   · 칭호: 지난번에 본 칭호 목록을 통째로 들고 있다가 새로 생긴 것만 띄운다.
//     기록이 처음이면(이 기능이 막 생겼거나 새 기기) **띄우지 않고 지금 목록만 적어 둔다.**
//     안 그러면 첫 접속에 그동안 딴 칭호 수십 개가 한꺼번에 쏟아진다.
//     리더 칭호(득점왕 등)는 "지금 1위" 라 주마다 오락가락해서 뺀다.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { EarnedTitle } from "../../lib/titles";
import MomReveal, { type MomRevealData } from "./MomReveal";
import TitleReveal from "./TitleReveal";
import { markSeen, readSeen, wasSeen } from "./seen";

// 등급까지 키에 넣는다 — 실버 → 골드로 오르면 새 키가 생겨 다시 뜬다.
const titleBase = (t: EarnedTitle) => `${t.scope ?? "career"}:${t.seasonId ?? ""}:${t.id}:`;
const titleKey = (t: EarnedTitle) => `${titleBase(t)}${t.tier ?? "-"}`;

type Step = { kind: "mom" } | { kind: "title"; titles: EarnedTitle[]; upgraded: string[] };

export default function HomeCelebrations({
  mom,
  myTitles,
  me,
  accent,
}: {
  mom: MomRevealData | null;
  myTitles: EarnedTitle[];
  me?: string;
  accent: string;
}) {
  // localStorage 는 브라우저에서만 읽힌다. 서버 렌더는 아무것도 안 그린다(하이드레이션 일치).
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const titles = useMemo(() => myTitles.filter((t) => !t.variant), [myTitles]);
  const titlesStore = me ? `fx_titles_${me}` : null;
  const momStore = mom ? `fx_mom_${mom.matchId}` : null;

  const queue = useMemo<Step[]>(() => {
    if (!isClient) return [];
    const q: Step[] = [];
    if (momStore && !wasSeen(momStore)) q.push({ kind: "mom" });
    const stored = titlesStore ? readSeen(titlesStore) : null;
    if (stored) {
      let prev = new Set<string>();
      try {
        prev = new Set(JSON.parse(stored) as string[]);
      } catch {
        /* 깨진 기록이면 처음처럼 다룬다 — 아래 effect 가 다시 적는다 */
      }
      const fresh = titles.filter((t) => !prev.has(titleKey(t)));
      // 같은 칭호의 다른 등급이 기록에 있었으면 "새로 딴" 게 아니라 "등급이 오른" 것이다.
      const upgraded = fresh
        .filter((t) => [...prev].some((k) => k.startsWith(titleBase(t))))
        .map(titleKey);
      if (prev.size > 0 && fresh.length > 0) q.push({ kind: "title", titles: fresh, upgraded });
    }
    return q;
  }, [isClient, momStore, titlesStore, titles]);

  // 칭호 기록이 처음이면 조용히 지금 목록만 적어 둔다.
  useEffect(() => {
    if (!isClient || !titlesStore) return;
    const stored = readSeen(titlesStore);
    let ok = false;
    try {
      ok = !!stored && Array.isArray(JSON.parse(stored));
    } catch {
      ok = false;
    }
    if (!ok) markSeen(titlesStore, JSON.stringify(titles.map(titleKey)));
  }, [isClient, titlesStore, titles]);

  const [step, setStep] = useState(0);
  const current = queue[step];
  if (!current) return null;

  const done = () => {
    if (current.kind === "mom" && momStore) markSeen(momStore);
    if (current.kind === "title" && titlesStore) markSeen(titlesStore, JSON.stringify(titles.map(titleKey)));
    setStep((s) => s + 1);
  };

  return current.kind === "mom" && mom ? (
    <MomReveal key="mom" data={mom} me={me} accent={accent} onClose={done} />
  ) : current.kind === "title" ? (
    <TitleReveal
      key="title"
      titles={current.titles}
      upgraded={new Set(current.upgraded)}
      titleKey={titleKey}
      accent={accent}
      onClose={done}
    />
  ) : null;
}
