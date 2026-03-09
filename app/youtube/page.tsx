'use client'

import { useEffect, useRef, useState } from 'react'

// ─── 타입 정의 ───────────────────────────────────────────────────────────────

interface VideoResult {
  collectedAt: string
  title: string
  channelTitle: string
  publishedAt: string
  viewCount: string
  likeCount: string
  commentCount: string
  url: string
}

interface ChannelResult {
  collectedAt: string
  channelTitle: string
  publishedAt: string
  subscriberCount: string
  viewCount: string
  videoCount: string
  channelUrl: string
}

type AnyResult = VideoResult | ChannelResult

interface QueryResult {
  query: string
  results: AnyResult[]
}

interface CollectionRecord {
  id: string
  mode: 'keyword' | 'channel'
  queries: string[]
  maxResults: number
  filters: Record<string, number>
  collectedAt: string
  queryResults: QueryResult[]
  usage?: { units: number; calls: number }
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function formatNum(v: string): string {
  const n = parseInt(v.replace(/,/g, ''), 10)
  if (isNaN(n)) return v
  return n.toLocaleString('ko-KR')
}

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('ko-KR')
  } catch {
    return iso
  }
}

function safeInt(s: string): number {
  const n = parseInt(s.replace(/,/g, ''), 10)
  return isNaN(n) ? 0 : n
}

// ─── 엑셀 다운로드 ────────────────────────────────────────────────────────────

async function downloadExcel(record: CollectionRecord) {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  const headerStyle = {
    font: { bold: true, size: 11 } as const,
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF0F0' } },
    alignment: { horizontal: 'center' as const },
    border: {
      top: { style: 'thin' as const, color: { argb: 'FFFFCCCC' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFFFCCCC' } },
      left: { style: 'thin' as const, color: { argb: 'FFFFCCCC' } },
      right: { style: 'thin' as const, color: { argb: 'FFFFCCCC' } },
    },
  }

  const isKeyword = record.mode === 'keyword'

  for (const qr of record.queryResults) {
    const sheetName = qr.query.slice(0, 31)
    const ws = workbook.addWorksheet(sheetName)

    const headers = isKeyword
      ? ['수집일시', '영상제목', '채널명', '업로드일', '조회수', '좋아요', '댓글수', '영상URL']
      : ['수집일시', '채널명', '개설일', '구독자수', '총조회수', '업로드수', '채널URL']

    headers.forEach((h, i) => {
      const cell = ws.getCell(1, i + 1)
      cell.value = h
      Object.assign(cell, headerStyle)
    })

    qr.results.forEach((row, ri) => {
      const excelRow = ri + 2
      if (isKeyword) {
        const r = row as VideoResult
        const vals = [r.collectedAt, r.title, r.channelTitle, formatDate(r.publishedAt), safeInt(r.viewCount), safeInt(r.likeCount), safeInt(r.commentCount), r.url]
        vals.forEach((v, ci) => {
          ws.getCell(excelRow, ci + 1).value = v
        })
      } else {
        const r = row as ChannelResult
        const vals = [r.collectedAt, r.channelTitle, formatDate(r.publishedAt), safeInt(r.subscriberCount), safeInt(r.viewCount), safeInt(r.videoCount), r.channelUrl]
        vals.forEach((v, ci) => {
          ws.getCell(excelRow, ci + 1).value = v
        })
      }
    })

    ws.getColumn(1).width = 18
    ws.getColumn(2).width = isKeyword ? 40 : 30
    ws.getColumn(3).width = 20
    ws.getColumn(4).width = 12
    ws.getColumn(5).width = 12
    ws.getColumn(6).width = 12
    ws.getColumn(7).width = isKeyword ? 12 : 40
    if (isKeyword) ws.getColumn(8).width = 40
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `youtube_${record.mode}_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function YouTubePage() {
  const [mode, setMode] = useState<'keyword' | 'channel'>('keyword')
  const [queries, setQueries] = useState<string[]>([''])
  const [maxResults, setMaxResults] = useState(50)

  // 키워드 모드 필터
  const [minViews, setMinViews] = useState('')
  const [minLikes, setMinLikes] = useState('')
  const [minComments, setMinComments] = useState('')

  // 채널 모드 필터
  const [minSubs, setMinSubs] = useState('')
  const [minTotalViews, setMinTotalViews] = useState('')
  const [minVideos, setMinVideos] = useState('')

  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState('')
  const [currentRecord, setCurrentRecord] = useState<CollectionRecord | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<CollectionRecord | null>(null)
  const [history, setHistory] = useState<CollectionRecord[]>([])
  const [activeTab, setActiveTab] = useState(0)

  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('youtube_collector_history')
      if (stored) setHistory(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  function addLog(msg: string) {
    setLogs((prev) => [...prev, msg])
  }

  function addQuery() {
    if (queries.length < 10) setQueries([...queries, ''])
  }

  function removeQuery(idx: number) {
    setQueries(queries.filter((_, i) => i !== idx))
  }

  function updateQuery(idx: number, value: string) {
    const next = [...queries]
    next[idx] = value
    setQueries(next)
  }

  async function handleCollect() {
    const cleanQueries = queries.map((q) => q.trim()).filter(Boolean)
    if (!cleanQueries.length) {
      setError('검색어를 최소 1개 입력하세요.')
      return
    }
    setError('')
    setLoading(true)
    setLogs([])
    setCurrentRecord(null)
    setSelectedRecord(null)
    setActiveTab(0)

    const filters = mode === 'keyword'
      ? {
          minViews: parseInt(minViews) || 0,
          minLikes: parseInt(minLikes) || 0,
          minComments: parseInt(minComments) || 0,
        }
      : {
          minSubs: parseInt(minSubs) || 0,
          minTotalViews: parseInt(minTotalViews) || 0,
          minVideos: parseInt(minVideos) || 0,
        }

    const queryResults: QueryResult[] = []
    let totalUnits = 0
    let totalCalls = 0
    addLog(`[수집 시작] 모드: ${mode === 'keyword' ? '영상' : '채널'} / 검색어 ${cleanQueries.length}개 / 목표 ${maxResults}개/검색어`)

    for (let i = 0; i < cleanQueries.length; i++) {
      const q = cleanQueries[i]
      addLog(`[${i + 1}/${cleanQueries.length}] "${q}" 수집 중...`)

      try {
        const res = await fetch('/api/youtube/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, query: q, maxResults, ...filters }),
        })

        const data = await res.json() as { results?: AnyResult[]; usage?: { units: number; calls: number }; error?: string }
        if (!res.ok) throw new Error(data.error ?? '수집 실패')

        const results = data.results ?? []
        queryResults.push({ query: q, results })
        if (data.usage) { totalUnits += data.usage.units; totalCalls += data.usage.calls }
        addLog(`[${i + 1}/${cleanQueries.length}] "${q}" 완료 → ${results.length}개 수집`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : '알 수 없는 오류'
        addLog(`[${i + 1}/${cleanQueries.length}] "${q}" 오류: ${msg}`)
        queryResults.push({ query: q, results: [] })
      }
    }

    const total = queryResults.reduce((s, r) => s + r.results.length, 0)
    addLog(`[완료] 총 ${total}개 수집 완료 (쿼터 ${totalUnits} units / API 호출 ${totalCalls}회)`)

    const record: CollectionRecord = {
      id: Date.now().toString(),
      mode,
      queries: cleanQueries,
      maxResults,
      filters,
      collectedAt: new Date().toISOString(),
      queryResults,
      usage: { units: totalUnits, calls: totalCalls },
    }

    setCurrentRecord(record)
    const newHistory = [record, ...history].slice(0, 30)
    setHistory(newHistory)
    localStorage.setItem('youtube_collector_history', JSON.stringify(newHistory))
    setLoading(false)
  }

  function deleteRecord(id: string) {
    const next = history.filter((r) => r.id !== id)
    setHistory(next)
    localStorage.setItem('youtube_collector_history', JSON.stringify(next))
    if (selectedRecord?.id === id) setSelectedRecord(null)
    if (currentRecord?.id === id) setCurrentRecord(null)
  }

  const displayRecord = selectedRecord ?? currentRecord
  const isKeyword = displayRecord?.mode === 'keyword'

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-violet-800">YouTube API 데이터 수집</h1>

      {/* 설정 섹션 */}
      <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm space-y-6">

        {/* 모드 선택 */}
        <div>
          <label className="text-sm font-semibold text-violet-700 mb-3 block">수집 모드</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('keyword')}
              disabled={loading}
              style={mode === 'keyword' ? { background: '#8b5cf6', color: '#fff', borderColor: '#8b5cf6' } : {}}
              className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 text-left transition-all disabled:opacity-50 ${
                mode === 'keyword' ? 'shadow-md' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50'
              }`}
            >
              <span className="text-2xl">🎬</span>
              <div>
                <p className="font-semibold text-sm">영상 검색 수집</p>
                <p className="text-xs mt-0.5 opacity-70">키워드로 유튜브 영상 검색</p>
              </div>
              {mode === 'keyword' && (
                <span className="ml-auto text-lg">✓</span>
              )}
            </button>
            <button
              onClick={() => setMode('channel')}
              disabled={loading}
              style={mode === 'channel' ? { background: '#8b5cf6', color: '#fff', borderColor: '#8b5cf6' } : {}}
              className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 text-left transition-all disabled:opacity-50 ${
                mode === 'channel' ? 'shadow-md' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50'
              }`}
            >
              <span className="text-2xl">📺</span>
              <div>
                <p className="font-semibold text-sm">채널 검색 수집</p>
                <p className="text-xs mt-0.5 opacity-70">키워드로 유튜브 채널 검색</p>
              </div>
              {mode === 'channel' && (
                <span className="ml-auto text-lg">✓</span>
              )}
            </button>
          </div>
        </div>

        {/* 검색어 입력 */}
        <div>
          <label className="text-sm font-semibold text-violet-700 mb-3 block">
            {mode === 'keyword' ? '검색 키워드' : '채널 검색어'}
            <span className="text-xs font-normal text-slate-400 ml-2">최대 10개</span>
          </label>
          <div className="space-y-2">
            {queries.map((q, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => updateQuery(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); if (idx === queries.length - 1) addQuery() }
                  }}
                  placeholder={`${mode === 'keyword' ? '키워드' : '채널 검색어'} ${idx + 1} 입력`}
                  disabled={loading}
                  className="flex-1 border border-violet-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 disabled:opacity-50"
                />
                {queries.length > 1 && (
                  <button
                    onClick={() => removeQuery(idx)}
                    disabled={loading}
                    className="px-3 py-2 text-xs text-rose-400 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
            {queries.length < 10 && (
              <button
                onClick={addQuery}
                disabled={loading}
                className="text-sm text-violet-500 hover:text-violet-700 transition-colors mt-1 disabled:opacity-50"
              >
                + 검색어 추가
              </button>
            )}
          </div>
        </div>

        {/* 수집 목표 개수 */}
        <div>
          <label className="text-sm font-semibold text-violet-700 mb-3 block">
            검색어당 수집 목표 개수
            <span className="text-xs font-normal text-slate-400 ml-2">(필터 조건 통과 기준)</span>
          </label>
          <input
            type="number"
            value={maxResults}
            min={1}
            max={500}
            onChange={(e) => setMaxResults(Math.max(1, Math.min(500, parseInt(e.target.value) || 50)))}
            disabled={loading}
            className="w-32 border border-violet-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 disabled:opacity-50"
          />
        </div>

        {/* 필터 조건 */}
        <div>
          <label className="text-sm font-semibold text-violet-700 mb-3 block">
            필터 조건
            <span className="text-xs font-normal text-slate-400 ml-2">(빈 칸 = 조건 없음)</span>
          </label>
          <div className="grid grid-cols-3 gap-4">
            {mode === 'keyword' ? (
              <>
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">조회수 ≥</p>
                  <input type="number" value={minViews} onChange={(e) => setMinViews(e.target.value)} placeholder="0" min={0} disabled={loading}
                    className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 disabled:opacity-50" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">좋아요 ≥</p>
                  <input type="number" value={minLikes} onChange={(e) => setMinLikes(e.target.value)} placeholder="0" min={0} disabled={loading}
                    className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 disabled:opacity-50" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">댓글수 ≥</p>
                  <input type="number" value={minComments} onChange={(e) => setMinComments(e.target.value)} placeholder="0" min={0} disabled={loading}
                    className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 disabled:opacity-50" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">구독자수 ≥</p>
                  <input type="number" value={minSubs} onChange={(e) => setMinSubs(e.target.value)} placeholder="0" min={0} disabled={loading}
                    className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 disabled:opacity-50" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">총조회수 ≥</p>
                  <input type="number" value={minTotalViews} onChange={(e) => setMinTotalViews(e.target.value)} placeholder="0" min={0} disabled={loading}
                    className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 disabled:opacity-50" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">업로드수 ≥</p>
                  <input type="number" value={minVideos} onChange={(e) => setMinVideos(e.target.value)} placeholder="0" min={0} disabled={loading}
                    className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 disabled:opacity-50" />
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">{error}</p>
        )}

        <button
          onClick={handleCollect}
          disabled={loading}
          style={{ background: loading ? '#c4b5fd' : '#8b5cf6', color: '#fff' }}
          className="w-full py-3 rounded-xl font-medium text-sm shadow-sm transition-colors disabled:cursor-not-allowed"
        >
          {loading ? '⏳ 수집 중...' : '▶ 수집 시작'}
        </button>
      </section>

      {/* 로그 */}
      {logs.length > 0 && (
        <section className="bg-white border border-violet-100 rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-violet-700 mb-2">수집 로그</h2>
          <div
            ref={logRef}
            className="h-36 overflow-y-auto bg-slate-50 rounded-xl p-3 text-xs text-slate-600 font-mono space-y-0.5"
          >
            {logs.map((log, i) => (
              <p key={i}>{log}</p>
            ))}
          </div>
        </section>
      )}

      {/* 결과 */}
      {displayRecord && displayRecord.queryResults.length > 0 && (
        <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-violet-700">수집 결과</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {displayRecord.mode === 'keyword' ? '영상 수집' : '채널 수집'} ·{' '}
                {displayRecord.queries.join(', ')} ·{' '}
                총 {displayRecord.queryResults.reduce((s, r) => s + r.results.length, 0)}개
              </p>
            </div>
            <button
              onClick={() => downloadExcel(displayRecord)}
              className="text-sm bg-violet-100 text-violet-600 border border-violet-200 px-4 py-1.5 rounded-full hover:bg-violet-200 transition-colors"
            >
              엑셀 다운로드
            </button>
          </div>

          {/* 쿼리별 탭 */}
          {displayRecord.queryResults.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {displayRecord.queryResults.map((qr, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  style={activeTab === i ? { background: '#8b5cf6', color: '#fff', borderColor: '#8b5cf6' } : {}}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    activeTab === i ? '' : 'border-violet-200 text-slate-500 hover:bg-violet-50'
                  }`}
                >
                  {qr.query}
                  <span className="ml-1 opacity-70">({qr.results.length})</span>
                </button>
              ))}
            </div>
          )}

          {/* 테이블 */}
          {(() => {
            const qr = displayRecord.queryResults[activeTab] ?? displayRecord.queryResults[0]
            if (!qr || !qr.results.length) {
              return <p className="text-sm text-slate-400 py-4 text-center">수집된 데이터가 없습니다.</p>
            }
            return (
              <div className="overflow-x-auto rounded-xl border border-violet-100">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-violet-50 border-b border-violet-100">
                      {isKeyword ? (
                        <>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">영상제목</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">채널명</th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold text-violet-600">조회수</th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold text-violet-600">좋아요</th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold text-violet-600">댓글수</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">업로드일</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">채널명</th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold text-violet-600">구독자수</th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold text-violet-600">총조회수</th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold text-violet-600">업로드수</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">개설일</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {qr.results.map((row, ri) => (
                      <tr
                        key={ri}
                        className={`border-b border-violet-50 last:border-0 hover:bg-violet-50/30 transition-colors ${ri % 2 === 1 ? 'bg-violet-50/20' : ''}`}
                      >
                        {isKeyword ? (() => {
                          const r = row as VideoResult
                          return (
                            <>
                              <td className="py-2 px-3 text-slate-700 text-xs max-w-[200px]">
                                <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-violet-600 hover:underline line-clamp-2">
                                  {r.title}
                                </a>
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-xs whitespace-nowrap">{r.channelTitle}</td>
                              <td className="py-2 px-3 text-right text-slate-700 text-xs font-medium">{formatNum(r.viewCount)}</td>
                              <td className="py-2 px-3 text-right text-slate-700 text-xs font-medium">{formatNum(r.likeCount)}</td>
                              <td className="py-2 px-3 text-right text-slate-700 text-xs font-medium">{formatNum(r.commentCount)}</td>
                              <td className="py-2 px-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(r.publishedAt)}</td>
                            </>
                          )
                        })() : (() => {
                          const r = row as ChannelResult
                          return (
                            <>
                              <td className="py-2 px-3 text-slate-700 text-xs whitespace-nowrap">
                                <a href={r.channelUrl} target="_blank" rel="noopener noreferrer" className="hover:text-violet-600 hover:underline">
                                  {r.channelTitle}
                                </a>
                              </td>
                              <td className="py-2 px-3 text-right text-slate-700 text-xs font-medium">{formatNum(r.subscriberCount)}</td>
                              <td className="py-2 px-3 text-right text-slate-700 text-xs font-medium">{formatNum(r.viewCount)}</td>
                              <td className="py-2 px-3 text-right text-slate-700 text-xs font-medium">{formatNum(r.videoCount)}</td>
                              <td className="py-2 px-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(r.publishedAt)}</td>
                            </>
                          )
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
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
            {(() => {
              // 누적 API 사용량 계산 (오래된 순 → 최신 순으로 누적)
              const reversed = [...history].reverse()
              const cumMap: Record<string, { units: number; calls: number }> = {}
              let cu = 0, cc = 0
              for (const r of reversed) {
                cu += r.usage?.units ?? 0
                cc += r.usage?.calls ?? 0
                cumMap[r.id] = { units: cu, calls: cc }
              }
              return history.map((record) => {
              const total = record.queryResults.reduce((s, r) => s + r.results.length, 0)
              const cumUsage = cumMap[record.id]
              return (
                <li
                  key={record.id}
                  className="bg-white border rounded-xl px-4 py-3 flex items-center gap-4 transition-all hover:border-violet-300"
                  style={selectedRecord?.id === record.id ? { borderColor: '#8b5cf6', boxShadow: '0 1px 3px rgba(139,92,246,0.2)' } : { borderColor: '#ede9fe' }}
                >
                  <div className="min-w-0 w-48 shrink-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      [{record.mode === 'keyword' ? '영상' : '채널'}] {record.queries.join(', ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      총 {total}개 · {new Date(record.collectedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>

                  {/* API 사용량 (누적) */}
                  <div className="flex-1 min-w-0">
                    {cumUsage ? (
                      <table className="text-xs">
                        <thead>
                          <tr>
                            <th className="text-left py-0.5 px-3 text-violet-500 font-medium">일일사용량</th>
                            <th className="text-left py-0.5 px-3 text-violet-500 font-medium">호출회수</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-0.5 px-3 text-slate-600 font-medium">{cumUsage.units.toLocaleString()}</td>
                            <td className="py-0.5 px-3 text-slate-600 font-medium">{cumUsage.calls}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedRecord(selectedRecord?.id === record.id ? null : record)
                        setActiveTab(0)
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
              )
            })
            })()}
          </ul>
        </section>
      )}
    </div>
  )
}
