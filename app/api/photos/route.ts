import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { revalidatePath } from "next/cache";
import { addPhotosToMatch, removePhotoFromMatch } from "../../lib/sheets-write";
import { requireAdmin } from "@/app/lib/admin";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { matchId, urls } = await request.json();

    if (matchId === undefined || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    await addPhotosToMatch(Number(matchId), urls);
    revalidatePath("/");
    revalidateAppData();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { matchId, url } = await request.json();
    if (matchId === undefined || !url) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }
    await removePhotoFromMatch(Number(matchId), url);
    revalidatePath("/");
    revalidateAppData();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
