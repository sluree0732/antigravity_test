import Link from 'next/link'

async function getRecentPosts() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/posts?page=1&limit=5`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.posts ?? []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const posts = await getRecentPosts()

  return (
    <div className="space-y-10">
      <section className="text-center py-14 px-4 rounded-2xl bg-gradient-to-br from-violet-100 via-purple-50 to-pink-50">
        <h1 className="text-3xl font-bold text-violet-800 mb-3">커뮤니티에 오신 것을 환영합니다</h1>
        <p className="text-slate-500 mb-7">자유롭게 글을 작성하고 소통하세요.</p>
        <Link
          href="/board"
          className="inline-block bg-violet-500 text-white px-6 py-2.5 rounded-full hover:bg-violet-600 transition-colors text-sm font-medium shadow-sm"
        >
          게시판 바로가기
        </Link>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-violet-800">최근 게시글</h2>
          <Link href="/board" className="text-sm text-violet-400 hover:text-violet-600 transition-colors">
            전체 보기 →
          </Link>
        </div>

        {posts.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">아직 게시글이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {posts.map((post: { id: string; title: string; authorName: string; createdAt: string }) => (
              <li key={post.id}>
                <Link
                  href={`/board/${post.id}`}
                  className="flex items-center justify-between bg-white border border-violet-100 rounded-xl px-4 py-3 hover:border-violet-300 hover:shadow-sm transition-all"
                >
                  <span className="text-sm text-slate-700 truncate">{post.title}</span>
                  <div className="flex items-center gap-3 text-xs text-slate-400 ml-4 shrink-0">
                    <span>{post.authorName}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
