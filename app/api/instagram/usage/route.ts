import { NextRequest, NextResponse } from 'next/server'
import { appendUsageRowById, getSheetValuesById } from '@/lib/sheets'

// 기존 시트 탭명과 컬럼 구조 (A=날짜, B=call_count, C=total_time)
const SHEET_TAB = '퀴터_사용량'
const HEADERS = ['날짜', 'call_count', 'total_time']

function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

async function getTotals(spreadsheetId: string): Promise<{ totalCount: number; lastCallCount: number; lastTotalTime: number }> {
  const rows = await getSheetValuesById(spreadsheetId, `${SHEET_TAB}!A1:C`)
  const dataRows = rows.slice(1)
  let totalCount = 0
  let lastCallCount = 0
  let lastTotalTime = 0
  for (const r of dataRows) {
    totalCount += 1
    lastCallCount = parseInt(r[1] ?? '0') || lastCallCount
    lastTotalTime = parseInt(r[2] ?? '0') || lastTotalTime
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

    const body = await req.json() as { call_count: number; total_time: number }
    const { call_count, total_time } = body

    await appendUsageRowById(spreadsheetId, SHEET_TAB, HEADERS, [
      todayKST(), String(call_count), String(total_time),
    ])

    const totals = await getTotals(spreadsheetId)
    return NextResponse.json({ ok: true, ...totals })
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
