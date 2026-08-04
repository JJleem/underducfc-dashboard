"use client";
// MOM 투표 — 결과는 항상 보이고, 투표는 드로어에서.
//
// 규칙은 기존 홈과 같다.
//   · 투표자는 로그인한 카카오 이름 (따로 안 묻는다)
//   · 자기 자신에게는 투표할 수 없다
//   · 공격 후보 = FW·MF, 수비 후보 = GK·DF. 포지션이 없으면 양쪽 모두,
//     이미 표를 받은 사람은 포지션과 무관하게 후보에 남는다
//   · 예상 경기 종료 뒤 24시간 동안 투표한다
//   · 공격·수비는 역할로 구분하고, 선택 상태는 팀의 핑크 한 색으로 통일한다
//
// 처음엔 칩을 본문에 늘어놓았더니 "뭘 누르는 화면인지" 알 수가 없었다.
// 결과(막대)와 투표(드로어)를 분리해야 각각이 무슨 화면인지 읽힌다.

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Loader2, Shield, Star, Target } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { FEED_SUMMARY_ROW, FeedSummaryEnd, FeedSummaryLabel } from "./FeedSummary";
import { getMomVoteDeadline, momVoteTimeLabel } from "../../lib/mom-vote-window";
import PlayerFace from "../PlayerFace";

export interface MomVote {
  matchId: number;
  voterName: string;
  votedFor: string;
  voteType: string;
}

const ATK_POS = new Set(["FW", "MF"]);
const DEF_POS = new Set(["GK", "DF"]);

function tallyOf(votes: MomVote[], type: string): Record<string, number> {
  const t: Record<string, number> = {};
  votes.filter((v) => v.voteType === type).forEach((v) => {
    t[v.votedFor] = (t[v.votedFor] || 0) + 1;
  });
  return t;
}

/** 한 후보의 득표 막대. 최다 득표는 핑크 + 별. */
function VoteBar({
  name,
  tally,
  mine,
}: {
  name: string;
  tally: Record<string, number>;
  mine?: string;
}) {
  const values = Object.values(tally);
  const max = Math.max(...values, 1);
  const count = tally[name] || 0;
  const leader = count > 0 && count === max;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex w-16 shrink-0 items-center gap-0.5 text-[11px] font-bold ${
          leader ? "text-[#FF718B] dark:text-[#FFB6C1]" : "text-gray-800 dark:text-white/65"
        }`}
      >
        {leader && <Star width={10} height={10} className="shrink-0 fill-current" />}
        <span className="truncate">{name}</span>
      </span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#FF8FA3]/10 dark:bg-[#FFB6C1]/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            leader ? "bg-[#FF8FA3] dark:bg-[#FFB6C1]" : "bg-[#FF8FA3]/35 dark:bg-[#FFB6C1]/30"
          }`}
          style={{ width: count > 0 ? `${Math.round((count / max) * 100)}%` : "0%" }}
        />
      </div>
      <span className="w-4 shrink-0 text-right text-[11px] font-bold tabular-nums text-gray-500 dark:text-white/45">{count}</span>
      {mine === name ? (
        <Check width={12} height={12} className="shrink-0 text-[#FF8FA3] dark:text-[#FFB6C1]" />
      ) : (
        <span className="w-3 shrink-0" />
      )}
    </div>
  );
}

function CandidateBallot({
  title,
  icon,
  names,
  selected,
  positions,
  onSelect,
  tone,
}: {
  title: string;
  icon: ReactNode;
  names: string[];
  selected: string;
  positions: Record<string, string>;
  onSelect: (name: string) => void;
  tone: "attack" | "defense";
}) {
  const roleTone =
    tone === "attack"
      ? "text-[#FF718B] dark:text-[#FFB6C1]"
      : "text-blue-500 dark:text-blue-400";
  return (
    <section className="border-t border-[#FF8FA3]/20 pt-4 dark:border-[#FFB6C1]/15">
      <div className="mb-3 flex items-center justify-between">
        <p className={`flex items-center gap-1.5 text-[13px] font-black ${roleTone}`}>
          <span>{icon}</span>
          {title}
        </p>
        <span
          className={`text-[10.5px] font-bold ${
            selected ? "text-[#FF718B] dark:text-[#FFB6C1]" : "text-gray-400 dark:text-white/35"
          }`}
        >
          {selected ? `${selected} 선택` : "한 명 선택"}
        </span>
      </div>

      <div className="grid grid-cols-2 border-t border-[#FF8FA3]/15 dark:border-[#FFB6C1]/10">
        {names.map((name, index) => {
          const active = selected === name;
          const loneLastCell = names.length % 2 === 1 && index === names.length - 1;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? "" : name)}
              className={`flex min-h-[58px] min-w-0 items-center gap-2 border-b border-[#FF8FA3]/15 px-2 py-2.5 text-left transition-colors dark:border-[#FFB6C1]/10 ${
                index % 2 === 1 ? "border-l border-l-[#FF8FA3]/15 pl-3 dark:border-l-[#FFB6C1]/10" : "pr-3"
              } ${
                loneLastCell ? "border-r border-r-[#FF8FA3]/15 dark:border-r-[#FFB6C1]/10" : ""
              } ${
                active
                  ? "bg-[#FF8FA3]/[0.07] dark:bg-[#FFB6C1]/[0.07]"
                  : "active:bg-[#FF8FA3]/[0.035] dark:active:bg-[#FFB6C1]/[0.04]"
              }`}
            >
              <PlayerFace name={name} size={32} />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[12.5px] font-black ${
                    active
                      ? "text-[#F45F7A] dark:text-[#FFB6C1]"
                      : "text-gray-800 dark:text-white/75"
                  }`}
                >
                  {name}
                </span>
                <span className="mt-0.5 block text-[9.5px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-white/30">
                  {positions[name] || "포지션 미정"}
                </span>
              </span>
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  active
                    ? "border-[#FF8FA3] bg-[#FF8FA3] text-white dark:border-[#FFB6C1] dark:bg-[#FFB6C1]"
                    : "border-[#FF8FA3]/30 text-transparent dark:border-[#FFB6C1]/25"
                }`}
              >
                <Check width={10} height={10} strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function MomVote({
  matchId,
  matchDate,
  matchTime,
  attendees,
  votes,
  userName,
  positions = {},
  confirmedMoms = [],
  confirmedMomGroups,
  countdownPreview = false,
  variant = "row",
}: {
  matchId: number;
  matchDate: string;
  matchTime?: string;
  attendees: string[];
  votes: MomVote[];
  userName?: string;
  /** 이름 → 포지션(FW/MF/DF/GK). 공격·수비 후보를 나누는 데 쓴다. */
  positions?: Record<string, string>;
  /** 관리자 입력으로 확정된 MOM. 피드에서는 이 이름 줄이 드로어 트리거가 된다. */
  confirmedMoms?: string[];
  /** 저장값의 `공격 / 수비` 구분. 있으면 현재 포지션보다 이 기록을 우선한다. */
  confirmedMomGroups?: { attack: string[]; defense: string[] };
  /** /home-preview 에서 진행 중 모양을 바로 확인하기 위한 값. */
  countdownPreview?: boolean;
  /** row = 피드 요약 · action = 액션 아이콘 · hero = 경기 직후 히어로 CTA */
  variant?: "row" | "action" | "hero";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [atk, setAtk] = useState("");
  const [def, setDef] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atkTally = tallyOf(votes, "공격");
  const defTally = tallyOf(votes, "수비");
  const myAtk = votes.find((v) => v.voterName === userName && v.voteType === "공격")?.votedFor;
  const myDef = votes.find((v) => v.voterName === userName && v.voteType === "수비")?.votedFor;

  const [now, setNow] = useState<number | null>(null);
  const [previewDeadline, setPreviewDeadline] = useState<Date | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const startedAt = Date.now();
      setNow(startedAt);
      if (countdownPreview) setPreviewDeadline(new Date(startedAt + 18 * 60 * 60 * 1000));
    });
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 60_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [countdownPreview]);

  const actualDeadline = getMomVoteDeadline(matchDate, matchTime);
  const deadline = countdownPreview ? previewDeadline : actualDeadline;
  const closed = now !== null && (!deadline || now >= deadline.getTime());
  const shownMoms = countdownPreview ? [] : confirmedMoms;

  const candidates = (tally: Record<string, number>, allow: Set<string>) =>
    attendees.filter((n) => {
      const pos = (positions[n] || "").toUpperCase();
      const unknown = !ATK_POS.has(pos) && !DEF_POS.has(pos);
      return allow.has(pos) || unknown || (tally[n] || 0) > 0;
    });

  const atkNames = candidates(atkTally, ATK_POS);
  const defNames = candidates(defTally, DEF_POS);

  const openDrawer = () => {
    setAtk(myAtk || "");
    setDef(myDef || "");
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    if (!userName || (!atk && !def)) return;
    setSaving(true);
    setError(null);
    try {
      for (const [votedFor, voteType] of [
        [atk, "공격"],
        [def, "수비"],
      ] as const) {
        if (!votedFor) continue;
        const res = await fetch("/api/mom-vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId, voterName: userName, votedFor, voteType }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "투표 저장 실패");
      }
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "투표 저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (attendees.length === 0) return null;

  const atkLeader = Object.keys(atkTally).sort((a, b) => atkTally[b] - atkTally[a])[0];
  const defLeader = Object.keys(defTally).sort((a, b) => defTally[b] - defTally[a])[0];
  const total = votes.length;
  const voted = !!(myAtk || myDef);
  const selectedCount = Number(!!atk) + Number(!!def);
  const storedGroups = countdownPreview ? undefined : confirmedMomGroups;
  const confirmedAttack = storedGroups
    ? storedGroups.attack
    : shownMoms.filter((name) => ATK_POS.has((positions[name] || "").toUpperCase()));
  const confirmedDefense = storedGroups
    ? storedGroups.defense
    : shownMoms.filter((name) => DEF_POS.has((positions[name] || "").toUpperCase()));
  const confirmedUnsorted = shownMoms.filter(
    (name) => !confirmedAttack.includes(name) && !confirmedDefense.includes(name)
  );
  const plainMomSummary =
    total === 0
        ? closed
          ? "투표 없이 마감"
          : "투표 전"
        : "";

  return (
    <>
      {variant === "action" ? (
        // 액션 줄 아이콘 — 댓글·참석과 같은 크기, 같은 여는 방식.
        <button
          type="button"
          onClick={openDrawer}
          aria-label="MOM 투표"
          className="flex items-center gap-1.5 text-gray-700 dark:text-white/70"
        >
          <Star
            width={17}
            height={17}
            strokeWidth={2}
            className={voted ? "fill-current text-[#FF8FA3] dark:text-[#FFB6C1]" : ""}
          />
          {total > 0 && <span className="text-[12px] font-black tabular-nums">{total}</span>}
        </button>
      ) : variant === "hero" ? (
        <button
          type="button"
          onClick={openDrawer}
          className="press-cta mt-5 w-full rounded-2xl bg-[#FF8FA3] px-4 py-3.5 text-center text-white shadow-sm active:bg-[#F97E95] dark:bg-[#FF8FA3]"
        >
          <span className="flex items-center justify-center gap-1.5 text-[13px] font-black">
            <Crown
              width={15}
              height={15}
              strokeWidth={2.3}
              className="shrink-0 fill-amber-200/30 text-amber-200"
            />
            오늘의 MOM, 누구였나요?
          </span>
          <span className="mt-1 block text-[10px] font-bold text-white/75">
            참석 {attendees.length}명 중 선택
            {!closed && deadline && now !== null && ` · ${momVoteTimeLabel(deadline, now)}`}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={openDrawer}
          className={FEED_SUMMARY_ROW}
        >
          <FeedSummaryLabel>
            <span className="flex items-center gap-1">
              <Crown
                width={12}
                height={12}
                strokeWidth={2.2}
                className="shrink-0 fill-amber-400/30 text-amber-400 dark:fill-amber-300/25 dark:text-amber-300"
              />
              MOM
            </span>
          </FeedSummaryLabel>
          <span
            className={`min-w-0 flex-1 truncate text-[13px] font-bold ${
              total > 0 || shownMoms.length > 0
                ? "text-gray-800 dark:text-white/75"
                : "text-gray-400 dark:text-white/35"
            }`}
          >
            {shownMoms.length > 0 ? (
              <>
                {confirmedAttack.length > 0 && (
                  <>
                    <span className="text-[#FF718B] dark:text-[#FFB6C1]">공격</span>{" "}
                    {confirmedAttack.join(" · ")}
                  </>
                )}
                {confirmedAttack.length > 0 && confirmedDefense.length > 0 && (
                  <span className="mx-1.5 text-gray-300 dark:text-white/20">·</span>
                )}
                {confirmedDefense.length > 0 && (
                  <>
                    <span className="text-blue-500 dark:text-blue-400">수비</span>{" "}
                    {confirmedDefense.join(" · ")}
                  </>
                )}
                {(confirmedAttack.length > 0 || confirmedDefense.length > 0) &&
                  confirmedUnsorted.length > 0 && (
                    <span className="mx-1.5 text-gray-300 dark:text-white/20">·</span>
                  )}
                {confirmedUnsorted.join(" · ")}
              </>
            ) : total === 0 ? (
              plainMomSummary
            ) : (
              <>
                {atkLeader && (
                  <>
                    <span className="text-[#FF718B] dark:text-[#FFB6C1]">공격</span> {atkLeader}
                  </>
                )}
                {atkLeader && defLeader && (
                  <span className="mx-1.5 text-gray-300 dark:text-white/20">·</span>
                )}
                {defLeader && (
                  <>
                    <span className="text-blue-500 dark:text-blue-400">수비</span> {defLeader}
                  </>
                )}
              </>
            )}
            {shownMoms.length === 0 && deadline && now !== null && (total > 0 || !closed) && (
              <span className="text-amber-500 dark:text-amber-300">
                <span className="mx-1.5 text-gray-300 dark:text-white/20">·</span>
                {momVoteTimeLabel(deadline, now)}
              </span>
            )}
          </span>
          <FeedSummaryEnd label={`${total}표`} />
        </button>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent
          className={`bg-white dark:bg-[#161618] ${
            closed
              ? "h-auto max-h-[70dvh] data-[vaul-drawer-direction=bottom]:max-h-[70dvh]"
              : "h-auto max-h-[92dvh] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[92dvh]"
          }`}
        >
          <DrawerHeader className="px-5 pb-3 pt-2">
            <DrawerTitle className="flex items-center gap-2.5 text-left text-[17px] font-black text-gray-900 dark:text-white">
              <span className="flex shrink-0 items-center justify-center text-amber-400 dark:text-amber-300">
                <Crown
                  width={19}
                  height={19}
                  strokeWidth={2.3}
                  className="fill-amber-400/25 dark:fill-amber-300/20"
                />
              </span>
              <span>
                MOM 투표
                <span className="mt-0.5 block text-[10.5px] font-bold text-gray-400 dark:text-white/35">
                  공격과 수비에서 한 명씩 선택해 주세요
                </span>
              </span>
            </DrawerTitle>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
              <div className="flex items-center justify-between border-y border-[#FF8FA3]/20 py-2.5 text-[10.5px] font-bold dark:border-[#FFB6C1]/15">
                <span className="text-gray-500 dark:text-white/50">
                  <b className="font-black text-gray-800 dark:text-white/80">{userName}</b> 님으로 투표
                  <span className="ml-1 text-gray-300 dark:text-white/25">· 본인 제외</span>
                </span>
                {!closed && deadline && now !== null && (
                  <span className="shrink-0 text-amber-500 dark:text-amber-300">
                    {momVoteTimeLabel(deadline, now)}
                  </span>
                )}
              </div>

              {/* 현재 결과 — 드로어를 열면 여기서 한눈에 본다 */}
              {total > 0 && (
                <section className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[13px] font-black text-gray-900 dark:text-white">현재 득표</p>
                    <span className="text-[10.5px] font-bold tabular-nums text-[#FF718B] dark:text-[#FFB6C1]">
                      {total}표
                    </span>
                  </div>
                  {Object.keys(atkTally).length > 0 && (
                    <div>
                      <p className="mb-2 flex items-center gap-1 text-[11px] font-black text-[#FF718B] dark:text-[#FFB6C1]">
                        <Target width={12} height={12} strokeWidth={2.4} /> 공격
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {Object.keys(atkTally)
                          .sort((a, b) => atkTally[b] - atkTally[a])
                          .map((n) => (
                            <VoteBar key={n} name={n} tally={atkTally} mine={myAtk} />
                          ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(defTally).length > 0 && (
                    <div className={Object.keys(atkTally).length > 0 ? "mt-4 border-t border-[#FF8FA3]/15 pt-4 dark:border-[#FFB6C1]/10" : ""}>
                      <p className="mb-2 flex items-center gap-1 text-[11px] font-black text-blue-500 dark:text-blue-400">
                        <Shield width={12} height={12} strokeWidth={2.4} /> 수비
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {Object.keys(defTally)
                          .sort((a, b) => defTally[b] - defTally[a])
                          .map((n) => (
                            <VoteBar key={n} name={n} tally={defTally} mine={myDef} />
                          ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {closed ? (
                <p className="mt-5 text-[12px] font-bold text-gray-400">투표가 마감됐어요.</p>
              ) : !userName ? (
                <p className="mt-5 text-[12px] font-bold text-gray-400">로그인하면 투표할 수 있어요.</p>
              ) : (
                <div className="mt-5 flex flex-col gap-6">
                  <CandidateBallot
                    title="공격 MOM"
                    icon={<Target width={14} height={14} strokeWidth={2.4} />}
                    names={atkNames.filter((n) => n !== userName)}
                    selected={atk}
                    positions={positions}
                    onSelect={setAtk}
                    tone="attack"
                  />
                  <CandidateBallot
                    title="수비 MOM"
                    icon={<Shield width={14} height={14} strokeWidth={2.4} />}
                    names={defNames.filter((n) => n !== userName)}
                    selected={def}
                    positions={positions}
                    onSelect={setDef}
                    tone="defense"
                  />
                </div>
              )}
          </div>

          <div className="shrink-0 border-t border-[#FF8FA3]/20 bg-white/95 px-5 pt-3 backdrop-blur-xl dark:border-[#FFB6C1]/15 dark:bg-[#161618]/95"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
              {error && <p className="mb-2 text-[11px] font-bold text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-[64px] shrink-0 py-3 text-[12px] font-black text-gray-400 active:text-gray-700 dark:text-white/35 dark:active:text-white/70"
                >
                  {closed || !userName ? "닫기" : "취소"}
                </button>
                {!closed && userName && (
                <button
                  type="button"
                  onClick={submit}
                  disabled={(!atk && !def) || saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#FF8FA3] py-3 text-[12px] font-black text-white shadow-[0_6px_18px_rgba(255,143,163,0.24)] active:bg-[#F97E95] disabled:bg-[#FF8FA3]/20 disabled:text-white disabled:shadow-none dark:disabled:bg-[#FFB6C1]/15 dark:disabled:text-white/30"
                >
                  {saving && <Loader2 width={14} height={14} className="animate-spin" />}
                  {selectedCount > 0 ? `${selectedCount}명 선택 · 투표하기` : "선수를 선택해 주세요"}
                </button>
                )}
              </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
