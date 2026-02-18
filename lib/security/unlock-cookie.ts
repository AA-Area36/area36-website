import { getCloudflareContext } from "@opennextjs/cloudflare"

type UnlockCookiePayload = {
  v: 1
  ids: string[]
  iat: number
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlEncodeString(input: string): string {
  return base64UrlEncode(textEncoder.encode(input))
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function getUnlockCookieSecret(): Promise<string | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return env.UNLOCK_COOKIE_SECRET || env.AUTH_SECRET || env.NEXTAUTH_SECRET || null
  } catch {
    // Not in Cloudflare environment
  }

  return (
    process.env.UNLOCK_COOKIE_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    null
  )
}

async function hmacSign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value))
  return base64UrlEncode(new Uint8Array(signature))
}

export async function signUnlockCookie(ids: string[]): Promise<string | null> {
  const secret = await getUnlockCookieSecret()
  if (!secret) return null

  const payload: UnlockCookiePayload = {
    v: 1,
    ids,
    iat: Date.now(),
  }

  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload))
  const signature = await hmacSign(payloadB64, secret)
  return `${payloadB64}.${signature}`
}

// ── Short-lived single-file unlock tokens ──────────────────────────────
// Used as a query parameter (`?unlock=<token>`) to grant immediate access
// to a file right after the password is verified. This avoids the race
// between the server action setting a cookie and the next fetch including
// it. Tokens are intentionally longer-lived to reduce re-prompts.
//
// v2: signed with global unlock/auth secret
// v3: fallback signed with file-specific secret (stored password hash)
type UnlockTokenPayload = { v: 2 | 3; id: string; iat: number }

export const FILE_UNLOCK_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Create a signed, short-lived token granting access to a single file.
 * Falls back to file-scoped signing if the global unlock secret is not
 * configured in the current runtime.
 */
export async function signFileUnlockToken(
  fileId: string,
  fileScopedSecret?: string | null
): Promise<string | null> {
  const globalSecret = await getUnlockCookieSecret()
  const secret = globalSecret || fileScopedSecret || null
  if (!secret) return null

  const payload: UnlockTokenPayload = {
    v: globalSecret ? 2 : 3,
    id: fileId,
    iat: Date.now(),
  }
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload))
  const signature = await hmacSign(payloadB64, secret)
  return `${payloadB64}.${signature}`
}

/**
 * Verify a single-file unlock token and return the file ID it grants
 * access to, or `null` if invalid / expired.
 */
export async function verifyFileUnlockToken(
  token: string | null | undefined,
  fileScopedSecret?: string | null
): Promise<string | null> {
  if (!token) return null

  const parts = token.split(".")
  if (parts.length !== 2) return null

  const [payloadB64, signature] = parts
  let payload: UnlockTokenPayload

  try {
    const payloadJson = textDecoder.decode(base64UrlDecode(payloadB64))
    payload = JSON.parse(payloadJson) as UnlockTokenPayload
  } catch {
    return null
  }

  if (!payload || (payload.v !== 2 && payload.v !== 3) || !payload.id) {
    return null
  }

  const secret =
    payload.v === 2
      ? await getUnlockCookieSecret()
      : fileScopedSecret || null
  if (!secret) return null

  const expectedSignature = await hmacSign(payloadB64, secret)
  if (!timingSafeEqual(signature, expectedSignature)) return null
  if (Date.now() - payload.iat > FILE_UNLOCK_TOKEN_MAX_AGE_MS) return null

  return payload.id
}

export async function verifyUnlockCookie(
  value: string | undefined
): Promise<UnlockCookiePayload | null> {
  if (!value) return null

  const secret = await getUnlockCookieSecret()
  if (!secret) return null

  const parts = value.split(".")
  if (parts.length !== 2) return null

  const [payloadB64, signature] = parts
  const expectedSignature = await hmacSign(payloadB64, secret)
  if (!timingSafeEqual(signature, expectedSignature)) {
    return null
  }

  try {
    const payloadJson = textDecoder.decode(base64UrlDecode(payloadB64))
    const payload = JSON.parse(payloadJson) as UnlockCookiePayload
    if (!payload || payload.v !== 1 || !Array.isArray(payload.ids)) {
      return null
    }
    return payload
  } catch {
    return null
  }
}
