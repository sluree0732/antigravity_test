import { auth } from '@/lib/auth'
import { createComment, getCommentsByPostId } from '@/lib/comments'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const comments = await getCommentsByPostId(id)
    return NextResponse.json(comments)
  } catch (error) {
    console.error('GET /api/posts/[id]/comments error:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.name) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const content = String(body.content ?? '').trim()
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  try {
    const comment = await createComment({
      postId: id,
      content,
      authorEmail: session.user.email ?? session.user.id ?? '',
      authorName: session.user.name,
    })
    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('POST /api/posts/[id]/comments error:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
