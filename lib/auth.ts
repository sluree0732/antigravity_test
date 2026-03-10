import NextAuth from 'next-auth'
import type { OAuthConfig, OAuthUserConfig } from 'next-auth/providers'
import { upsertUser } from './users'

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

function NaverProvider(options: OAuthUserConfig<NaverProfile>): OAuthConfig<NaverProfile> {
  return {
    id: 'naver',
    name: '네이버',
    type: 'oauth',
    authorization: 'https://nid.naver.com/oauth2.0/authorize',
    token: 'https://nid.naver.com/oauth2.0/token',
    userinfo: 'https://openapi.naver.com/v1/nid/me',
    profile(profile) {
      return {
        id: profile.response.id,
        name: profile.response.name ?? profile.response.nickname ?? '',
        email: profile.response.email ?? '',
        image: profile.response.profile_image ?? null,
      }
    },
    ...options,
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID_LOGIN!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email || !user.name) return false
      try {
        await upsertUser({
          email: user.email,
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
