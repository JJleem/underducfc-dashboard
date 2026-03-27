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

  // matchId + quarter 행이 있는지 확인
  let existingRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(matchId) && rows[i][1] === quarter) {
      existingRow = i + 1; // 1-based 행 번호
      break;
    }
  }

  // 19칸 고정 (match_id, quarter, formation, p1~p11, sub1~sub5)
  const playerCells = [...players, ...Array(11 - players.length).fill("")];
  const subCells = [...subs, ...Array(5 - subs.length).fill("")];
  const newRow = [String(matchId), quarter, formation, ...playerCells, ...subCells];

  if (existingRow > 0) {
    // 업데이트
    const range = `lineup!A${existingRow}:S${existingRow}`;
    await fetch(`${base}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ range, values: [newRow] }),
    });
  } else {
    // 새 행 추가
    await fetch(
      `${base}/values/${encodeURIComponent("lineup!A1:S1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ range: "lineup!A1:S1", values: [newRow] }),
      }
    );
  }
}
