import { NextRequest, NextResponse } from "next/server";
import { appendMedia, deleteMediaByUrl } from "@/app/lib/sheets-write";
import { getSheetData } from "@/app/lib/google-sheets";

export async function GET() {
  try {
    const rows = await getSheetData("media!A1:D100");
    const items = rows
      .slice(1)
      .map((row: string[], i: number) => ({
        id: i,
        type: row[0] || "image",
        url: row[1] || "",
        title: row[2] || "",
        uploadedAt: row[3] || "",
      }))
      .filter((item) => item.url);
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { type, url, title } = await req.json();
    if (!url) return NextResponse.json({ error: "URL 필수" }, { status: 400 });
    await appendMedia({ type: type || "image", url, title: title || "" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL 필수" }, { status: 400 });
    await deleteMediaByUrl(url);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
