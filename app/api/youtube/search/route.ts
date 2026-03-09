import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://www.googleapis.com/youtube/v3'

function safeInt(v: unknown, d = 0): number {
  const n = parseInt(String(v ?? '').replace(/,/g, ''), 10)
  return isNaN(n) ? d : n
}

function makeTracker() {
  let units = 0
  let calls = 0
  return {
    track(endpoint: string) { calls++; units += endpoint === 'search' ? 100 : 1 },
    get units() { return units },
    get calls() { return calls },
  }
}

async function ytGet(endpoint: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) throw new Error('YOUTUBE_API_KEY가 설정되지 않았습니다.')

  const url = new URL(`${BASE}/${endpoint}`)
  Object.entries({ ...params, key: apiKey }).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube API 오류 (${res.status}): ${text.slice(0, 300)}`)
  }
  return res.json() as Promise<Record<string, unknown>>
}

async function getVideoDetails(videoIds: string[]): Promise<Record<string, Record<string, unknown>>> {
  const result: Record<string, Record<string, unknown>> = {}
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50)
    const data = await ytGet('videos', {
      part: 'snippet,statistics',
      id: chunk.join(','),
    })
    for (const item of (data.items as Record<string, unknown>[]) ?? []) {
      const id = item.id as string
      if (id) result[id] = item
    }
  }
  return result
}

async function getChannelDetails(channelIds: string[]): Promise<Record<string, Record<string, unknown>>> {
  const result: Record<string, Record<string, unknown>> = {}
  for (let i = 0; i < channelIds.length; i += 50) {
    const chunk = channelIds.slice(i, i + 50)
    const data = await ytGet('channels', {
      part: 'snippet,statistics',
      id: chunk.join(','),
    })
    for (const item of (data.items as Record<string, unknown>[]) ?? []) {
      const id = item.id as string
      if (id) result[id] = item
    }
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      mode: 'keyword' | 'channel'
      query: string
      maxResults?: number
      minViews?: number
      minLikes?: number
      minComments?: number
      minSubs?: number
      minTotalViews?: number
      minVideos?: number
    }

    const {
      mode,
      query,
      maxResults = 50,
      minViews = 0,
      minLikes = 0,
      minComments = 0,
      minSubs = 0,
      minTotalViews = 0,
      minVideos = 0,
    } = body

    if (!query?.trim()) {
      return NextResponse.json({ error: '검색어를 입력하세요.' }, { status: 400 })
    }

    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    const tracker = makeTracker()

    if (mode === 'keyword') {
      const results: Record<string, string>[] = []
      const seen = new Set<string>()
      let pageToken: string | undefined
      let totalProcessed = 0

      while (results.length < maxResults) {
        const params: Record<string, string> = {
          part: 'snippet',
          type: 'video',
          q: query,
          maxResults: '50',
        }
        if (pageToken) params.pageToken = pageToken

        tracker.track('search')
        const data = await ytGet('search', params)
        const items = (data.items as Record<string, unknown>[]) ?? []
        if (!items.length) break

        const videoIds: string[] = []
        const parsedItems: { videoId: string; snippet: Record<string, unknown> }[] = []

        for (const item of items) {
          const id = (item.id as Record<string, unknown>)
          const vid = id?.videoId as string
          if (!vid || seen.has(vid)) continue
          seen.add(vid)
          videoIds.push(vid)
          parsedItems.push({ videoId: vid, snippet: (item.snippet as Record<string, unknown>) ?? {} })
        }

        if (!videoIds.length) {
          pageToken = data.nextPageToken as string | undefined
          if (!pageToken) break
          continue
        }

        tracker.track('videos')
        const details = await getVideoDetails(videoIds)

        for (const s of parsedItems) {
          const det = details[s.videoId] ?? {}
          const snippet = (det.snippet as Record<string, unknown>) ?? s.snippet
          const stats = (det.statistics as Record<string, unknown>) ?? {}

          const views = safeInt(stats.viewCount)
          const likes = safeInt(stats.likeCount)
          const comments = safeInt(stats.commentCount)

          if (views < minViews || likes < minLikes || comments < minComments) continue

          results.push({
            collectedAt: now,
            title: String(snippet.title ?? ''),
            channelTitle: String(snippet.channelTitle ?? ''),
            publishedAt: String(snippet.publishedAt ?? ''),
            viewCount: String(stats.viewCount ?? '0'),
            likeCount: String(stats.likeCount ?? '0'),
            commentCount: String(stats.commentCount ?? '0'),
            url: `https://www.youtube.com/watch?v=${s.videoId}`,
          })

          if (results.length >= maxResults) break
        }

        totalProcessed += videoIds.length
        if (results.length >= maxResults) break

        pageToken = data.nextPageToken as string | undefined
        if (!pageToken) break
        if (totalProcessed >= maxResults * 5) break
      }

      return NextResponse.json({ mode: 'keyword', query, results, usage: { units: tracker.units, calls: tracker.calls } })

    } else if (mode === 'channel') {
      const results: Record<string, string>[] = []
      const seen = new Set<string>()
      let pageToken: string | undefined
      let totalProcessed = 0

      while (results.length < maxResults) {
        const params: Record<string, string> = {
          part: 'snippet',
          type: 'channel',
          q: query,
          maxResults: '50',
        }
        if (pageToken) params.pageToken = pageToken

        tracker.track('search')
        const data = await ytGet('search', params)
        const items = (data.items as Record<string, unknown>[]) ?? []
        if (!items.length) break

        const channelIds: string[] = []
        const parsedItems: { channelId: string; snippet: Record<string, unknown> }[] = []

        for (const item of items) {
          const id = (item.id as Record<string, unknown>)
          const cid = id?.channelId as string
          if (!cid || seen.has(cid)) continue
          seen.add(cid)
          channelIds.push(cid)
          parsedItems.push({ channelId: cid, snippet: (item.snippet as Record<string, unknown>) ?? {} })
        }

        if (!channelIds.length) {
          pageToken = data.nextPageToken as string | undefined
          if (!pageToken) break
          continue
        }

        tracker.track('channels')
        const details = await getChannelDetails(channelIds)

        for (const s of parsedItems) {
          const det = details[s.channelId] ?? {}
          const snippet = (det.snippet as Record<string, unknown>) ?? s.snippet
          const stats = (det.statistics as Record<string, unknown>) ?? {}

          const subs = safeInt(stats.subscriberCount)
          const totalViews = safeInt(stats.viewCount)
          const videos = safeInt(stats.videoCount)

          if (subs < minSubs || totalViews < minTotalViews || videos < minVideos) continue

          results.push({
            collectedAt: now,
            channelTitle: String(snippet.title ?? ''),
            publishedAt: String(snippet.publishedAt ?? ''),
            subscriberCount: String(stats.subscriberCount ?? '0'),
            viewCount: String(stats.viewCount ?? '0'),
            videoCount: String(stats.videoCount ?? '0'),
            channelUrl: `https://www.youtube.com/channel/${s.channelId}`,
          })

          if (results.length >= maxResults) break
        }

        totalProcessed += channelIds.length
        if (results.length >= maxResults) break

        pageToken = data.nextPageToken as string | undefined
        if (!pageToken) break
        if (totalProcessed >= maxResults * 5) break
      }

      return NextResponse.json({ mode: 'channel', query, results, usage: { units: tracker.units, calls: tracker.calls } })

    } else {
      return NextResponse.json({ error: '잘못된 모드입니다.' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
