// app/roster/RosterClient.tsx
"use client";
import React from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  ArrowLeft,
  Pencil,
  Loader2,
  User,
  UserPlus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "../components/ui/drawer";
import { playerFaceOnSrc } from "../lib/player-faceons";
import { useRouter } from "next/navigation";
import AppToast from "../components/AppToast";

interface RosterClientProps {
  players: string[][];
  isAdmin?: boolean;
}

// 포지션 그룹 메타 (앱 포지션 색 체계와 동일). 골키퍼 주황 / 수비 파랑 / 미드 초록 / 공격 핑크.
const POS_META: Record<string, { label: string; en: string; color: string }> = {
  GK: { label: "골키퍼", en: "GOALKEEPERS", color: "#F59E0B" },
  DF: { label: "수비수", en: "DEFENDERS", color: "#3B82F6" },
  MF: { label: "미드필더", en: "MIDFIELDERS", color: "#10B981" },
  FW: { label: "공격수", en: "FORWARDS", color: "#FF8FA3" },
  ETC: { label: "기타", en: "OTHERS", color: "#94A3B8" },
};
const POS_ORDER = ["GK", "DF", "MF", "FW", "ETC"];

// 스쿼드 카드 페이스온: 파일이 있으면 사진, 없거나 실패하면 실루엣.
function SquadPhoto({ name, accent }: { name: string; accent: string }) {
  const src = playerFaceOnSrc(name);
  const [failed, setFailed] = React.useState(false);
  const showPhoto = src && !failed;
  return (
    <>
      {!showPhoto && (
        <User
          className="absolute bottom-4 left-1/2 -translate-x-1/2"
          style={{ width: "48%", height: "48%", color: accent }}
          strokeWidth={1.3}
        />
      )}
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-contain object-bottom drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]"
        />
      )}
    </>
  );
}

export default function RosterClient({ players: initialPlayers, isAdmin = false }: RosterClientProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [playerList, setPlayerList] = React.useState<string[][]>(initialPlayers);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  // memo = 주장 역할("c" 주장 / "vc" 부주장 / "" 없음). 완장·명단 표시가 이 값을 본다.
  const [form, setForm] = React.useState({ no: "", name: "", pos: "MF", status: "활동", memo: "" });
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!saveError) return;
    const timer = window.setTimeout(() => setSaveError(null), 2400);
    return () => window.clearTimeout(timer);
  }, [saveError]);

  const openAdd = () => {
    setMode("add");
    setEditId(null);
    setForm({ no: "", name: "", pos: "MF", status: "활동", memo: "" });
    setModalOpen(true);
  };

  const openEdit = (player: string[]) => {
    setMode("edit");
    setEditId(player[6] || null);
    setForm({
      no: player[0] === "-" ? "" : player[0] || "",
      name: player[1] || "",
      pos: (player[2] || "MF").toUpperCase(),
      status: player[3] || "활동",
      memo: (player[5] || "").trim().toLowerCase(),
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (mode === "add") {
        const res = await fetch("/api/roster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("등록 실패");
        router.refresh();
        const data = await res.json().catch(() => ({}));
        const newId = data?.id != null ? String(data.id) : "";
        setPlayerList((prev) => [...prev, [form.no || "-", form.name, form.pos, form.status, "", form.memo, newId]]);
      } else {
        if (!editId) throw new Error("수정할 선수를 찾을 수 없습니다.");
        const res = await fetch(`/api/roster/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("수정 실패");
        router.refresh();
        setPlayerList((prev) =>
          prev.map((p) =>
            p[6] === editId
              ? [form.no || "-", form.name, form.pos, form.status, p[4] || "", form.memo, p[6]]
              : p
          )
        );
      }
      setModalOpen(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "선수 정보를 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  const byNumber = (a: string[], b: string[]) => {
    const nA = parseInt(a[0]);
    const nB = parseInt(b[0]);
    const hasA = !isNaN(nA) && a[0]?.trim() !== "" && a[0] !== "-";
    const hasB = !isNaN(nB) && b[0]?.trim() !== "" && b[0] !== "-";
    if (hasA && hasB) return nA - nB;
    if (hasA) return -1;
    if (hasB) return 1;
    return 0;
  };

  // 포지션별로 묶는다. 비활동 선수는 각 그룹 끝으로 보내되 그 안에서는 등번호순이다.
  const grouped = React.useMemo(() => {
    const g: Record<string, string[][]> = {};
    for (const p of playerList) {
      const raw = (p[2] || "").toUpperCase().trim();
      const key = ["GK", "DF", "MF", "FW"].includes(raw) ? raw : "ETC";
      (g[key] ||= []).push(p);
    }
    for (const k of Object.keys(g)) {
      g[k].sort(
        (a, b) =>
          Number((a[3] || "활동") === "비활동") -
            Number((b[3] || "활동") === "비활동") || byNumber(a, b),
      );
    }
    return g;
  }, [playerList]);

  const statusCounts = React.useMemo(
    () => ({
      active: playerList.filter((player) => (player[3] || "활동") === "활동").length,
      injured: playerList.filter((player) => player[3] === "부상").length,
      inactive: playerList.filter((player) => player[3] === "비활동").length,
    }),
    [playerList],
  );

  return (
    <div className="relative mx-auto min-h-[100dvh] max-w-md overflow-hidden bg-gray-50 font-sans text-gray-900 transition-colors duration-300 dark:bg-[#09090b] dark:text-zinc-100">
      <header className="app-workspace-header safe-header-py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="뒤로"
            className="press-icon -my-2.5 -ml-2.5 flex h-11 w-11 items-center justify-center text-gray-700 dark:text-gray-300"
          >
            <ArrowLeft width={18} height={18} strokeWidth={2.4} />
          </Link>
          <span className="app-header-label">SQUAD</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={openAdd}
              aria-label="선수 추가"
              title="선수 추가"
              className="app-icon-action app-icon-action-primary press-icon -my-1"
            >
              <UserPlus width={16} height={16} strokeWidth={2.4} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="테마 전환"
            className="app-icon-action app-icon-action-neutral press-icon -my-1"
          >
            <Moon className="block h-4 w-4 text-gray-700 dark:hidden" />
            <Sun className="hidden h-4 w-4 text-[#FFB6C1] dark:block" />
          </button>
        </div>
      </header>

      <main className="pb-28">
        <section className="relative overflow-hidden px-4 pb-5 pt-5">
          <div
            className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#FF8FA3]"
            style={{ opacity: 0.15, filter: "blur(46px)" }}
          />
          <div
            className="pointer-events-none absolute -right-4 top-1 h-28 w-28 bg-gray-900/[0.05] dark:bg-white/[0.06]"
            style={{
              WebkitMaskImage: "url(/underduck-mark.png)",
              maskImage: "url(/underduck-mark.png)",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              maskPosition: "center",
            }}
          />
          <div className="relative">
            <p className="text-[10px] font-black tracking-[0.18em] text-[#FF8FA3] dark:text-[#FFB6C1]">
              UNDERDUCK FC
            </p>
            <h1 className="mt-2 text-[25px] font-black leading-tight tracking-[-0.04em] text-gray-900 dark:text-white">
              언더덕 스쿼드
            </h1>
            <p className="mt-2 text-[11px] font-bold text-gray-500 dark:text-white/45">
              함께 뛰는 {playerList.length}명의 선수들
            </p>
            <div className="mt-4 flex items-center gap-3 text-[10px] font-black">
              <span className="text-[#FF8FA3] dark:text-[#FFB6C1]">
                활동 {statusCounts.active}
              </span>
              {statusCounts.injured > 0 && (
                <span className="text-red-500 dark:text-red-400">부상 {statusCounts.injured}</span>
              )}
              {statusCounts.inactive > 0 && (
                <span className="text-gray-400 dark:text-white/35">
                  비활동 {statusCounts.inactive}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 포지션별 스쿼드 그리드 */}
        <div className="space-y-7">
          {POS_ORDER.map((key) => {
            const group = grouped[key];
            if (!group || group.length === 0) return null;
            const meta = POS_META[key];
            return (
              <section key={key}>
                {/* 그룹 헤더 */}
                <div className="mb-3 flex items-baseline gap-2 px-4">
                  <h2
                    className="text-[11px] font-black uppercase tracking-[0.18em]"
                    style={{ color: meta.color }}
                  >
                    {key}
                  </h2>
                  <span className="text-[11px] font-black text-gray-700 dark:text-white/75">
                    {meta.label}
                  </span>
                  <span className="text-[9px] font-bold tracking-[0.12em] text-gray-300 dark:text-white/20">
                    {meta.en}
                  </span>
                  <span className="ml-auto text-[11px] font-black tabular-nums text-gray-400 dark:text-white/35">
                    {group.length}
                  </span>
                </div>

                {/* 인스타 프로필처럼 사진 면이 이어지는 스쿼드 월. 카드 테두리·그림자는 쓰지 않는다. */}
                <div className="grid grid-cols-3 gap-0 bg-transparent">
                  {group.map((player, index) => {
                    const rawNo = (player[0] || "").trim();
                    const hasNo = !!rawNo && rawNo !== "-" && !isNaN(parseInt(rawNo));
                    const name = player[1] || "무명";
                    const status = player[3] || "활동";
                    const etc = (player[5] || "").toLowerCase().trim();
                    const isC = etc === "c";
                    const isVC = etc === "vc";
                    const isInjured = status === "부상";
                    const isInactive = status === "비활동";
                    const color = meta.color;

                    return (
                      <div
                        key={player[6] || index}
                        style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                        className="animate-rise relative"
                      >
                        <Link
                          href={`/players/${encodeURIComponent(name.trim())}`}
                          className={`group relative block aspect-[3/4] overflow-hidden bg-gray-100 transition-opacity active:opacity-70 dark:bg-[#111114] ${
                            isInactive ? "grayscale" : ""
                          }`}
                          style={{
                            background: isInactive
                              ? undefined
                              : `linear-gradient(155deg, ${color}22 0%, ${color}0b 48%, transparent 78%)`,
                          }}
                        >
                          {/* 큰 등번호 (시그니처) */}
                          {hasNo && (
                            <span
                              className="pointer-events-none absolute -top-1 right-0.5 select-none font-black leading-none tabular-nums"
                              style={{ fontSize: "54px", color: isInactive ? "rgba(148,163,184,.16)" : `${color}2e` }}
                            >
                              {rawNo}
                            </span>
                          )}

                          {/* 페이스온 */}
                          <SquadPhoto name={name} accent={color} />

                          {isInactive && (
                            <div className="pointer-events-none absolute inset-0 z-[1] bg-gray-200/35 dark:bg-black/35" />
                          )}

                          {/* 하단 그라데이션 + 꼭 필요한 정보만 */}
                          <div className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/90 via-black/45 to-transparent px-2 pb-2 pt-9">
                            <div className="flex items-center gap-1">
                              <span className="truncate text-[12px] font-black leading-tight text-white">{name}</span>
                              {isC && <span className="shrink-0 text-[8px] font-black text-emerald-300">C</span>}
                              {isVC && <span className="shrink-0 text-[8px] font-black text-amber-300">VC</span>}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[9px] font-black">
                              <span className="tabular-nums text-white/65">
                                {hasNo ? `No. ${rawNo}` : "No. -"}
                              </span>
                              {isInjured && <span className="text-red-300">부상</span>}
                              {isInactive && <span className="text-white/45">비활동</span>}
                            </div>
                          </div>
                        </Link>

                        {/* 관리자 편집 (링크와 분리) */}
                        {isAdmin && (
                          <button
                            onClick={() => openEdit(player)}
                            className="absolute left-1.5 top-1.5 z-10 flex min-h-9 items-center gap-1 rounded-full bg-black/55 px-2.5 text-white/90 backdrop-blur-sm active:opacity-70"
                            aria-label="선수 수정"
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="text-[8px] font-black">편집</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* 선수 추가/수정 Drawer */}
      <Drawer open={modalOpen} onOpenChange={setModalOpen} repositionInputs>
        <DrawerContent className="max-h-[92dvh] overflow-hidden bg-white dark:bg-[#161618]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-[15px] font-black text-gray-900 dark:text-white">
              {mode === "add" ? "선수 추가" : "선수 수정"}
            </DrawerTitle>
            <p className="mt-0.5 text-[11px] font-bold text-gray-400 dark:text-white/30">
              명단에 표시되는 기본 정보를 입력해 주세요.
            </p>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
            {/* 이름 */}
            <div>
              <p className="mb-2 text-[10px] font-black tracking-[0.14em] text-gray-400 dark:text-white/35">이름 *</p>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="선수 이름"
                className="app-field-surface app-control-md w-full rounded-xl px-3.5 py-2.5 font-medium"
              />
            </div>

            {/* 등번호 */}
            <div>
              <p className="mb-2 text-[10px] font-black tracking-[0.14em] text-gray-400 dark:text-white/35">등번호 <span className="font-medium normal-case tracking-normal text-gray-300 dark:text-white/20">(미입력 시 -)</span></p>
              <input
                type="number"
                value={form.no}
                onChange={(e) => setForm((p) => ({ ...p, no: e.target.value }))}
                placeholder="등번호"
                min={0}
                max={99}
                className="app-field-surface app-control-md w-full rounded-xl px-3.5 py-2.5 font-medium"
              />
            </div>

            {/* 포지션 */}
            <div>
              <p className="mb-2 text-[10px] font-black tracking-[0.14em] text-gray-400 dark:text-white/35">포지션</p>
              <div className="grid grid-cols-4 gap-2">
                {["GK", "DF", "MF", "FW"].map((p) => {
                  const styles: Record<string, string> = {
                    GK: "bg-amber-500 text-white",
                    DF: "bg-blue-500 text-white",
                    MF: "bg-emerald-500 text-white",
                    FW: "bg-[#FF8FA3] text-white",
                  };
                  const inactiveStyles: Record<string, string> = {
                    GK: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
                    DF: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
                    MF: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
                    FW: "bg-[#FF8FA3]/10 text-[#FF8FA3] dark:bg-[#FFB6C1]/10 dark:text-[#FFB6C1]",
                  };
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, pos: p }))}
                      className={`rounded-xl py-2.5 text-[12px] font-black transition-colors ${form.pos === p ? styles[p] : inactiveStyles[p]}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 상태 */}
            <div>
              <p className="mb-2 text-[10px] font-black tracking-[0.14em] text-gray-400 dark:text-white/35">상태</p>
              <div className="flex gap-2">
                {["활동", "부상", "비활동"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, status: s }))}
                    className={`flex-1 rounded-xl py-2.5 text-[12px] font-black transition-colors ${
                      form.status === s
                        ? s === "활동"
                          ? "bg-[#FF8FA3] text-white"
                          : s === "부상"
                            ? "bg-red-500 text-white"
                            : "bg-gray-500 text-white dark:bg-white/35 dark:text-black"
                        : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 주장 역할 — 완장(FormationField)과 명단 표시가 이 값을 본다. */}
            <div>
              <p className="mb-2 text-[10px] font-black tracking-[0.14em] text-gray-400 dark:text-white/35">주장</p>
              <div className="flex gap-2">
                {[
                  { value: "", label: "없음" },
                  { value: "c", label: "주장" },
                  { value: "vc", label: "부주장" },
                ].map((r) => (
                  <button
                    key={r.value || "none"}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, memo: r.value }))}
                    className={`flex-1 rounded-xl py-2.5 text-[12px] font-black transition-colors ${
                      form.memo === r.value
                        ? r.value
                          ? "bg-[#FF8FA3] text-white"
                          : "bg-gray-500 text-white dark:bg-white/35 dark:text-black"
                        : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] font-bold text-gray-400 dark:text-white/30">
                주장은 한 명만 두세요. 부주장은 여럿이어도 됩니다.
              </p>
            </div>
          </div>

          <DrawerFooter className="pb-[max(16px,env(safe-area-inset-bottom))] pt-2">
            <button
              type="button"
              onClick={submit}
              disabled={saving || !form.name.trim()}
              className="app-button app-button-primary app-cta-md w-full"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "add" ? "추가하기" : "수정하기"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <AppToast message={saveError} tone="error" />
    </div>
  );
}
