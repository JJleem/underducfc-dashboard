import { NextRequest, NextResponse } from "next/server";
import { addPushSubscription, removePushSubscription } from "@/app/lib/sheets-write";

export async function POST(req: NextRequest) {
  try {
    const { endpoint, keys } = await req.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "잘못된 구독 데이터" }, { status: 400 });
    }
    await addPushSubscription({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "endpoint 없음" }, { status: 400 });
    await removePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
