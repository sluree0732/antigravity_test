import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { upsertUser, verifyLocalUser } from './users'

interface NaverProfile {
  resultcode: string
  message: string
  response: {
    id: string
    nickname?: string
    name?: string
    email?: string
    profile_image?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    {
      id: 'naver',
      name: '네이버',
      type: 'oauth',
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      authorization: {
        url: 'https://nid.naver.com/oauth2.0/authorize',
        params: { auth_type: 'reauthenticate' },
      },
      token: 'https://nid.naver.com/oauth2.0/token',
      userinfo: 'https://openapi.naver.com/v1/nid/me',
      profile(profile: NaverProfile) {
        return {
          id: profile.response.id,
          name: profile.response.name ?? profile.response.nickname ?? '',
          email: profile.response.email ?? '',
          image: profile.response.profile_image ?? null,
        }
      },
    },
    Credentials({
      name: '아이디/비밀번호',
      credentials: {
        userId: { label: '아이디', type: 'text' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        const userId = credentials?.userId as string
        const password = credentials?.password as string
        if (!userId || !password) return null

        const user = await verifyLocalUser(userId, password)
        if (!user) return null

        return {
          id: user.userId,
          name: user.name,
          email: `${user.userId}@local`,
          image: null,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true
      if (!user.name) return false
      try {
        await upsertUser({
          email: user.email ?? '',
          name: user.name,
          image: user.image ?? '',
        })
      } catch (error) {
        console.error('[auth] Failed to save user to sheets:', error)
      }
      return true
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
        },
      }
    },
  },
  pages: {
    signIn: '/login',
  },
})
