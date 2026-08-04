import NewHome from "./components/home/NewHome";

/** 홈은 인스타 피드형 NewHome으로 확정한다. 환경변수·쿼리로 이전 홈에 돌아가지 않는다. */
export default function TeamDashboardPage() {
  return <NewHome />;
}
