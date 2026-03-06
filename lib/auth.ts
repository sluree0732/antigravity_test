import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { upsertUser } from './users'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: { prompt: 'select_account' },
      },
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
  jwt: {
    encode: async ({ secret, token }) => {
      const { SignJWT } = await import('jose')
      const secretKey = new TextEncoder().encode(String(secret))
      return new SignJWT(token as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secretKey)
    },
    decode: async ({ secret, token }) => {
      if (!token) return null
      const { jwtVerify } = await import('jose')
      const secretKey = new TextEncoder().encode(String(secret))
      const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] })
      return payload
    },
  },
  pages: {
    signIn: '/login',
  },
})
