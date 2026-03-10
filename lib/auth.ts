import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { upsertUser } from './users'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
  pages: {
    signIn: '/login',
  },
})
