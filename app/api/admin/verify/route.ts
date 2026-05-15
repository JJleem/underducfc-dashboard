import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return NextResponse.json({ error: "ADMIN_PIN 환경변수 미설정" }, { status: 500 });
  if (pin !== adminPin) return NextResponse.json({ error: "PIN 오류" }, { status: 403 });
  return NextResponse.json({ ok: true });
}
