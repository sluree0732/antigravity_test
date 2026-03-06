'use client'

import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Post } from '@/lib/posts'

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const [post, setPost] = useState<Post | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((r) => r.json())
      .then((data: Post) => {
        if (session?.user?.email && data.authorEmail !== session.user.email) {
          router.push(`/board/${id}`)
          return
        }
        setPost(data)
        setTitle(data.title)
        setContent(data.content)
      })
      .catch(() => router.push('/board'))
  }, [id, session, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해 주세요.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '수정에 실패했습니다.')
      }

      router.push(`/board/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!post) return <div className="text-center py-20 text-slate-400">로딩 중...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-violet-800 mb-6">글 수정</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="w-full border border-violet-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
          maxLength={200}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요..."
          rows={12}
          className="w-full border border-violet-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 resize-none"
        />

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-violet-200 text-slate-500 rounded-xl hover:bg-violet-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors disabled:opacity-50 shadow-sm"
          >
            {submitting ? '수정 중...' : '수정 완료'}
          </button>
        </div>
      </form>
    </div>
  )
}
