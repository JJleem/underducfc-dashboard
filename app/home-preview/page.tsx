// /home-preview — 새 홈을 상태·레이아웃 스위치와 함께 띄워보는 미리보기.
//
// 그리는 내용은 실제 홈과 같은 컴포넌트(NewHome)다. 여긴 preview 를 켜서
// 상단에 스위치만 더 붙인다. 지금 팀 상태는 하나뿐이라 나머지 네 화면을
// 눈으로 확인할 방법이 필요해서 남겨둔 화면이다.

import NewHome from "../components/home/NewHome";

export const dynamic = "force-dynamic";

export default async function HomePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; list?: string; vote?: string }>;
}) {
  const { state, list, vote } = await searchParams;
  return <NewHome forcedState={state} list={list} preview previewVote={vote} />;
}
