import { createLocalUser } from '@/lib/users'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const userId = String(body.userId ?? '').trim()
  const name = String(body.name ?? '').trim()
  const password = String(body.password ?? '')

  if (!userId || !name || !password) {
    return NextResponse.json({ error: '아이디, 닉네임, 비밀번호를 모두 입력하세요.' }, { status: 400 })
  }
  if (userId.length < 4) {
    return NextResponse.json({ error: '아이디는 4자 이상이어야 합니다.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })
  }

  try {
    await createLocalUser(userId, name, password)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : '회원가입 실패'
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
