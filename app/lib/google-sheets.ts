// app/lib/google-sheets.ts

type SheetRange =
  | "roster!A1:J50"
  | "matches!A1:M50"
  | "matches!A1:N50"
  | "matches!A1:O50"
  | "stats!A1:G50"
  | "notice!A1:E20"
  | "lineup!A1:T100"
  | "feedback!A1:D500"
  | "mom_vote!A1:E500"
  | "media!A1:D100"
  | "push_subscriptions!A:C"
  | "push_subscriptions!A:A"
  | "attendance_vote!A1:E500"
  | "vote_comment!A1:E500"
  | "users!A1:E1000"
  | "featured!A1:D200";

export async function getSheetData(range: SheetRange) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  if (!sheetId || !apiKey) {
    throw new Error("Google Sheets API 환경변수가 설정되지 않았습니다.");
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  let response: Response | null = null;

  // 429/5xx처럼 일시적인 Google API 오류는 짧게 재시도
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(url, { cache: "no-store" });
    if (response.ok) break;

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }

  if (!response?.ok) {
    const status = response?.status ?? 0;
    console.error(`[sheets] ${range} 읽기 실패 (${status})`);
    throw new Error(`데이터를 불러오는데 실패했습니다. (${status})`);
  }

  const data = await response.json();
  return data.values || [];
}

/** matches 시트 전체 범위 */
export async function getMatchesData(): Promise<string[][]> {
  return getSheetData("matches!A1:O50");
}
