import { NextResponse } from "next/server";

export async function GET() {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    return NextResponse.json({ error: "Cloudinary 환경변수 없음" }, { status: 500 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = "underduck";
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

  const { createHash } = await import("node:crypto");
  const signature = createHash("sha1").update(paramsToSign + apiSecret).digest("hex");

  return NextResponse.json({ timestamp, signature, apiKey, cloudName, folder });
}
