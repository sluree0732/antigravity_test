import { NextRequest, NextResponse } from 'next/server'
import { appendUsageRowById, getSheetValuesById } from '@/lib/sheets'

// 인스타그램_DB 스프레드시트 (퀴터_사용량 탭 보유)
const SPREADSHEET_ID = '1z1kqMwv8yLsUJMzIojgJpUyNukDkCo9uI9xdIR-fm18'
const SHEET_TAB = '퀴터_사용량'
const HEADERS = ['날짜', 'call_count', 'total_time']

function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

async function getTotals(): Promise<{ totalCount: number; lastCallCount: number; lastTotalTime: number }> {
  const rows = await getSheetValuesById(SPREADSHEET_ID, `${SHEET_TAB}!A1:C`)
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
    const totals = await getTotals()
    return NextResponse.json(totals)
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { call_count: number; total_time: number }
    const { call_count, total_time } = body

    await appendUsageRowById(SPREADSHEET_ID, SHEET_TAB, HEADERS, [
      todayKST(), String(call_count), String(total_time),
    ])

    const totals = await getTotals()
    return NextResponse.json({ ok: true, ...totals })
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
