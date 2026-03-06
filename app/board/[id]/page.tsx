'use client'

import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { Post } from '@/lib/posts'
import type { Comment } from '@/lib/comments'
import Link from 'next/link'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        fetch(`/api/posts/${id}`),
        fetch(`/api/posts/${id}/comments`),
      ])
      if (postRes.status === 404) {
        router.push('/board')
        return
      }
      const [postData, commentsData] = await Promise.all([
        postRes.json(),
        commentsRes.json(),
      ])
      setPost(postData)
      setComments(commentsData)
    } catch (error) {
      console.error('Failed to fetch post:', error)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleDelete() {
    if (!confirm('게시글을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/board')
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      })
      if (res.ok) {
        setCommentText('')
        const newComment = await res.json()
        setComments((prev) => [...prev, newComment])
      }
    } catch (error) {
      console.error('Failed to create comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCommentDelete(cid: string) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/posts/${id}/comments/${cid}`, { method: 'DELETE' })
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== cid))
  }

  if (loading) return <div className="text-center py-20 text-slate-400">로딩 중...</div>
  if (!post) return null

  const isAuthor = session?.user?.email === post.authorEmail

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/board" className="text-sm text-violet-400 hover:text-violet-600 transition-colors">
          ← 게시판으로
        </Link>
      </div>

      <article className="bg-white border border-violet-100 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">{post.title}</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{post.authorName}</span>
              <span>·</span>
              <span>{new Date(post.createdAt).toLocaleString('ko-KR')}</span>
            </div>
            {isAuthor && (
              <div className="flex gap-2">
                <Link
                  href={`/board/${post.id}/edit`}
                  className="text-xs text-violet-400 hover:text-violet-600 transition-colors"
                >
                  수정
                </Link>
                <button
                  onClick={handleDelete}
                  className="text-xs text-rose-400 hover:text-rose-600 transition-colors"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
        <hr className="border-violet-50" />
        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </article>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-violet-700">댓글 {comments.length}</h2>

        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="bg-white border border-violet-100 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-violet-600">{c.authorName}</span>
                  <span>{new Date(c.createdAt).toLocaleString('ko-KR')}</span>
                </div>
                {session?.user?.email === c.authorEmail && (
                  <button
                    onClick={() => handleCommentDelete(c.id)}
                    className="text-xs text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-600">{c.content}</p>
            </li>
          ))}
        </ul>

        {session ? (
          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="flex-1 border border-violet-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors disabled:opacity-50"
            >
              {submitting ? '...' : '댓글 달기'}
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-400 text-center py-3">
            댓글을 작성하려면{' '}
            <Link href="/login" className="text-violet-500 underline">
              로그인
            </Link>
            이 필요합니다.
          </p>
        )}
      </section>
    </div>
  )
}
