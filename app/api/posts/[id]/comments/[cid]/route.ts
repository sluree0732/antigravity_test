import { auth } from '@/lib/auth'
import { deleteComment } from '@/lib/comments'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { cid } = await params
  try {
    const deleted = await deleteComment(cid, session.user.email ?? session.user.id ?? '')
    if (!deleted) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/posts/[id]/comments/[cid] error:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
