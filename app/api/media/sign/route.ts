import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin") || req.headers.get("x-admin-pin");
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin || pin !== adminPin) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    return NextResponse.json({ error: "Cloudinary 환경변수 없음" }, { status: 500 });
  }

  const resourceType = req.nextUrl.searchParams.get("type") || "image";
  const timestamp = Math.round(Date.now() / 1000);
  const folder = "underduck-media";
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

  const { createHash } = await import("node:crypto");
  const signature = createHash("sha1").update(paramsToSign + apiSecret).digest("hex");

  return NextResponse.json({ timestamp, signature, apiKey, cloudName, folder, resourceType });
}
