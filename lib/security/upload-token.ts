import { getCloudflareContext } from "@opennextjs/cloudflare"

type UploadTokenPayload = {
  v: 1
  eventId: string
  exp: number
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

async function getUploadTokenSecret(): Promise<string | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return (
      env.UPLOAD_TOKEN_SECRET ||
      env.UNLOCK_COOKIE_SECRET ||
      env.AUTH_SECRET ||
      env.NEXTAUTH_SECRET ||
      null
    )
  } catch {
    // Not in Cloudflare environment
  }

  return (
    process.env.UPLOAD_TOKEN_SECRET ||
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

export async function createEventUploadToken(
  eventId: string,
  ttlMs = 10 * 60 * 1000
): Promise<string | null> {
  const secret = await getUploadTokenSecret()
  if (!secret) return null

  const payload: UploadTokenPayload = {
    v: 1,
    eventId,
    exp: Date.now() + ttlMs,
  }

  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload))
  const signature = await hmacSign(payloadB64, secret)
  return `${payloadB64}.${signature}`
}

export async function verifyEventUploadToken(
  token: string,
  eventId: string
): Promise<boolean> {
  const secret = await getUploadTokenSecret()
  if (!secret) return false

  const parts = token.split(".")
  if (parts.length !== 2) return false

  const [payloadB64, signature] = parts
  const expectedSignature = await hmacSign(payloadB64, secret)
  if (!timingSafeEqual(signature, expectedSignature)) return false

  try {
    const payloadJson = textDecoder.decode(base64UrlDecode(payloadB64))
    const payload = JSON.parse(payloadJson) as UploadTokenPayload
    if (!payload || payload.v !== 1) return false
    if (payload.eventId !== eventId) return false
    if (payload.exp < Date.now()) return false
    return true
  } catch {
    return false
  }
}
