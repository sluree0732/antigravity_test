import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!

const REQUIRED_SHEETS = ['users', 'posts', 'comments']
let sheetsInitialized = false

async function ensureSheets(): Promise<void> {
  if (sheetsInitialized) return
  const sheets = await getSheets()
  const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const existingTitles = response.data.sheets?.map((s) => s.properties?.title ?? '') ?? []
  const missing = REQUIRED_SHEETS.filter((name) => !existingTitles.includes(name))
  if (missing.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
      },
    })
  }
  sheetsInitialized = true
}

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey || !SPREADSHEET_ID) {
    throw new Error('Google Sheets environment variables not configured')
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export async function getSheets() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

export async function getSheetValues(range: string): Promise<string[][]> {
  await ensureSheets()
  const sheets = await getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  })
  return (response.data.values as string[][] | null | undefined) ?? []
}

export async function appendRow(range: string, values: string[]): Promise<void> {
  await ensureSheets()
  const sheets = await getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

export async function updateRow(range: string, values: string[]): Promise<void> {
  const sheets = await getSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

export async function deleteRow(sheetId: number, rowIndex: number): Promise<void> {
  const sheets = await getSheets()
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  })
}

// 사용량 탭이 없으면 자동 생성 후 행 추가 (메인 스프레드시트용)
export async function appendUsageRow(sheetName: string, headers: string[], values: string[]): Promise<void> {
  const sheets = await getSheets()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const exists = meta.data.sheets?.some((s) => s.properties?.title === sheetName)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    })
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    })
  }
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

// 임의 스프레드시트에 사용량 행 추가 (Instagram 전용 시트용)
export async function appendUsageRowById(spreadsheetId: string, sheetName: string, headers: string[], values: string[]): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const exists = meta.data.sheets?.some((s) => s.properties?.title === sheetName)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    })
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    })
  }
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

export async function getSheetValuesById(spreadsheetId: string, range: string): Promise<string[][]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range })
  return (response.data.values as string[][] | null | undefined) ?? []
}

export async function updateRowById(spreadsheetId: string, range: string, values: string[]): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

export async function getSheetId(sheetName: string): Promise<number> {
  const sheets = await getSheets()
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  })
  const sheet = response.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  )
  if (!sheet?.properties?.sheetId) {
    throw new Error(`Sheet "${sheetName}" not found`)
  }
  return sheet.properties.sheetId
}
