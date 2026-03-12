import { NextRequest, NextResponse } from 'next/server'
import { appendUsageRowById, getSheetValuesById, updateRowById } from '@/lib/sheets'

// SNS 데이터 스크래핑 스프레드시트 (퀴터_사용량 탭 보유)
const SPREADSHEET_ID = '155CwKeCfacj2mF3-pNINCAYU9QSmW3QmoZwQjRLCzeQ'
const SHEET_TAB = '퀴터_사용량'
const HEADERS = ['날짜', '일일사용량', '호출회수']

function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

async function getTotals(): Promise<{ totalUnits: number; totalCalls: number }> {
  const rows = await getSheetValuesById(SPREADSHEET_ID, `${SHEET_TAB}!A1:C`)
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
    const totals = await getTotals()
    return NextResponse.json(totals)
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { units: number; calls: number }
    const { units, calls } = body
    const today = todayKST()

    // 오늘 날짜 행이 이미 있으면 누적, 없으면 새 행 추가
    const rows = await getSheetValuesById(SPREADSHEET_ID, `${SHEET_TAB}!A1:C`)
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === today)

    if (rowIndex > 0) {
      const existingUnits = parseInt(rows[rowIndex][1] ?? '0') || 0
      const existingCalls = parseInt(rows[rowIndex][2] ?? '0') || 0
      const sheetRow = rowIndex + 1 // 배열 인덱스 → 시트 행 번호 (1-based)
      await updateRowById(SPREADSHEET_ID, `${SHEET_TAB}!A${sheetRow}:C${sheetRow}`, [
        today, String(existingUnits + units), String(existingCalls + calls),
      ])
    } else {
      await appendUsageRowById(SPREADSHEET_ID, SHEET_TAB, HEADERS, [today, String(units), String(calls)])
    }

    const totals = await getTotals()
    return NextResponse.json({ ok: true, ...totals })
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
