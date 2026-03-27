// app/lib/google-sheets.ts

type SheetRange =
  | "roster!A1:J50"
  | "matches!A1:L50"
  | "stats!A1:G50"
  | "notice!A1:D20"
  | "lineup!A1:S100";

export async function getSheetData(range: SheetRange) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  if (!sheetId || !apiKey) {
    throw new Error("Google Sheets API 환경변수가 설정되지 않았습니다.");
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

  // 60초마다 구글 시트 데이터를 새로고침 (ISR)
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다.");
  }

  const data = await response.json();
  return data.values || [];
}
