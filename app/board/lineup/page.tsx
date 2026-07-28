// 전술게시판 — 내 전술(선발 11명) 작성/수정.
// 1인 1개라 이미 쓴 글이 있으면 그 글을 불러와 수정 모드로 연다.
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listBoardPosts } from "../../lib/board";
import { getRosterRows } from "../../lib/backend";
import BoardLineupClient from "./BoardLineupClient";

export const dynamic = "force-dynamic";

export default async function BoardLineupPage() {
  const session = await auth();
  const kakaoId = (session?.user as { kakaoId?: string } | undefined)?.kakaoId;
  if (!kakaoId || !session?.user?.name) redirect("/board");

  const [rosterRows, posts] = await Promise.all([
    getRosterRows().catch(() => [] as string[][]),
    listBoardPosts().catch(() => []),
  ]);

  // 선수 풀 = 현재 활동 중인 로스터 전원 (경기 참석 여부와 무관)
  const roster = rosterRows
    .slice(1)
    .map((r) => ({
      no: (r[0] || "").trim(),
      name: (r[1] || "").trim(),
      status: (r[3] || "").trim(),
      // roster pref_pos = index 7 (CSV, 최대 3)
      pref: (r[7] || "").split(",").map((v) => v.trim()).filter(Boolean),
    }))
    .filter((p) => p.name && p.status === "활동");

  const rosterMap: Record<string, string> = {};
  const prefPosMap: Record<string, string[]> = {};
  roster.forEach((p) => {
    rosterMap[p.name] = p.no;
    if (p.pref.length) prefPosMap[p.name] = p.pref;
  });

  const mine = posts.find((p) => p.lineup && p.kakaoId === kakaoId) ?? null;

  return (
    <BoardLineupClient
      author={session.user.name}
      players={roster.map((p) => p.name)}
      rosterMap={rosterMap}
      prefPosMap={prefPosMap}
      existing={mine}
    />
  );
}
