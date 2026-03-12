import { NextRequest, NextResponse } from 'next/server'
import { appendUsageRowById, getSheetValuesById } from '@/lib/sheets'

// SNS 데이터 스크래핑 스프레드시트 (퀴터_사용량 탭 보유)
const SHEET_TAB = '퀴터_사용량'
const HEADERS = ['날짜', '일일사용량', '호출회수']

function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

async function getTotals(spreadsheetId: string): Promise<{ totalUnits: number; totalCalls: number }> {
  const rows = await getSheetValuesById(spreadsheetId, `${SHEET_TAB}!A1:C`)
  const dataRows = rows.slice(1)
  let totalUnits = 0
  let totalCalls = 0
  for (const r of dataRows) {
    totalUnits += parseInt(r[1] ?? '0') || 0
    totalCalls += parseInt(r[2] ?? '0') || 0
  }
  return { totalUnits, totalCalls }
}

export async function GET() {
  try {
    const spreadsheetId = process.env.YT_SPREADSHEET_ID
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'YT_SPREADSHEET_ID가 설정되지 않았습니다.' }, { status: 500 })
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
    const spreadsheetId = process.env.YT_SPREADSHEET_ID
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'YT_SPREADSHEET_ID가 설정되지 않았습니다.' }, { status: 500 })
    }

    const body = await req.json() as { units: number; calls: number }
    const { units, calls } = body

    await appendUsageRowById(spreadsheetId, SHEET_TAB, HEADERS, [todayKST(), String(units), String(calls)])

    const totals = await getTotals(spreadsheetId)
    return NextResponse.json({ ok: true, ...totals })
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
