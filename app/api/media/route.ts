import { NextRequest, NextResponse } from "next/server";
import { revalidateAppData } from "@/app/lib/cache";
import { appendMedia, deleteMediaByUrl } from "@/app/lib/sheets-write";
import { getMediaRows } from "@/app/lib/backend";

export const dynamic = "force-dynamic";

function checkPin(req: NextRequest): boolean {
  const pin = req.headers.get("x-admin-pin");
  const adminPin = process.env.ADMIN_PIN;
  return !!adminPin && pin === adminPin;
}

export async function GET() {
  try {
    const rows = await getMediaRows();
    const items = rows
      .slice(1)
      .map((row: string[], i: number) => ({
        id: i,
        type: row[0] || "image",
        url: row[1] || "",
        title: row[2] || "",
        uploadedAt: row[3] || "",
      }))
      .filter((item: { url: string }) => item.url);
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  try {
    const { type, url, title } = await req.json();
    if (!url) return NextResponse.json({ error: "URL 필수" }, { status: 400 });
    await appendMedia({ type: type || "image", url, title: title || "" });
    revalidateAppData();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL 필수" }, { status: 400 });
    await deleteMediaByUrl(url);
    revalidateAppData();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
