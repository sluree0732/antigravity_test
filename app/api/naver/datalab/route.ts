import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { keywords, startDate, endDate, timeUnit, device, gender, ages } = await req.json()

  const clientId = process.env.NAVER_DATALAB_CLIENT_ID
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Naver API 인증 정보가 없습니다.' }, { status: 500 })
  }

  const validKeywords = [...new Set((keywords as string[]).map((k) => k.trim()).filter(Boolean))]
  if (!validKeywords.length) {
    return NextResponse.json({ error: '검색어를 입력하세요.' }, { status: 400 })
  }

  const keywordGroups = validKeywords.map((kw) => ({
    groupName: kw,
    keywords: [kw],
  }))

  const body = {
    startDate,
    endDate,
    timeUnit,
    keywordGroups,
    device: device ?? '',
    gender: gender ?? '',
    ages: ages ?? [],
  }

  try {
    const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Naver API 오류: ${err}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[naver/datalab]', error)
    return NextResponse.json({ error: '데이터 수집 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
