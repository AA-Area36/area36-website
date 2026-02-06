import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { D1Adapter } from "./d1-adapter"
import { isGroupMember, type AdminDirectoryCredentials } from "@/lib/google/admin-directory"

const ALLOWED_DOMAIN = "@area36.org"
const ADMIN_GROUP_EMAIL = "area36-internal@area36.org"
const ALLOWED_ADMIN_EMAILS = new Set([
  "webmaster@area36.org",
  "alttechnology@area36.org",
])
let adminConfigWarningLogged = false

function normalizeEmail(email?: string | null): string {
  return email?.trim().toLowerCase() ?? ""
}

function isAllowedAdminEmail(email?: string | null): boolean {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.endsWith(ALLOWED_DOMAIN)) {
    return false
  }
  return ALLOWED_ADMIN_EMAILS.has(normalized)
}

function warnAdminConfigOnce(message: string) {
  if (adminConfigWarningLogged) return
  adminConfigWarningLogged = true
  console.warn(message)
}

function getAdminDirectoryCredentials(env: CloudflareEnv): AdminDirectoryCredentials | null {
  if (!env.GDRIVE_SERVICE_ACCOUNT_EMAIL || !env.GDRIVE_PRIVATE_KEY || !env.GDRIVE_PRIVATE_KEY_ID) {
    warnAdminConfigOnce("Admin directory check not configured: missing service account credentials.")
    return null
  }

  const subject = env.GOOGLE_ADMIN_IMPERSONATE_EMAIL || env.GMAIL_SENDER_EMAIL
  if (!subject) {
    warnAdminConfigOnce("Admin directory check not configured: missing impersonation email.")
    return null
  }

  return {
    clientEmail: env.GDRIVE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GDRIVE_PRIVATE_KEY,
    privateKeyId: env.GDRIVE_PRIVATE_KEY_ID,
    subject,
  }
}

async function isAllowedAdminUser(email: string | null | undefined, env: CloudflareEnv): Promise<boolean> {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.endsWith(ALLOWED_DOMAIN)) {
    return false
  }
  if (ALLOWED_ADMIN_EMAILS.has(normalized)) {
    return true
  }

  const credentials = getAdminDirectoryCredentials(env)
  if (!credentials) {
    return false
  }

  try {
    return await isGroupMember(credentials, ADMIN_GROUP_EMAIL, normalized)
  } catch (error) {
    console.error("Failed to verify admin group membership:", error)
    return false
  }
}

const nextAuth = NextAuth(async () => {
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
        // Only allow approved Area 36 admin emails or group members
        if (!(await isAllowedAdminUser(profile?.email, env))) {
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

const baseAuth = nextAuth.auth

export async function auth(...args: Parameters<typeof baseAuth>) {
  const session = await baseAuth(...args)
  if (!session?.user?.email) {
    return null
  }
  const { env } = await getCloudflareContext({ async: true })
  if (!(await isAllowedAdminUser(session.user.email, env))) {
    return null
  }
  return session
}

export const { handlers, signIn, signOut } = nextAuth
