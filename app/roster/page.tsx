// app/roster/page.tsx
import { getSheetData } from "../lib/google-sheets";
import RosterClient from "./RosterClient";

export default async function RosterPage() {
  // 구글 시트에서 로스터 데이터를 가져옵니다.
  const rows = await getSheetData("roster!A1:J50");
  const players = rows.slice(1); // 첫 줄(헤더) 제외

  // 클라이언트 컴포넌트로 데이터를 넘겨서 렌더링합니다.
  return <RosterClient players={players} />;
}
