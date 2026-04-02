import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { uploadToDrive, addPhotoToMatch } from "../../lib/sheets-write";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const matchId = Number(formData.get("matchId"));

    if (!file || isNaN(matchId)) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split("/")[1] || "jpg";
    const filename = `match${matchId}_${Date.now()}.${ext}`;

    const fileId = await uploadToDrive(buffer, filename, file.type);
    await addPhotoToMatch(matchId, fileId);

    revalidatePath("/");
    return NextResponse.json({ ok: true, fileId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
