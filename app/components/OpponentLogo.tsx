import Image from "next/image";
import { getOpponentLogo } from "../lib/opponent-logos";

/**
 * 상대팀 로고. 매핑에 로고가 있으면 이미지를, 없으면 팀명 첫 글자
 * 플레이스홀더를 렌더링해 화면 통일감을 유지한다.
 */
export default function OpponentLogo({
  name,
  className = "",
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const logo = getOpponentLogo(name);
  const initial = (name || "").trim().charAt(0) || "?";

  if (logo) {
    return (
      <div
        className={`relative w-14 h-14 bg-white dark:bg-black rounded-full flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden ${className}`}
      >
        <Image src={logo} alt={name || "상대팀"} fill className="object-contain p-1.5" />
      </div>
    );
  }

  return (
    <div
      className={`w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center border border-gray-200 dark:border-white/10 text-lg font-black text-gray-400 dark:text-gray-500 shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}
