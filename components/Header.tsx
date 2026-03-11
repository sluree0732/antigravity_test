'use client'

import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  function navClass(href: string) {
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
    return isActive
      ? 'font-semibold text-violet-700 transition-colors text-sm'
      : 'text-slate-500 hover:text-violet-600 transition-colors text-sm'
  }

  return (
    <header className="border-b border-violet-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <nav className="flex items-center gap-6">
          <Link href="/" className={navClass('/')}>
            홈
          </Link>
          <Link href="/board" className={navClass('/board')}>
            게시판
          </Link>
          {session?.user && (
            <Link href="/mypage" className={navClass('/mypage')}>
              마이페이지
            </Link>
          )}
          <Link href="/naver" className={navClass('/naver')}>
            네이버API
          </Link>
          <Link href="/youtube" className={navClass('/youtube')}>
            유튜브API
          </Link>
          <Link href="/instagram" className={navClass('/instagram')}>
            인스타그램API
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {status === 'loading' ? (
            <span className="text-sm text-slate-400">로딩 중...</span>
          ) : session?.user ? (
            <>
              <Link href="/mypage" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? ''}
                    width={28}
                    height={28}
                    className="rounded-full ring-2 ring-violet-200"
                  />
                )}
                <span className="text-sm text-slate-600">{session.user.name}</span>
              </Link>
              <button
                onClick={() => signOut()}
                className="text-sm text-slate-400 hover:text-rose-400 transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="text-sm text-slate-500 hover:text-violet-600 transition-colors"
              >
                회원가입
              </Link>
              <Link
                href="/login"
                className="text-sm bg-violet-500 text-white px-3 py-1.5 rounded-full hover:bg-violet-600 transition-colors shadow-sm"
              >
                로그인
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
