// 26-27 결과 카드(피드)와 공유 이미지(캔버스)가 같은 Anton 을 쓰도록 한 곳에 둔다.
// 캔버스는 className 을 못 쓰니 anton.style.fontFamily 로 이름을 받아 그린다.
import { Anton } from "next/font/google";

export const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });
