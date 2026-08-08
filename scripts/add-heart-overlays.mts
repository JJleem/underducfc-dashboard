// heart.jpeg의 손 하트 중앙에만 빨간 하트를 결정적으로 합성한다.
// AI 편집 전에 이 파일을 레퍼런스로 쓰면 인물·얼굴·손을 다시 그릴 필요가 없다.

import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const input = "test/heart.jpeg";
const output = "test/heart-composite.png";

const hearts = [
  { x: 384, y: 840, size: 38 },
  { x: 614, y: 808, size: 34 },
  { x: 838, y: 768, size: 36 },
  { x: 956, y: 784, size: 48 },
  { x: 1112, y: 794, size: 34 },
  { x: 1296, y: 748, size: 38 },
  { x: 1462, y: 808, size: 40 },
  { x: 500, y: 980, size: 38 },
  { x: 822, y: 916, size: 36 },
  { x: 928, y: 980, size: 40 },
  { x: 1228, y: 990, size: 40 },
  { x: 1432, y: 1022, size: 40 },
];

function heartSvg(size: number): Buffer {
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="fill" cx="34%" cy="25%" r="78%">
          <stop offset="0" stop-color="#ff9c9c"/>
          <stop offset="0.25" stop-color="#ff3b3b"/>
          <stop offset="1" stop-color="#b40018"/>
        </radialGradient>
        <filter id="glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path filter="url(#glow)" fill="#ff2738" opacity="0.42"
        d="M50 88C42 78 12 60 12 35C12 15 38 8 50 28C62 8 88 15 88 35C88 60 58 78 50 88Z"/>
      <path fill="url(#fill)" stroke="#ff6974" stroke-width="2"
        d="M50 86C42 77 17 60 17 37C17 20 39 14 50 31C61 14 83 20 83 37C83 60 58 77 50 86Z"/>
      <ellipse cx="36" cy="31" rx="9" ry="6" fill="white" opacity="0.72" transform="rotate(-24 36 31)"/>
    </svg>`);
}

await mkdir("test", { recursive: true });
await sharp(input)
  .resize(1920, 1440, { fit: "fill" })
  .composite(
    hearts.map(({ x, y, size }) => ({
      input: heartSvg(size),
      left: Math.round(x - size / 2),
      top: Math.round(y - size / 2),
    })),
  )
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(output);
