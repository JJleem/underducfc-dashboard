import { NextRequest, NextResponse } from "next/server";
import { updateNotice } from "@/app/lib/sheets-write";
import { sendPushToAll } from "@/app/lib/send-push";

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, title, content, important, location } = body;
    if (!title || !content) {
      return NextResponse.json({ error: "제목과 내용은 필수입니다." }, { status: 400 });
    }
    await updateNotice({
      date: date || new Date().toISOString().slice(0, 10),
      title,
      content,
      important: !!important,
      location: location || "",
    });
    sendPushToAll({
      title: important ? "📢 [중요] 새 공지사항이 등록됐어요" : "📢 새 공지사항이 등록됐어요",
      body: title,
      url: "/",
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
