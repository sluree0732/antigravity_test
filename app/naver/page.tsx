'use client'

import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface TrendData {
  period: string
  ratio: number
}

interface TrendResult {
  title: string
  keywords: string[]
  data: TrendData[]
}

interface CollectionRecord {
  id: string
  keywords: string[]
  startDate: string
  endDate: string
  timeUnit: string
  collectedAt: string
  results: TrendResult[]
}

const TIME_UNITS = [
  { value: 'date', label: '일간' },
  { value: 'week', label: '주간' },
  { value: 'month', label: '월간' },
] as const

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b']

function timeUnitLabel(tu: string) {
  return tu === 'date' ? '일간' : tu === 'week' ? '주간' : '월간'
}

function formatPeriod(period: string, timeUnit: string): string {
  if (timeUnit === 'month') {
    return period.slice(0, 7) // 2025-08-01 → 2025-08
  }
  if (timeUnit === 'week') {
    const start = new Date(period)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    return `${fmt(start)} ~ ${fmt(end)}` // 2025-05-26 ~ 2025-06-01
  }
  return period
}

function generateChartPng(results: TrendResult[]): string {
  const W = 1000
  const H = 420
  const pad = { top: 50, right: 30, bottom: 70, left: 60 }
  const cW = W - pad.left - pad.right
  const cH = H - pad.top - pad.bottom

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // 배경
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const n = results[0]?.data.length ?? 0
  if (n === 0) return canvas.toDataURL('image/png').split(',')[1]

  // 가로 격자선 + Y축 레이블
  ctx.strokeStyle = '#ede9fe'
  ctx.lineWidth = 1
  ctx.font = '11px Arial'
  ctx.fillStyle = '#94a3b8'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (cH / 5) * i
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke()
    ctx.fillText(String(100 - i * 20), pad.left - 6, y + 4)
  }

  // X축 레이블 (최대 10개)
  const periods = results[0].data.map((d) => d.period)
  const step = Math.max(1, Math.ceil(n / 10))
  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px Arial'
  ctx.textAlign = 'center'
  periods.forEach((p, i) => {
    if (i % step === 0 || i === n - 1) {
      const x = pad.left + (cW / (n - 1)) * i
      ctx.fillText(p, x, H - pad.bottom + 18)
    }
  })

  // 라인 그리기
  results.forEach((r, ri) => {
    const color = COLORS[ri % COLORS.length]
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    r.data.forEach((d, i) => {
      const x = pad.left + (cW / (n - 1)) * i
      const y = pad.top + cH * (1 - d.ratio / 100)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  })

  // 범례 (하단)
  const legendY = H - 15
  const totalW = results.length * 130
  let legendX = (W - totalW) / 2
  results.forEach((r, ri) => {
    const color = COLORS[ri % COLORS.length]
    ctx.fillStyle = color
    ctx.fillRect(legendX, legendY - 8, 24, 4)
    ctx.fillStyle = '#374151'
    ctx.font = '12px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(r.title, legendX + 30, legendY)
    legendX += 130
  })

  return canvas.toDataURL('image/png').split(',')[1]
}

export default function NaverPage() {
  const today = new Date().toISOString().split('T')[0]
  const monthAgo = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })()

  const [keywords, setKeywords] = useState<string[]>([''])
  const [startDate, setStartDate] = useState(monthAgo)
  const [endDate, setEndDate] = useState(today)
  const [timeUnit, setTimeUnit] = useState<'date' | 'week' | 'month'>('date')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 현재 수집 결과 (keywords + results 묶어서 저장)
  const [currentRecord, setCurrentRecord] = useState<CollectionRecord | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<CollectionRecord | null>(null)
  const [history, setHistory] = useState<CollectionRecord[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('naver_datalab_history')
      if (stored) setHistory(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  function addKeyword() {
    if (keywords.length < 5) setKeywords([...keywords, ''])
  }

  function removeKeyword(idx: number) {
    setKeywords(keywords.filter((_, i) => i !== idx))
  }

  function updateKeyword(idx: number, value: string) {
    const next = [...keywords]
    next[idx] = value
    setKeywords(next)
  }

  async function handleCollect() {
    // 각 입력 필드에서 콤마 구분 키워드도 자동 분리
    const trimmed = keywords
      .flatMap((k) => k.split(',').map((s) => s.trim()))
      .filter(Boolean)
    const unique = [...new Set(trimmed)]

    if (!unique.length) {
      setError('최소 1개의 검색어를 입력하세요.')
      return
    }
    if (trimmed.length !== unique.length) {
      setError('중복된 검색어가 있습니다. 제거 후 다시 시도하세요.')
      setKeywords([...unique, ...Array(Math.max(0, keywords.length - unique.length)).fill('')].slice(0, 5))
      return
    }
    if (!startDate || !endDate) {
      setError('시작일과 종료일을 선택하세요.')
      return
    }

    setLoading(true)
    setError('')
    setSelectedRecord(null)
    setCurrentRecord(null)

    try {
      const res = await fetch('/api/naver/datalab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: unique, startDate, endDate, timeUnit }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '수집 실패')

      const results: TrendResult[] = data.results ?? []
      if (!results.length) throw new Error('수집된 데이터가 없습니다.')

      const record: CollectionRecord = {
        id: Date.now().toString(),
        keywords: unique,
        startDate,
        endDate,
        timeUnit,
        collectedAt: new Date().toISOString(),
        results,
      }

      setCurrentRecord(record)

      const newHistory = [record, ...history].slice(0, 30)
      setHistory(newHistory)
      localStorage.setItem('naver_datalab_history', JSON.stringify(newHistory))
    } catch (err) {
      setError(err instanceof Error ? err.message : '수집 중 오류 발생')
    } finally {
      setLoading(false)
    }
  }

  async function downloadExcel(record: CollectionRecord) {
    const { results, keywords: kws, startDate: sd, endDate: ed, timeUnit: tu } = record
    if (!results?.length) return

    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    workbook.creator = '네이버 DataLab'

    // ── 데이터 시트 ──
    const dataSheet = workbook.addWorksheet('데이터')
    const colCount = kws.length + 1

    // 헤더 (셀 직접 주소 방식)
    dataSheet.getCell(1, 1).value = '날짜'
    kws.forEach((kw, i) => { dataSheet.getCell(1, i + 2).value = kw })

    const headerStyle = {
      font: { bold: true, size: 11 } as const,
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE8E4FF' } },
      alignment: { horizontal: 'center' as const },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FFD8D0FF' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFD8D0FF' } },
        left: { style: 'thin' as const, color: { argb: 'FFD8D0FF' } },
        right: { style: 'thin' as const, color: { argb: 'FFD8D0FF' } },
      },
    }
    for (let c = 1; c <= colCount; c++) Object.assign(dataSheet.getCell(1, c), headerStyle)

    // 데이터 행 (셀 직접 주소 방식)
    const allData = results[0]?.data ?? []
    allData.forEach((d, rowIdx) => {
      const excelRow = rowIdx + 2
      dataSheet.getCell(excelRow, 1).value = d.period
      dataSheet.getCell(excelRow, 1).alignment = { horizontal: 'center' }
      results.forEach((r, colIdx) => {
        const val = r.data[rowIdx]?.ratio ?? 0
        dataSheet.getCell(excelRow, colIdx + 2).value = val
        dataSheet.getCell(excelRow, colIdx + 2).alignment = { horizontal: 'right' }
      })
      // 테두리
      for (let c = 1; c <= colCount; c++) {
        dataSheet.getCell(excelRow, c).border = {
          top: { style: 'thin', color: { argb: 'FFE9E4FF' } },
          bottom: { style: 'thin', color: { argb: 'FFE9E4FF' } },
          left: { style: 'thin', color: { argb: 'FFE9E4FF' } },
          right: { style: 'thin', color: { argb: 'FFE9E4FF' } },
        }
      }
    })

    // 컬럼 너비
    dataSheet.getColumn(1).width = 14
    for (let c = 2; c <= colCount; c++) dataSheet.getColumn(c).width = 14

    // ── 차트 시트 ──
    const chartSheet = workbook.addWorksheet('차트')
    chartSheet.getCell('A1').value = `${kws.join(', ')} · ${sd} ~ ${ed} · ${timeUnitLabel(tu)}`
    chartSheet.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF6D28D9' } }

    // Canvas로 직접 차트 그리기
    try {
      const pngBase64 = generateChartPng(results)
      const imageId = workbook.addImage({ base64: pngBase64, extension: 'png' })
      chartSheet.addImage(imageId, 'A2:N28')
    } catch { /* 차트 생성 실패 시 데이터만 */ }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `naver_datalab_${sd}_${ed}_${tu}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  function deleteRecord(id: string) {
    const next = history.filter((r) => r.id !== id)
    setHistory(next)
    localStorage.setItem('naver_datalab_history', JSON.stringify(next))
    if (selectedRecord?.id === id) setSelectedRecord(null)
    if (currentRecord?.id === id) setCurrentRecord(null)
  }

  const displayRecord = selectedRecord ?? currentRecord

  // recharts 용 데이터 변환 (dataKey는 안전한 ASCII 키 사용, name prop으로 한글 표시)
  const chartData = (displayRecord?.results[0]?.data ?? []).map((d, idx) => {
    const obj: Record<string, string | number> = { period: d.period }
    displayRecord?.results.forEach((r, ri) => {
      obj[`kw${ri}`] = r.data[idx]?.ratio ?? 0
    })
    return obj
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-violet-800">네이버 DataLab 검색어 트렌드</h1>

      {/* 입력 섹션 */}
      <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm space-y-6">

        {/* 검색어 */}
        <div>
          <label className="text-sm font-semibold text-violet-700 mb-3 block">
            검색어
            <span className="text-xs font-normal text-slate-400 ml-2">최대 5개</span>
          </label>
          <div className="space-y-2">
            {keywords.map((kw, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={kw}
                  onChange={(e) => updateKeyword(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); if (idx === keywords.length - 1) addKeyword() }
                  }}
                  placeholder={`검색어 ${idx + 1} 입력`}
                  className="flex-1 border border-violet-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
                />
                {keywords.length > 1 && (
                  <button
                    onClick={() => removeKeyword(idx)}
                    className="px-3 py-2 text-xs text-rose-400 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
            {keywords.length < 5 && (
              <button onClick={addKeyword} className="text-sm text-violet-500 hover:text-violet-700 transition-colors mt-1">
                + 검색어 추가
              </button>
            )}
          </div>
        </div>

        {/* 조회 기간 */}
        <div>
          <label className="text-sm font-semibold text-violet-700 mb-3 block">조회 기간</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1.5">시작일</p>
              <input
                type="date" value={startDate} min="2016-01-01" max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-violet-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 cursor-pointer"
              />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1.5">종료일</p>
              <input
                type="date" value={endDate} min={startDate} max={today}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-violet-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 수집 단위 */}
        <div>
          <label className="text-sm font-semibold text-violet-700 mb-3 block">수집 단위</label>
          <div className="flex gap-2">
            {TIME_UNITS.map(({ value, label }) => (
              <button
                key={value} onClick={() => setTimeUnit(value)}
                className={`px-5 py-2 text-sm rounded-full border transition-colors ${
                  timeUnit === value
                    ? 'bg-violet-500 text-white border-violet-500 shadow-sm'
                    : 'border-violet-200 text-slate-500 hover:bg-violet-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">{error}</p>}

        <button
          onClick={handleCollect} disabled={loading}
          className="w-full py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors font-medium text-sm disabled:opacity-50 shadow-sm"
        >
          {loading ? '수집 중...' : '데이터 수집'}
        </button>
      </section>

      {/* 결과 섹션 */}
      {displayRecord && displayRecord.results.length > 0 && (
        <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-violet-700">수집 결과</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {displayRecord.keywords.join(', ')} · {displayRecord.startDate} ~ {displayRecord.endDate} · {timeUnitLabel(displayRecord.timeUnit)}
              </p>
            </div>
            <button
              onClick={() => downloadExcel(displayRecord)}
              className="text-sm bg-violet-100 text-violet-600 border border-violet-200 px-4 py-1.5 rounded-full hover:bg-violet-200 transition-colors"
            >
              엑셀 다운로드
            </button>
          </div>

          {/* 그래프 */}
          <div className="w-full">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval="preserveStartEnd"
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #ede9fe', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                {displayRecord.results.map((r, i) => (
                  <Line
                    key={`kw${i}`}
                    type="monotone"
                    dataKey={`kw${i}`}
                    name={r.title}
                    stroke={COLORS[i % COLORS.length]}
                    dot={false}
                    strokeWidth={2}
                    strokeOpacity={1}
                    isAnimationActive={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 데이터 테이블 */}
          <div className="overflow-x-auto rounded-xl border border-violet-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-violet-50 border-b border-violet-100">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-violet-600">날짜</th>
                  {displayRecord.results.map((r, i) => (
                    <th key={r.title} className="text-right py-2.5 px-4 text-xs font-semibold" style={{ color: COLORS[i % COLORS.length] }}>
                      {r.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRecord.results[0].data.map((d, rowIdx) => (
                  <tr key={d.period} className={`border-b border-violet-50 last:border-0 ${rowIdx % 2 === 1 ? 'bg-violet-50/30' : ''}`}>
                    <td className="py-2 px-4 text-slate-500 text-xs">{formatPeriod(d.period, displayRecord.timeUnit)}</td>
                    {displayRecord.results.map((r) => (
                      <td key={r.title} className="py-2 px-4 text-right text-slate-700 text-xs font-medium">
                        {r.data[rowIdx]?.ratio.toFixed(2) ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 수집 이력 */}
      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-violet-700">
            수집 이력
            <span className="text-xs font-normal text-slate-400 ml-2">({history.length}건)</span>
          </h2>
          <ul className="space-y-2">
            {history.map((record) => (
              <li
                key={record.id}
                className={`bg-white border rounded-xl px-4 py-3 flex items-center justify-between transition-all ${
                  selectedRecord?.id === record.id ? 'border-violet-400 shadow-sm' : 'border-violet-100 hover:border-violet-300'
                }`}
              >
                <div className="min-w-0 mr-4">
                  <p className="text-sm font-medium text-slate-700 truncate">{record.keywords.join(', ')}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {record.startDate} ~ {record.endDate} · {timeUnitLabel(record.timeUnit)} · {new Date(record.collectedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedRecord(selectedRecord?.id === record.id ? null : record)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="text-xs text-violet-500 hover:text-violet-700 transition-colors px-2 py-1"
                  >
                    {selectedRecord?.id === record.id ? '닫기' : '보기'}
                  </button>
                  <button
                    onClick={() => downloadExcel(record)}
                    className="text-xs bg-violet-100 text-violet-600 border border-violet-200 px-3 py-1 rounded-full hover:bg-violet-200 transition-colors"
                  >
                    엑셀
                  </button>
                  <button
                    onClick={() => deleteRecord(record.id)}
                    className="text-xs text-rose-400 hover:text-rose-600 transition-colors px-2 py-1"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
