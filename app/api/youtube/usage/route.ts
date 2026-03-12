import { NextRequest, NextResponse } from 'next/server'
import { appendUsageRow, getSheetValues } from '@/lib/sheets'

const SHEET_TAB = 'API사용량_YouTube'
const HEADERS = ['일시', '모드', '쿼리', '유닛', '호출수']

async function getTotals(): Promise<{ totalUnits: number; totalCalls: number }> {
  const rows = await getSheetValues(`${SHEET_TAB}!A1:E`)
  const dataRows = rows.slice(1)
  let totalUnits = 0
  let totalCalls = 0
  for (const r of dataRows) {
    totalUnits += parseInt(r[3] ?? '0') || 0
    totalCalls += parseInt(r[4] ?? '0') || 0
  }
  return { totalUnits, totalCalls }
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
    const body = await req.json() as { units: number; calls: number; mode: string; query: string }
    const { units, calls, mode, query } = body

    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    await appendUsageRow(SHEET_TAB, HEADERS, [now, mode, query, String(units), String(calls)])

    const totals = await getTotals()
    return NextResponse.json({ ok: true, ...totals })
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
