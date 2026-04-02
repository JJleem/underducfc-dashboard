// Google Sheets 쓰기 유틸리티 (Service Account JWT 인증)

function base64url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

async function getAccessToken(
  scope = "https://www.googleapis.com/auth/spreadsheets"
): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error("SERVICE_ACCOUNT 환경변수가 설정되지 않았습니다.");
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );

  const { createSign } = await import("node:crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, "base64url");

  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) throw new Error("Access token 발급 실패");
  const data = await res.json();
  return data.access_token as string;
}

export async function uploadToDrive(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID 환경변수가 없습니다.");

  const token = await getAccessToken("https://www.googleapis.com/auth/drive.file");
  const boundary = "underduck_boundary";
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!uploadRes.ok) throw new Error("Drive 업로드 실패");
  const { id: fileId } = await uploadRes.json();

  // 공개 설정
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return fileId as string;
}

export async function addPhotoToMatch(matchId: number, fileId: string): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 환경변수가 없습니다.");

  const token = await getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const rowNum = matchId + 2; // 헤더(1행) + 0-based index

  const readRes = await fetch(`${base}/values/matches!M${rowNum}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const readData = await readRes.json();
  const current: string = readData.values?.[0]?.[0] || "";
  const existing = current ? current.split(",").filter(Boolean) : [];

  if (existing.length >= 5) throw new Error("최대 5장까지 업로드 가능합니다.");

  const newVal = [...existing, fileId].join(",");
  const range = `matches!M${rowNum}`;

  await fetch(
    `${base}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ range, values: [[newVal]] }),
    }
  );
}

export async function appendFeedback({
  matchId,
  name,
  message,
}: {
  matchId: number;
  name: string;
  message: string;
}) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 환경변수가 없습니다.");

  const token = await getAccessToken();
  const timestamp = new Date().toISOString();
  const row = [String(matchId), timestamp, name.trim(), message.trim()];

  const range = encodeURIComponent("feedback!A:D");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) throw new Error("feedback 시트 쓰기 실패");
}

export async function writeLineup({
  matchId,
  quarter,
  formation,
  players,
  subs,
}: {
  matchId: number;
  quarter: string;
  formation: string;
  players: string[];
  subs: string[];
}) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 환경변수가 없습니다.");

  const token = await getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;

  // 기존 데이터 읽기
  const readRes = await fetch(`${base}/values/lineup!A1:S100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!readRes.ok) throw new Error("lineup 시트 읽기 실패");
  const readData = await readRes.json();
  const rows: string[][] = readData.values || [];

  // 헤더 보존 (없으면 기본값)
  const header = rows.length > 0
    ? rows[0]
    : ["matchId", "quarter", "formation", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11", "sub1", "sub2", "sub3", "sub4", "sub5"];

  // 19칸 고정 (match_id, quarter, formation, p1~p11, sub1~sub5)
  const playerCells = [...players, ...Array(Math.max(0, 11 - players.length)).fill("")].slice(0, 11);
  const subCells = [...subs, ...Array(Math.max(0, 5 - subs.length)).fill("")].slice(0, 5);
  const newRow = [String(matchId), quarter, formation, ...playerCells, ...subCells];

  // 플레이어/교체 모두 비어있으면 해당 행 삭제, 아니면 업데이트/추가
  const isEmpty = playerCells.every(p => !p) && subCells.every(s => !s);

  let found = false;
  const dataRows = rows.slice(1)
    .map((row): string[] | null => {
      if (String(row[0]) === String(matchId) && row[1] === quarter) {
        found = true;
        return isEmpty ? null : newRow; // 비어있으면 행 삭제
      }
      return row;
    })
    .filter((row): row is string[] => row !== null);

  if (!found && !isEmpty) {
    dataRows.push(newRow);
  }

  // 기존 행보다 줄었으면 빈 행으로 패딩 → 이전 데이터 완전히 덮어쓰기
  const originalRowCount = rows.length;
  const allRows = [header, ...dataRows];
  const emptyRow = Array(19).fill("");
  while (allRows.length < originalRowCount) {
    allRows.push(emptyRow);
  }
  const writeRange = `lineup!A1:S${Math.max(allRows.length, originalRowCount)}`;

  await fetch(`${base}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ range: writeRange, values: allRows }),
  });
}
