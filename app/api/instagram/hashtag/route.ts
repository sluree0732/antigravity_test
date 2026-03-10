import { NextRequest, NextResponse } from 'next/server'

const BASE_HOST = 'https://graph.facebook.com'
const API_VERSION = 'v23.0'
const BASE = `${BASE_HOST}/${API_VERSION}`

const HASHTAG_FIELDS = 'id,caption,media_type,media_url,permalink,comments_count,like_count'

function getEnv() {
  const userId = process.env.IG_USER_ID
  const token = process.env.IG_ACCESS_TOKEN
  if (!userId || !token) throw new Error('IG_USER_ID 또는 IG_ACCESS_TOKEN이 설정되지 않았습니다.')
  return { userId, token }
}

function parseUsageHeader(headers: Headers): { call_count: number; total_time: number } | null {
  try {
    const raw = headers.get('x-app-usage') ?? headers.get('X-App-Usage')
    if (!raw) return null
    const u = JSON.parse(raw) as { call_count?: number; total_time?: number }
    return { call_count: u.call_count ?? 0, total_time: u.total_time ?? 0 }
  } catch {
    return null
  }
}

// Python의 advance_paging과 동일: next URL에서 path와 params 분리
function advancePaging(nextUrl: string): { path: string; params: Record<string, string> } {
  const parsed = new URL(nextUrl)
  const params: Record<string, string> = {}
  parsed.searchParams.forEach((v, k) => { params[k] = v })
  return { path: `${parsed.origin}${parsed.pathname}`, params }
}

async function getHashtagId(
  keyword: string,
  userId: string,
  token: string,
): Promise<{ id: string; usage: { call_count: number; total_time: number } | null }> {
  const url = new URL(`${BASE}/ig_hashtag_search`)
  url.searchParams.set('user_id', userId)
  url.searchParams.set('q', keyword)
  url.searchParams.set('access_token', token)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  const usage = parseUsageHeader(res.headers)

  const data = await res.json() as {
    data?: { id: string }[]
    error?: { message: string; code?: number; type?: string }
  }

  if (!res.ok || data.error) {
    const errMsg = data.error?.message ?? `HTTP ${res.status}`
    throw new Error(`해시태그 ID 조회 실패 (${res.status}): ${errMsg}`)
  }

  const items = data.data ?? []
  if (!items.length) throw new Error(`'#${keyword}' 해시태그를 찾을 수 없습니다.`)
  return { id: items[0].id, usage }
}

async function fetchMedia(
  hashtagId: string,
  kind: 'recent_media' | 'top_media',
  userId: string,
  token: string,
  maxResults: number,
): Promise<{ results: Record<string, string>[]; usage: { call_count: number; total_time: number } | null; logs: string[] }> {
  const results: Record<string, string>[] = []
  const seen = new Set<string>()
  const logs: string[] = []
  let lastUsage: { call_count: number; total_time: number } | null = null

  let url = `${BASE}/${hashtagId}/${kind}`
  let params: Record<string, string> = {
    user_id: userId,
    fields: HASHTAG_FIELDS,
    access_token: token,
    limit: '50',
  }

  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  let page = 0

  while (results.length < maxResults) {
    page++
    logs.push(`[수집] ${kind} page ${page} ...`)

    const reqUrl = new URL(url)
    Object.entries(params).forEach(([k, v]) => reqUrl.searchParams.set(k, v))

    const res = await fetch(reqUrl.toString(), { cache: 'no-store' })
    const u = parseUsageHeader(res.headers)
    if (u) lastUsage = u

    const data = await res.json() as {
      data?: Record<string, unknown>[]
      paging?: { next?: string; cursors?: { after?: string; before?: string } }
      error?: { message: string; code?: number; type?: string }
    }

    // 버스트/요청제한 처리 (Python의 403/429 처리)
    if (res.status === 429 || res.status === 403) {
      const errMsg = data.error?.message ?? `HTTP ${res.status}`
      const code = data.error?.code
      logs.push(`[중단] ${kind} HTTP ${res.status} code=${code}: ${errMsg}`)
      break
    }

    if (!res.ok || data.error) {
      const errMsg = data.error?.message ?? `HTTP ${res.status}`
      const code = data.error?.code
      throw new Error(`미디어 조회 실패 [${kind}] (${res.status}) code=${code}: ${errMsg}`)
    }

    const rows = data.data ?? []
    logs.push(`[수집] ${kind} page ${page} → ${rows.length}개 응답`)

    for (const item of rows) {
      const permalink = String(item.permalink ?? '')
      if (!permalink || seen.has(permalink)) continue
      seen.add(permalink)
      results.push({
        collectedAt: now,
        type: kind === 'recent_media' ? '최신' : '인기',
        permalink,
        mediaType: String(item.media_type ?? ''),
        caption: String(item.caption ?? ''),
        mediaUrl: String(item.media_url ?? ''),
        likeCount: String(item.like_count ?? '0'),
        commentCount: String(item.comments_count ?? '0'),
      })
      if (results.length >= maxResults) break
    }

    // top_media는 페이지네이션 없음 (Python과 동일)
    if (kind === 'top_media') break

    const nextUrl = data.paging?.next
    if (!nextUrl) {
      logs.push(`[종료] ${kind} 다음 페이지 없음`)
      break
    }

    // Python의 advance_paging과 동일하게 next URL 파싱
    const { path, params: nextParams } = advancePaging(nextUrl)
    url = path
    params = { ...nextParams, limit: '50' }
  }

  return { results, usage: lastUsage, logs }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { query: string; maxResults?: number }
    const { query, maxResults = 50 } = body

    if (!query?.trim()) {
      return NextResponse.json({ error: '해시태그를 입력하세요.' }, { status: 400 })
    }

    const { userId, token } = getEnv()
    const keyword = query.trim().replace(/^#/, '')

    const { id: hashtagId, usage: searchUsage } = await getHashtagId(keyword, userId, token)

    const half = Math.ceil(maxResults / 2)
    const { results: recentMedia, usage: recentUsage, logs: recentLogs } = await fetchMedia(hashtagId, 'recent_media', userId, token, half)
    const { results: topMedia, usage: topUsage, logs: topLogs } = await fetchMedia(hashtagId, 'top_media', userId, token, half)

    // 중복 제거 후 합산
    const seen = new Set<string>()
    const results: Record<string, string>[] = []
    for (const item of [...recentMedia, ...topMedia]) {
      if (!seen.has(item.permalink)) {
        seen.add(item.permalink)
        results.push(item)
        if (results.length >= maxResults) break
      }
    }

    const finalUsage = topUsage ?? recentUsage ?? searchUsage
    return NextResponse.json({
      query: keyword,
      results,
      usage: finalUsage,
      logs: [...recentLogs, ...topLogs],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
