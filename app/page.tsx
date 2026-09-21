import NewHome from "./components/home/NewHome";

/** 홈은 인스타 피드형 NewHome으로 확정한다. 환경변수·쿼리로 이전 홈에 돌아가지 않는다. */
export default async function TeamDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  // 피드를 한 시즌으로 좁히는 선택. 기본(없음)은 전체다 — 개막일 아침에 홈이 비면 안 된다.
  const { season } = await searchParams;
  return <NewHome season={season} />;
}
