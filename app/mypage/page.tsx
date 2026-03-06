'use client'

import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Post } from '@/lib/posts'

interface MeData {
  user: { email: string; name: string; image: string; createdAt: string } | null
  posts: Post[]
}

export default function MyPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<MeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-20 text-slate-400">로딩 중...</div>
  }

  return (
    <div className="space-y-8">
      <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-violet-700 mb-5">프로필</h2>
        <div className="flex items-center gap-5">
          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? ''}
              width={64}
              height={64}
              className="rounded-full ring-4 ring-violet-100"
            />
          )}
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-800 text-lg">{session?.user?.name}</p>
            <p className="text-sm text-slate-600">
              <span className="text-violet-400 mr-2 text-xs font-medium uppercase tracking-wide">아이디</span>
              {session?.user?.email}
            </p>
            {data?.user?.createdAt && (
              <p className="text-sm text-slate-600">
                <span className="text-violet-400 mr-2 text-xs font-medium uppercase tracking-wide">가입일</span>
                {new Date(data.user.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-violet-700">
            내가 쓴 글 <span className="text-violet-400 font-normal text-base">({data?.posts?.length ?? 0})</span>
          </h2>
          <Link
            href="/board/create"
            className="text-sm bg-violet-500 text-white px-4 py-1.5 rounded-full hover:bg-violet-600 transition-colors shadow-sm"
          >
            글쓰기
          </Link>
        </div>

        {!data?.posts?.length ? (
          <p className="text-slate-400 text-sm text-center py-8">아직 작성한 글이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {data.posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/board/${post.id}`}
                  className="flex items-center justify-between bg-white border border-violet-100 rounded-xl px-4 py-3 hover:border-violet-300 hover:shadow-sm transition-all"
                >
                  <span className="text-sm text-slate-700 truncate">{post.title}</span>
                  <span className="text-xs text-slate-400 ml-4 shrink-0">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
