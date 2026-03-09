import { NextResponse } from 'next/server'
import { getSheetValues } from '@/lib/sheets'

// 유튜브 API 사용량 시트 탭 이름 — search route와 반드시 일치해야 함
const SHEET_TAB = 'API사용량_YouTube'
const LAST_N = 5

export async function GET() {
  try {
    const rows = await getSheetValues(`${SHEET_TAB}!A1:Z`)
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
