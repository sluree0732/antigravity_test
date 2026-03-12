import { NextRequest, NextResponse } from 'next/server'
import { appendUsageRowById, getSheetValuesById } from '@/lib/sheets'

const SHEET_TAB = 'API사용량'
const HEADERS = ['일시', '모드', '쿼리', '수집수', 'call_count(%)', 'total_time(%)']

async function getTotals(spreadsheetId: string): Promise<{ totalCount: number; lastCallCount: number; lastTotalTime: number }> {
  const rows = await getSheetValuesById(spreadsheetId, `${SHEET_TAB}!A1:F`)
  const dataRows = rows.slice(1)
  let totalCount = 0
  let lastCallCount = 0
  let lastTotalTime = 0
  for (const r of dataRows) {
    totalCount += parseInt(r[3] ?? '0') || 0
    lastCallCount = parseInt(r[4] ?? '0') || lastCallCount
    lastTotalTime = parseInt(r[5] ?? '0') || lastTotalTime
  }
  return { totalCount, lastCallCount, lastTotalTime }
}

export async function GET() {
  try {
    const spreadsheetId = process.env.IG_SPREADSHEET_ID
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'IG_SPREADSHEET_ID가 설정되지 않았습니다.' }, { status: 500 })
    }
    const totals = await getTotals(spreadsheetId)
    return NextResponse.json(totals)
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const spreadsheetId = process.env.IG_SPREADSHEET_ID
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'IG_SPREADSHEET_ID가 설정되지 않았습니다.' }, { status: 500 })
    }

    const body = await req.json() as { call_count: number; total_time: number; mode: string; query: string; count: number }
    const { call_count, total_time, mode, query, count } = body

    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    await appendUsageRowById(spreadsheetId, SHEET_TAB, HEADERS, [
      now, mode, query, String(count), String(call_count), String(total_time),
    ])

    const totals = await getTotals(spreadsheetId)
    return NextResponse.json({ ok: true, ...totals })
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
