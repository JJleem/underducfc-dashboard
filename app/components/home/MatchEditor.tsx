"use client";
// 관리자 — 경기 등록 / 결과 입력.
//
// 내용은 기존 홈(DashboardClient)의 두 Drawer 와 같다. 바뀐 건 담는 그릇뿐이다.
// 선택지·저장 형식을 하나라도 다르게 두면 어느 홈에서 저장했느냐에 따라 데이터가
// 달라지므로, 항목은 전부 기존 것을 그대로 옮겼다.
//
//   경기 유형  일반 매칭 · 자체전 · 풋살
//   결과       예정 · 승 · 무 · 패 · 자체전            (자체전이 결과에도 있다)
//   시간       미정 + 06:00~24:00 정각 칩              (자유 입력이 아니다)
//   날짜       달력에서 고른다
//   골 기록    골 추가 → 득점자(참석자 또는 자책골) → 어시스트(선택) → 확인
//
// 저장 형식도 같다: goals/assists 를 골 순서대로 쉼표로 나란히 잇고, 어시스트가 없으면
// 그 자리를 빈 칸으로 둔다("A,B" / ",김광민"). 짝이 어긋나면 도움이 엉뚱한 골에 붙는다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";

export interface EditableMatch {
  id: number;
  date: string;
  time: string;
  location: string;
  opponent: string;
  type: string;
  result: string;
  ourScore: string;
  theirScore: string;
  goals: string;
  assists: string;
  attendees: string;
}

interface GoalEvent {
  scorer: string;
  assister: string;
}

// 풋살은 기존 데이터에 이미 쓰이고 있었는데(3/14·3/21·5/9) 선택지에 없어서,
// 그 경기를 수정하면 유형이 조용히 덮어써졌다.
const TYPES = ["일반 매칭", "자체전", "풋살"];
const RESULTS = ["예정", "승", "무", "패", "자체전"];
const TIMES = [
  "미정", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
  "21:00", "22:00", "23:00", "24:00",
];

/** 결과 칩 색. 기존 홈과 같은 배색. */
const RESULT_TONE: Record<string, string> = {
  승: "bg-[#FF8FA3] text-white dark:bg-[#FFB6C1] dark:text-black",
  패: "bg-gray-500 text-white",
  무: "bg-amber-400 text-white",
  자체전: "bg-violet-400 text-white",
  예정: "bg-gray-200 text-gray-700 dark:bg-white/20 dark:text-white",
};

function toMatchDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const FIELD =
  "w-full rounded-xl bg-gray-100 px-4 py-2.5 text-[13px] font-medium text-gray-900 outline-none placeholder:text-gray-400 dark:bg-white/10 dark:text-white dark:placeholder:text-gray-600";
const LABEL = "mb-2 text-[10px] font-semibold tracking-widest text-gray-400";
const CHIP = "rounded-xl px-3 py-1.5 text-[11px] font-black transition-colors";
const CHIP_ON = "bg-[#FF8FA3] text-white dark:bg-[#FFB6C1] dark:text-black";
const CHIP_OFF = "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300";

export default function MatchEditor({
  mode,
  match,
  roster,
  onClose,
}: {
  mode: "create" | "edit";
  match?: EditableMatch;
  /** 참석자 후보 = 로스터 전체 */
  roster: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(match?.date ?? "");
  const [time, setTime] = useState(match?.time && match.time !== "미정" ? match.time : "");
  const [location, setLocation] = useState(
    match?.location && match.location !== "미정" ? match.location : "",
  );
  const [opponent, setOpponent] = useState(
    match?.opponent && match.opponent !== "미정" ? match.opponent : "",
  );
  const [type, setType] = useState(match?.type || "일반 매칭");
  const [result, setResult] = useState(match?.result || "예정");
  const [ourScore, setOurScore] = useState(
    match?.ourScore && match.ourScore !== "-" ? match.ourScore : "",
  );
  const [theirScore, setTheirScore] = useState(
    match?.theirScore && match.theirScore !== "-" ? match.theirScore : "",
  );

  const [attendees, setAttendees] = useState<Set<string>>(
    () => new Set((match?.attendees || "").split(",").map((s) => s.trim()).filter(Boolean)),
  );
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>(() => {
    const g = (match?.goals || "").split(",").map((s) => s.trim());
    const a = (match?.assists || "").split(",").map((s) => s.trim());
    return g.filter(Boolean).map((scorer, i) => ({ scorer, assister: a[i] || "" }));
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickScorer, setPickScorer] = useState("");
  const [pickAssister, setPickAssister] = useState("");

  // 참석자에서 빼면 그 사람이 낀 골 기록도 같이 지운다(기존과 동일).
  const toggleAttendee = (name: string) => {
    setAttendees((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        setGoalEvents((events) => events.filter((e) => e.scorer !== name && e.assister !== name));
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const save = async () => {
    if (!date) {
      setError("날짜는 필수입니다.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const base = { date, time, location, opponent, type };
      const res =
        mode === "create"
          ? await fetch("/api/matches", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(base),
            })
          : await fetch(`/api/matches/${match!.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...base,
                result,
                ourScore,
                theirScore,
                goals: goalEvents.map((e) => e.scorer).join(","),
                assists: goalEvents.map((e) => e.assister || "").join(","),
                attendees: Array.from(attendees).join(","),
              }),
            });
      if (!res.ok) throw new Error((await res.json()).error || "저장 실패");
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  // 기존 홈과 같은 vaul Drawer 를 쓴다. 밑에서 부드럽게 올라오고, 아래로 끌어 닫을 수 있다.
  return (
    <Drawer
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      repositionInputs={false}
    >
      <DrawerContent className="max-h-[92dvh] bg-white dark:bg-[#161618]">
        <DrawerHeader className="pb-0">
          <DrawerTitle className="text-[15px] font-bold text-gray-900 dark:text-white">
            {mode === "create"
              ? "경기 일정 등록"
              : `경기 결과 입력${match?.opponent ? ` — vs ${match.opponent}` : ""}`}
          </DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          <div className="flex flex-col gap-6">
            {/* 날짜 */}
            <div>
              <p className={LABEL}>날짜 *</p>
              <Calendar
                mode="single"
                selected={date ? new Date(date + "T12:00:00") : undefined}
                onSelect={(d) => {
                  if (d) setDate(toMatchDateStr(d));
                }}
              />
              {date && (
                <p className="mt-1.5 text-center text-[11px] font-black text-[#FF8FA3] dark:text-[#FFB6C1]">
                  {date} 선택됨
                </p>
              )}
            </div>

            {/* 시간 */}
            <div>
              <p className={LABEL}>시간</p>
              <div className="flex flex-wrap gap-1.5">
                {TIMES.map((t) => {
                  const on = (t === "미정" && !time) || time === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t === "미정" ? "" : t)}
                      className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 상대팀 */}
            <div>
              <p className={LABEL}>
                상대팀{" "}
                <span className="font-medium normal-case tracking-normal text-gray-300 dark:text-gray-600">
                  (미입력 시 미정)
                </span>
              </p>
              <input
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="상대팀 이름"
                className={FIELD}
              />
            </div>

            {/* 장소 */}
            <div>
              <p className={LABEL}>장소</p>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="경기장 이름"
                className={FIELD}
              />
            </div>

            {/* 경기 유형 */}
            <div>
              <p className={LABEL}>경기 유형</p>
              <div className="flex gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 rounded-xl py-2.5 text-[12px] font-black transition-colors ${
                      type === t ? CHIP_ON : CHIP_OFF
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {mode === "edit" && (
              <>
                {/* 결과 */}
                <div>
                  <p className={LABEL}>결과</p>
                  <div className="flex flex-wrap gap-2">
                    {RESULTS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setResult(r)}
                        className={`min-w-[56px] flex-1 rounded-xl py-2.5 text-[12px] font-black transition-colors ${
                          result === r
                            ? RESULT_TONE[r]
                            : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 스코어 */}
                <div>
                  <p className={LABEL}>스코어</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-center">
                      <p className="mb-1 text-[10px] text-gray-400">언더덕</p>
                      <input
                        type="number"
                        min={0}
                        value={ourScore}
                        onChange={(e) => setOurScore(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-xl bg-gray-100 px-3 py-3 text-center text-[20px] font-black text-gray-900 outline-none dark:bg-white/10 dark:text-white"
                      />
                    </div>
                    <span className="text-[20px] font-black text-gray-300 dark:text-gray-600">:</span>
                    <div className="flex-1 text-center">
                      <p className="mb-1 truncate text-[10px] text-gray-400">{opponent || "상대팀"}</p>
                      <input
                        type="number"
                        min={0}
                        value={theirScore}
                        onChange={(e) => setTheirScore(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-xl bg-gray-100 px-3 py-3 text-center text-[20px] font-black text-gray-900 outline-none dark:bg-white/10 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 참석자 */}
                <div>
                  <p className={LABEL}>
                    참석자{" "}
                    <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{attendees.size}명</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roster.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleAttendee(name)}
                        className={`${CHIP} ${
                          attendees.has(name)
                            ? "bg-gray-800 text-white dark:bg-white dark:text-black"
                            : CHIP_OFF
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 골 기록 */}
                {attendees.size > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-semibold tracking-widest text-gray-400">
                        골 기록{" "}
                        <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">{goalEvents.length}골</span>
                      </p>
                      {!pickerOpen && (
                        <button
                          type="button"
                          onClick={() => {
                            setPickerOpen(true);
                            setPickScorer("");
                            setPickAssister("");
                          }}
                          className="flex items-center gap-1 rounded-lg bg-[#FF8FA3]/10 px-2.5 py-1 text-[11px] font-black text-[#FF8FA3] dark:bg-[#FFB6C1]/10 dark:text-[#FFB6C1]"
                        >
                          <Plus width={12} height={12} strokeWidth={2.6} /> 골 추가
                        </button>
                      )}
                    </div>

                    {goalEvents.length > 0 && (
                      <div className="mb-3 flex flex-col gap-1.5">
                        {goalEvents.map((event, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-4 text-[10px] font-semibold text-gray-400">{i + 1}</span>
                              {event.scorer === "자책골" ? (
                                <span className="text-[13px] font-bold text-orange-500 dark:text-orange-400">
                                  자책골 (OG)
                                </span>
                              ) : (
                                <>
                                  <span className="text-[13px] font-bold text-gray-900 dark:text-white">
                                    {event.scorer}
                                  </span>
                                  {event.assister && (
                                    <span className="text-[11px] font-bold text-blue-400">
                                      A. {event.assister}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setGoalEvents((prev) => prev.filter((_, idx) => idx !== i))}
                              aria-label="골 삭제"
                              className="p-1 text-gray-400"
                            >
                              <X width={14} height={14} strokeWidth={2.4} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {pickerOpen && (
                      <div className="flex flex-col gap-4 rounded-2xl bg-gray-50 p-4 dark:bg-white/5">
                        <div>
                          <p className={LABEL}>득점자</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(attendees).map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  setPickScorer(name);
                                  setPickAssister("");
                                }}
                                className={`${CHIP} ${
                                  pickScorer === name
                                    ? CHIP_ON
                                    : "border border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/10 dark:text-gray-300"
                                }`}
                              >
                                {name}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setPickScorer("자책골");
                                setPickAssister("");
                              }}
                              className={`${CHIP} ${
                                pickScorer === "자책골"
                                  ? "bg-orange-400 text-white"
                                  : "border border-orange-200 bg-orange-50 text-orange-500 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-400"
                              }`}
                            >
                              자책골 (OG)
                            </button>
                          </div>
                        </div>

                        {pickScorer !== "자책골" && (
                          <div>
                            <p className={LABEL}>
                              어시스트{" "}
                              <span className="font-medium normal-case tracking-normal text-gray-300 dark:text-gray-600">
                                (선택)
                              </span>
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from(attendees)
                                .filter((n) => n !== pickScorer)
                                .map((name) => (
                                  <button
                                    key={name}
                                    type="button"
                                    onClick={() =>
                                      setPickAssister((prev) => (prev === name ? "" : name))
                                    }
                                    className={`${CHIP} ${
                                      pickAssister === name
                                        ? "bg-blue-400 text-white"
                                        : "border border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/10 dark:text-gray-300"
                                    }`}
                                  >
                                    {name}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPickerOpen(false)}
                            className="flex-1 rounded-xl bg-gray-200 py-2.5 text-[12px] font-black text-gray-600 dark:bg-white/10 dark:text-gray-300"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!pickScorer) return;
                              setGoalEvents((prev) => [
                                ...prev,
                                { scorer: pickScorer, assister: pickAssister },
                              ]);
                              setPickScorer("");
                              setPickAssister("");
                              setPickerOpen(false);
                            }}
                            disabled={!pickScorer}
                            className="flex-1 rounded-xl bg-[#FF8FA3] py-2.5 text-[12px] font-black text-white disabled:opacity-40 dark:bg-[#FFB6C1] dark:text-black"
                          >
                            확인
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {error && <p className="text-[12px] font-bold text-red-500">{error}</p>}

            <button
              type="button"
              onClick={save}
              disabled={saving || !date}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#FF8FA3] py-3 text-[13px] font-black text-white disabled:opacity-40 dark:bg-[#FFB6C1] dark:text-black"
            >
              {saving && <Loader2 width={16} height={16} className="animate-spin" />}
              {mode === "create" ? "등록하기" : "저장하기"}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
