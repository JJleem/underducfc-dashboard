import webpush from "web-push";
import { getAllPushSubscriptions } from "./sheets-write";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  const subs = await getAllPushSubscriptions();
  console.log(`[push] 구독자 수: ${subs.length}`);
  if (subs.length === 0) return;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[push] sub[${i}] 실패:`, r.reason);
  });
}
