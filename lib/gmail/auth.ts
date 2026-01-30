// Gmail service account JWT authentication with domain-wide delegation
// Uses Web Crypto API for Cloudflare Workers compatibility

import type { GmailCredentials } from "./types"

// In-memory token cache (fallback for local dev and same-isolate reuse)
let memoryTokenCache: {
  accessToken: string
  expiresAt: number
  forUser: string
} | null = null

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
const TOKEN_CACHE_KEY = "https://cache.internal/gmail-token"

/**
 * Get token from Cloudflare Cache API
 */
async function getTokenFromCache(senderEmail: string): Promise<{ accessToken: string; expiresAt: number; forUser: string } | null> {
  // Check memory cache first (for same-isolate reuse)
  if (
    memoryTokenCache &&
    memoryTokenCache.expiresAt > Date.now() + 5 * 60 * 1000 &&
    memoryTokenCache.forUser === senderEmail
  ) {
    return memoryTokenCache
  }

  // Try Cloudflare Cache API
  try {
    const cache = await caches.open("gmail-auth")
    const response = await cache.match(TOKEN_CACHE_KEY)
    if (response) {
      const data = await response.json() as { accessToken: string; expiresAt: number; forUser: string }
      // Verify token is still valid (with 5 minute buffer) and for same user
      if (data.expiresAt > Date.now() + 5 * 60 * 1000 && data.forUser === senderEmail) {
        // Also store in memory for faster subsequent access
        memoryTokenCache = data
        return data
      }
    }
  } catch {
    // Cache API not available (local dev)
  }

  return null
}

/**
 * Store token in Cloudflare Cache API
 */
async function setTokenInCache(accessToken: string, expiresAt: number, forUser: string): Promise<void> {
  const data = { accessToken, expiresAt, forUser }

  // Store in memory cache
  memoryTokenCache = data

  // Store in Cloudflare Cache API
  try {
    const cache = await caches.open("gmail-auth")
    const ttl = Math.floor((expiresAt - Date.now()) / 1000)
    const response = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${Math.max(ttl - 300, 60)}`, // Cache for TTL minus 5 minute buffer
      },
    })
    await cache.put(TOKEN_CACHE_KEY, response)
  } catch {
    // Cache API not available (local dev)
  }
}

/**
 * Convert PEM-encoded private key to ArrayBuffer for Web Crypto API
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Handle escaped newlines from environment variables
  const normalizedPem = pem.replace(/\\n/g, "\n")

  // Remove PEM headers and whitespace
  const base64 = normalizedPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "")

  // Decode base64
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Base64URL encode (JWT-safe encoding)
 */
function base64UrlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data)
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data)
  } else {
    bytes = data
  }

  // Use btoa for binary to base64
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Create a signed JWT for Google service account authentication
 * Uses domain-wide delegation to impersonate the sender email
 */
async function createJWT(credentials: GmailCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  // JWT Header
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: credentials.privateKeyId,
  }

  // JWT Payload (Claims)
  // The 'sub' claim enables domain-wide delegation - impersonating the sender email
  const payload = {
    iss: credentials.clientEmail,
    sub: credentials.senderEmail, // Impersonate this user
    scope: SCOPES.join(" "),
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: expiry,
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  // Import private key for signing
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(credentials.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signatureInput)
  )

  // Combine into complete JWT
  const encodedSignature = base64UrlEncode(signature)
  return `${signatureInput}.${encodedSignature}`
}

/**
 * Exchange JWT for Google access token
 */
async function exchangeJWTForToken(jwt: string): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Gmail access token: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  }
}

/**
 * Get a valid access token, using cache when possible
 */
export async function getAccessToken(credentials: GmailCredentials): Promise<string> {
  // Check if cached token is still valid
  const cached = await getTokenFromCache(credentials.senderEmail)
  if (cached) {
    return cached.accessToken
  }

  // Create new JWT and exchange for access token
  const jwt = await createJWT(credentials)
  const { accessToken, expiresIn } = await exchangeJWTForToken(jwt)

  // Cache the token
  const expiresAt = Date.now() + expiresIn * 1000
  await setTokenInCache(accessToken, expiresAt, credentials.senderEmail)

  return accessToken
}

/**
 * Clear the token cache (useful for handling 401 errors)
 */
export async function clearTokenCache(): Promise<void> {
  memoryTokenCache = null

  // Also clear from Cloudflare Cache API
  try {
    const cache = await caches.open("gmail-auth")
    await cache.delete(TOKEN_CACHE_KEY)
  } catch {
    // Cache API not available
  }
}
