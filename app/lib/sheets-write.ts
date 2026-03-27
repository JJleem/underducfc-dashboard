// Google Sheets 쓰기 유틸리티 (Service Account JWT 인증)

function base64url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

async function getAccessToken(): Promise<string> {
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

  // 데이터 행만 추출 (헤더 제외), 인메모리에서 수정 → 전체 덮어쓰기
  // (인덱스 기반 행 번호 계산 시 빈 행으로 인한 오프셋 오류 방지)
  let found = false;
  const dataRows = rows.slice(1).map((row) => {
    if (String(row[0]) === String(matchId) && row[1] === quarter) {
      found = true;
      return newRow;
    }
    return row;
  });

  if (!found) {
    dataRows.push(newRow);
  }

  const allRows = [header, ...dataRows];
  const writeRange = `lineup!A1:S${allRows.length}`;

  await fetch(`${base}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ range: writeRange, values: allRows }),
  });
}
