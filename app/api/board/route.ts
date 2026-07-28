import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/app/lib/admin";
import { listBoardPosts, createBoardPost } from "@/app/lib/board";
import { youtubeId } from "@/app/lib/youtube";

export async function GET() {
  try {
    return NextResponse.json(await listBoardPosts());
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireUser();
  if (denied) return denied;
  try {
    const session = await auth();
    const kakaoId = (session?.user as { kakaoId?: string })?.kakaoId;
    const author = session?.user?.name;
    if (!kakaoId || !author) {
      return NextResponse.json({ error: "세션 정보 없음" }, { status: 401 });
    }

    const { title, youtubeUrl, body, lineup } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "제목은 필수입니다." }, { status: 400 });
    }

    // 전술 글이면 라인업이, 유튜브 글이면 링크가 있어야 한다.
    if (lineup) {
      const players: string[] = Array.isArray(lineup.players) ? lineup.players : [];
      if (players.filter((p) => p?.trim()).length < 11) {
        return NextResponse.json({ error: "선발 11명을 모두 채워주세요." }, { status: 400 });
      }
    } else {
      if (!youtubeUrl?.trim()) {
        return NextResponse.json({ error: "유튜브 링크는 필수입니다." }, { status: 400 });
      }
      if (!youtubeId(youtubeUrl)) {
        return NextResponse.json({ error: "올바른 유튜브 링크가 아닙니다." }, { status: 400 });
      }
    }

    const post = await createBoardPost({
      kakaoId,
      author,
      title: title.trim(),
      youtubeUrl: lineup ? null : youtubeUrl.trim(),
      body: body?.trim() || null,
      lineup: lineup
        ? {
            formation: String(lineup.formation || ""),
            positions: String(lineup.positions || ""),
            players: (lineup.players as string[]).map((p) => String(p || "").trim()),
            instructions: String(lineup.instructions || ""),
            tactic: String(lineup.tactic || ""),
          }
        : null,
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
