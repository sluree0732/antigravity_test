'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ userId: '', name: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.userId, name: form.name, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '회원가입 실패')
        return
      }
      router.push('/login?signup=success')
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-violet-800 mb-2">회원가입</h1>
        <p className="text-slate-500 text-sm">아이디와 비밀번호를 설정하세요.</p>
      </div>

      <div className="bg-white border border-violet-100 rounded-2xl p-8 w-full max-w-sm shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">아이디</label>
            <input
              type="text"
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              placeholder="4자 이상"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">닉네임</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="표시될 이름"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="6자 이상"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">비밀번호 확인</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="비밀번호 재입력"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-400"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-4">
          이미 계정이 있으신가요?{' '}
          <a href="/login" className="text-violet-600 hover:underline">로그인</a>
        </p>
      </div>
    </div>
  )
}
