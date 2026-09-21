"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sun, Moon, RotateCcw, Save, Check, UserPlus, UserMinus, X, ArrowRightLeft, Plus, Trash2, Move, ClipboardList } from "lucide-react";
import { useTheme } from "next-themes";
import { MatchData, LineupData } from "../../../lib/match-types";
import type { SubstitutionEvent } from "../../../lib/lineup";
import LineupPitch from "../../../components/LineupPitch";
import AppToast from "../../../components/AppToast";
import type { BoardLineupQuarter } from "../../../lib/board";
import {
  FORMATION_PRESETS,
  formationOf,
  TACTICS,
  instructionAllowed,
  parseInstructions,
  parsePositions,
  roleFromPoint,
  serializeInstructions,
  serializePositions,
  type Point,
} from "../../../lib/positions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

const QUARTERS = ["1Q", "2Q", "3Q", "4Q", "5Q", "6Q"];
const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1"];
const MAX_SUBS = 9;

interface ActiveSlot {
  type: "player" | "sub";
  index: number;
}

/** 쿼터 한 칸의 편집 내용 전부. 탭을 옮겨도 이걸 들고 있어서 작업이 안 날아간다. */
interface QuarterState {
  formation: string;
  positions: Point[];
  tactic: string;
  instructions: string[][];
  assignments: (string | null)[];
  subs: (string | null)[];
  substitutions: SubstitutionEvent[];
}

const emptyQuarterState = (formation: string): QuarterState => ({
  formation,
  positions: FORMATION_PRESETS[formation] ?? FORMATION_PRESETS[FORMATIONS[0]],
  tactic: "",
  instructions: Array.from({ length: 11 }, () => []),
  assignments: Array(11).fill(null),
  subs: Array(MAX_SUBS).fill(null),
  substitutions: [],
});

const quarterStateOf = (existing: LineupData): QuarterState => {
  const formation = existing.formation || FORMATIONS[0];
  const assignments: (string | null)[] = Array(11).fill(null);
  existing.players.forEach((p, i) => { assignments[i] = p || null; });
  const subs: (string | null)[] = Array(MAX_SUBS).fill(null);
  existing.subs.forEach((v, i) => { subs[i] = v || null; });
  return {
    formation,
    positions:
      parsePositions(existing.positions) ??
      FORMATION_PRESETS[formation] ??
      FORMATION_PRESETS[FORMATIONS[0]],
    tactic: existing.tactic || "",
    instructions: parseInstructions(existing.instructions),
    assignments,
    subs,
    substitutions: existing.substitutions || [],
  };
};

/**
 * "저장된 것과 달라졌나"를 판정하는 지문.
 * formation 은 저장할 때 좌표에서 다시 계산되므로 뺀다 — 넣으면 멀쩡한 쿼터가
 * 저장 안 된 것처럼 보인다.
 */
const signatureOf = (s: QuarterState) =>
  JSON.stringify({
    p: s.positions.map((pt) => [pt.x, pt.y]),
    t: s.tactic,
    i: s.instructions,
    a: s.assignments.map((v) => v ?? ""),
    s: s.subs.map((v) => v ?? ""),
    u: s.substitutions.map((e) => [e.out, e.in, e.time ?? ""]),
  });

/** 게시판에서 불러올 수 있는 후보 = 글쓴이의 쿼터 하나 ("임재준님의 2쿼터") */
export interface BoardLineupOption {
  postId: number;
  title: string;
  author: string;
  quarter: BoardLineupQuarter;
}

interface LineupEditorProps {
  match: MatchData;
  lineups: LineupData[];
  attendees: string[];
  rosterMap: Record<string, string>;
  prefPosMap?: Record<string, string[]>;
  /** 선수별 "경기당 Q" — 프로필에 나오는 값과 같다 */
  avgQuartersMap?: Record<string, string>;
  boardLineups?: BoardLineupOption[];
}

// 선호 포지션 카테고리 색 (GK 주황 / 수비 파랑 / 미드 초록 / 공격 핑크)
const PREF_POS_COLOR: Record<string, string> = {
  GK: "#F59E0B",
  LB: "#3B82F6", CB: "#3B82F6", RB: "#3B82F6",
  CDM: "#10B981", CM: "#10B981", CAM: "#10B981",
  LW: "#FF8FA3", RW: "#FF8FA3", ST: "#FF8FA3",
};

export default function LineupEditor({
  match,
  lineups,
  attendees,
  rosterMap,
  prefPosMap = {},
  avgQuartersMap = {},
  boardLineups = [],
}: LineupEditorProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const [quarter, setQuarter] = useState(QUARTERS[0]);
  const [formation, setFormation] = useState(FORMATIONS[0]);
  const [positions, setPositions] = useState<Point[]>(FORMATION_PRESETS[FORMATIONS[0]]);
  const [tactic, setTactic] = useState("");
  const [instructions, setInstructions] = useState<string[][]>(() => Array.from({ length: 11 }, () => []));
  const [assignments, setAssignments] = useState<(string | null)[]>(Array(11).fill(null));
  const [subs, setSubs] = useState<(string | null)[]>(Array(MAX_SUBS).fill(null));
  const [substitutions, setSubstitutions] = useState<SubstitutionEvent[]>([]);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  // "자리 바꾸기"를 누른 슬롯. 다음에 탭하는 슬롯과 선수를 맞바꾼다.
  const [swapFrom, setSwapFrom] = useState<ActiveSlot | null>(null);
  // 슬롯보다 선수를 먼저 고른 경우. 다음에 탭하는 슬롯에 들어간다.
  const [pickedPlayer, setPickedPlayer] = useState<string | null>(null);
  // 지금 보고 있지 않은 쿼터들의 편집 내용. 탭을 옮겨도 여기 남아 있다.
  const [drafts, setDrafts] = useState<Record<string, QuarterState>>({});
  // 저장에 성공한 순간의 지문. lineups prop 이 갱신되기 전에도 "저장됨"을 안다.
  const [savedSig, setSavedSig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [guests, setGuests] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState("");
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!toastError) return;
    const timer = window.setTimeout(() => setToastError(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toastError]);
  // Q 배지를 눌렀을 때 그게 무슨 숫자인지 알려주는 안내
  const [toastHint, setToastHint] = useState<string | null>(null);
  React.useEffect(() => {
    if (!toastHint) return;
    const timer = window.setTimeout(() => setToastHint(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toastHint]);
  // 드래그 중 LineupPitch가 알려주는 실시간 포메이션 이름 (끝나면 null)
  const [liveShape, setLiveShape] = useState<string | null>(null);
  // 게시판 불러오기
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  // 작성자 전술 → 원본 쿼터 → 적용할 경기 쿼터의 3단계 선택
  const [selectedImportPostId, setSelectedImportPostId] = useState<number | null>(null);
  const [pendingImport, setPendingImport] = useState<BoardLineupOption | null>(null);
  const groupedBoardLineups = Array.from(
    boardLineups.reduce((groups, option) => {
      const current = groups.get(option.postId);
      if (current) current.options.push(option);
      else groups.set(option.postId, {
        postId: option.postId,
        author: option.author,
        title: option.title,
        options: [option],
      });
      return groups;
    }, new Map<number, {
      postId: number;
      author: string;
      title: string;
      options: BoardLineupOption[];
    }>()).values(),
  );

  /** 서버에 저장된 그 쿼터의 모습. 아직 한 번도 저장 안 했으면 빈 상태. */
  const savedStateOf = (q: string): QuarterState => {
    const existing = lineups.find((l) => l.quarter === q);
    return existing ? quarterStateOf(existing) : emptyQuarterState(formation);
  };

  // 쿼터 변경 시 화면 맞추기.
  //
  // effect 로 하면 이미 그린 뒤에 값이 들어와서 이전 쿼터가 한 프레임 비친다.
  // "prop 이 바뀌면 state 를 맞춘다"는 렌더 중에 하는 게 맞는 일이라(React 공식 패턴)
  // 직전에 읽은 쿼터를 들고 있다가 달라졌을 때만 한 번 맞춘다.
  //
  // 떠나는 쿼터는 drafts 에 넣어두고, 들어가는 쿼터는 drafts 에 있으면 거기서,
  // 없으면 서버 저장본에서 꺼낸다. 그래서 저장 전에 탭을 옮겨도 안 날아간다.
  const [loadedQuarter, setLoadedQuarter] = useState<string | null>(null);
  if (loadedQuarter !== quarter) {
    if (loadedQuarter !== null) {
      const leaving: QuarterState = {
        formation, positions, tactic, instructions, assignments, subs, substitutions,
      };
      setDrafts((prev) => ({ ...prev, [loadedQuarter]: leaving }));
    }
    setLoadedQuarter(quarter);
    const next = drafts[quarter] ?? savedStateOf(quarter);
    setFormation(next.formation);
    setPositions(next.positions);
    setTactic(next.tactic);
    setInstructions(next.instructions);
    setAssignments(next.assignments);
    setSubs(next.subs);
    setSubstitutions(next.substitutions);
    setActiveSlot(null);
    setPickedPlayer(null);
  }

  // 포메이션 변경 시 배치 초기화
  const handleFormationChange = (f: string) => {
    setFormation(f);
    setPositions(FORMATION_PRESETS[f] ?? FORMATION_PRESETS[FORMATIONS[0]]);
    setAssignments(Array(11).fill(null));
    setInstructions(Array.from({ length: 11 }, () => []));
    setActiveSlot(null);
    setPickedPlayer(null);
  };

  const matchesPreset = (name: string) => {
    const preset = FORMATION_PRESETS[name];
    return !!preset && positions.every((p, i) => p.x === preset[i].x && p.y === preset[i].y);
  };
  const isCustom = !matchesPreset(formation);

  // 드래그 중에는 필드가 알려주는 실시간 이름을, 아니면 현재 좌표에서 계산한 이름을 쓴다
  const shapeName = liveShape ?? formationOf(positions);

  const resetPositions = () => {
    setPositions(FORMATION_PRESETS[formation] ?? FORMATION_PRESETS[FORMATIONS[0]]);
  };

  /**
   * 게시판 전술 글 불러오기.
   * 배치·팀 전술·개인 전술은 그대로 가져오고, 선수는 이 경기 참석자에 있는 사람만 앉힌다.
   * (게시판은 활동 인원 전체로 짜므로 참석자가 다를 수밖에 없다)
   */
  const importFromBoard = (option: BoardLineupOption, targetQuarter: string) => {
    // 다른 쿼터로 가져오면 그 쿼터로 이동한다.
    // 쿼터 전환 useEffect가 기존 저장분을 덮어쓰지 않도록 먼저 전환하고 다음 틱에 채운다.
    if (targetQuarter !== quarter) {
      setQuarter(targetQuarter);
      setTimeout(() => applyBoardLineup(option), 0);
      setImporting(false);
      setPendingImport(null);
      return;
    }
    applyBoardLineup(option);
  };

  const applyBoardLineup = (option: BoardLineupOption) => {
    const src = option.quarter;
    const nextPositions =
      parsePositions(src.positions) ?? FORMATION_PRESETS[src.formation] ?? FORMATION_PRESETS[FORMATIONS[0]];
    const attending = new Set(attendees);
    const nextAssignments = src.players
      .slice(0, 11)
      .map((name) => (name && attending.has(name) ? name : null));
    while (nextAssignments.length < 11) nextAssignments.push(null);

    setFormation(src.formation || FORMATIONS[0]);
    setPositions(nextPositions);
    setTactic(src.tactic || "");
    setInstructions(parseInstructions(src.instructions));
    setAssignments(nextAssignments);
    setActiveSlot(null);
    setSwapFrom(null);
    setImporting(false);
    setSelectedImportPostId(null);
    setPendingImport(null);
    // 누가 빠졌는지 이름까지 알려줘야 대체자를 바로 떠올릴 수 있다
    const dropped = src.players.slice(0, 11).filter((n) => n && !attending.has(n));
    setImportNote(
      dropped.length > 0
        ? `${option.author}님의 ${src.quarter} 전술을 가져왔어요. 불참으로 빠진 ${dropped.length}자리: ${dropped.join(", ")}`
        : `${option.author}님의 ${src.quarter} 전술을 가져왔어요.`
    );
  };

  const addGuest = () => {
    const name = guestInput.trim();
    if (!name || attendees.includes(name) || guests.includes(name)) return;
    setGuests((prev) => [...prev, name]);
    setGuestInput("");
  };

  const removeGuest = (name: string) => {
    setGuests((prev) => prev.filter((g) => g !== name));
    // 배치된 곳에서도 제거
    setAssignments((prev) => prev.map((p) => (p === name ? null : p)));
    setSubs((prev) => prev.map((s) => (s === name ? null : s)));
  };

  // 참석 명단 자체에 중복/공백 변형이 있어도 자동 대기 배치에서 중복 생성하지 않는다.
  const allPlayers = Array.from(
    new Set([...attendees, ...guests].map((name) => name.trim()).filter(Boolean)),
  );
  const substitutionPlayers = Array.from(new Set([
    ...allPlayers,
    ...assignments.filter((player): player is string => !!player),
    ...subs.filter((player): player is string => !!player),
    ...substitutions.flatMap((event) => [event.out, event.in]).filter(Boolean),
  ]));

  const assignedPlayers = new Set([
    ...assignments.filter(Boolean),
    ...subs.filter(Boolean),
  ] as string[]);

  /** 두 슬롯의 선수를 맞바꾼다 (선발↔선발, 대기↔대기, 선발↔대기 모두) */
  const swapSlots = (a: ActiveSlot, b: ActiveSlot) => {
    const playerAt = (s: ActiveSlot) =>
      s.type === "player" ? assignments[s.index] : subs[s.index];
    const nextA = [...assignments];
    const nextS = [...subs];
    const put = (s: ActiveSlot, name: string | null) => {
      if (s.type === "player") nextA[s.index] = name;
      else nextS[s.index] = name;
    };
    const av = playerAt(a);
    const bv = playerAt(b);
    put(a, bv);
    put(b, av);
    setAssignments(nextA);
    setSubs(nextS);

    // 선발 자리끼리 바뀌면 개인 전술도 선수를 따라간다
    if (a.type === "player" && b.type === "player") {
      setInstructions((prev) => {
        const next = [...prev];
        const keep = (ids: string[], slot: number) =>
          ids.filter((id) => instructionAllowed(id, roleFromPoint(positions[slot])));
        next[a.index] = keep(prev[b.index], a.index);
        next[b.index] = keep(prev[a.index], b.index);
        return next;
      });
    }
  };

  /**
   * 선수를 슬롯에 넣는다. 원래 있던 자리(선발·대기)에서는 빠진다.
   * advance = 슬롯을 먼저 고른 흐름에서만 true — 다음 빈 슬롯으로 자동 이동한다.
   */
  const placeInSlot = (slot: ActiveSlot, name: string, advance: boolean) => {
    // 선수가 이미 배치된 위치 (assignments / subs 둘 다 확인)
    const inAssignments = assignments.indexOf(name);
    const inSubs = subs.indexOf(name);

    if (slot.type === "player") {
      const next = [...assignments];
      if (inAssignments >= 0) {
        next[inAssignments] = null;
      } else if (inSubs >= 0) {
        const nextS = [...subs];
        nextS[inSubs] = null;
        setSubs(nextS);
      }
      next[slot.index] = name;
      setAssignments(next);
      if (!advance) return;
      const nextEmpty = next.findIndex((v, i) => i > slot.index && !v);
      setActiveSlot(nextEmpty >= 0 ? { type: "player", index: nextEmpty } : null);
    } else {
      const next = [...subs];
      if (inSubs >= 0) {
        next[inSubs] = null;
      } else if (inAssignments >= 0) {
        const nextA = [...assignments];
        nextA[inAssignments] = null;
        setAssignments(nextA);
      }
      next[slot.index] = name;
      setSubs(next);
      if (!advance) return;
      const nextEmpty = next.findIndex((v, i) => i > slot.index && !v);
      setActiveSlot(nextEmpty >= 0 ? { type: "sub", index: nextEmpty } : null);
    }
  };

  /** 슬롯 하나만 비운다 (선발이면 개인 전술도 같이 날린다) */
  const clearSlot = (slot: ActiveSlot) => {
    if (slot.type === "player") {
      setAssignments((prev) => prev.map((v, i) => (i === slot.index ? null : v)));
      setInstructions((prev) => prev.map((ids, i) => (i === slot.index ? [] : ids)));
    } else {
      setSubs((prev) => prev.map((v, i) => (i === slot.index ? null : v)));
    }
    setActiveSlot(null);
  };

  const handleSlotClick = (type: "player" | "sub", index: number) => {
    // 자리 바꾸기 대기 중이면 → 이번 탭이 상대 슬롯
    if (swapFrom) {
      if (!(swapFrom.type === type && swapFrom.index === index)) {
        swapSlots(swapFrom, { type, index });
      }
      setSwapFrom(null);
      setActiveSlot(null);
      return;
    }

    // 선수를 먼저 골라둔 상태면 이번 탭이 놓을 자리다
    if (pickedPlayer) {
      placeInSlot({ type, index }, pickedPlayer, false);
      setPickedPlayer(null);
      setActiveSlot(null);
      return;
    }

    // 같은 슬롯 → 해제, 아니면 선택 (선발 슬롯이면 개인 전술 카드가 열린다)
    if (activeSlot?.type === type && activeSlot.index === index) {
      setActiveSlot(null);
      return;
    }
    setActiveSlot({ type, index });
  };

  const handlePlayerClick = (name: string) => {
    // 슬롯을 먼저 잡아둔 상태면 바로 배치, 아니면 이 선수를 들고 슬롯을 기다린다
    if (activeSlot) {
      placeInSlot(activeSlot, name, true);
      setPickedPlayer(null);
      return;
    }
    setPickedPlayer((prev) => (prev === name ? null : name));
  };

  const hasCurrentData = assignments.some(Boolean) || subs.some(Boolean);

  /** 그 쿼터의 현재 편집 내용. 손댄 적 없으면 null. */
  const stateOfQuarter = (q: string): QuarterState | null =>
    q === quarter
      ? { formation, positions, tactic, instructions, assignments, subs, substitutions }
      : drafts[q] ?? null;

  const isQuarterDirty = (q: string) => {
    const current = stateOfQuarter(q);
    if (!current) return false;
    const baseline = savedSig[q] ?? signatureOf(savedStateOf(q));
    return signatureOf(current) !== baseline;
  };

  const dirtyQuarters = QUARTERS.filter(isQuarterDirty);

  /** 어느 쿼터에도 못 들어간 참석/게스트 선수를 빈 대기 슬롯에 채운다 */
  const withLeftoversInSubs = (state: QuarterState): QuarterState => {
    const placed = new Set(
      [...state.assignments, ...state.subs].filter(Boolean) as string[],
    );
    const leftovers = allPlayers.filter((name) => !placed.has(name));
    if (leftovers.length === 0) return state;
    const finalSubs = [...state.subs];
    let li = 0;
    for (let i = 0; i < finalSubs.length && li < leftovers.length; i++) {
      if (!finalSubs[i]) finalSubs[i] = leftovers[li++];
    }
    return li > 0 ? { ...state, subs: finalSubs } : state;
  };

  const postQuarter = async (q: string, state: QuarterState) => {
    const res = await fetch("/api/lineup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId: match.id,
        quarter: q,
        formation: formationOf(state.positions),
        players: state.assignments.map((v) => v || ""),
        subs: state.subs.map((v) => v || ""),
        substitutions: state.substitutions,
        positions: serializePositions(state.positions),
        tactic: state.tactic,
        instructions: serializeInstructions(state.instructions),
      }),
    });
    if (!res.ok) throw new Error(await res.text());
  };

  const handleMoveQuarter = async (target: string) => {
    if (!target || target === quarter) return;
    setMoving(true);
    try {
      // 1. 현재 라인업을 타겟 쿼터에 저장
      const moved: QuarterState = {
        formation, positions, tactic, instructions, assignments, subs, substitutions,
      };
      await postQuarter(target, moved);

      // 2. 원본 쿼터 비우기
      const res2 = await fetch("/api/lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          quarter,
          formation: "4-3-3",
          players: Array(11).fill(""),
          subs: Array(MAX_SUBS).fill(""),
          substitutions: [],
        }),
      });
      if (!res2.ok) throw new Error(await res2.text());

      // 화면도 서버와 같은 모습으로 맞춘다 — 안 맞추면 방금 비운 쿼터가
      // "저장 안 됨"으로 남는다. 원본 비우기는 좌표·전술 없이 보내므로
      // 로컬도 4-3-3 기본 배치로 되돌린다.
      const cleared = emptyQuarterState(FORMATIONS[0]);
      setFormation(cleared.formation);
      setPositions(cleared.positions);
      setTactic(cleared.tactic);
      setInstructions(cleared.instructions);
      setAssignments(cleared.assignments);
      setSubs(cleared.subs);
      setSubstitutions(cleared.substitutions);
      setActiveSlot(null);
      setPickedPlayer(null);
      setDrafts((prev) => ({ ...prev, [target]: moved }));
      setSavedSig((prev) => ({
        ...prev,
        [target]: signatureOf(moved),
        [quarter]: signatureOf(cleared),
      }));

      // 서버 데이터 동기화 (lineups prop 갱신). 쓰기 라우트가 캐시를 무효화하므로
      // 하드 리로드 대신 소프트 리프레시로 깜빡임 없이 최신 데이터를 받는다.
      setMoveTarget(null);
      router.refresh();
    } catch (e) {
      setToastError("이동 실패: " + (e instanceof Error ? e.message : e));
    } finally {
      setMoving(false);
    }
  };

  /**
   * 저장 안 된 쿼터를 전부 저장한다. 바뀐 게 없으면 지금 쿼터만 저장한다.
   * 저장해도 편집 화면에 남는다 — 4쿼터를 이어서 짜려면 나가면 안 된다.
   */
  const handleSave = async () => {
    const targets = dirtyQuarters.length > 0 ? dirtyQuarters : [quarter];
    setSaving(true);
    try {
      const sigs: Record<string, string> = {};
      for (const q of targets) {
        const state = stateOfQuarter(q);
        if (!state) continue;
        // 배치되지 않은 참석/게스트 선수를 빈 대기 슬롯에 자동으로 채움
        const final = withLeftoversInSubs(state);
        await postQuarter(q, final);
        sigs[q] = signatureOf(final);
        if (q === quarter) setSubs(final.subs);
        else setDrafts((prev) => ({ ...prev, [q]: final }));
      }
      setSavedSig((prev) => ({ ...prev, ...sigs }));
      router.refresh(); // 대시보드·경기상세의 캐시된 라인업에도 반영되게
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (e) {
      setToastError("저장 실패: " + (e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-zinc-100 font-sans max-w-md mx-auto shadow-2xl overflow-hidden">
      {/* 헤더 */}
      <header className="app-workspace-header app-workspace-header-wide safe-header-py-35">
        <button
          type="button"
          onClick={() => {
            // 홈 피드·경기 상세 등 실제로 편집 화면에 들어온 위치로 돌아간다.
            // 새 탭에서 직접 연 경우에는 앱 밖으로 빠지지 않게 경기 상세를 fallback으로 쓴다.
            if (window.history.length > 1) router.back();
            else router.replace(`/matches/${match.id}`);
          }}
          aria-label="이전 화면으로"
          className="-my-2.5 -ml-2.5 flex h-11 items-center gap-2 px-2.5 text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-extrabold text-sm uppercase tracking-tight">라인업 편집</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="테마 전환"
            className="touch-target flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10"
          >
            <Moon className="block dark:hidden w-4 h-4 text-gray-700" />
            <Sun className="hidden dark:block w-4 h-4 text-[var(--ud-primary)]" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-black transition-all ${
              saved
                ? "bg-green-500 text-white"
                : dirtyQuarters.length === 0
                ? "bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500"
                : "bg-[var(--ud-primary)] text-black hover:bg-[var(--ud-primary)]"
            }`}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? "저장됨" : saving ? "저장 중..." : "저장"}
            {!saved && !saving && dirtyQuarters.length > 0 && (
              <span className="rounded-full bg-black/15 px-1.5 text-[10px] leading-[1.6]">
                {dirtyQuarters.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-10 animate-fade">
        {/* 경기 정보 */}
        <div className="text-center py-2">
          <p className="text-[11px] font-bold text-gray-400">{match.date} · {match.location}</p>
          <p className="text-[15px] font-black text-gray-800 dark:text-white mt-0.5">
            언더덕 vs {match.opponent}
          </p>
        </div>

        {/* 쿼터 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUARTERS.map((q) => {
            const dirty = isQuarterDirty(q);
            const hasData =
              lineups.some((l) => l.quarter === q) ||
              !!stateOfQuarter(q)?.assignments.some(Boolean);
            return (
              <button
                key={q}
                onClick={() => setQuarter(q)}
                className={`flex-shrink-0 text-[11px] font-black px-4 py-2 rounded-xl transition-all ${
                  quarter === q
                    ? "bg-[var(--ud-primary)] text-black"
                    : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10"
                }`}
              >
                {q}
                {dirty ? (
                  <span className="ml-1 text-[8px] text-[#E11D48]" title="저장 안 됨">●</span>
                ) : hasData ? (
                  <span className="ml-1 text-[8px] opacity-60">●</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* 쿼터 이동 */}
        {hasCurrentData && (
          <div className="flex items-center gap-2">
            {moveTarget === null ? (
              <button
                onClick={() => setMoveTarget("")}
                className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                {quarter} → 다른 쿼터로 이동
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-gray-500 dark:text-gray-400">이동할 쿼터:</span>
                {QUARTERS.filter((q) => q !== quarter).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleMoveQuarter(q)}
                    disabled={moving}
                    className="text-[11px] font-black px-3 py-1.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
                <button
                  onClick={() => setMoveTarget(null)}
                  className="text-[11px] font-black px-2 py-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  취소
                </button>
                {moving && <span className="text-[10px] text-gray-400 animate-pulse">이동 중...</span>}
              </div>
            )}
          </div>
        )}

        {/* 게시판에서 불러오기 */}
        {boardLineups.length > 0 && (
          <div className="space-y-2">
            {!importing ? (
              <button
                onClick={() => {
                  setImporting(true);
                  setSelectedImportPostId(null);
                  setPendingImport(null);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-[11px] font-black text-gray-500 transition-all hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                게시판에서 불러오기 ({groupedBoardLineups.length})
              </button>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300">
                    불러올 전술
                  </p>
                  <button
                    onClick={() => {
                      setImporting(false);
                      setSelectedImportPostId(null);
                      setPendingImport(null);
                    }}
                    aria-label="닫기"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-black/5 text-gray-400 dark:bg-white/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {pendingImport ? (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
                      <p className="truncate text-[12px] font-black">
                        {pendingImport.author}님의 {pendingImport.quarter.quarter}
                      </p>
                      <p className="truncate text-[10px] text-gray-400">
                        {pendingImport.quarter.formation} · {pendingImport.title}
                      </p>
                    </div>
                    <p className="text-[10px] font-semibold text-gray-400">어느 쿼터로 가져올까요?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUARTERS.map((q) => {
                        const hasData = lineups.some((l) => l.quarter === q);
                        return (
                          <button
                            key={q}
                            onClick={() => importFromBoard(pendingImport, q)}
                            className={`rounded-xl px-3 py-1.5 text-[11px] font-black text-white transition-all ${
                              q === pendingImport.quarter.quarter
                                ? "bg-[var(--ud-primary)] hover:opacity-85"
                                : "bg-blue-500 hover:bg-blue-600"
                            }`}
                          >
                            {q}
                            {hasData && <span className="ml-1 text-[8px] opacity-70">덮어씀</span>}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPendingImport(null)}
                        className="rounded-xl px-2 py-1.5 text-[11px] font-black text-gray-400"
                      >
                        뒤로
                      </button>
                    </div>
                  </div>
                ) : selectedImportPostId !== null ? (
                  <div className="space-y-2">
                    {(() => {
                      const selectedPost = groupedBoardLineups.find(
                        (group) => group.postId === selectedImportPostId,
                      );
                      if (!selectedPost) return null;
                      return (
                        <>
                          <div className="flex items-center justify-between rounded-xl bg-[var(--ud-primary)]/10 px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-black text-[#d94e6c] dark:text-[var(--ud-primary)]">
                                {selectedPost.author}님의 전술
                              </p>
                              <p className="truncate text-[10px] text-gray-400">
                                {selectedPost.title}
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedImportPostId(null)}
                              className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-black text-gray-400"
                            >
                              다른 전술
                            </button>
                          </div>
                          <p className="text-[10px] font-semibold text-gray-400">
                            불러올 원본 쿼터를 선택하세요
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {selectedPost.options.map((option) => {
                              const usable = option.quarter.players.filter(
                                (name) => name && attendees.includes(name),
                              ).length;
                              return (
                                <button
                                  key={`${option.postId}-${option.quarter.quarter}`}
                                  onClick={() => setPendingImport(option)}
                                  className="rounded-xl border border-gray-200 px-3 py-2 text-left transition-all hover:border-[var(--ud-primary)]/60 active:scale-[0.98] dark:border-white/10"
                                >
                                  <span className="block text-[12px] font-black">
                                    {option.quarter.quarter}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] text-gray-400">
                                    {option.quarter.formation} · 참석 {usable}/11
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                <>
                <p className="mb-2 text-[10px] font-semibold leading-relaxed text-gray-400">
                  배치·전술·개인 전술을 가져옵니다. 이 경기에 참석하지 않는 선수 자리는 비워둡니다.
                </p>
                <div className="space-y-1.5">
                  {groupedBoardLineups.map((group) => {
                    const bestUsable = Math.max(
                      ...group.options.map((option) =>
                        option.quarter.players.filter((name) => name && attendees.includes(name)).length
                      ),
                    );
                    return (
                      <button
                        key={group.postId}
                        onClick={() => setSelectedImportPostId(group.postId)}
                        className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-left transition-all hover:border-[var(--ud-primary)]/50 dark:border-white/10"
                      >
                        <span className="shrink-0 rounded-lg bg-[var(--ud-primary)]/15 px-2 py-1 text-[11px] font-black text-[#e75f7c] dark:text-[var(--ud-primary)]">
                          {group.options.length}쿼터
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-black">
                            {group.author}님의 전술
                          </span>
                          <span className="block truncate text-[10px] text-gray-400">
                            {group.title}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-black text-gray-500 dark:bg-white/10 dark:text-gray-300">
                          최대 {bestUsable}/11
                        </span>
                      </button>
                    );
                  })}
                </div>
                </>
                )}
              </div>
            )}
            {importNote && (
              <p className="rounded-xl bg-[var(--ud-primary)]/10 px-3 py-2 text-[11px] font-bold text-[#e75f7c] dark:text-[var(--ud-primary)]">
                {importNote}
              </p>
            )}
          </div>
        )}

        {/* 포메이션 — 이름은 실제 배치에서 계산되므로 드래그하면 같이 바뀐다 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 shrink-0">포메이션</span>
            <span className="rounded-lg bg-gray-900 px-2 py-1 text-[13px] font-black leading-none text-white dark:bg-white dark:text-black">
              {shapeName}
            </span>
            {isCustom && (
              <span className="text-[10px] font-black text-[var(--ud-primary)]">커스텀 배치</span>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FORMATIONS.map((f) => (
              <button
                key={f}
                onClick={() => handleFormationChange(f)}
                className={`flex-shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg transition-all ${
                  matchesPreset(f)
                    ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                    : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* 전술 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 shrink-0">전술</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TACTICS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTactic(tactic === t.id ? "" : t.id)}
                title={t.desc}
                className={`flex-shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg transition-all ${
                  tactic === t.id
                    ? "bg-[var(--ud-primary)] text-white"
                    : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 포메이션 필드 (탭으로 배치, 드래그로 위치 조정) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {swapFrom
                ? "바꿀 상대 슬롯을 탭하세요"
                : pickedPlayer
                ? `${pickedPlayer} 선택됨 → 놓을 자리를 탭하세요`
                : activeSlot?.type === "player"
                ? assignments[activeSlot.index]
                  ? `${assignments[activeSlot.index]} 선택됨 → 아래에서 개인 전술 설정`
                  : `빈 슬롯 ${activeSlot.index + 1} 선택됨 → 선수 목록에서 탭`
                : activeSlot?.type === "sub"
                ? `대기 슬롯 ${activeSlot.index + 1} 선택됨 → 선수 목록에서 탭`
                : "탭 = 선수 선택·개인 전술 · 끌면 위치 이동"}
            </span>
            <div className="flex items-center gap-2.5">
              {swapFrom && (
                <button
                  onClick={() => setSwapFrom(null)}
                  className="flex items-center gap-1 text-[10px] font-black text-gray-500 hover:text-gray-700 dark:text-gray-300"
                >
                  <X className="w-3 h-3" /> 바꾸기 취소
                </button>
              )}
              {isCustom && (
                <button
                  onClick={resetPositions}
                  className="flex items-center gap-1 text-[10px] font-bold text-[var(--ud-primary)] hover:opacity-75"
                >
                  <Move className="w-3 h-3" /> 배치 복귀
                </button>
              )}
              <button
                onClick={() => { setAssignments(Array(11).fill(null)); setSubs(Array(MAX_SUBS).fill(null)); setActiveSlot(null); setPickedPlayer(null); }}
                className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <RotateCcw className="w-3 h-3" /> 초기화
              </button>
            </div>
          </div>

          <LineupPitch
            positions={positions}
            players={assignments}
            instructions={instructions}
            rosterMap={rosterMap}
            selectedSlot={activeSlot?.type === "player" ? activeSlot.index : null}
            swapSlot={swapFrom?.type === "player" ? swapFrom.index : null}
            onSlotTap={(i) => handleSlotClick("player", i)}
            onPositionsChange={setPositions}
            onInstructionsChange={setInstructions}
            onLiveShape={setLiveShape}
            onDragStart={() => setSwapFrom(null)}
            onSwapRequest={(i) => setSwapFrom({ type: "player", index: i })}
            onClearSlot={(i) => clearSlot({ type: "player", index: i })}
            onCloseSlot={() => setActiveSlot(null)}
          />
        </div>

        {/* 대기 선수 슬롯 */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">대기 선수</p>
            {activeSlot?.type === "sub" && subs[activeSlot.index] && !swapFrom && (
              <>
                <button
                  onClick={() => setSwapFrom({ type: "sub", index: activeSlot.index })}
                  className="flex items-center gap-1 rounded-lg bg-gray-900 px-2 py-1 text-[10px] font-black text-white dark:bg-white dark:text-black"
                >
                  <ArrowRightLeft className="h-3 w-3" /> 자리 바꾸기
                </button>
                <button
                  onClick={() => clearSlot({ type: "sub", index: activeSlot.index })}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-[10px] font-black text-gray-500 dark:border-white/20 dark:text-gray-300"
                >
                  <UserMinus className="h-3 w-3" /> 빼기
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: MAX_SUBS }).map((_, i) => {
              const sub = subs[i];
              const isActive = activeSlot?.type === "sub" && activeSlot.index === i;
              const isSwapSource = swapFrom?.type === "sub" && swapFrom.index === i;
              return (
                <button
                  key={i}
                  onClick={() => handleSlotClick("sub", i)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all border ${
                    isSwapSource
                      ? "border-[var(--ud-primary)] bg-[var(--ud-primary)]/10 text-[#e75f7c] dark:text-[var(--ud-primary)]"
                      : isActive
                      ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                      : sub
                      ? "border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200"
                      : "border-dashed border-gray-300 dark:border-white/10 bg-transparent text-gray-400"
                  }`}
                >
                  {sub || `SUB ${i + 1}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* 선수 풀 */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            참석 선수 ({allPlayers.length}명)
          </p>

          {/* 게스트 추가 입력 */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 flex-1 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <UserPlus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) addGuest();
                }}
                placeholder="게스트 이름 입력"
                className="flex-1 bg-transparent text-[12px] font-bold text-gray-800 outline-none placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--ud-primary)]/30 dark:text-gray-100"
              />
            </div>
            <button
              onClick={addGuest}
              className="px-3 py-2 rounded-xl bg-gray-900 dark:bg-white/10 text-white dark:text-gray-200 text-[11px] font-black hover:opacity-80 transition-opacity"
            >
              추가
            </button>
          </div>

          {/* 미정 고정 버튼 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePlayerClick("미정")}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border border-dashed cursor-pointer ${
                pickedPlayer === "미정"
                  ? "border-[var(--ud-primary)] bg-[var(--ud-primary)] text-white ring-2 ring-[var(--ud-primary)]/40"
                  : "border-gray-400 dark:border-white/30 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
            >
              ? 미정
            </button>
          </div>

          {allPlayers.length === 0 ? (
            <p className="text-[12px] text-gray-400 dark:text-gray-600">
              matches 시트 L열에 참석자를 입력하거나 게스트를 추가하세요
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allPlayers.map((name) => {
                const used = assignedPlayers.has(name);
                const isGuest = guests.includes(name);
                const isPicked = pickedPlayer === name;
                const pref = prefPosMap[name] || [];
                const avgQ = avgQuartersMap[name];
                return (
                  <div key={name} className="flex flex-col items-center gap-1">
                  <div className="relative flex items-center">
                    <button
                      onClick={() => handlePlayerClick(name)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                        isPicked
                          ? "bg-[var(--ud-primary)] text-white border border-[var(--ud-primary)] ring-2 ring-[var(--ud-primary)]/40"
                          : isGuest
                          ? used
                            ? "bg-gray-200 dark:bg-white/10 text-gray-500 border border-gray-300 dark:border-white/10"
                            : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 border border-dashed border-gray-400 dark:border-white/30 hover:bg-gray-200 dark:hover:bg-white/20"
                          : used
                          ? "bg-[var(--ud-primary)]/20 text-[var(--ud-primary)] border border-[var(--ud-primary)]/30"
                          : "bg-white dark:bg-white/10 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/20"
                      }`}
                    >
                      {isGuest && <span className="mr-1 text-[8px] text-gray-400">G</span>}
                      {used && !isGuest && <Check className="mr-1 w-2.5 h-2.5 inline-block align-middle" />}
                      {name}
                    </button>
                    {isGuest && (
                      <button
                        onClick={() => removeGuest(name)}
                        className="ml-1 w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                    {/* 경기당 Q · 선호 포지션 (라인업 참고용) */}
                    {(avgQ || pref.length > 0) && (
                      <div className="flex items-center gap-0.5">
                        {avgQ && (
                          <button
                            type="button"
                            onClick={() => setToastHint(`${name} · 경기당 평균 ${avgQ}Q`)}
                            aria-label={`${name} 경기당 평균 출전 쿼터 ${avgQ}`}
                            title="경기당 평균 출전 쿼터 (프로필과 같은 값)"
                            className="rounded bg-gray-100 px-1 text-[8px] font-black leading-[1.5] tabular-nums text-gray-500 dark:bg-white/10 dark:text-gray-400"
                          >
                            {avgQ}Q
                          </button>
                        )}
                        {pref.map((p) => (
                          <span
                            key={p}
                            className="rounded px-1 text-[8px] font-black leading-[1.5]"
                            style={{ color: PREF_POS_COLOR[p] ?? "#94A3B8", backgroundColor: `${PREF_POS_COLOR[p] ?? "#94A3B8"}1f` }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 실제 교체 기록 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300">
                <ArrowRightLeft className="h-3.5 w-3.5 text-[var(--ud-primary)]" />
                교체 기록
              </p>
              <p className="mt-1 text-[10px] font-semibold text-gray-400">경기 중 나간 선수와 들어온 선수를 기록합니다</p>
            </div>
            <button
              type="button"
              onClick={() => setSubstitutions((events) => [...events, { out: "", in: "", time: "" }])}
              className="flex items-center gap-1 rounded-xl bg-gray-900 px-2.5 py-2 text-[10px] font-black text-white dark:bg-white dark:text-black"
            >
              <Plus className="h-3 w-3" /> 추가
            </button>
          </div>

          {substitutions.length === 0 ? (
            <button
              type="button"
              onClick={() => setSubstitutions([{ out: "", in: "", time: "" }])}
              className="w-full rounded-xl border border-dashed border-gray-200 py-4 text-[11px] font-bold text-gray-400 transition-colors hover:border-[var(--ud-primary)]/50 hover:text-[var(--ud-primary)] dark:border-white/10"
            >
              + 첫 교체 기록 추가
            </button>
          ) : (
            <div className="space-y-2">
              {substitutions.map((event, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 dark:border-white/[0.06] dark:bg-black/10"
                >
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <Select
                      value={event.out || undefined}
                      onValueChange={(value) =>
                        setSubstitutions((events) =>
                          events.map((item, i) => i === index ? { ...item, out: value } : item)
                        )
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className="rounded-lg border-gray-200 bg-white text-[11px] font-bold dark:border-white/10 dark:bg-[#202024]"
                      >
                        <SelectValue placeholder="OUT 선수" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] border-gray-200 bg-white text-gray-900 shadow-xl dark:border-white/10 dark:bg-[#17171a] dark:text-gray-100">
                        {substitutionPlayers.map((player) => (
                          <SelectItem
                            key={`out-${player}`}
                            value={player}
                            className="text-[12px] font-bold focus:bg-gray-100 dark:focus:bg-white/10"
                          >
                            {player}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ArrowRightLeft className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                    <Select
                      value={event.in || undefined}
                      onValueChange={(value) =>
                        setSubstitutions((events) =>
                          events.map((item, i) => i === index ? { ...item, in: value } : item)
                        )
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className="rounded-lg border-gray-200 bg-white text-[11px] font-bold dark:border-white/10 dark:bg-[#202024]"
                      >
                        <SelectValue placeholder="IN 선수" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] border-gray-200 bg-white text-gray-900 shadow-xl dark:border-white/10 dark:bg-[#17171a] dark:text-gray-100">
                        {substitutionPlayers.map((player) => (
                          <SelectItem
                            key={`in-${player}`}
                            value={player}
                            className="text-[12px] font-bold focus:bg-gray-100 dark:focus:bg-white/10"
                          >
                            {player}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={event.time || ""}
                      onChange={(e) =>
                        setSubstitutions((events) =>
                          events.map((item, i) => i === index ? { ...item, time: e.target.value } : item)
                        )
                      }
                      placeholder="시점 (예: 12분)"
                      className="app-field-surface h-8 flex-1 rounded-lg border border-gray-200 px-2.5 text-[11px] font-bold dark:border-white/10"
                    />
                    <button
                      type="button"
                      aria-label="교체 기록 삭제"
                      onClick={() => setSubstitutions((events) => events.filter((_, i) => i !== index))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-white/[0.06]">
            <p className="text-[10px] font-semibold leading-relaxed text-gray-400">
              교체 기록은 현재 쿼터의 포메이션·선발·대기 선수와 함께 저장됩니다.
            </p>
          </div>
        </div>

        {/* 본문 맨 아래 저장 버튼. 항상 닿는 쪽은 헤더의 저장 버튼이다
            (본문은 overflow-hidden·transform 조상 안이라 sticky/fixed 가 안 먹는다). */}
        <div className="border-t border-gray-200 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-[12px] font-black transition-all ${
              saved
                ? "bg-emerald-500 text-white"
                : dirtyQuarters.length === 0
                ? "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500"
                : "bg-[var(--ud-primary)] text-black hover:bg-[var(--ud-primary)]"
            } disabled:opacity-70`}
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved
              ? "저장됨"
              : saving
              ? "저장 중..."
              : dirtyQuarters.length === 0
              ? "저장할 변경 없음"
              : `저장 안 된 ${dirtyQuarters.length}개 쿼터 저장 (${dirtyQuarters.join(", ")})`}
          </button>
        </div>
      </main>
      <AppToast message={toastError} tone="error" />
      <AppToast message={toastHint} />
    </div>
  );
}
