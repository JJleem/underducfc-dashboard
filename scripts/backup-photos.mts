// 경기 사진 원본 백업. `npm run backup:photos [받을 폴더]`
//
// 팀 사진의 원본은 Cloudinary 무료 계정에만 있다. 용량이 문제가 아니라 — 25 크레딧 중
// 1.3 을 쓰는 중이라 몇 년치 여유가 있다 — 무료 계정에는 보장이 없다는 게 문제다.
// 다시 찍을 수 없는 사진이라 사본 하나는 손에 들고 있어야 한다.
//
// 몇 번을 돌려도 안전하다. 이미 받은 파일은 크기를 보고 건너뛰므로, 중간에 끊기면
// 다시 돌리면 이어서 받는다.
//
// 받을 곳 기본값은 레포 밖(~/underduck-photos)이다. 195MB 를 레포 안에 두면
// 실수로 커밋될 여지가 생기고, gitignore 로 막아도 백업이 레포와 같이 사라진다.
//
// 환경변수: CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const FOLDER = "underduck";
const OUT_DIR = process.argv[2] || join(homedir(), "underduck-photos");

const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;

if (!KEY || !SECRET || !CLOUD) {
  console.error("CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET / CLOUD_NAME 이 없습니다 (.env.local).");
  process.exit(1);
}

const AUTH = "Basic " + Buffer.from(`${KEY}:${SECRET}`).toString("base64");

interface Resource {
  public_id: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  created_at: string;
  secure_url: string;
}

/** Admin API 는 한 번에 500개까지만 준다. 지금은 47장이지만 커서를 따라간다. */
async function listAll(): Promise<Resource[]> {
  const out: Resource[] = [];
  let cursor = "";
  do {
    const url =
      `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image` +
      `?type=upload&prefix=${FOLDER}/&max_results=500` +
      (cursor ? `&next_cursor=${encodeURIComponent(cursor)}` : "");
    const res = await fetch(url, { headers: { Authorization: AUTH } });
    if (!res.ok) throw new Error(`목록 조회 실패 ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { resources: Resource[]; next_cursor?: string };
    out.push(...body.resources);
    cursor = body.next_cursor || "";
  } while (cursor);
  return out;
}

async function sizeOf(path: string): Promise<number> {
  try {
    return (await stat(path)).size;
  } catch {
    return -1;
  }
}

async function download(url: string, path: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${res.status}`);
  await mkdir(dirname(path), { recursive: true });
  // .part 로 받고 다 받은 뒤에 옮긴다. 중간에 끊긴 파일이 "받은 것"으로 남으면
  // 다음 실행이 그걸 건너뛰어서 깨진 사본이 영구히 남는다.
  const tmp = `${path}.part`;
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(tmp));
  const { rename } = await import("node:fs/promises");
  await rename(tmp, path);
}

const mb = (n: number) => (n / 1024 / 1024).toFixed(1);

async function main() {
  console.log(`목록을 받는 중… (${FOLDER}/)`);
  const list = await listAll();
  const total = list.reduce((s, r) => s + r.bytes, 0);
  console.log(`원본 ${list.length}장, 합계 ${mb(total)}MB → ${OUT_DIR}\n`);

  await mkdir(OUT_DIR, { recursive: true });

  let saved = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const [i, r] of list.entries()) {
    // public_id 로 이름을 지어야 다시 돌렸을 때 같은 파일이 같은 자리에 온다.
    const name = `${r.public_id.slice(FOLDER.length + 1)}.${r.format}`;
    const path = join(OUT_DIR, name);
    const tag = `[${String(i + 1).padStart(3)}/${list.length}]`;

    if ((await sizeOf(path)) === r.bytes) {
      skipped++;
      continue;
    }

    try {
      await download(r.secure_url, path);
      saved++;
      console.log(`${tag} ${name}  ${mb(r.bytes)}MB`);
    } catch (e) {
      failed.push(name);
      console.error(`${tag} 실패 ${name}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 어떤 사진이 어느 경기 것인지는 파일명만 봐선 모른다. 목록을 같이 남겨두면
  // 나중에 Cloudinary 계정이 없어져도 URL·촬영일·해상도가 남는다.
  await writeFile(
    join(OUT_DIR, "manifest.json"),
    JSON.stringify(
      {
        backedUpAt: new Date().toISOString(),
        cloud: CLOUD,
        count: list.length,
        bytes: total,
        photos: list.map((r) => ({
          file: `${r.public_id.slice(FOLDER.length + 1)}.${r.format}`,
          publicId: r.public_id,
          url: r.secure_url,
          bytes: r.bytes,
          size: `${r.width}x${r.height}`,
          createdAt: r.created_at,
        })),
      },
      null,
      2,
    ),
  );

  const onDisk = (await readdir(OUT_DIR)).filter((f) => f !== "manifest.json" && !f.endsWith(".part"));
  console.log(`\n새로 받음 ${saved} · 이미 있음 ${skipped} · 실패 ${failed.length}`);
  console.log(`폴더에 총 ${onDisk.length}장 — ${OUT_DIR}`);
  if (failed.length) {
    console.log(`실패한 건 다시 돌리면 이어받습니다: ${failed.join(", ")}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
