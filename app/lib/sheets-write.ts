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
      scope,
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


export async function addPhotosToMatch(matchId: number, newUrls: string[]): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 환경변수가 없습니다.");

  const token = await getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const rowNum = matchId + 2;

  const readRes = await fetch(`${base}/values/matches!M${rowNum}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const readData = await readRes.json();
  const current: string = readData.values?.[0]?.[0] || "";
  const existing = current ? current.split(",").filter(Boolean) : [];

  const slots = 5 - existing.length;
  if (slots <= 0) throw new Error("최대 5장까지 업로드 가능합니다.");

  const toAdd = newUrls.slice(0, slots);
  const newVal = [...existing, ...toAdd].join(",");
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

export async function removePhotoFromMatch(matchId: number, url: string): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");

  const token = await getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const rowNum = matchId + 2;

  const readRes = await fetch(`${base}/values/matches!M${rowNum}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const readData = await readRes.json();
  const current: string = readData.values?.[0]?.[0] || "";
  const remaining = current.split(",").filter((u) => u && u !== url).join(",");
  const range = `matches!M${rowNum}`;

  await fetch(`${base}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ range, values: [[remaining]] }),
  });
}

export async function deleteFeedback(
  matchId: number,
  timestamp: string,
  name: string,
  message: string
): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");

  const token = await getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;

  const readRes = await fetch(`${base}/values/feedback!A1:D500`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const readData = await readRes.json();
  const rows: string[][] = readData.values || [];

  let deleted = false;
  const newRows = rows.filter((row, i) => {
    if (i === 0) return true;
    if (!deleted && String(row[0]) === String(matchId) && row[1] === timestamp && row[2] === name && row[3] === message) {
      deleted = true;
      return false;
    }
    return true;
  });

  while (newRows.length < rows.length) newRows.push(["", "", "", ""]);

  const range = `feedback!A1:D${Math.max(newRows.length, rows.length)}`;
  await fetch(`${base}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ range, values: newRows }),
  });
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

export async function appendMomVote({
  matchId,
  voterName,
  votedFor,
  voteType,
}: {
  matchId: number;
  voterName: string;
  votedFor: string;
  voteType: string;
}) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 환경변수가 없습니다.");

  const token = await getAccessToken();
  const timestamp = new Date().toISOString();
  const row = [String(matchId), voterName.trim(), votedFor.trim(), voteType.trim(), timestamp];

  const range = encodeURIComponent("mom_vote!A:E");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) throw new Error("mom_vote 시트 쓰기 실패");
}

export async function deleteMomVote(matchId: number, voterName: string, voteType?: string) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");

  const token = await getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;

  const readRes = await fetch(`${base}/values/mom_vote!A1:E500`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const readData = await readRes.json();
  const rows: string[][] = readData.values || [];

  const newRows = rows.filter((row, i) => {
    if (i === 0) return true;
    const matchesId = String(row[0]) === String(matchId);
    const matchesVoter = row[1] === voterName;
    const matchesType = voteType ? row[3] === voteType : true;
    return !(matchesId && matchesVoter && matchesType);
  });

  while (newRows.length < rows.length) newRows.push(["", "", "", "", ""]);

  const range = `mom_vote!A1:E${Math.max(newRows.length, rows.length)}`;
  await fetch(`${base}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ range, values: newRows }),
  });
}

export async function writeMatchMom(matchId: number, mom: string): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");

  const token = await getAccessToken();
  const rowNum = matchId + 2; // 헤더 1행 + 0-index 보정
  const range = `matches!K${rowNum}`;

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ range, values: [[mom]] }),
    }
  );
}

export async function updateMatchResult(
  matchId: number,
  data: {
    date: string;
    time: string;
    location: string;
    opponent: string;
    type: string;
    result: string;
    ourScore: string;
    theirScore: string;
    goals: string;
    assists: string;
    attendees: string;
  }
): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");
  const token = await getAccessToken();
  const row = matchId + 2;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: [
          { range: `matches!A${row}`, values: [[data.date]] },
          { range: `matches!B${row}`, values: [[data.time]] },
          { range: `matches!C${row}`, values: [[data.location]] },
          { range: `matches!D${row}`, values: [[data.opponent]] },
          { range: `matches!E${row}`, values: [[data.ourScore]] },
          { range: `matches!F${row}`, values: [[data.theirScore]] },
          { range: `matches!G${row}`, values: [[data.result]] },
          { range: `matches!H${row}`, values: [[data.type]] },
          { range: `matches!I${row}`, values: [[data.goals]] },
          { range: `matches!J${row}`, values: [[data.assists]] },
          { range: `matches!L${row}`, values: [[data.attendees]] },
        ],
      }),
    }
  );
  if (!res.ok) throw new Error("경기 결과 업데이트 실패");
}

export async function appendRoster(player: {
  no: string;
  name: string;
  pos: string;
  status: string;
}): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");
  const token = await getAccessToken();
  const row = [player.no, player.name, player.pos, player.status, "", ""];
  const range = encodeURIComponent("roster!A:F");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) throw new Error("roster 시트 쓰기 실패");
}

export async function appendMatch(match: {
  date: string;
  time: string;
  location: string;
  opponent: string;
  type: string;
}): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");
  const token = await getAccessToken();
  const row = [match.date, match.time, match.location, match.opponent, "", "", "예정", match.type, "", "", "", "", ""];
  const range = encodeURIComponent("matches!A:M");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) throw new Error("matches 시트 쓰기 실패");
}

export async function updateNotice(notice: {
  date: string;
  title: string;
  content: string;
  important: boolean;
  location?: string;
}): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");
  const token = await getAccessToken();
  const range = "notice!A2:E2";
  const values = [[notice.date, notice.title, notice.content, notice.important ? "Y" : "N", notice.location || ""]];
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ range, values }),
    }
  );
  if (!res.ok) throw new Error("notice 시트 쓰기 실패");
}

export async function appendMedia(item: {
  type: string;
  url: string;
  title: string;
}): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");
  const token = await getAccessToken();
  const row = [item.type, item.url, item.title, new Date().toISOString()];
  const range = encodeURIComponent("media!A:D");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) throw new Error("media 시트 쓰기 실패");
}

export async function deleteMediaByUrl(url: string): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");
  const token = await getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;

  const readRes = await fetch(`${base}/values/media!A1:D100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const readData = await readRes.json();
  const rows: string[][] = readData.values || [];

  const newRows = rows.filter((row, i) => i === 0 || row[1] !== url);
  while (newRows.length < rows.length) newRows.push(["", "", "", ""]);

  const range = `media!A1:D${Math.max(newRows.length, rows.length)}`;
  await fetch(`${base}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ range, values: newRows }),
  });
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

// ── Push 구독 관리 ────────────────────────────────────────────
// push_subscriptions 시트: A=endpoint, B=p256dh, C=auth

export async function addPushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");
  const token = await getAccessToken();
  const range = encodeURIComponent("push_subscriptions!A:C");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[sub.endpoint, sub.p256dh, sub.auth]] }),
    }
  );
  if (!res.ok) throw new Error("구독 저장 실패");
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");
  const token = await getAccessToken();

  // 전체 읽어서 해당 endpoint 행 번호 찾기
  const range = encodeURIComponent("push_subscriptions!A:A");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return;
  const data = await res.json();
  const rows: string[][] = data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === endpoint);
  if (rowIndex === -1) return;

  // 해당 행 삭제 (batchUpdate deleteDimension)
  const sheetInfoRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const sheetInfo = await sheetInfoRes.json();
  const sheet = sheetInfo.sheets?.find(
    (s: { properties: { title: string; sheetId: number } }) => s.properties.title === "push_subscriptions"
  );
  if (!sheet) return;

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 },
        },
      }],
    }),
  });
}

// ── 유저 관리 (카카오 로그인) ──────────────────────────────────
// users 시트: A=kakaoId, B=nickname, C=profileImage, D=joinedAt, E=lastLogin
export async function upsertUser(user: {
  kakaoId: string;
  nickname: string;
  profileImage: string;
}): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");
  const token = await getAccessToken();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;

  const readRes = await fetch(`${base}/values/users!A1:E1000`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const readData = await readRes.json();
  const rows: string[][] = readData.values || [];
  const now = new Date().toISOString();

  // 헤더(0행) 제외하고 kakaoId 일치 행 찾기
  const idx = rows.findIndex((r, i) => i > 0 && String(r[0]) === String(user.kakaoId));

  if (idx === -1) {
    // 신규 유저 → append
    const range = encodeURIComponent("users!A:E");
    const res = await fetch(
      `${base}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [[user.kakaoId, user.nickname, user.profileImage, now, now]] }),
      }
    );
    if (!res.ok) throw new Error("users 시트 쓰기 실패");
  } else {
    // 기존 유저 → 닉네임/이미지/lastLogin 갱신 (joinedAt은 보존)
    const rowNum = idx + 1; // 배열 인덱스 → 시트 행 번호
    const joinedAt = rows[idx][3] || now;
    const range = `users!B${rowNum}:E${rowNum}`;
    await fetch(`${base}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ range, values: [[user.nickname, user.profileImage, joinedAt, now]] }),
    });
  }
}

export async function getAllPushSubscriptions(): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID 없음");
  const token = await getAccessToken();
  const range = encodeURIComponent("push_subscriptions!A:C");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const rows: string[][] = data.values || [];
  // 헤더 행 건너뜀 (A1이 "endpoint"인 경우)
  const start = rows[0]?.[0] === "endpoint" ? 1 : 0;
  return rows.slice(start).filter((r) => r[0]).map((r) => ({
    endpoint: r[0],
    p256dh: r[1] || "",
    auth: r[2] || "",
  }));
}
