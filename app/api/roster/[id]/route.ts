import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { updateRoster } from "@/app/lib/sheets-write";
import { requireAdmin } from "@/app/lib/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await req.json();
    const { no, name, pos, status } = body;
    if (!name) {
      return NextResponse.json({ error: "이름은 필수입니다." }, { status: 400 });
    }
    await updateRoster(id, {
      no: no || "-",
      name,
      pos: pos || "MF",
      status: status || "활동",
    });
    revalidateAppData();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
