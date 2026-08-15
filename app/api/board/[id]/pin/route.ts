import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin";
import { toggleBoardPin } from "@/app/lib/board";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const result = await toggleBoardPin(Number(id));
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
