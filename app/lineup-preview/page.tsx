"use client";
// 임시 디자인 프리뷰 (검수 후 삭제)
import StartingElevenCard from "../components/StartingElevenCard";

const players = [
  "박영휘",
  "문승환", "금상덕", "원석희", "우진우",
  "홍창의", "공도하", "강창훈",
  "김주성", "문대영", "황동주",
];
const rosterMap: Record<string, string> = {
  박영휘: "1", 문승환: "4", 금상덕: "5", 원석희: "3", 우진우: "2",
  홍창의: "6", 공도하: "8", 강창훈: "10",
  김주성: "9", 문대영: "11", 황동주: "7",
  신태민: "13", 김광민: "14", 김준수: "15", 임재준: "16",
};

export default function LineupPreview() {
  return (
    <div className="mx-auto min-w-0 w-full max-w-md overflow-hidden bg-gray-50 p-3 dark:bg-[#070b18]">
      <StartingElevenCard
        formation="4-3-3"
        players={players}
        rosterMap={rosterMap}
        captainRoles={{ 금상덕: "C" }}
        opponent="어미새 FC"
        date="2026-07-18"
        time="10:00"
        location="월드컵 풋살장"
        subs={["신태민", "김광민", "김준수", "임재준"]}
      />
    </div>
  );
}
