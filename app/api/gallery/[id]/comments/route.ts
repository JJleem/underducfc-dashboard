import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/app/lib/admin";
import { addGalleryComment, getGalleryComments } from "@/app/lib/gallery";
import { isGalleryArtworkId } from "@/app/lib/matchday-gallery";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const denied = await requireUser(); if (denied) return denied; const { id } = await params; if (!isGalleryArtworkId(id)) return NextResponse.json([], { status: 404 }); return NextResponse.json(await getGalleryComments(id)); }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) { const denied = await requireUser(); if (denied) return denied; const { id } = await params; if (!isGalleryArtworkId(id)) return NextResponse.json({}, { status: 404 }); const s = await auth(); const u = s?.user as { kakaoId?: string; name?: string }; const { message } = await req.json(); if (!u?.kakaoId || !u.name || !String(message).trim()) return NextResponse.json({ error: "내용을 확인해주세요." }, { status: 400 }); return NextResponse.json(await addGalleryComment(id, { kakaoId: u.kakaoId, author: u.name, message: String(message).trim() }), { status: 201 }); }
