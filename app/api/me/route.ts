import { auth } from '@/lib/auth'
import { getPostsByAuthor } from '@/lib/posts'
import { findUserByEmail } from '@/lib/users'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [user, posts] = await Promise.all([
      findUserByEmail(session.user.email),
      getPostsByAuthor(session.user.email),
    ])
    return NextResponse.json({ user, posts })
  } catch (error) {
    console.error('GET /api/me error:', error)
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
  }
}
