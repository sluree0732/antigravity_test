import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://graph.facebook.com/v23.0'

function getEnv() {
  const igUserId = process.env.IG_USER_ID
  const token = process.env.IG_ACCESS_TOKEN
  if (!igUserId || !token) throw new Error('IG_USER_ID 또는 IG_ACCESS_TOKEN이 설정되지 않았습니다.')
  return { igUserId, token }
}

function bdFields(after: string | null, perPage: number): string {
  let mediaEdge = 'media'
  if (after) mediaEdge += `.after(${after})`
  mediaEdge += `.limit(${perPage})`
  const mediaFields = '{caption,media_type,media_url,permalink,timestamp,children{id,media_type,media_url}}'
  const profileFields = 'username,name,biography,website,followers_count,follows_count,media_count'
  return `business_discovery.username(%s){${profileFields},${mediaEdge}${mediaFields}}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      username: string
      maxMedia?: number
      perPage?: number
    }

    const { username, maxMedia = 100, perPage = 20 } = body

    if (!username?.trim()) {
      return NextResponse.json({ error: '유저네임을 입력하세요.' }, { status: 400 })
    }

    const { igUserId, token } = getEnv()
    const uname = username.trim().replace(/^@/, '')
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    let lastUsage = { call_count: 0, total_time: 0 }

    let after: string | null = null
    let profile: Record<string, string> | null = null
    const mediaItems: Record<string, string>[] = []
    const seenPermalinks = new Set<string>()
    let page = 0
    const maxPages = Math.ceil((maxMedia > 0 ? maxMedia : 100) / perPage) + 2

    while (true) {
      page++
      if (page > maxPages) break

      const fields = bdFields(after, perPage).replace('%s', uname)
      const url = new URL(`${BASE}/${igUserId}`)
      url.searchParams.set('fields', fields)
      url.searchParams.set('access_token', token)

      const res = await fetch(url.toString(), { cache: 'no-store' })
      try {
        const usageHeader = res.headers.get('x-app-usage')
        if (usageHeader) {
          const u = JSON.parse(usageHeader) as { call_count?: number; total_time?: number }
          lastUsage = { call_count: u.call_count ?? lastUsage.call_count, total_time: u.total_time ?? lastUsage.total_time }
        }
      } catch { /* ignore */ }

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`BD API 오류 (${res.status}): ${text.slice(0, 200)}`)
      }

      const data = await res.json() as {
        business_discovery?: Record<string, unknown>
        error?: { message: string; code?: number }
      }

      if (data.error) throw new Error(data.error.message)

      const bd = data.business_discovery
      if (!bd) throw new Error(`'@${uname}' 계정을 찾을 수 없거나 Business 계정이 아닙니다.`)

      // 프로필 (첫 페이지에서만 저장)
      if (!profile) {
        profile = {
          사용자명: String(bd.username ?? ''),
          이름: String(bd.name ?? ''),
          바이오: String(bd.biography ?? ''),
          웹사이트: String(bd.website ?? ''),
          팔로워수: String(bd.followers_count ?? '0'),
          팔로잉수: String(bd.follows_count ?? '0'),
          게시물수: String(bd.media_count ?? '0'),
        }
      }

      const mediaEdge = bd.media as { data?: Record<string, unknown>[]; paging?: { cursors?: { after?: string } } } | undefined
      const items = mediaEdge?.data ?? []

      for (const item of items) {
        const permalink = String(item.permalink ?? '')
        if (!permalink || seenPermalinks.has(permalink)) continue
        seenPermalinks.add(permalink)

        mediaItems.push({
          collectedAt: now,
          permalink,
          mediaType: String(item.media_type ?? ''),
          caption: String(item.caption ?? ''),
          mediaUrl: String(item.media_url ?? ''),
          publishedAt: String(item.timestamp ?? ''),
          childCount: String(
            ((item.children as { data?: unknown[] } | undefined)?.data?.length) ?? 0
          ),
        })

        if (maxMedia > 0 && mediaItems.length >= maxMedia) break
      }

      if (maxMedia > 0 && mediaItems.length >= maxMedia) break

      const newAfter = mediaEdge?.paging?.cursors?.after
      if (!newAfter) break
      after = newAfter
    }

    return NextResponse.json({
      username: uname,
      profile: profile ?? {},
      media: mediaItems,
      usage: lastUsage,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
