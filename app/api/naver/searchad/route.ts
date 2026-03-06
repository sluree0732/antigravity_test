import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function generateSignature(timestamp: number, method: string, uri: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${uri}`
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64')
}

export async function POST(req: NextRequest) {
  const { keywords } = await req.json()

  const apiKey = process.env.NAVER_SEARCHAD_API_KEY
  const secretKey = process.env.NAVER_SEARCHAD_SECRET_KEY
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID

  if (!apiKey || !secretKey || !customerId) {
    return NextResponse.json({ error: 'SearchAD API 인증 정보가 없습니다.' }, { status: 500 })
  }

  const timestamp = Date.now()
  const method = 'GET'
  const uri = '/keywordstool'
  const signature = generateSignature(timestamp, method, uri, secretKey)

  const params = new URLSearchParams({
    hintKeywords: (keywords as string[]).join(','),
    showDetail: '1',
  })

  try {
    const res = await fetch(`https://api.naver.com/keywordstool?${params}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'X-Customer': customerId,
        'X-Timestamp': String(timestamp),
        'X-Signature': signature,
      },
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `SearchAD API 오류: ${err}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[naver/searchad]', error)
    return NextResponse.json({ error: '검색량 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
