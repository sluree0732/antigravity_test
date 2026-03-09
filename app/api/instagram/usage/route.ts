import { NextResponse } from 'next/server'
import { getSheetValuesById } from '@/lib/sheets'

// 인스타그램 API 사용량 시트 탭 이름 (변경 필요 시 수정)
const SHEET_TAB = 'API사용량'
const LAST_N = 5

export async function GET() {
  try {
    const spreadsheetId = process.env.IG_SPREADSHEET_ID
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'IG_SPREADSHEET_ID가 설정되지 않았습니다.' }, { status: 500 })
    }

    const rows = await getSheetValuesById(spreadsheetId, `${SHEET_TAB}!A1:Z`)
    if (!rows.length) return NextResponse.json({ headers: [], rows: [] })

    const headers = rows[0]
    const dataRows = rows.slice(1)
    const lastRows = dataRows.slice(-LAST_N)

    return NextResponse.json({ headers, rows: lastRows })
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
