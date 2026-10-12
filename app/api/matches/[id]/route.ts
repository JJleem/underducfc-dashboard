import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { finalizeAttendance, setAttendanceStatus, updateMatchResult } from "@/app/lib/sheets-write";
import { sendPushToAll } from "@/app/lib/send-push";
import { requireAdmin } from "@/app/lib/admin";
import { isCasualMatch } from "@/app/components/home/match-result";
import { udGet } from "@/app/lib/underduck";
import type { MatchOut } from "@/app/lib/matches-backend";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const matchId = Number(id);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "잘못된 경기 ID" }, { status: 400 });
    }
    const body = await req.json();
    const { date, time, location, opponent, type, result, ourScore, theirScore, goals, assists, attendees } = body;
    // 저장 전 결과를 본다. 이미 끝난 경기를 고쳐 저장(득점자·참석자 수정 등)할 때마다
    // "경기 종료" 알림이 또 나가지 않도록, 예정 → 결과 로 바뀌는 첫 저장에만 보낸다.
    // 캐시된 값이면 방금 저장한 걸 못 볼 수 있어 no-store 로 읽는다.
    // 조회가 실패하면 예전처럼 보낸다(알림 누락보다 중복이 낫다).
    let wasFinished = false;
    try {
      const prev = await udGet<MatchOut>(`/api/underduck/matches/${matchId}`, { cache: "no-store" });
      wasFinished = !!prev.result && prev.result !== "예정";
    } catch (e) {
      console.error("[match] 이전 결과 조회 실패 (알림은 그대로 보냄):", e);
    }
    await updateMatchResult(matchId, {
      date: date ?? "",
      time: time ?? "",
      location: location ?? "",
      opponent: opponent ?? "",
      type: type ?? "",
      result: result || "예정",
      ourScore: ourScore ?? "",
      theirScore: theirScore ?? "",
      goals: goals ?? "",
      assists: assists ?? "",
      attendees: attendees ?? "",
    });
    if (result && result !== "예정") {
      // 경기가 끝나면 출석 투표도 함께 닫는다.
      //
      // 예전엔 투표 화면에서 관리자가 "투표 마감"을 따로 눌러야 했는데 실제로는 아무도
      // 안 눌러서, 끝난 경기의 투표가 계속 "진행중"으로 남아 있었다(25경기 중 마감은 1건뿐).
      // 결과를 입력하는 순간이 곧 경기가 끝난 순간이라 여기가 제일 정확한 타이밍이다.
      //
      // 참석자를 덮어쓰지 않는 게 중요하다. finalizeAttendance 는 "참석" 투표자로
      // matches.attendees 를 채우는데, 방금 관리자가 폼에서 고른 실제 참석자가 더 정확하다.
      // (투표는 "나갈게요"고 결과 입력은 "실제로 나왔다"다)
      //   · 관리자가 참석자를 골랐다  → 상태만 마감으로
      //   · 비워서 저장했다          → 투표 결과로 채우면서 마감
      try {
        if (String(attendees ?? "").trim()) {
          await setAttendanceStatus(matchId, "마감");
        } else {
          await finalizeAttendance(matchId);
        }
      } catch (e) {
        // 투표 마감이 실패해도 경기 결과 저장은 이미 끝났다. 되돌리지 않는다.
        console.error("[match] 출석 투표 마감 실패 (무시):", e);
      }

      // 자체전·풋살·야유회는 알림을 보내지 않는다. 매주 치르는 경기라
      // 전체 알림이 매주 나가면 알림 피로만 쌓이고, 본문이 MOM 투표를
      // 재촉하는 내용인데 그 경기들은 MOM 투표 자체를 열지 않는다.
      if (!wasFinished && !isCasualMatch(result, type)) {
        try {
          await sendPushToAll({
            title: "경기가 종료되었어요. 모두 고생하셨습니다!",
            body: "MOM투표 부탁드립니다! 🗳️",
            url: "/",
          });
        } catch (e) {
          console.error("[push] match 알림 실패:", e);
        }
      }
    }
    revalidateAppData();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
