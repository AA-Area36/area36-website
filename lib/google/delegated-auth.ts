import { getGoogleServiceAccountCredentials } from "@/lib/google/sheets"

type TokenCache = { accessToken: string; expiresAt: number }

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const CACHE_NAME = "google-delegated-auth"
const memoryCache = new Map<string, TokenCache>()

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, "\n")
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "")
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer
}

function base64UrlEncode(data: ArrayBuffer | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function cacheKey(scopes: string[], subject?: string): Promise<string> {
  const raw = `${subject ?? "service-account"}|${[...scopes].sort().join(" ")}`
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function clearDelegatedGoogleToken(scopes: string[], subject: string): Promise<void> {
  const key = await cacheKey(scopes, subject)
  memoryCache.delete(key)
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.delete(`https://cache.internal/google-delegated/${key}`)
  } catch {
    // Cache API is unavailable in some local runtimes.
  }
}

export async function clearGoogleServiceAccountToken(scopes: string[]): Promise<void> {
  const key = await cacheKey(scopes)
  memoryCache.delete(key)
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.delete(`https://cache.internal/google-delegated/${key}`)
  } catch {
    // Cache API is unavailable in some local runtimes.
  }
}

async function getGoogleAccessToken(scopes: string[], subject?: string): Promise<string> {
  const key = await cacheKey(scopes, subject)
  const cached = memoryCache.get(key)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.accessToken

  try {
    const cache = await caches.open(CACHE_NAME)
    const response = await cache.match(`https://cache.internal/google-delegated/${key}`)
    if (response) {
      const stored = (await response.json()) as TokenCache
      if (stored.expiresAt > Date.now() + 5 * 60 * 1000) {
        memoryCache.set(key, stored)
        return stored.accessToken
      }
    }
  } catch {
    // Cache API is unavailable in some local runtimes.
  }

  const credentials = await getGoogleServiceAccountCredentials()
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT", kid: credentials.privateKeyId }
  const payload = {
    iss: credentials.clientEmail,
    ...(subject ? { sub: subject } : {}),
    scope: [...scopes].sort().join(" "),
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(credentials.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signatureInput),
  )
  const jwt = `${signatureInput}.${base64UrlEncode(signature)}`
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(8_000),
  })
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get delegated Google token: ${tokenResponse.status}`)
  }
  const token = (await tokenResponse.json()) as { access_token: string; expires_in: number }
  if (!token.access_token || !Number.isFinite(token.expires_in) || token.expires_in <= 0) {
    throw new Error("Google returned an invalid service account token")
  }
  const stored = { accessToken: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 }
  memoryCache.set(key, stored)

  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(
      `https://cache.internal/google-delegated/${key}`,
      new Response(JSON.stringify(stored), {
        headers: { "Cache-Control": `public, max-age=${Math.max(token.expires_in - 300, 60)}` },
      }),
    )
  } catch {
    // Cache API is unavailable in some local runtimes.
  }

  return stored.accessToken
}

export async function getDelegatedGoogleAccessToken(scopes: string[], subject: string): Promise<string> {
  return getGoogleAccessToken(scopes, subject)
}

export async function getGoogleServiceAccountAccessToken(scopes: string[]): Promise<string> {
  return getGoogleAccessToken(scopes)
}
