import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { appendRoster } from "@/app/lib/sheets-write";
import { requireAdmin } from "@/app/lib/admin";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const { no, name, pos, status } = body;
    if (!name) {
      return NextResponse.json({ error: "이름은 필수입니다." }, { status: 400 });
    }
    const { id } = await appendRoster({
      no: no || "-",
      name,
      pos: pos || "MF",
      status: status || "활동",
    });
    revalidateAppData();
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
