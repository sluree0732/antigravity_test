import { auth } from '@/lib/auth'
import { getPostsByAuthor } from '@/lib/posts'
import { findUserByEmail } from '@/lib/users'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userKey = session.user.email ?? session.user.id ?? ''

  try {
    const [user, posts] = await Promise.all([
      findUserByEmail(userKey),
      getPostsByAuthor(userKey),
    ])
    return NextResponse.json({ user, posts })
  } catch (error) {
    console.error('GET /api/me error:', error)
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
  }
}
