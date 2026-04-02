import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { addPhotosToMatch } from "../../lib/sheets-write";

export async function POST(request: NextRequest) {
  try {
    const { matchId, urls } = await request.json();

    if (matchId === undefined || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    await addPhotosToMatch(Number(matchId), urls);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
