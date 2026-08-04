import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireUser } from "@/app/lib/admin";
import { listBoardPosts, createBoardPost } from "@/app/lib/board";
import { youtubeId } from "@/app/lib/youtube";
import { isInstagramUrl } from "@/app/lib/instagram";

export async function GET() {
  const denied = await requireUser();
  if (denied) return denied;
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

    // 전술 글이면 라인업이, 영상 글이면 링크가 있어야 한다.
    // (youtubeUrl 은 백엔드 컬럼명 그대로 쓴다 — 유튜브·인스타 공용 "공유 링크" 칸)
    if (lineup) {
      const quarters = Array.isArray(lineup.quarters) ? lineup.quarters : [];
      if (quarters.length === 0) {
        return NextResponse.json({ error: "쿼터를 하나 이상 만들어주세요." }, { status: 400 });
      }
      if (quarters.length > 4) {
        return NextResponse.json({ error: "쿼터는 최대 4개까지입니다." }, { status: 400 });
      }
      for (const q of quarters) {
        const players: string[] = Array.isArray(q.players) ? q.players : [];
        if (players.filter((p) => p?.trim()).length < 11) {
          return NextResponse.json(
            { error: `${q.quarter ?? ""} 선발 11명을 모두 채워주세요.` },
            { status: 400 },
          );
        }
      }
    } else {
      if (!youtubeUrl?.trim()) {
        return NextResponse.json({ error: "영상 링크는 필수입니다." }, { status: 400 });
      }
      if (!youtubeId(youtubeUrl) && !isInstagramUrl(youtubeUrl)) {
        return NextResponse.json(
          { error: "유튜브 또는 인스타그램 링크만 올릴 수 있습니다." },
          { status: 400 },
        );
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
            quarters: (lineup.quarters as Record<string, unknown>[]).map((q, i) => ({
              quarter: String(q.quarter || `${i + 1}Q`),
              formation: String(q.formation || ""),
              positions: String(q.positions || ""),
              players: (q.players as string[]).map((p) => String(p || "").trim()),
              instructions: String(q.instructions || ""),
              tactic: String(q.tactic || ""),
            })),
          }
        : null,
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
