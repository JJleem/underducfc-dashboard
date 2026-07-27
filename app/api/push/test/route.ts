import { NextResponse } from "next/server";
import { sendPushToAll } from "@/app/lib/send-push";
import { requireAdmin } from "@/app/lib/admin";

// 관리자 전용.
// 가드가 없던 동안은 이 URL만 알면 로그인도 없이 전 회원에게 알림을 쏠 수 있었다.
//
// 구독 목록(subs)도 더 이상 응답에 싣지 않는다. 진단에 필요한 건 "보냈는지"이지
// 전 회원의 구독 키가 아니다.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const missing = ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_EMAIL"].filter(
    (k) => !process.env[k],
  );
  if (missing.length) {
    return NextResponse.json({ ok: false, reason: `환경변수 누락: ${missing.join(", ")}` });
  }

  try {
    await sendPushToAll({ title: "🔔 테스트 알림", body: "푸시 정상 작동!", url: "/" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: String(e) }, { status: 500 });
  }
}
