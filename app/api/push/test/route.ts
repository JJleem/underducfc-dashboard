import { NextResponse } from "next/server";
import { sendPushToAll } from "@/app/lib/send-push";
import { getAllPushSubscriptions } from "@/app/lib/sheets-write";

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  const subs = await getAllPushSubscriptions().catch((e) => ({ error: String(e) }));

  if (!publicKey || !privateKey || !email) {
    return NextResponse.json({
      ok: false,
      reason: "환경변수 누락",
      publicKey: !!publicKey,
      privateKey: !!privateKey,
      email: !!email,
      subs,
    });
  }

  try {
    await sendPushToAll({ title: "🔔 테스트 알림", body: "푸시 정상 작동!", url: "/" });
    return NextResponse.json({ ok: true, subs });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: String(e), subs });
  }
}
