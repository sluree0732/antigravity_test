'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/')
  }, [session, router])

  if (status === 'loading') {
    return <div className="text-center py-20 text-gray-400">로딩 중...</div>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-violet-800 mb-2">로그인</h1>
        <p className="text-slate-500 text-sm">Google 계정으로 간편하게 시작하세요.</p>
      </div>

      <div className="bg-white border border-violet-100 rounded-2xl p-8 w-full max-w-sm shadow-sm">
        <button
          onClick={() => signIn('naver', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 border border-violet-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-violet-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" fill="#03C75A"/>
          </svg>
          네이버로 로그인
        </button>
      </div>
    </div>
  )
}
