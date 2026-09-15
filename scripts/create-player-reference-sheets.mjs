import sharp from 'sharp';
import path from 'node:path';

const root = process.cwd();
const playersDir = path.join(root, 'public', 'players');
const outputDir = path.join(root, 'public', 'generated', 'references');

const sheets = {
  '04-halftime-references.png': ['문승환', '임준우', '공도하', '강창훈', '최동권', '금상덕'],
  '05-shootout-references.png': ['강현준', '이건주', '김한별', '임재준', '백성원', '홍창의', '우진우'],
  '06-offside-references.png': ['문대영', '백성원', '홍창의', '강창훈', '원석희', '김주성', '박영휘'],
};

await sharp({
  create: { width: 1, height: 1, channels: 4, background: 'white' },
}).png().toFile(path.join(outputDir, '.init.png'));

for (const [filename, names] of Object.entries(sheets)) {
  const cellWidth = 360;
  const cellHeight = 480;
  const columns = 4;
  const rows = Math.ceil(names.length / columns);
  const composites = [];

  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    const imagePath = path.join(playersDir, `${name}.webp`);
    const portrait = await sharp(imagePath)
      .resize(cellWidth, cellHeight - 54, { fit: 'contain', background: '#eeeeee' })
      .extend({ bottom: 54, background: '#ffffff' })
      .composite([{ input: Buffer.from(`<svg width="${cellWidth}" height="54"><rect width="100%" height="100%" fill="white"/><text x="18" y="36" font-family="Arial, Malgun Gothic, sans-serif" font-size="28" font-weight="700" fill="black">${index + 1}. ${name}</text></svg>`), top: cellHeight - 54, left: 0 }])
      .png()
      .toBuffer();
    composites.push({ input: portrait, left: (index % columns) * cellWidth, top: Math.floor(index / columns) * cellHeight });
  }

  await sharp({
    create: { width: columns * cellWidth, height: rows * cellHeight, channels: 4, background: '#d8d8d8' },
  }).composite(composites).png().toFile(path.join(outputDir, filename));
}
