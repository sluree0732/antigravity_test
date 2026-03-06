import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PROTECTED_PATHS = ['/mypage', '/board/create']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected =
    PROTECTED_PATHS.some((p) => pathname.startsWith(p)) ||
    /^\/board\/[^/]+\/edit$/.test(pathname)

  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/mypage', '/board/create', '/board/:id/edit'],
}
