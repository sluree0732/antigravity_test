import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import SessionProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: '커뮤니티',
  description: '게시판 커뮤니티 사이트',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-violet-50">
        <SessionProvider>
          <Header />
          <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}
