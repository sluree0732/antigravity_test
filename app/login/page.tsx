'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function LoginForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ userId: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) router.push('/')
  }, [session, router])

  const signupSuccess = searchParams.get('signup') === 'success'

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        userId: form.userId,
        password: form.password,
        redirect: false,
      })
      if (result?.error) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      } else {
        router.push('/')
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="text-center py-20 text-gray-400">로딩 중...</div>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-violet-800 mb-2">로그인</h1>
        <p className="text-slate-500 text-sm">계정으로 로그인하세요.</p>
      </div>

      {signupSuccess && (
        <p className="text-green-600 text-sm font-medium">회원가입이 완료됐습니다. 로그인하세요.</p>
      )}

      <div className="bg-white border border-violet-100 rounded-2xl p-8 w-full max-w-sm shadow-sm flex flex-col gap-4">
        {/* 자체 로그인 */}
        <form onSubmit={handleCredentialsLogin} className="flex flex-col gap-3">
          <input
            type="text"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            placeholder="아이디"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-400"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="비밀번호"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-400"
            required
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          계정이 없으신가요?{' '}
          <a href="/signup" className="text-violet-600 hover:underline">회원가입</a>
        </p>

        {/* 구분선 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs text-slate-400">또는</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {/* 네이버 로그인 */}
        <button
          onClick={() => signIn('naver', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">로딩 중...</div>}>
      <LoginForm />
    </Suspense>
  )
}
