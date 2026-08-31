import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/admin";
import { revalidateAppData, UD_TAG } from "@/app/lib/cache";
import { toggleLoungeLike } from "@/app/lib/lounge";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    const result = await toggleLoungeLike(Number(id));
    revalidateAppData(UD_TAG.lounge);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
