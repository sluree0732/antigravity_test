'use client'

import { useEffect, useRef, useState } from 'react'

// ─── 타입 정의 ───────────────────────────────────────────────────────────────

interface HashtagResult {
  collectedAt: string
  type: string
  permalink: string
  mediaType: string
  caption: string
  mediaUrl: string
  likeCount: string
  commentCount: string
}

interface BDMediaResult {
  collectedAt: string
  permalink: string
  mediaType: string
  caption: string
  mediaUrl: string
  publishedAt: string
  childCount: string
}

interface BDProfile {
  사용자명: string
  이름: string
  바이오: string
  웹사이트: string
  팔로워수: string
  팔로잉수: string
  게시물수: string
}

interface HashtagQueryResult {
  query: string
  results: HashtagResult[]
}

interface BDQueryResult {
  username: string
  profile: BDProfile
  media: BDMediaResult[]
}

interface CollectionRecord {
  id: string
  mode: 'hashtag' | 'business'
  queries: string[]
  settings: Record<string, number>
  collectedAt: string
  hashtagResults?: HashtagQueryResult[]
  bdResults?: BDQueryResult[]
  usage?: { call_count: number; total_time: number }
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

  if (record.mode === 'hashtag' && record.hashtagResults) {
    for (const qr of record.hashtagResults) {
      const sheetName = qr.query.slice(0, 31)
      const ws = workbook.addWorksheet(sheetName)
      const headers = ['수집일시', '유형', '퍼머링크', '미디어타입', '본문캡션', '미디어URL', '좋아요수', '댓글수']
      headers.forEach((h, i) => {
        const cell = ws.getCell(1, i + 1)
        cell.value = h
        Object.assign(cell, headerStyle)
      })
      qr.results.forEach((row, ri) => {
        const vals = [row.collectedAt, row.type, row.permalink, row.mediaType, row.caption, row.mediaUrl, safeInt(row.likeCount), safeInt(row.commentCount)]
        vals.forEach((v, ci) => { ws.getCell(ri + 2, ci + 1).value = v })
      })
      ws.getColumn(1).width = 18
      ws.getColumn(2).width = 8
      ws.getColumn(3).width = 40
      ws.getColumn(4).width = 14
      ws.getColumn(5).width = 40
      ws.getColumn(6).width = 40
      ws.getColumn(7).width = 10
      ws.getColumn(8).width = 10
    }
  } else if (record.mode === 'business' && record.bdResults) {
    for (const bd of record.bdResults) {
      const sheetName = bd.username.slice(0, 31)
      const ws = workbook.addWorksheet(sheetName)

      // 프로필 행
      ws.getCell(1, 1).value = '프로필'
      Object.assign(ws.getCell(1, 1), { ...headerStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E0FF' } } })
      const profileKeys = Object.keys(bd.profile) as (keyof BDProfile)[]
      profileKeys.forEach((k, i) => {
        ws.getCell(2, i + 1).value = k
        ws.getCell(3, i + 1).value = bd.profile[k]
      })

      ws.addRow([])

      // 미디어 헤더
      const mediaHeaders = ['수집일시', '퍼머링크', '미디어타입', '본문캡션', '미디어URL', '게시시각', '자식개수']
      mediaHeaders.forEach((h, i) => {
        const cell = ws.getCell(5, i + 1)
        cell.value = h
        Object.assign(cell, headerStyle)
      })
      bd.media.forEach((row, ri) => {
        const vals = [row.collectedAt, row.permalink, row.mediaType, row.caption, row.mediaUrl, row.publishedAt, safeInt(row.childCount)]
        vals.forEach((v, ci) => { ws.getCell(ri + 6, ci + 1).value = v })
      })
      ws.getColumn(1).width = 18
      ws.getColumn(2).width = 40
      ws.getColumn(3).width = 14
      ws.getColumn(4).width = 40
      ws.getColumn(5).width = 40
      ws.getColumn(6).width = 20
      ws.getColumn(7).width = 10
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `instagram_${record.mode}_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function InstagramPage() {
  const [mode, setMode] = useState<'hashtag' | 'business'>('hashtag')
  const [queries, setQueries] = useState<string[]>([''])

  // 해시태그 설정
  const [maxResults, setMaxResults] = useState(50)

  // BD 설정
  const [maxMedia, setMaxMedia] = useState(100)
  const [perPage, setPerPage] = useState(20)

  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState('')
  const [currentRecord, setCurrentRecord] = useState<CollectionRecord | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<CollectionRecord | null>(null)
  const [history, setHistory] = useState<CollectionRecord[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [sharedUsage, setSharedUsage] = useState<{ totalCount: number; lastCallCount: number; lastTotalTime: number } | null>(null)

  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('instagram_collector_history')
      if (stored) setHistory(JSON.parse(stored))
    } catch { /* ignore */ }
    fetch('/api/instagram/usage')
      .then((r) => r.json())
      .then((d: { totalCount?: number; lastCallCount?: number; lastTotalTime?: number }) => {
        if (d.totalCount !== undefined) setSharedUsage({ totalCount: d.totalCount, lastCallCount: d.lastCallCount ?? 0, lastTotalTime: d.lastTotalTime ?? 0 })
      })
      .catch(() => { /* ignore */ })
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
      setError(mode === 'hashtag' ? '해시태그를 최소 1개 입력하세요.' : '유저네임을 최소 1개 입력하세요.')
      return
    }
    setError('')
    setLoading(true)
    setLogs([])
    setCurrentRecord(null)
    setSelectedRecord(null)
    setActiveTab(0)

    const modeLabel = mode === 'hashtag' ? '해시태그' : 'BD(계정)'
    addLog(`[수집 시작] 모드: ${modeLabel} / ${cleanQueries.length}개 / ${mode === 'hashtag' ? `목표 ${maxResults}개` : `계정당 최대 ${maxMedia === 0 ? '무제한' : maxMedia}개`}`)

    if (mode === 'hashtag') {
      const hashtagResults: HashtagQueryResult[] = []
      let lastUsage: { call_count: number; total_time: number } | undefined

      for (let i = 0; i < cleanQueries.length; i++) {
        const q = cleanQueries[i]
        addLog(`[${i + 1}/${cleanQueries.length}] "#${q.replace(/^#/, '')}" 수집 중...`)

        try {
          const res = await fetch('/api/instagram/hashtag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q, maxResults }),
          })
          const data = await res.json() as { query?: string; results?: HashtagResult[]; usage?: { call_count: number; total_time: number }; error?: string; logs?: string[] }
          if (!res.ok) throw new Error(data.error ?? '수집 실패')

          if (data.logs) data.logs.forEach((l) => addLog(l))
          const results = data.results ?? []
          hashtagResults.push({ query: data.query ?? q, results })
          if (data.usage) lastUsage = data.usage
          addLog(`[${i + 1}/${cleanQueries.length}] "#${data.query ?? q}" 완료 → ${results.length}개 수집`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : '알 수 없는 오류'
          addLog(`[${i + 1}/${cleanQueries.length}] "${q}" 오류: ${msg}`)
          hashtagResults.push({ query: q, results: [] })
        }
      }

      const total = hashtagResults.reduce((s, r) => s + r.results.length, 0)
      addLog(`[완료] 총 ${total}개 수집 완료${lastUsage ? ` (call_count: ${lastUsage.call_count}%, total_time: ${lastUsage.total_time}%)` : ''}`)

      const record: CollectionRecord = {
        id: Date.now().toString(),
        mode: 'hashtag',
        queries: cleanQueries,
        settings: { maxResults },
        collectedAt: new Date().toISOString(),
        hashtagResults,
        usage: lastUsage,
      }
      setCurrentRecord(record)
      const newHistory = [record, ...history].slice(0, 30)
      setHistory(newHistory)
      localStorage.setItem('instagram_collector_history', JSON.stringify(newHistory))
      // 서버에 사용량 저장
      if (lastUsage) {
        fetch('/api/instagram/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ call_count: lastUsage.call_count, total_time: lastUsage.total_time, mode: 'hashtag', query: cleanQueries.join(', '), count: total }),
        })
          .then((r) => r.json())
          .then((d: { totalCount?: number; lastCallCount?: number; lastTotalTime?: number }) => {
            if (d.totalCount !== undefined) setSharedUsage({ totalCount: d.totalCount, lastCallCount: d.lastCallCount ?? 0, lastTotalTime: d.lastTotalTime ?? 0 })
          })
          .catch(() => { /* ignore */ })
      }
    } else {
      const bdResults: BDQueryResult[] = []
      let lastUsage: { call_count: number; total_time: number } | undefined

      for (let i = 0; i < cleanQueries.length; i++) {
        const uname = cleanQueries[i].replace(/^@/, '')
        addLog(`[${i + 1}/${cleanQueries.length}] "@${uname}" 수집 중...`)

        try {
          const res = await fetch('/api/instagram/business', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uname, maxMedia, perPage }),
          })
          const data = await res.json() as { username?: string; profile?: BDProfile; media?: BDMediaResult[]; usage?: { call_count: number; total_time: number }; error?: string }
          if (!res.ok) throw new Error(data.error ?? '수집 실패')

          bdResults.push({
            username: data.username ?? uname,
            profile: data.profile ?? {} as BDProfile,
            media: data.media ?? [],
          })
          if (data.usage) lastUsage = data.usage
          addLog(`[${i + 1}/${cleanQueries.length}] "@${data.username ?? uname}" 완료 → 미디어 ${(data.media ?? []).length}개 수집`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : '알 수 없는 오류'
          addLog(`[${i + 1}/${cleanQueries.length}] "@${uname}" 오류: ${msg}`)
          bdResults.push({ username: uname, profile: {} as BDProfile, media: [] })
        }
      }

      const total = bdResults.reduce((s, r) => s + r.media.length, 0)
      addLog(`[완료] 총 ${total}개 미디어 수집 완료${lastUsage ? ` (call_count: ${lastUsage.call_count}%, total_time: ${lastUsage.total_time}%)` : ''}`)

      const record: CollectionRecord = {
        id: Date.now().toString(),
        mode: 'business',
        queries: cleanQueries,
        settings: { maxMedia, perPage },
        collectedAt: new Date().toISOString(),
        bdResults,
        usage: lastUsage,
      }
      setCurrentRecord(record)
      const newHistory = [record, ...history].slice(0, 30)
      setHistory(newHistory)
      localStorage.setItem('instagram_collector_history', JSON.stringify(newHistory))
      // 서버에 사용량 저장
      if (lastUsage) {
        fetch('/api/instagram/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ call_count: lastUsage.call_count, total_time: lastUsage.total_time, mode: 'business', query: cleanQueries.join(', '), count: total }),
        })
          .then((r) => r.json())
          .then((d: { totalCount?: number; lastCallCount?: number; lastTotalTime?: number }) => {
            if (d.totalCount !== undefined) setSharedUsage({ totalCount: d.totalCount, lastCallCount: d.lastCallCount ?? 0, lastTotalTime: d.lastTotalTime ?? 0 })
          })
          .catch(() => { /* ignore */ })
      }
    }

    setLoading(false)
  }

  function deleteRecord(id: string) {
    const next = history.filter((r) => r.id !== id)
    setHistory(next)
    localStorage.setItem('instagram_collector_history', JSON.stringify(next))
    if (selectedRecord?.id === id) setSelectedRecord(null)
    if (currentRecord?.id === id) setCurrentRecord(null)
  }

  const displayRecord = selectedRecord ?? currentRecord

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-violet-800">Instagram API 데이터 수집</h1>

      {/* 설정 섹션 */}
      <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm space-y-6">

        {/* 모드 선택 */}
        <div>
          <label className="text-sm font-semibold text-violet-700 mb-3 block">수집 모드</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setMode('hashtag'); setQueries(['']) }}
              disabled={loading}
              style={mode === 'hashtag' ? { background: '#8b5cf6', color: '#fff', borderColor: '#8b5cf6' } : {}}
              className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 text-left transition-all disabled:opacity-50 ${
                mode === 'hashtag' ? 'shadow-md' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50'
              }`}
            >
              <span className="text-2xl">🏷️</span>
              <div>
                <p className="font-semibold text-sm">해시태그 수집</p>
                <p className="text-xs mt-0.5 opacity-70">해시태그로 게시물 검색</p>
              </div>
              {mode === 'hashtag' && <span className="ml-auto text-lg">✓</span>}
            </button>
            <button
              onClick={() => { setMode('business'); setQueries(['']) }}
              disabled={loading}
              style={mode === 'business' ? { background: '#8b5cf6', color: '#fff', borderColor: '#8b5cf6' } : {}}
              className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 text-left transition-all disabled:opacity-50 ${
                mode === 'business' ? 'shadow-md' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50'
              }`}
            >
              <span className="text-2xl">👤</span>
              <div>
                <p className="font-semibold text-sm">계정 수집 (BD)</p>
                <p className="text-xs mt-0.5 opacity-70">비즈니스 계정 미디어 수집</p>
              </div>
              {mode === 'business' && <span className="ml-auto text-lg">✓</span>}
            </button>
          </div>
        </div>

        {/* 검색어 입력 */}
        <div>
          <label className="text-sm font-semibold text-violet-700 mb-3 block">
            {mode === 'hashtag' ? '해시태그' : '인스타그램 유저네임'}
            <span className="text-xs font-normal text-slate-400 ml-2">
              최대 10개 · {mode === 'hashtag' ? '# 자동 제거' : '@ 자동 제거'}
            </span>
          </label>
          <div className="space-y-2">
            {queries.map((q, idx) => (
              <div key={idx} className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                    {mode === 'hashtag' ? '#' : '@'}
                  </span>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => updateQuery(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); if (idx === queries.length - 1) addQuery() }
                    }}
                    placeholder={mode === 'hashtag' ? `해시태그 ${idx + 1} 입력` : `유저네임 ${idx + 1} 입력`}
                    disabled={loading}
                    className="w-full border border-violet-200 rounded-xl pl-7 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 disabled:opacity-50"
                  />
                </div>
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
                + 추가
              </button>
            )}
          </div>
        </div>

        {/* 수집 설정 */}
        <div>
          <label className="text-sm font-semibold text-violet-700 mb-3 block">수집 설정</label>
          {mode === 'hashtag' ? (
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1.5">최대 수집 개수</p>
                <input
                  type="number"
                  value={maxResults}
                  min={1}
                  max={500}
                  onChange={(e) => setMaxResults(Math.max(1, Math.min(500, parseInt(e.target.value) || 50)))}
                  disabled={loading}
                  className="w-28 border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-slate-400 mt-4">최신 게시물과 인기 게시물을 각각 절반씩 수집합니다.</p>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-xs text-slate-400 mb-1.5">계정당 최대 미디어 수<span className="ml-1 text-violet-400">(0=무제한)</span></p>
                <input
                  type="number"
                  value={maxMedia}
                  min={0}
                  max={1000}
                  onChange={(e) => setMaxMedia(Math.max(0, Math.min(1000, parseInt(e.target.value) || 0)))}
                  disabled={loading}
                  className="w-28 border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 disabled:opacity-50"
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1.5">페이지당 개수</p>
                <input
                  type="number"
                  value={perPage}
                  min={1}
                  max={50}
                  onChange={(e) => setPerPage(Math.max(1, Math.min(50, parseInt(e.target.value) || 20)))}
                  disabled={loading}
                  className="w-24 border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-slate-400 mt-4">Business Discovery API — 비즈니스/크리에이터 계정만 조회 가능합니다.</p>
            </div>
          )}
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
      {displayRecord && (
        <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-violet-700">수집 결과</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {displayRecord.mode === 'hashtag' ? '해시태그 수집' : '계정 수집'} ·{' '}
                {displayRecord.queries.join(', ')} ·{' '}
                {displayRecord.mode === 'hashtag'
                  ? `총 ${(displayRecord.hashtagResults ?? []).reduce((s, r) => s + r.results.length, 0)}개`
                  : `총 ${(displayRecord.bdResults ?? []).reduce((s, r) => s + r.media.length, 0)}개`}
              </p>
            </div>
            <button
              onClick={() => downloadExcel(displayRecord)}
              className="text-sm bg-violet-100 text-violet-600 border border-violet-200 px-4 py-1.5 rounded-full hover:bg-violet-200 transition-colors"
            >
              엑셀 다운로드
            </button>
          </div>

          {/* 탭 */}
          {((displayRecord.mode === 'hashtag' ? displayRecord.hashtagResults?.length : displayRecord.bdResults?.length) ?? 0) > 1 && (
            <div className="flex gap-1 flex-wrap">
              {(displayRecord.mode === 'hashtag' ? displayRecord.hashtagResults : displayRecord.bdResults ?? [])?.map((item, i) => {
                const label = displayRecord.mode === 'hashtag'
                  ? `#${(item as HashtagQueryResult).query}`
                  : `@${(item as BDQueryResult).username}`
                const count = displayRecord.mode === 'hashtag'
                  ? (item as HashtagQueryResult).results.length
                  : (item as BDQueryResult).media.length
                return (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    style={activeTab === i ? { background: '#8b5cf6', color: '#fff', borderColor: '#8b5cf6' } : {}}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      activeTab === i ? '' : 'border-violet-200 text-slate-500 hover:bg-violet-50'
                    }`}
                  >
                    {label}
                    <span className="ml-1 opacity-70">({count})</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* 해시태그 결과 테이블 */}
          {displayRecord.mode === 'hashtag' && (() => {
            const qr = displayRecord.hashtagResults?.[activeTab] ?? displayRecord.hashtagResults?.[0]
            if (!qr || !qr.results.length) {
              return <p className="text-sm text-slate-400 py-4 text-center">수집된 데이터가 없습니다.</p>
            }
            return (
              <div className="overflow-x-auto rounded-xl border border-violet-100">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-violet-50 border-b border-violet-100">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">유형</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">퍼머링크</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">미디어타입</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600 max-w-[200px]">캡션</th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-violet-600">좋아요</th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-violet-600">댓글</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qr.results.map((row, ri) => (
                      <tr
                        key={ri}
                        className={`border-b border-violet-50 last:border-0 hover:bg-violet-50/30 transition-colors ${ri % 2 === 1 ? 'bg-violet-50/20' : ''}`}
                      >
                        <td className="py-2 px-3 text-xs whitespace-nowrap">
                          <span
                            style={row.type === '인기' ? { background: '#8b5cf6', color: '#fff' } : { background: '#ede9fe', color: '#7c3aed' }}
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          <a href={row.permalink} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline truncate block max-w-[160px]">
                            {row.permalink.replace('https://www.instagram.com/', '')}
                          </a>
                        </td>
                        <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">{row.mediaType}</td>
                        <td className="py-2 px-3 text-xs text-slate-600 max-w-[200px]">
                          <span className="line-clamp-2">{row.caption}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-xs font-medium text-slate-700">{formatNum(row.likeCount)}</td>
                        <td className="py-2 px-3 text-right text-xs font-medium text-slate-700">{formatNum(row.commentCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {/* BD 결과 */}
          {displayRecord.mode === 'business' && (() => {
            const bd = displayRecord.bdResults?.[activeTab] ?? displayRecord.bdResults?.[0]
            if (!bd) return <p className="text-sm text-slate-400 py-4 text-center">수집된 데이터가 없습니다.</p>
            return (
              <div className="space-y-4">
                {/* 프로필 카드 */}
                <div className="bg-violet-50 rounded-xl p-4 grid grid-cols-2 gap-2 text-sm">
                  {(Object.entries(bd.profile) as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-violet-500 font-medium text-xs w-16 shrink-0">{k}</span>
                      <span className="text-slate-700 text-xs">{k.includes('수') ? formatNum(v) : v || '-'}</span>
                    </div>
                  ))}
                </div>
                {/* 미디어 테이블 */}
                {bd.media.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-violet-100">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="bg-violet-50 border-b border-violet-100">
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">퍼머링크</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">미디어타입</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600 max-w-[200px]">캡션</th>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold text-violet-600">게시시각</th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold text-violet-600">자식</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bd.media.map((row, ri) => (
                          <tr
                            key={ri}
                            className={`border-b border-violet-50 last:border-0 hover:bg-violet-50/30 transition-colors ${ri % 2 === 1 ? 'bg-violet-50/20' : ''}`}
                          >
                            <td className="py-2 px-3 text-xs">
                              <a href={row.permalink} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline truncate block max-w-[160px]">
                                {row.permalink.replace('https://www.instagram.com/', '')}
                              </a>
                            </td>
                            <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">{row.mediaType}</td>
                            <td className="py-2 px-3 text-xs text-slate-600 max-w-[200px]">
                              <span className="line-clamp-2">{row.caption}</span>
                            </td>
                            <td className="py-2 px-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(row.publishedAt)}</td>
                            <td className="py-2 px-3 text-right text-xs text-slate-500">{row.childCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-4 text-center">수집된 미디어가 없습니다.</p>
                )}
              </div>
            )
          })()}
        </section>
      )}

      {/* 수집 이력 */}
      {history.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-violet-700">
              수집 이력
              <span className="text-xs font-normal text-slate-400 ml-2">({history.length}건)</span>
            </h2>
            {sharedUsage && (
              <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2 text-xs">
                <span className="text-violet-500 font-medium">공유 누적 수집</span>
                <span className="text-slate-500">총 수집수</span>
                <span className="font-semibold text-violet-700">{sharedUsage.totalCount.toLocaleString()}개</span>
                <span className="text-slate-500">마지막 call_count</span>
                <span className="font-semibold text-violet-700">{sharedUsage.lastCallCount}%</span>
              </div>
            )}
          </div>
          <ul className="space-y-2">
            {history.map((record) => {
              const total = record.mode === 'hashtag'
                ? (record.hashtagResults ?? []).reduce((s, r) => s + r.results.length, 0)
                : (record.bdResults ?? []).reduce((s, r) => s + r.media.length, 0)
              return (
                <li
                  key={record.id}
                  className="bg-white border rounded-xl px-4 py-3 flex items-center gap-4 transition-all hover:border-violet-300"
                  style={selectedRecord?.id === record.id ? { borderColor: '#8b5cf6', boxShadow: '0 1px 3px rgba(139,92,246,0.2)' } : { borderColor: '#ede9fe' }}
                >
                  <div className="min-w-0 w-48 shrink-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      [{record.mode === 'hashtag' ? '해시태그' : 'BD'}] {record.queries.join(', ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      총 {total}개 · {new Date(record.collectedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>

                  {/* API 사용량 */}
                  <div className="flex-1 min-w-0">
                    {record.usage ? (
                      <table className="text-xs">
                        <thead>
                          <tr>
                            <th className="text-left py-0.5 px-3 text-violet-500 font-medium">call_count</th>
                            <th className="text-left py-0.5 px-3 text-violet-500 font-medium">total_time</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-0.5 px-3 text-slate-600 font-medium">{record.usage.call_count}%</td>
                            <td className="py-0.5 px-3 text-slate-600 font-medium">{record.usage.total_time}%</td>
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
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
