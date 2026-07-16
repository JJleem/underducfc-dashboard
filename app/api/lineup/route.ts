import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { revalidatePath } from "next/cache";
import { writeLineup } from "../../lib/sheets-write";
import { requireAdmin } from "@/app/lib/admin";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await request.json();
    const { matchId, quarter, formation, players, subs, substitutions } = body;

    if (matchId === undefined || !quarter || !formation) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    await writeLineup({
      matchId,
      quarter,
      formation,
      players: players || [],
      subs: subs || [],
      substitutions: substitutions || [],
    });

    revalidatePath(`/matches/${matchId}`);
    revalidatePath("/");

    revalidateAppData();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
