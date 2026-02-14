import NextAuth from "next-auth"
import type { Session } from "next-auth"
import Google from "next-auth/providers/google"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { D1Adapter } from "./d1-adapter"
import { isGroupMember, type AdminDirectoryCredentials } from "@/lib/google/admin-directory"
import { createLocalAdminBypassSession, isLocalAdminBypassEnabled } from "./dev-bypass"

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

async function isAreaAdminUser(email: string | null | undefined, env: CloudflareEnv): Promise<boolean> {
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

async function getDistrictAdminForEmail(email: string, env: CloudflareEnv): Promise<number[]> {
  const normalized = normalizeEmail(email)
  if (!normalized) return []
  if (!env.DB) return []

  try {
    const res = await env.DB
      .prepare("SELECT district_number AS districtNumber FROM district_admins WHERE lower(email) = ?")
      .bind(normalized)
      .all<{ districtNumber: number }>()
    return (res?.results ?? [])
      .map((r) => Number((r as any).districtNumber))
      .filter((n) => Number.isFinite(n))
  } catch {
    // Local dev / fresh environments may not have migrations applied yet.
    return []
  }
}

async function isAllowedSignInEmail(email: string | null | undefined, env: CloudflareEnv): Promise<boolean> {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  if (await isAreaAdminUser(normalized, env)) return true
  const districts = await getDistrictAdminForEmail(normalized, env)
  return districts.length > 0
}

function cookieDomainForProd(): string | undefined {
  return process.env.NODE_ENV === "production" ? ".area36.org" : undefined
}

function isAllowedRedirectHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === "area36.org" || h === "www.area36.org") return true
  const m = h.match(/^d(\d{1,2})\.area36\.org$/)
  if (!m) return false
  const n = Number(m[1])
  return Number.isFinite(n) && n >= 1 && n <= 27 && n !== 10
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
        // Allow Area admins OR explicit district-admin allowlist emails (any Google workspace).
        return await isAllowedSignInEmail(profile?.email, env)
      },
      async session({ session, user }) {
        if (session.user) {
          session.user.id = user.id
        }
        return session
      },
      async redirect({ url, baseUrl }) {
        // Allow redirects only within Area 36 hostnames to avoid open redirects.
        try {
          if (url.startsWith("/")) return `${baseUrl}${url}`
          const parsed = new URL(url)
          if (!isAllowedRedirectHost(parsed.hostname)) return baseUrl
          if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return baseUrl
          return parsed.toString()
        } catch {
          return baseUrl
        }
      },
    },
    cookies: {
      sessionToken: { options: { domain: cookieDomainForProd() } },
      callbackUrl: { options: { domain: cookieDomainForProd() } },
      csrfToken: { options: { domain: cookieDomainForProd() } },
      pkceCodeVerifier: { options: { domain: cookieDomainForProd() } },
      state: { options: { domain: cookieDomainForProd() } },
      nonce: { options: { domain: cookieDomainForProd() } },
    },
    trustHost: true,
  }
})

export type A36Session = Session & {
  user: NonNullable<Session["user"]> & { isAreaAdmin: boolean; districtAdminFor: number[] }
}

function toA36Session(session: Session, isAreaAdmin: boolean, districtAdminFor: number[]): A36Session {
  const user = session.user ?? {}
  return {
    ...session,
    user: {
      ...user,
      isAreaAdmin,
      districtAdminFor,
    },
  } as A36Session
}

/**
 * Returns the current session for any allowed user (Area admin OR allowlisted district admin).
 * Returns null if unauthenticated or not allowlisted.
 */
export async function getSession(): Promise<A36Session | null> {
  if (await isLocalAdminBypassEnabled()) {
    return createLocalAdminBypassSession()
  }

  const session = await nextAuth.auth()
  if (!session?.user?.email) return null
  const { env } = await getCloudflareContext({ async: true })

  const email = normalizeEmail(session.user.email)
  const [areaAdmin, districtAdminFor] = await Promise.all([
    isAreaAdminUser(email, env),
    getDistrictAdminForEmail(email, env),
  ])

  if (!areaAdmin && districtAdminFor.length === 0) return null
  return toA36Session(session, areaAdmin, districtAdminFor)
}

/**
 * Backward-compatible helper: returns a session only for Area admins.
 * Use getSession() for district admins.
 */
export async function auth(): Promise<A36Session | null> {
  const session = await getSession()
  if (!session) return null
  if (!session.user.isAreaAdmin) return null
  return session
}

export const { handlers, signIn, signOut } = nextAuth
