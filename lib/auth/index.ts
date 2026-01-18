import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { D1Adapter } from "./d1-adapter"

const ALLOWED_DOMAIN = "@area36.org"

export const { handlers, signIn, signOut, auth } = NextAuth(async () => {
  const { env } = await getCloudflareContext({ async: true })

  return {
    adapter: D1Adapter(env.DB),
    providers: [
      Google({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
      }),
    ],
    pages: {
      signIn: "/admin/login",
      error: "/admin/login",
    },
    callbacks: {
      async signIn({ profile }) {
        // Only allow @area36.org emails
        if (!profile?.email?.endsWith(ALLOWED_DOMAIN)) {
          return false
        }
        return true
      },
      async session({ session, user }) {
        if (session.user) {
          session.user.id = user.id
        }
        return session
      },
    },
    trustHost: true,
  }
})
