'use client'

import Pagination from '@/components/Pagination'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Post } from '@/lib/posts'

interface PostListResult {
  posts: Post[]
  total: number
  page: number
  limit: number
}

export default function BoardPage() {
  const { data: session } = useSession()
  const [result, setResult] = useState<PostListResult>({ posts: [], total: 0, page: 1, limit: 10 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async (p: number, q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '10', search: q })
      const res = await fetch(`/api/posts?${params}`)
      const data = await res.json()
      setResult(data)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts(page, query)
  }, [page, query, fetchPosts])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setQuery(search)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-violet-800">게시판</h1>
        {session && (
          <Link
            href="/board/create"
            className="text-sm bg-violet-500 text-white px-4 py-1.5 rounded-full hover:bg-violet-600 transition-colors shadow-sm"
          >
            글쓰기
          </Link>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목 또는 내용 검색..."
          className="flex-1 border border-violet-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-violet-100 border border-violet-200 text-violet-600 rounded-xl hover:bg-violet-200 transition-colors"
        >
          검색
        </button>
      </form>

      {loading ? (
        <div className="text-center py-16 text-slate-400">로딩 중...</div>
      ) : result.posts.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          {query ? `"${query}"에 대한 검색 결과가 없습니다.` : '아직 게시글이 없습니다.'}
        </div>
      ) : (
        <>
          <div className="text-xs text-slate-400">총 {result.total}개의 글</div>
          <ul className="space-y-2">
            {result.posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/board/${post.id}`}
                  className="flex items-center justify-between bg-white border border-violet-100 rounded-xl px-4 py-3.5 hover:border-violet-300 hover:shadow-sm transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{post.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{post.content.slice(0, 60)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 ml-4 shrink-0">
                    <span>{post.authorName}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={result.page}
            total={result.total}
            limit={result.limit}
            onPageChange={(p) => setPage(p)}
          />
        </>
      )}
    </div>
  )
}
