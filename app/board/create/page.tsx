'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CreatePostPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해 주세요.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '글 작성에 실패했습니다.')
      }

      const post = await res.json()
      router.push(`/board/${post.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '글 작성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-violet-800 mb-6">글쓰기</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full border border-violet-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
            maxLength={200}
          />
        </div>
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요..."
            rows={12}
            className="w-full border border-violet-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 resize-none"
          />
        </div>

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
            {submitting ? '작성 중...' : '작성 완료'}
          </button>
        </div>
      </form>
    </div>
  )
}
